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
    PermEvents.check_url();

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
                $("#equation_canvas").off("keypress",Editor.current_mode.close_mode()).on("keypress", Editor.current_mode.init_mode());
                break;
            }
        }
    }

    if(e.keyCode == KeyCode.del) {
        Editor.deleteTool();
        $("#equation_canvas").off("keypress",Editor.current_mode.close_mode()).on("keypress", Editor.current_mode.init_mode());
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
                var tex_math = "";
                if ( tex_nodes.length != 0 ) {
                    var tex_string = tex_nodes[ 0 ].textContent;
                    // get just the math, removing spaces
                    tex_math = tex_string.split("$").slice(1,-1).join("").replace( /\s*/g, "" );
					Editor.slider.updateSlide(tex_math);
                }
                /* Assuming the latex is correctly rendered - Need to use macro commands that
                	mathjax supports. See website below:
                	http://docs.mathjax.org/en/v1.1-latest/tex.html#supported-latex-commands
                */
                if(tex_math.search("vbox") != -1)
                	return;
                var elem = document.createElement("div");
				elem.setAttribute("id","Hidden_Tex");
				elem.style.visibility = "visible"; 		// Hide the element
				elem.style.position = "absolute";
				elem.style.fontSize = "800%";
				/*var dim_tuple = Editor.get_canvas_elements_dimensions();
				elem.style.width = dim_tuple.item1 + "px";
				elem.style.height = dim_tuple.item2 + "px";*/
				elem.innerHTML = '\\[' + tex_math + '\\]'; 	// So MathJax can render it
				document.body.appendChild(elem); 		// don't forget to remove it later
	
				// Change renderer to svg and make sure it has been processed before calling
				// PermEvents.callBack
				MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "SVG"]);
    			MathJax.Hub.Queue(["Rerender", MathJax.Hub,elem], [function(){ 
    				MathJax.Hub.Queue(["Typeset",MathJax.Hub,elem], [Editor.copy_tex,elem,data]);
    			}]);
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

// Returns the total width and height of elements on the canvas from their BBox
Editor.get_canvas_elements_dimensions = function(){
	var start_width = parseFloat(RenderManager.segment_set_divs[0].getBoundingClientRect().left.toFixed(2));
	var end_width = parseFloat(RenderManager.segment_set_divs[RenderManager.segment_set_divs.length-1].getBoundingClientRect().right.toFixed(2));
	var height = 0;
	for(var i = 0; i < RenderManager.segment_set_divs.length; i++){
		var h = RenderManager.segment_set_divs[i].getBoundingClientRect();
		if(h.height >= height)
			height = h.height;
	}
	return new Tuple(end_width-start_width, height);
}

Editor.scale_tex = function(elem){
	var MathJax_div = document.getElementsByClassName("MathJax_SVG")[0];
	math_width = MathJax_div.offsetWidth;
	math_height = MathJax_div.offsetHeight;
	//target_width = dim_tuple.item1 * (math_width/math_height);
	//target_height = dim_tuple.item2 * (math_width/math_height);
	//target_width = dim_tuple.item1;
	//target_height = dim_tuple.item2;
	console.log("Width: " + math_width + " Height: " + math_height);
	if(math_width > target_width || math_height > target_height){ 
		elem.style.fontSize = (parseInt(elem.style.fontSize.split("%")[0]) - 10) + "%";
		MathJax.Hub.Queue(["Rerender",MathJax.Hub,elem], [$.proxy(Editor.scale_tex(elem), this)]);
	}else{
		return;
	}
}

