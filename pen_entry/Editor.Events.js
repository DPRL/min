var EditorState = 
    {
        // select tool states
        "ReadyToStrokeSelect" : 0,
        "StrokeSelecting" : 1,
        "ReadyToRectangleSelect" : 2,
        "RectangleSelecting" : 3,
        
        // pen states
        "ReadyToStroke" : 4, 
        "MiddleOfStroke" : 5,

        // text tool states
        "ReadyForText" : 6, "MiddleOfText" : 7,

        // Segment (and primitive) selection, labeling
        "SegmentsSelected" : 8,
        "MovingSegments" : 9,
        "Resizing" : 10,
        "Relabeling" : 11,
        "PinchResizing": 12,

        // Editing text box.
        "InTextBox" : 13,

        // New: moving a symbol in edit mode; touch and hold state.
    };

var TouchAndHoldState = {
    "NoTouchAndHold": 0,
    "MouseDownAndStationary": 1,
    "FingerDownAndStationary": 2 // same as the above state, but happening on a touchscreen
};

Editor.lastEvent = null;
Editor.moveQueue = null;
Editor.touchAndHoldFlag = TouchAndHoldState.NoTouchAndHold;

Editor.setup_events = function()
{
    var button_index = 0; // Sets default initial state (pen/touch entry)
    Editor.timeStamp = null;
    Editor.prevTimeStamp = null;
    
    PermEvents.setup_window();

    PermEvents.setup_toolbar();
    PermEvents.setup_document();

    // Select the pen tool
    Editor.button_states[Buttons.Pen].enabled = true;

}

Editor.setStrokeView = function()
{
    var show = true;
    for (var i=0; i < Editor.segments.length; i++) {
        var nextSegment = Editor.segments[i];
        if (nextSegment.chalk_layer) {
            if (!show){
                nextSegment.inner_svg.setAttribute("style", "fill:none;stroke-linecap:round;");
                nextSegment.element.style.visibility = "hidden";
            }
            else{
                nextSegment.inner_svg.setAttribute("style", "fill:none;stroke-linecap:round;");
                nextSegment.element.style.visibility = "visible";                
            }
        }
    }
}

Editor.fit_to_screen = function(event)
{
    var root_div = document.getElementById("equation_editor_root");
    root_div.style.width = window.innerWidth + "px";
    root_div.style.height = window.innerHeight + "px";
    
    Editor.canvas_width = Editor.canvas_div.offsetWidth;
    Editor.canvas_height = Editor.canvas_div.offsetHeight;
    
    Editor.div_position = findPosition(Editor.canvas_div);
    
    window.scroll(0,0);
}



//--------------------------------------------------
// 
// User Input Events
//   - touchAndHold (called using timeout)
//   - onDoubleClick (called on touchAndHold as well)
//
//   - onMouseDown
//   - onMouseMove
//   - onMouseUp
//   - onKeyPress
//-------------------------------------------------- 

Editor.mapCanvasBackspace = function(e)
{
    if(e.keyCode == KeyCode.backspace)
    {
        // Check whether the text box has focus.
        textBox = document.getElementById("tex_result");
        if (document.querySelector(":focus") == textBox) {
            // Act as normal.
        } else {
            // If we're not in the text box, need to avoid going 'back'
            // when we press backspace in Safari and some other browsers.
            // TODO: These should be subsumed by events in the mode objects
            switch (Editor.state)
            {
            case EditorState.MiddleOfText:
                // e.preventDefault();
                // Editor.current_text.popCharacter();
                // CMS: Moved these actions to DrawModeOnKeyPress
                break;
            default:
                // Otherwise, delete any selections.
                e.preventDefault();
                Editor.deleteTool();
                break;
            }
        }
    }

    if(e.keyCode == KeyCode.del) {
        Editor.deleteTool();
    }
    
}

// Eventually change this into something that all events use and
// move into EditorMode.
Editor.onKeyPress = function(e)
{
    // For touch-and-hold
    Editor.lastEvent = e;

    if (Editor.touchAndHoldFlag == TouchAndHoldState.MouseDownAndStationary)
        return;

    // RLAZ: map enter to issuing the search.
    // TODO: CMS, this will remain in the every keypress events
    if(e.keyCode == KeyCode.enter) {
        Editor.search();
        return;
    } 

    // RLAZ: skip deletes (46) and backspaces (8), handled in mapCanvasBackspace()
    if(e.keyCode == KeyCode.backspace || e.keyCode == KeyCode.del)
        return;
}

//--------------------------------------------------
// 
// Editing modes/states
// 
//-------------------------------------------------- 

