var EditorState = 
    {
        // select tool states
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

    if(e.keyCode == KeyCode.enter && Editor.state == EditorState.MiddleOfText) {
        Editor.current_mode.stopTextInput();
        return;
    }
    
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
            sb.append(encodeURIComponent("x")+"\" min=\"");
        else
            sb.append(encodeURIComponent(t.item1.symbols[0] + "")).append("\" min=\"");
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
                if(tex_math.search("vbox") != -1 || tex_math.search("vtop") != -1 || tex_math == ""){ // checks for tex error before MathJax yells!
                	console.log("DRACULAE Tex Output Error -  MathJax can't render commands in Tex");
                	return;
                }
                console.log("Alignment -> Tex_math: " + tex_math);
                var elem = document.createElement("div");
				elem.setAttribute("id","Alignment_Tex");
				elem.style.visibility = "hidden"; 		// Hide the element
				elem.style.position = "absolute";
				elem.style.fontSize = "800%";
				elem.innerHTML = '\\[' + tex_math + '\\]'; 	// So MathJax can render it
				document.body.appendChild(elem); 		// don't forget to remove it later
	
				// Change renderer to svg and make sure it has been processed before calling
				// PermEvents.callBack
				MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "SVG"]);
    			MathJax.Hub.Queue(["Rerender", MathJax.Hub,elem], [function(){ 
    				MathJax.Hub.Queue(["Typeset",MathJax.Hub,elem], [Editor.copy_tex,elem]);
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
	var root = document.getElementById("Alignment_Tex").getElementsByClassName("MathJax_SVG")[0].firstChild;
	var rect = root.getBoundingClientRect();
	math_width = parseFloat(rect.width.toFixed(2));
	math_height = parseFloat(rect.height.toFixed(2));
	if(math_width < target_width || math_height < target_height){ 
		elem.style.fontSize = (parseInt(elem.style.fontSize.split("%")[0]) + 20) + "%";
		MathJax.Hub.Queue(["Rerender",MathJax.Hub,elem], [$.proxy(Editor.scale_tex(elem), this)]);
	}else{
		return;
	}
}

/* 	A function that just changes the X position of the start translation for
	first symbol during alignment.
*/
Editor.getDefaultPosition = function(canvasElementsWidth, default_position){
	var start_position = default_position;
	var x_decrement = 60;
	var canvasWidthFromDefaultPosition = $(Editor.canvas_div)[0].getBoundingClientRect().width - start_position.x;
	var spaceLeft = canvasWidthFromDefaultPosition - canvasElementsWidth;
	if(canvasElementsWidth < canvasWidthFromDefaultPosition && spaceLeft > 80){
		return start_position;
	}else{
		start_position.x -= x_decrement;
		Editor.getDefaultPosition(canvasElementsWidth-x_decrement, start_position);
		return start_position;
	}
}

/* Gets the MathJax rendered SVG from the div, sorts them and canvas segments before
   applying alignment to the symbols on the canvas.
*/
Editor.copy_tex = function(elem){
	dim_tuple = Editor.get_canvas_elements_dimensions();
	var root = document.getElementById("Alignment_Tex").getElementsByClassName("MathJax_SVG")[0].firstChild;
	var rect = root.getBoundingClientRect();
	target_width = (rect.width/rect.height) * dim_tuple.item2;
	target_height = dim_tuple.item2;
	Editor.scale_tex(elem); // scale to fit element on canvas dimensions
	
	// Retrieve symbols from the div element
	var svg_root =  document.getElementById("Alignment_Tex").getElementsByClassName("MathJax_SVG")[0].firstChild;
	var use_tag_array = svg_root.getElementsByTagName("use");
	var rect_tag_array = svg_root.getElementsByTagName("rect");
	use_tag_array = Array.prototype.slice.call(use_tag_array);
	rect_tag_array = Array.prototype.slice.call(rect_tag_array);
	var elements = use_tag_array.concat(rect_tag_array);
	var offset = elements[0].getBoundingClientRect();
	var initial_offset = new Vector2(offset.left, offset.top); 
	
	// Sort the svg and canvas elements
	var x_pos = Editor.sort_svg_positions(elements);
	var canvas_elements = Editor.sort_canvas_elements();
	Editor.print_sorted(x_pos, "use");
	Editor.print_sorted(canvas_elements, "canvas");
	
	// Start transformation process and alignment process.
	var transform_action = new TransformSegments(Editor.segments);
	var default_position = Editor.segments[0].translation;
	if(default_position.x > 100)
		default_position = Editor.getDefaultPosition(dim_tuple.item1, default_position);
	Editor.apply_alignment(x_pos, default_position, canvas_elements, initial_offset);
	transform_action.add_new_transforms(Editor.segments);
	transform_action.Apply();
	Editor.add_action(transform_action);
	x_pos = []; // Clear array
	document.body.removeChild(elem); // Remove elem from document body (Alignment done)
	MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "HTML-CSS"]);
}

