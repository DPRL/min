// a datastructure representing the top N recognition results

function RecognitionResult()
{
    // list of symbols
    this.symbols = new Array();
    // associated list of certainties (from 0 to 1)
    this.certainties = new Array();
    
    this.results = 0;
    
    this.instance_ids = new Array();
    this.set_id = -1;
}

RecognitionResult.prototype.fromXML = function(in_xml_element)
{
    {
        var attributes = in_xml_element.attributes;
        var instance_ids = attributes.getNamedItem("instanceIDs").value.split(',');
        
        for(var k = 0; k < instance_ids.length; k++)
        {
            this.instance_ids.push(parseInt(instance_ids[k]));
        }

    }
    
    var result_nodes = in_xml_element.getElementsByTagName("Result");
    for(var k = 0; k < result_nodes.length; k++)
    {
        var attributes = result_nodes[k].attributes;
        var s_symbol = attributes.getNamedItem("symbol").value;
        var s_certainty = attributes.getNamedItem("certainty").value;
        
        this.certainties.push(parseFloat(s_certainty));
        this.symbols.push(s_symbol);
    }
    
    this.results = result_nodes.length;
    this.set_id = Segment.set_count++;
}

RecognitionResult.prototype.save_state = function() {
	return {
		symbols: this.symbols,
		certainties: this.certainties,
		results: this.results,
		instance_ids: this.instance_ids,
		set_id: this.set_id
	}
}

RecognitionResult.restore_state = function(state) {
	result = new RecognitionResult();
	result.symbols = state.symbols;
	result.certainties = state.certainties;
	result.results = state.results;
	result.instance_ids = state.instance_ids;
	result.set_id = state.set_id;
	return result;
}

function RecognitionManager()
{
    
}

RecognitionManager.initialize = function()
{
    RecognitionManager.result_table = new Array();
    RecognitionManager.segment_queue = new Array();
    RecognitionManager.timeout = null;
    RecognitionManager.max_segments = 1;
    RecognitionManager.symbol_to_latex = {};
    RecognitionManager.latex_to_symbol = {};
    RecognitionManager.unicode_to_symbol = {};
    RecognitionManager.build_symbol_table();
}

RecognitionManager.build_symbol_table = function(){
	$.get
    (
        Editor.generic_symbol_table,
        function(data, textStatus, xmlhttp){
        	var data = xmlhttp.responseText;
        	var array = data.split("\n");
        	for(var i = 0; i < array.length; i++){ // build map(symbol to latex)
        		var temp = array[i].split(",");
        		if(temp[0] != "Codepoint"){
        			RecognitionManager.symbol_to_latex[temp[1]] = temp[3];
        			RecognitionManager.unicode_to_symbol[temp[0]] = temp[1];
        			if(temp[4] == null)
        				console.log(i);
        			var bar = temp[4].split("|");
        			for( var j = 0; j < bar.length; j++)
        				RecognitionManager.latex_to_symbol[bar[j]] = temp[1];
        		}
        	}
        }
    );
}

RecognitionManager.classify = function(in_set_id, should_segment)
{
    // first identify segments with this set id
    var segments_in_set = new Array();
    for(var k = 0; k < Editor.segments.length; k++)
        if(Editor.segments[k].set_id == in_set_id)
            segments_in_set.push(Editor.segments[k]);
    
    // if none exist, remove recognition result from table
    if(segments_in_set.length == 0)
    {
        for(var k = 0; k < RecognitionManager.result_table.length; k++)
        {
            if(RecognitionManager.result_table[k].set_id == in_set_id)
            {
                RecognitionManager.result_table.splice(k,1);
                return;
            }
        }
        return;
    }
    Editor.classifier.classify(segments_in_set, should_segment);
}

RecognitionManager.classify_queued = function(should_segment, should_assign_setid)
{
    var temp_list = new Array();
    var new_set_id = Segment.set_count++;
    
    var count = Math.min(RecognitionManager.max_segments, RecognitionManager.segment_queue.length);
    
    if ( count > 0 && !should_assign_setid ) new_set_id = RecognitionManager.segment_queue[ 0 ].set_id;
    
    for(var k = 0; k < count; k++)
    {
        temp_list.push(RecognitionManager.segment_queue[k]);
        temp_list[k].set_id = new_set_id;
    }
    RecognitionManager.segment_queue.splice(0,count);
    RecognitionManager.classify(new_set_id, should_segment);
}

RecognitionManager.enqueueSegment = function(segment)
{
    clearTimeout(RecognitionManager.timeout);

    RecognitionManager.segment_queue.push(segment);
    if(RecognitionManager.segment_queue.length >= RecognitionManager.max_segments)
    {
        RecognitionManager.classify_queued(false, segment.set_id == -1);
    }
    else
    {
        RecognitionManager.timeout = setTimeout("RecognitionManager.classify_queued(false," + ( segment.set_id == -1 ? "true" : "false" ) + ";", Editor.recognition_timeout);
    }
    
}

RecognitionManager.getRecognition = function(in_set_id)
{
    for(var k = 0; k < RecognitionManager.result_table.length; k++)
        if( RecognitionManager.result_table[k].set_id == in_set_id)
            return RecognitionManager.result_table[k];
    return null;
}

RecognitionManager.removeRecognition = function(in_set_id)
{
    for(var k = 0; k < RecognitionManager.result_table.length; k++)
        if( RecognitionManager.result_table[k].set_id == in_set_id)
            RecognitionManager.result_table.splice(k,1);
}

RecognitionManager.addRecognitionForText = function(textSegment) {
    RecognitionManager.removeRecognition(textSegment.set_id);
    
    result = new RecognitionResult();
    symbol = textSegment.text;
    if (symbol === undefined) {
        symbol = textSegment.text;
    }
    result.symbols.push(symbol);
    result.certainties.push(1);
    result.results = 1;
    result.set_id = textSegment.set_id;
    result.instance_ids.push(textSegment.instance_id);
    
    RecognitionManager.result_table.push(result);
}