Editor.copy_tex = function(elem,data){
	dim_tuple = Editor.get_canvas_elements_dimensions();
	target_width = $("#equation_canvas")[0].offsetWidth;
	target_height = $("#equation_canvas")[0].offsetHeight;
	Editor.scale_tex(elem); // scale to fit element on canvas dimensions
	
	// Identify the segments and place them appropriately
	var svg_root =  document.getElementById("Hidden_Tex").getElementsByClassName("MathJax_SVG")[0].firstChild;
	var use_tag_array = svg_root.getElementsByTagName("use");
	var rect_tag_array = svg_root.getElementsByTagName("rect"); 
	use_tag_array = Array.prototype.slice.call(use_tag_array);
	rect_tag_array = Array.prototype.slice.call(rect_tag_array);
	var elements = use_tag_array.concat(rect_tag_array);
	
	var sorted_coordinates = Editor.sort_svg_positions(elements);
	x_pos = sorted_coordinates[0];
	y_pos = sorted_coordinates[1];
	
	var transform_action = new TransformSegments(Editor.segments);
	// Save initial position of the first element
	if(!Editor.align_first_click){
		Editor.default_position = Editor.segments[0].translation;
		Editor.align_first_click = true;
	}
	var initial_offset;
	var default_position = Editor.segments[0].translation;
	Editor.apply_alignment(x_pos,default_position,true);
	Editor.apply_alignment(y_pos,default_position,false);
	transform_action.add_new_transforms(Editor.segments);
	transform_action.Apply();
	Editor.add_action(transform_action);
	x_pos = []; // Clear both arrays
	y_pos = [];
	document.body.removeChild(elem); // Remove elem from document body (Align done)
	MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "HTML-CSS"]);
}