// TODO: Move to initialization for draw mode
Editor.selectPenTool = function()
{
    Editor.clearButtonOverlays();
    
    Editor.button_states[Buttons.Pen].setSelected(true);
    Editor.clear_selected_segments();
    Editor.current_stroke = null;
    
    switch(Editor.state)
    {
    case EditorState.MiddleOfText:
        Editor.current_text.finishEntry();
        if(Editor.current_action.toString() == "EditText")
            Editor.current_action.set_current_text(Editor.current_text.text);
        else if(Editor.current_action.toString() == "AddSegments")
            Editor.current_action.buildSegmentXML();
        Editor.current_text = null;
        break;
    }

    Editor.state = EditorState.ReadyToStroke;
    RenderManager.colorOCRbbs("segment_input_set");
    RenderManager.render();
}

// TODO: Move functionality to StrokeSelectionMode (init)
Editor.strokeSelectionTool = function()
{
    if(Editor.button_states[Buttons.Stroke].enabled == false)
        return;
    Editor.clearButtonOverlays();
    Editor.button_states[Buttons.Stroke].setSelected(true);
    
    switch(Editor.state)
    {
    case EditorState.MiddleOfText:
        Editor.current_text.finishEntry();
        if(Editor.current_action.toString() == "EditText")
            Editor.current_action.set_current_text(Editor.current_text.text);
        else if(Editor.current_action.toString() == "AddSegments")
            Editor.current_action.buildSegmentXML();                
        Editor.current_text = null;
    }
    
    if(Editor.selected_segments.length == 0)
        Editor.state = EditorState.ReadyToStrokeSelect;
    else
        Editor.state = EditorState.SegmentsSelected;

    RenderManager.colorOCRbbs("segment_set_stroke");
    RenderManager.render();
    Editor.selection_method = "Stroke";
}