/* Identifies elements on canvas to MathJax rendered SVG and then moves to around to 
   look just like the SVG.
   Note: This methods relies on the fact that Canvas segments have their recognition result
         as an instance. This is set in the RenderManager after recognition is gotten. 
         "PenStroke_Object".Text - Recognition result for the PenStroke
*/
Editor.apply_alignment = function(array, default_position, canvas_elements, initial_offset){
	var transformed_segments = new Array(); // holds segment set_ids found
	for(var i = 0; i < array.length; i++){
		var svg_symbol = array[i].item3;
		var text = null;
		if(svg_symbol.getAttribute("href")){
			var unicode = svg_symbol.getAttribute("href").split("-")[1];
			text = String.fromCharCode(parseInt(unicode,16));
			// special case character. Has zero-width space -> Look it up
			if(text == "−")
				text = "-";
			if(text == "¯") // Min doesn't have support for overlays
				text = "-";
		}else
			text = "-"; // rect element is usually a division symbol which is _dash in Min	
		console.log("Tex: " +  text);
		var segments = null; // Segment that matched a given set_id. Can also contain joined strokes
		var index; // Used to index into RenderManager's segment_set_div to get height and width below
		for(var j = 0; j < canvas_elements.length; j++){ // Find the segment on canvas
			var set_id = canvas_elements[j].item3.set_id;
			if(canvas_elements[j].item3.text == text && (!transformed_segments.contains(set_id))){
				console.log("Match found for tex: " + text);
				transformed_segments.push(set_id);
				segments = Editor.get_segment_by_id(set_id);
				canvas_elements.splice(j,1); // remove segment from array
				index = j;
				break;
			}
		}
		if(segments == null)
			continue;
		var joined_segs,joined_width,joined_height,translation_difference1,translation_difference2;
		if(segments.length == 2){ // Joined symbols have one width and height not two
			var dim = Editor.get_joinedSeg_dimensions(segments);
			joined_height = dim.item1;
			joined_width = dim.item2;
			joined_segs = true;
			/*var BBox_rect = RenderManager.segment_set_divs[index].getBoundingClientRect();
			var BBox_rect_vector = new Vector2(parseInt(BBox_rect.left), parseInt(BBox_rect.top));
			translation_difference1 = Vector2.Subtract(segments[0].translation, BBox_rect_vector);
			translation_difference2 = Vector2.Subtract(segments[1].translation, BBox_rect_vector);*/
		}
		// Apply transformation to segment - resize and move
		var svg_symbol_rect = svg_symbol.getBoundingClientRect(); // get svg symbol's position
		var svg_width = svg_symbol_rect.width;
    	var svg_height = svg_symbol_rect.height;
		for(var k = 0; k < segments.length; k++){ 
			var s,s2,in_x,in_y;
			var seg_rect = Editor.get_BBox(segments[k]);
    		var elementOncanvasWidth = seg_rect.width;
    		var elementOncanvasHeight = seg_rect.height;
    		if(joined_segs){
    			s = svg_width/joined_width;
    			s2 = svg_height/joined_height;
    			joined_segs = false;
    		}else{
    			if(elementOncanvasWidth == 0)
    				elementOncanvasWidth = RenderManager.segment_set_divs[index].getBoundingClientRect().width;
    			if(elementOncanvasHeight == 0)
    				elementOncanvasHeight = RenderManager.segment_set_divs[index].getBoundingClientRect().height;
				s = svg_width/elementOncanvasWidth;
				s2 = svg_height/elementOncanvasHeight;
			}	
			
			var scale = new Vector2(s,s2);
			var min_0 = segments[k].world_mins;
			segments[k].resize(min_0,scale);
            segments[k].freeze_transform();
            
    		in_x = parseInt((default_position.x + svg_symbol_rect.left - initial_offset.x).toFixed(2));
			in_y = parseInt((default_position.y + svg_symbol_rect.top - initial_offset.y).toFixed(2));
			var translation = new Vector2(in_x,in_y);
			
			var in_offset = Vector2.Subtract(translation, segments[k].translation);
			segments[k].translate(in_offset);
			segments[k].freeze_transform();
			
			/*if(segments.length == 2 && k == 0){
				console.log("Translation calculated: " + translation);
				console.log("Translation 1: " + translation_difference1);
    			//segments[k].translate(translation_difference1);
    		}else if(segments.length == 2 && k == 1){
    			console.log("Translation 2: " + translation_difference2);
    			//segments[k].translate(translation_difference2);
    		}
			segments[k].freeze_transform();*/
			/*
			// Don't think this code is needed because canvas symbols are scaled to look
			// like the mathjax symbols.
			var collision_offset = Editor.check_collision(segments);
			console.log("Returned Collision Values: " + collision_offset);
			console.log("X collision type: " + collision_type_x + " Y collision type: " + collision_type_y);
			var temp_in_offset = new Vector2(0,0);
			if(collision_type_y == "top")
				temp_in_offset.y = -1 * collision_offset.y;
			if(collision_type_y == "bottom")
				temp_in_offset.y = collision_offset.y;
			if(collision_type_x == "right")
				temp_in_offset.x = collision_offset.x;
			if(collision_type_x == "left")
				temp_in_offset.x = -1 * collision_offset.x;
			//segments[k].translate(temp_in_offset);
			segments[k].freeze_transform();*/
			segments[k].already_aligned = true;
        }
	}
}