// Identifies elements on canvas to MathJax rendered SVG and then moves to around to 
// look just like the SVG
Editor.apply_alignment = function(array,default_position,remove_duplicates){
	// Editor.segments is already sorted during insertion into the array
	var transformed_segments = new Array(); // holds segment set_ids
	for(var i = 0; i < array.length; i++){
		var svg_symbol = array[i].item2;
		var text = null;
		if(svg_symbol.getAttribute("href")){
			var unicode = svg_symbol.getAttribute("href").split("-")[1];
			text = String.fromCharCode(parseInt(unicode,16));
		}else
			text = "-"; // rect element is usually a division symbol which is a dash in Min
		var prev_set_id = null;
		var signal = false; // used to index into RenderManager's segment_set_divs
		var index;
		var segments = null; // Segment that matched a given set_id. Can also contain joined strokes
		for(var j = 0; j < Editor.segments.length; j++){ // Find the segment on canvas
			if(signal)
				index = j-1;
			else
				index = j;
			var segment_text = null;
			if(Editor.segments[j].constructor != TeX_Input && Editor.segments[j].constructor != SymbolSegment && Editor.segments[j].set_id == prev_set_id){ // joined symbols
				segment_text = RenderManager.segment_set_divs[index].innerHTML;
				signal = true;
			}else if(Editor.segments[j].constructor != TeX_Input && Editor.segments[j].constructor != SymbolSegment){ // PenStroke and Image Blobs
				segment_text = RenderManager.segment_set_divs[index].innerHTML; 
				signal = false;
			}else if(Editor.segments[j].constructor == TeX_Input || Editor.segments[j].constructor == SymbolSegment){ // TeX_Input and SymbolSegment don't have text on their BBox
				segment_text = Editor.segments[j].text; 
				signal = false;
			}
			var set_id = Editor.segments[j].set_id;
			if(text == "+")
				segment_text = "+";
			if(text == "x")
				segment_text = "x";
			if(segment_text == text && (!transformed_segments.contains(set_id))){
				transformed_segments.push(set_id);
				segments = Editor.get_segment_by_id(set_id);
				break;
			}
			prev_set_id = Editor.segments[j].set_id;
		}
		if(segments == null)
			continue;
		var joined_segs,joined_width,joined_height;
		if(segments.length == 2){
			segments[0].index = index;
			segments[1].index = index;
			var dim = Editor.get_joinedSeg_dimensions(segments);
			joined_height = dim.item1;
			joined_width = dim.item2;
			joined_segs = true;
		}
		// Apply transformation to segment
		var svg_symbol_rect = svg_symbol.getBoundingClientRect(); // get svg symbol's position
		//Editor.draw_rect(svg_symbol_rect);
		var svg_width = svg_symbol_rect.width;
    	var svg_height = svg_symbol_rect.height;
		for(var k = 0; k < segments.length; k++){ 
			var s,s2,in_x,in_y;
			segments[k].index = index; // Index used to retrieve RenderManager BBox height and width
			var seg_rect = Editor.get_BBox(segments[k]);
    		var elementOncanvasWidth = seg_rect.width;
    		var elementOncanvasHeight = seg_rect.height;
    		/*width_scale = svg_symbol_rect.width/svg_width;
    		height_scale = svg_symbol_rect.height/svg_height;
    		svg_symbol.setAttribute("transform", "scale("+width_scale+","+height_scale+")");*/
    		if(joined_segs){
    			s = svg_width/joined_width;
    			s2 = svg_height/joined_height;
    		}else{
				s = svg_width/elementOncanvasWidth;
				s2 = svg_height/elementOncanvasHeight;
			}
			/*new_height =  svg_height * (elementOncanvasWidth/elementOncanvasHeight);
			//new_width =  dim_tuple.item1 * (svg_width/svg_height);
			//s = parseFloat((svg_width/new_width).toFixed(2));
			s2 =  new_height/svg_height;*/
			
			//s2 = parseFloat((dim_tuple.item2/elementOncanvasHeight).toFixed(2));
			var scale = new Vector2(s,s2);
			var min_0 = segments[k].world_mins;
			segments[k].resize(min_0, scale);
			segments[k].align_scale = scale;
			segments[k].align_old_translation = segments[k].translation;
            segments[k].freeze_transform();
			
			var svg_vector_format = new Vector2(parseInt(svg_symbol_rect.left.toFixed(2)),parseInt(svg_symbol_rect.top.toFixed(2)));
            if(i == 0 && remove_duplicates)
    			initial_offset = svg_vector_format;
    		if(segments.length == 2){
    			in_x = parseInt(default_position.x.toFixed(2)) + svg_vector_format.x;
				in_y = parseInt(default_position.y.toFixed(2)) + svg_vector_format.y;
    		}else{
    			in_x = parseInt(default_position.x.toFixed(2)) + svg_vector_format.x;
				in_y = parseInt(default_position.y.toFixed(2)) + svg_vector_format.y;
    		}
            
			var translation = new Vector2(in_x,in_y);
			translation.Subtract(initial_offset);
            /*if(segments[k].already_aligned && Vector2.Equals(Vector2.Subtract(translation,svg_vector_format), default_position))
    			continue;
    		else{
    			 if(!segments[k].already_aligned || !Vector2.Equals(Vector2.Subtract(translation,svg_vector_format), default_position) ){
    				if(segments.length == 2){
    					in_x = parseInt(Editor.default_position.x.toFixed(2)) + svg_vector_format.x;
						in_y = parseInt(Editor.default_position.y.toFixed(2)) + svg_vector_format.y;
    				}else{
    					in_x = parseInt(Editor.default_position.x.toFixed(2)) + svg_vector_format.x;
						in_y = parseInt(Editor.default_position.y.toFixed(2)) + svg_vector_format.y;
    				}
					translation = new Vector2(in_x,in_y);
					translation.Subtract(initial_offset);
				}
				segments[k].translation = translation;
				//var new_tran = Editor.check_collision(seg_rect,segments[k]);
				//segments[k].translation.Add(new_tran);
				segments[k].already_aligned = true;
			}*/
			segments[k].already_aligned = true;
			segments[k].translation = translation;
        }
        // Remove segment from y_pos array if remove_duplicates == true to reduce redundancy
        if(remove_duplicates){
			for(var l = 0; l < y_pos.length; l++){
				if(y_pos[l].item2 == array[i].item2)
					y_pos.splice(l,1);
			}
		}
	}
}

Editor.draw_rect = function(dim){
	var div = document.createElement('div');
	div.className = Editor.current_mode.segment_style_class;
	div.style.visibility='visible';
	document.body.appendChild(div)
	div.style.visibility = "visible";
	div.style.left = dim.left + "px";
	div.style.top = dim.top + "px";
	div.style.width = dim.width + "px";
	div.style.height = dim.height + "px";
	div.style.color = "red";
}