Editor.align = function()
{
    switch(Editor.state)
    {
    case EditorState.MiddleOfText:
        Editor.current_text.finishEntry();
        if(Editor.current_action.toString() == "EditText")
            Editor.current_action.set_current_text(Editor.current_text.text);
        else if(Editor.current_action.toString() == "AddSegments")
            Editor.current_action.buildSegmentXML();                
        Editor.current_text = null;
    }
    RenderManager.clear_canvas();


    // an array of tuples
    // recognition result, min bb, max bb, set id
    var data = new Array();

    //iterate throuogh all of the segment sets and identify each bounding box (and symbol)
    var set_segments = new Array();
    // segments are in order by set id
    Editor.segments.push(null);    // add null pointer so we can easily render last set in list
    var set_index = 0;
    for(var k = 0; k < Editor.segments.length; k++)
    {
        var seg = Editor.segments[k];
        if(set_segments.length == 0)
            set_segments.push(seg);
        else if(seg == null || seg.set_id != set_segments[0].set_id)
        {
            var mins = set_segments[0].worldMinPosition();
            var maxs = set_segments[0].worldMaxPosition();
            
            for(var j = 1; j < set_segments.length ; j++)
            {
                var seg_min = set_segments[j].worldMinPosition();
                var seg_max = set_segments[j].worldMaxPosition();
                
                if(seg_min.x < mins.x)
                    mins.x = seg_min.x;
                if(seg_min.y < mins.y)
                    mins.y = seg_min.y;
                
                if(seg_max.x > maxs.x)
                    maxs.x = seg_max.x;
                if(seg_max.y > maxs.y)
                    maxs.y = seg_max.y;
            }
            
            var origMins = mins.clone();
            var origMaxs = maxs.clone();
            var recognition_result = RecognitionManager.getRecognition(set_segments[0].set_id);
            // If it's a text segment, account for the draculae making x's smaller than t's, etc
            
            if (set_segments[0].constructor == SymbolSegment) {
                size = Vector2.Subtract(maxs, mins);
                if (-1 != $.inArray(set_segments[0].text, Editor.x_height_chars)) {
                    mins.y += size.y / 2;
                }
                if (-1 != $.inArray(set_segments[0].text, Editor.descender_chars)) {
                    mins.y += size.y / 2;
                    maxs.y += size.y / 2;
                } 
            }
            var tuple = new Tuple(recognition_result, mins, maxs, origMins, origMaxs);
            data.push(tuple);
            
            set_segments.length = 0;
            set_segments.push(seg);
        }
        else
            set_segments.push(seg);
    }
    Editor.segments.pop();
    
    /* build XML request here:
       <SegmentList>
       <Segment symbol="S" min="0,0" max="10,10" id="24"/>
       </SegmentList>
       
       
    */
    
    var sb = new StringBuilder();
    sb.append("?segments=<SegmentList>");
    for(var k = 0; k < data.length; k++)
    {
        var t = data[k];
        sb.append("<Segment symbol=\"");
        if(t.item1.symbols.length == 0)
            sb.append("x\" min=\"");
        else
            sb.append(t.item1.symbols[0]).append("\" min=\"");
        sb.append(new Vector2(Math.floor(t.item2.x), Math.floor(t.item2.y)).toString()).append("\" max=\"");
        sb.append(new Vector2(Math.floor(t.item3.x), Math.floor(t.item3.y)).toString()).append("\" id=\"");
        sb.append(t.item1.set_id).append("\"/>");
    }
    sb.append("</SegmentList>");
    
    $.ajax
    (
        {
            url: Editor.align_server_url + sb.toString(),
            success: function(in_data, textStatus, xmlhttp)
            {
                // parse response here
                var new_dimensions = new Array();

                // parse response xml
                var xmldoc = in_data;
                var segment_nodes = xmldoc.getElementsByTagName("Segment");
                var tex_nodes = xmldoc.getElementsByTagName( "TexString" );
                
                if(segment_nodes.length == 0)
                {
                    alert("DRACULAE Error: " + in_data);
                    return;
                }
                
                // Update the current slide with the TeX.
                if ( tex_nodes.length != 0 ) {
                    var tex_string = tex_nodes[ 0 ].textContent;
                    // get just the math, removing spaces
                    var tex_math = tex_string.split("$").slice(1,-1).join("").replace( /\s*/g, "" );
					Editor.slider.updateSlide(tex_math);
                }
                
                for(var k = 0; k < segment_nodes.length; k++)
                {
                    var attributes = segment_nodes[k].attributes;
                    var t = new Tuple();
                    t.item1 = parseInt(attributes.getNamedItem("id").value);
                    t.item2 = parseVector2(attributes.getNamedItem("min").value);
                    t.item3 = parseVector2(attributes.getNamedItem("max").value)
                    new_dimensions.push(t);

                }
                
                // foreach segment set
                
                var transform_action = new TransformSegments(Editor.segments);
                
                for(var k = 0; k < new_dimensions.length; k++)
                {
                    var t = null;
                    // find tuple containing original size of segment
                    for(var j = 0; j < data.length; j++)
                    {
                        if(data[j].item1.set_id == new_dimensions[k].item1)
                        {
                            t = data[j];
                            break;
                        }
                    }

                    if(t == null)
                        continue;
                    
                    var set_id = new_dimensions[k].item1;
                    var segments = Editor.get_segment_by_id(set_id);
                    
                    var min_0 = t.item4;
                    var max_0 = t.item5;
                    
                    var min_f = new_dimensions[k].item2;
                    var max_f = new_dimensions[k].item3;
                    
                    var size0 = Vector2.Subtract(max_0, min_0);
                    var sizef = Vector2.Subtract(max_f, min_f);
                    
                    // If it's a text segment, account for the draculae making x's smaller than t's, etc
                    if (segments.length == 1 && segments[0].constructor == SymbolSegment) {
                        if (-1 != $.inArray(segments[0].text, Editor.x_height_chars)) {
                            min_f.y -= sizef.y;
                            sizef.y *= 2;
                        }
                        if (-1 != $.inArray(segments[0].text, Editor.descender_chars)) {
                            min_f.y -= sizef.y / 2;
                        }
                    }
                    
                    var scale = new Vector2(sizef.x / size0.x, sizef.y / size0.y);
                    
                    var translation = new Vector2();
                    translation.x = scale.x * min_f.x - min_0.x;
                    translation.y = scale.y * min_f.y - min_0.y;
                    
                    
                    for(var i = 0; i < segments.length; i++)
                    {
                        segments[i].resize(min_0, scale);
                        segments[i].freeze_transform();
                        segments[i].translate(Vector2.Subtract(min_f, min_0));
                        segments[i].freeze_transform();
                    }
                    
                }
                
                transform_action.add_new_transforms(Editor.segments);
                transform_action.Apply();
                Editor.add_action(transform_action);
                //RenderManager.render();
            },
            error: function(jqXHR, textStatus, errorThrown)
            {
                console.log(jqXHR);
                console.log(textStatus);
                console.log(errorThrown);
            }
        }
    );
}