Editor.check_collision = function(segments){
	var offset = new Vector2(0,0);
	var x_offset = y_offset = 0;
	collision_type_x = collision_type_y = "";
	var segs = Editor.segments.slice(0, Editor.segments.length);
	for(var i = 0; i < segs.length; i++){
		if(segs[i].already_aligned){
			var seg_rect = Editor.get_seg_dimensions(segments);
			var seg_rect_size = Vector2.Subtract(seg_rect.item2, seg_rect.item1);
			var set_id = segs[i].set_id;
			var aligned_seg_rect = Editor.get_seg_dimensions(Editor.get_segment_by_id(set_id));
			var aligned_seg_rect_size = Vector2.Subtract(aligned_seg_rect.item2, aligned_seg_rect.item1);
			for(var k = 0; k < segs.length; k++){
        		if(segs[k].set_id == set_id)
            		segs.splice(k,0);
    		}
    		var seg_rect_left = seg_rect.item1.x,
    			seg_rect_top = seg_rect.item1.y,
    			seg_rect_right = seg_rect_size.x + seg_rect_left,
    			seg_rect_bottom = seg_rect_size.y + seg_rect_top,
    			aligned_seg_rect_left = aligned_seg_rect.item1.x,
    			aligned_seg_rect_top = aligned_seg_rect.item1.y,
    			aligned_seg_rect_right = aligned_seg_rect_size.x + aligned_seg_rect_left,
    			aligned_seg_rect_bottom = aligned_seg_rect_size.y + aligned_seg_rect_top;
    		console.log("Segment being inserted -> R:"+seg_rect_right+" L:"+	seg_rect_left+" T:"+ seg_rect_top+" B:"+seg_rect_bottom);
    		console.log("Segment already inserted -> R:"+aligned_seg_rect_right+" L:"+	aligned_seg_rect_left+" T:"+ aligned_seg_rect_top+" B:"+aligned_seg_rect_bottom);
    		if(seg_rect_right > aligned_seg_rect_right && seg_rect_left < aligned_seg_rect_right){ // Right Insertion
				x_offset = aligned_seg_rect_right - seg_rect_left;
				collision_type_x = "right";
			}
			if(seg_rect_right < aligned_seg_rect_right && seg_rect_right > aligned_seg_rect_left){ // Left Insertion
				x_offset = seg_rect_right - aligned_seg_rect_left;
				collision_type_x = "left";
			}
			if(seg_rect_top < aligned_seg_rect_top && seg_rect_bottom > aligned_seg_rect_top){ // Top Insertion
				y_offset = seg_rect_bottom - aligned_seg_rect_top;
				collision_type_y = "top";
			}
			if(seg_rect_bottom > aligned_seg_rect_bottom && seg_rect_top < aligned_seg_rect_bottom){ // Bottom Insertion
				y_offset = aligned_seg_rect_bottom - seg_rect_top;
				collision_type_y = "bottom";
			}
		}
	}
	offset.x = x_offset;
	offset.y = y_offset;
	return offset;
}