// Returns the maximum height and width of joined segments like a plus
Editor.get_joinedSeg_dimensions = function(segments){
	var height = width = 0;
	for(var i = 0; i < segments.length; i++){
		var seg_rect = Editor.get_BBox(segments[i]);
		if(seg_rect.height > height)
			height = seg_rect.height;
		if(seg_rect.width > width)
			width = seg_rect.width;
	}
	return new Tuple(height,width);
}

// Makes sure the segment to be aligned doesn't collide with other aligned segments
Editor.check_collision = function(seg_rect,segment){
	var offset = new Vector2(0,0);
	for(var i = 0; i < Editor.segments.length; i++){
		if(Editor.segments[i].already_aligned){
			var aligned_elem_rect = Editor.get_BBox(Editor.segments[i]);
			var seg_rect = Editor.get_BBox(segment);
			var aligned_elem_pos = Editor.get_position(aligned_elem_rect,Editor.segments[i]);
			var seg_pos = Editor.get_position(seg_rect,segment);
			// Detect collision based on newly calculated BBoxs
			if(seg_pos.item3 < aligned_elem_pos.item4){
				offset.x = aligned_elem_pos.item4 - seg_pos.item3;
			}
			/*if(seg_pos.item4 > aligned_elem_pos.item3){
				offset.y = seg_pos.item4 - aligned_elem_pos.item3;
			}*/
		}
	}
	return offset;
}

// Returns the BBox of an element after applying scaling and translation
Editor.get_position = function(rect, segment){
	// Apply scale to rect element
	var height = rect.height*segment.align_scale.y,
		width = rect.width*segment.align_scale.x,
		left = rect.left,
		right = width+left,
		top = rect.top,
		bottom = top+height;
	var translation_diff = Vector2.Subtract(segment.align_old_translation,segment.translation);
	return new Tuple(height, width, (left-translation_diff.x),(right-translation_diff.x),
		(top-translation_diff.y), (bottom-translation_diff.y));
}

// Returns the BBox of an element
Editor.get_BBox = function(seg){
	/*var elem_rect;
	if(seg.constructor == SymbolSegment)
		elem_rect = seg.element.getBoundingClientRect();
	else
		elem_rect = seg.inner_svg.getBoundingClientRect();
	return elem_rect;*/
	var v = {'width':0,'height':0};
	var t = RenderManager.segment_set_divs[seg.index];
	v.width = parseInt(t.style.width);
	v.height = parseInt(t.style.height);
	return v;
}

//Sorts an array
Editor.sort_svg_positions = function(array){
	var result = new Array();
	var x_pos = new Array(); // all x coordinates
	var y_pos = new Array(); // all y coordinates
	
	for(var i = 0; i < array.length; i++){
		var tuple_x = new Tuple(parseInt(array[i].getBoundingClientRect().left.toFixed(2)), array[i]);
		var tuple_y = new Tuple(parseInt(array[i].getBoundingClientRect().top.toFixed(2)), array[i]);
		x_pos.push(tuple_x);
		y_pos.push(tuple_y);
	}
	x_pos.sort(Editor.compare_numbers);
	y_pos.sort(Editor.compare_numbers);
	result[0] = x_pos;
	result[1] = y_pos;
	return result;
}

// Compare parsed in tuples
Editor.compare_numbers = function(a, b){
	if(a.item1 < b.item1)
		return -1;
	else if(a.item1 > b.item1)
		return 1;
	else
		return 0;
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
    Editor.ParseImage(file);
}
// This function is called when the user clicks on the upload image button
// And also when the user drags and drops a file on the canvas.
Editor.ParseImage = function(file){ 

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
$.ctrl = function(key, callback, args) {
    $(document).keydown(function(e) {
        if(!args) args=[]; // IE barks when args is null 
        if(e.keyCode == key.charCodeAt(0) && e.ctrlKey) {
            callback.apply(this, args);
            return false;
        }
    });        
};