// adds currently selected segments to a single segment group object
// the individual segments in the group remain in their type's render layer, 
// so no need to remove or re-render
Editor.groupTool = function()
{
    if(Editor.selected_segments.length > 0 && Editor.state == EditorState.SegmentsSelected)
    {
        // get a new uid for this set
        var set_id = Segment.set_count++;
        Editor.add_action(new GroupSegments(Editor.selected_segments, set_id));
        
        for(var k = 0; k < Editor.selected_segments.length; k++) {
            Editor.selected_segments[k].set_id = set_id;
        }

        
        RecognitionManager.classify(set_id);
        Editor.state = EditorState.SegmentsSelected;
    }
}

// deletes the currently selected segments
Editor.deleteTool = function()
{
    var action = new DeleteSegments(Editor.selected_segments)
    action.Apply();
    Editor.add_action(action);
    Editor.clearSelectedSegments();
}

/**
   Clear the selected segments from the canvas and then
   set the editor mode to the proper selection method.
**/
Editor.clearSelectedSegments = function(){
    Editor.clear_selected_segments();    
    RenderManager.render();
    console.log(Editor.selection_method);
    if(Editor.selection_method == "Stroke")
        Editor.state = EditorState.ReadyToStrokeSelect;
    else if(Editor.selection_method == "Rectangle")
        Editor.state = EditorState.ReadyToRectangleSelect;
}

Editor.typeTool = function()
{
    Editor.selected_segments.length = 0;
    Editor.current_stroke = null;
    Editor.clearButtonOverlays();

    Editor.button_states[Buttons.Pen].setSelected(true);
    Editor.button_states[Buttons.Rectangle].setSelected(false);
    Editor.button_states[Buttons.Stroke].setSelected(false);
    Editor.clear_selected_segments();
    
    switch(Editor.state)
    {
    case EditorState.SegmentsSelected:
        Editor.clear_selected_segments();
        break;
    case EditorState.MiddleOfText:
        if(Editor.current_action.toString() == "EditText")
            Editor.current_action.set_current_text(Editor.current_text.text);
        Editor.current_text = null;
        break;
    }
    Editor.state = EditorState.ReadyForText;
    RenderManager.render();
}

/*
   cb is a callback to call after thei Correction hides itself.  
*/
Editor.relabel = function(callback)
{
    Editor.clearButtonOverlays();
    for(var k = 0; k < Editor.button_states.length; k++)
        Editor.button_states[k].setEnabled(false);
    CorrectionMenu.show(callback);
}

// clears all the data and sends action list to server for storage
// CMS: This is never used currently, I assume that it's for saving actions and
// then reloading them.
Editor.clear = function()
{
    // get rid of last one if it' a bugger
    if(Editor.action_list.length > 0)
    {
        var prev_action = Editor.action_list.pop();
        if(prev_action.shouldKeep() == true)
            Editor.action_list.push(prev_action);
    }
    
    // save data
    var sb = new StringBuilder();
    sb.append("?actionList=<ActionList>");
    for(var k = 0; k < Editor.action_list.length; k++)
    {
        sb.append(Editor.action_list[k].toXML());
    }
    sb.append("</ActionList>");
    $.get
    (
        Editor.data_server_url + sb.toString(),
        function(data, textStatus, xmlhttp)
        {
            window.location.reload( true ); // href = Editor.editor_root + "index.xhtml";
        }
    );
    
    // reset editor
    // ?????
}