Editor.get_seg_dimensions =  function(set_segments){
	var mins = set_segments[0].worldMinDrawPosition();
    var maxs = set_segments[0].worldMaxDrawPosition();
            
	// Find the extent of the symbol (BB)
	for(var j = 1; j < set_segments.length; j++){
		var seg_min = set_segments[j].worldMinDrawPosition();
		var seg_max = set_segments[j].worldMaxDrawPosition();
		
		if(seg_min.x < mins.x)
			mins.x = seg_min.x;
		if(seg_min.y < mins.y)
			mins.y = seg_min.y;
		
		if(seg_max.x > maxs.x)
			maxs.x = seg_max.x;
		if(seg_max.y > maxs.y)
			maxs.y = seg_max.y;
	}
	return new Tuple(mins, maxs);
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

// Returns the BBox of an element
Editor.get_BBox = function(seg){
	var elem_rect;
	if(seg.constructor == SymbolSegment)
		elem_rect = seg.element.getBoundingClientRect();
	else
		elem_rect = seg.inner_svg.getBoundingClientRect();
	return elem_rect;
}

/* Sorts the render svg from mathjax from left to right and any segment whose x coordinate
   collides with another is sorted from top to bottom. Just compares the tops.
*/
Editor.sort_svg_positions = function(array){
	var x_pos = new Array(); // all x coordinates
	var current_x, current_y;
	for(var i = 0; i < array.length; i++){
		current_x = parseInt(array[i].getBoundingClientRect().left.toFixed(2));
		current_y = parseInt(array[i].getBoundingClientRect().top.toFixed(2));
		var tuple_x = new Tuple(current_x,current_y, array[i]);
		x_pos.push(tuple_x);
	}
	x_pos.sort(Editor.compare_numbers);
	return x_pos;
}

Editor.print_sorted = function(array, type){
	for(var l = 0; l < array.length; l++){
		if(type == "use" && array[l].item3.tagName == "use"){
			var unicode = array[l].item3.getAttribute("href").split("-")[1];
			var text = String.fromCharCode(parseInt(unicode,16));
			console.log("Use tag at: " + l + " is: " + text);
		}else if(type == "use" && array[l].item3.tagName == "rect"){
			console.log("Use tag at: " + l + " is: -");
		}else{
			console.log("Canvas Segments at: " + l + " is: " +  array[l].item3.text);
		}
	}
}

// Sorts all svg elements by x and y
Editor.sort_canvas_elements = function(){
	var sorted = new Array();
	var sorted_set_ids = new Array();
	var current_x, current_y;
	for(var i = 0; i < Editor.segments.length; i++){
		var seg = Editor.segments[i];
		var seg_rect = Editor.get_BBox(seg);
		current_x = parseInt(seg_rect.left.toFixed(2));
		current_y = parseInt(seg_rect.top.toFixed(2))
		if(sorted_set_ids.contains(seg.set_id)){
			var last_element = sorted.pop();
			if(last_element.item1 > current_x) // use lowest x
				sorted.push(new Tuple(current_x,current_y,seg));
			else
				sorted.push(new Tuple(last_element.item1,last_element.item2,seg));
		}else{
			sorted.push(new Tuple(current_x,current_y,seg));
			sorted_set_ids.push(seg.set_id);
		}
	}
	sorted.sort(Editor.compare_numbers);
	return sorted;
}
// Compares passed in tuples by sorting by x and y
Editor.compare_numbers = function(a, b){
	if (a.item1 == b.item1 && a.item2 == b.item2) return 0;
  	else if (a.item1 == b.item1) return a.item2 > b.item2 ? 1 : -1;
  	else return a.item1 > b.item1 ? 1 : -1;
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
    var action = new DeleteSegments(Editor.selected_segments);
    action.Apply();
    Editor.add_action(action);
    Editor.clearSelectedSegments();
}

/**
   Clear the selected segments from the canvas and then
   set the editor mode to the proper selection method.
**/
Editor.clearSelectedSegments = function(){
	Editor.delete_segments = true;
    Editor.clear_selected_segments();    
    RenderManager.render();
    Editor.delete_segments = false;
    console.log(Editor.selection_method);
    Editor.state = EditorState.ReadyToRectangleSelect;
}

Editor.typeTool = function()
{
    Editor.selected_segments.length = 0;
    Editor.current_stroke = null;
    Editor.clearButtonOverlays();

    Editor.button_states[Buttons.Pen].setSelected(true);
    Editor.button_states[Buttons.Rectangle].setSelected(false);
    //Editor.button_states[Buttons.Stroke].setSelected(false);
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