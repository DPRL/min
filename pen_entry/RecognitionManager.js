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
        
        //console.log(this.instance_ids);
    }
    
    var result_nodes = in_xml_element.getElementsByTagName("Result");
    for(var k = 0; k < result_nodes.length; k++)
    {
        var attributes = result_nodes[k].attributes;
        var s_symbol = attributes.getNamedItem("symbol").value;
        var s_certainty = attributes.getNamedItem("certainty").value;
            
        this.certainties.push(parseFloat(s_certainty));
        this.symbols.push(s_symbol);
        
        //console.log(s_symbol + " " + s_certainty);
    }
    
    this.results = result_nodes.length;
    
    this.set_id = Segment.set_count++;
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
    RecognitionManager.symbol_name_to_unicode = {};
    RecognitionManager.unicode_to_symbol_name = {};
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
    //console.log("classify queued!");
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
    var timeOut = 1500; // milliseconds.

    RecognitionManager.segment_queue.push(segment);
    if(RecognitionManager.segment_queue.length >= RecognitionManager.max_segments)
    {
        RecognitionManager.classify_queued(false, segment.set_id == -1);
    }
    else
    {
        // With 'max_segments = 1,' this will never execute.
        //console.log("Setting timeouot");
        RecognitionManager.timeout = setTimeout("RecognitionManager.classify_queued(false," + ( segment.set_id == -1 ? "true" : "false" ) + ";", timeOut);
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
    symbol = this.unicode_to_symbol_name[textSegment.text];
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