Editor.getInkML = function() {
    var inkml = "<ink xmlns=\"http://www.w3.org/2003/InkML\">";
    var segments = new Array();
    var segarray = Editor.segments.slice( 0 );
    segarray.sort( function( o1, o2 ) { return o1.instance_id - o2.instance_id } );
    
    for ( var i = 0; i < segarray.length; i++ ) {
        var stroke = segarray[ i ];
        var strokeid = stroke.instance_id;
        var segid = stroke.set_id;
        
        // translation for absolute positioning
        var tx = stroke.translation.x;
        var ty = stroke.translation.y;
        var sx = stroke.scale.x;
        var sy = stroke.scale.y;
        // add to proper segment
        if ( segments[ segid ] == null ) segments[ segid ] = new Array();
        segments[ segid ].push( strokeid );
        
        // add stroke data to inkml
        inkml += "<trace id=\"" + strokeid + "\">";
        var strokedata = new Array();
        for ( var j = 0; j < stroke.points.length; j++ ) {
            strokedata.push( ( ( stroke.points[ j ].x * sx ) + tx ) + " " + ( ( stroke.points[ j ].y * sy ) + ty ) );
        }
        inkml += strokedata.join( ", " );
        inkml += "</trace>";        
    }
    
    for ( var i = 0; i < segments.length; i++ ) {
        if ( segments[ i ] == null ) continue;
        var strokeids = segments[ i ];
        
        inkml += "<traceGroup xml:id=\"TG" + i + "\">";
        
        // label
        inkml += "<annotation type=\"truth\">" + RecognitionManager.getRecognition( i ).symbols[ 0 ] + "</annotation>"
        
        for ( var j = 0; j < strokeids.length; j++ ) {
            inkml += "<traceView traceDataRef=\"" + strokeids[ j ] + "\" />";
        }
        
        inkml += "</traceGroup>";
    }
    inkml += "</ink>";
    
    if ( Modernizr.touch ) {
        
        // ask for filename
        var fname = prompt( "Enter filename (leave blank for random)." );
        if ( fname == null ) return; // "cancel"
        
        // save to server
        $.ajax(
            {
                url: Editor.inkml_save_server_url + "?fname=" + fname + "&s=" + escape( inkml ),
                success: function( in_data, textStatus, xmlhttp ) {      
                    alert( "Saved: " + in_data.split( "!" )[ 1 ] );
                },
                error: function( jqXHR, textStatus, errorThrown ) {
                    console.log( jqXHR );
                    console.log( textStatus );
                    console.log( errorThrown );
                    if ( jqXHR.status == 0 ) {
                        alert( "Error: server offline." );
                    } else {
                        alert( "Error: " + textStatus + "/" + errorThrown );
                    }
                }
            }
        );
        
    } else {
        
        // save locally
        var datauri = "data:text/inkml," + escape( inkml ); // yes, this is an invalid mime type
        window.open( datauri );
        
    }
}

/*
  This method is complicated so let me explain what's going on:
  FileReader's readAsDataURL method and apparently Image's .src property are
  Asynchrynous, so we need to fire an event to do work instead of doing it sequentially.
  When the file is read as a data url, the first method is called which sets the data url
  as the Image's source.  That doesn't happen immediately, so another event is made
  for when the image's src is finished being set.  When this happens, then we forward
  the image to the render manager and the collision manager.
*/

Editor.onImageLoad = function(e)
{
    var file_list = e.target.files;
    var file = file_list[0];
    if(file)
    {
        var r = new FileReader();
        r.onload = function(e)
        {
            var loaded_image = new Image();
            
            // render image to canvas, get back the dataurl, send dataurl to server,
            // get back list of connected components in xml, add to managers
            var added_segments = new Array();
            loaded_image.onload = function(e)
            {
                var canvas = document.createElement("canvas");
                canvas.width = loaded_image.width;
                canvas.height = loaded_image.height;
                
                var context = canvas.getContext("2d");
                context.drawImage(loaded_image, 0, 0);
                
                // var dataUrl = canvas.toDataURL();
                inverseImage = ImageBlob.generateInverseImage(this);
                var blob = new ImageBlob(this, inverseImage);
                Editor.add_segment(blob);
                RecognitionManager.enqueueSegment(blob);
                
            }
            
            Editor.add_action(new AddSegments(added_segments));
            
            // set the result of the image load to the image object
            loaded_image.src = e.target.result;
        }
        r.readAsDataURL(file);

    }
    else
    {
        // file not loaded
    }
}

Editor.search = function(e) 
{
    // NOTE: CURRENTLY EXPERIMENTING WITH ONLY ONE TEXT BOX.
    var searchString = "";
    var engineType = document.getElementById("engineSelector").value;
	var keywords = document.getElementById("tex_result").value;
    var searchString = Editor.slider.getCurrentExpression();
	if (keywords) {
		searchString += ' ' + keywords;
	}


    /* INCOMPLETE */
    switch (engineType)
    {
    case 'LaTeX Search':
        url = 'http://latexsearch.com/latexFacets.do?searchInput=';
        searchString = searchString + '&stype=exact';
        break;
    case 'Wolfram Alpha':
        url='http://www.wolframalpha.com/input/?i=';
        break;
    case 'Google':
        url='http://www.google.com/search?q=';
        break;
    case 'Tangent':
        url = 'http://saskatoon.cs.rit.edu:9001/?query=';
        break;
    case 'Wikipedia':
        url = 'http://en.wikipedia.org/w/index.php?title=Special%3ASearch&search=';
        break;
    default:
        /* Currently NIST DLMF is the default (first list item) */
        url = 'http://dlmf.nist.gov/search/search?q=';
        break
    }
    searchString = encodeURIComponent(searchString);
    window.open(url + searchString);
}

Editor.goDPRL = function ()
{
    window.location = "http://www.cs.rit.edu/~dprl"
}

Editor.showToolTip = function(target, use){
	if (!Modernizr.touch) {
		$('#' + target).tooltip({content: use, items: '#' + target});
	}
}
