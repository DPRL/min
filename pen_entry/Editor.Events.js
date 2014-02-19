/* 
* This file is part of Min.
* 
* Min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* Min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with Min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright 2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	This class contains some of the logic and events for the Editor as a whole. 
        
        Events are defined for the following:
			onImageLoad (browsers supporting FileReader only)
        Methods that change the state of the editor are:
               1. groupTool - Adds selected segments to one segment group.
               2. deleteTool
               3. typeTool
               4. relabel
               5. clear
        Other methods:
               1. align - Align objects on the canvas and populate the query bar with a LaTeX
               string.
               2. search - submit the LaTeX query to a search engine.
    		      etc
*/
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

// Called when Min is starting up. Just calls other methods
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
    	$(Editor.canvas_div).off(Editor.current_mode.event_strings.onDown, Editor.current_mode.stopTextInput);
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
/*
	Performs alignment to the segments on the canvas, sends request to Draculae
*/
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
	    if(t.item1.symbols.length == 0){
		    sb.append("x\" min=\"");
            }	
	    else{
		    var latex = RecognitionManager.symbol_to_latex[ t.item1.symbols[0] ];
		    if(latex == null){
			    latex = RecognitionManager.symbol_to_latex[RecognitionManager.unicode_to_symbol[ t.item1.symbols[0] ]];
			    console.log("latex: " + latex);
			    if(latex == null)
				    sb.append("X").append("\" min=\""); // symbols not in our generic table
			    else
				    sb.append(latex).append("\" min=\"");
		    }
	            else
			    sb.append(latex).append("\" min=\"");
	    }
	
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
                tex_math = "";
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
                
                // Divs used for alignment
                var outer_div = document.createElement("div");
                outer_div.setAttribute("id","outer_div");
                var middle_div = document.createElement("div");
                middle_div.setAttribute("id","middle_div");
                
                // Main div with content in it
                var elem = document.createElement("div");
				elem.setAttribute("id","Alignment_Tex");
				elem.style.visibility = "visible";
				elem.style.fontSize = "500%";
				elem.innerHTML = '\\[' + tex_math + '\\]'; 	// So MathJax can render it
				
				middle_div.appendChild(elem);
				outer_div.appendChild(middle_div);
				Editor.canvas_div.appendChild(outer_div);
	
				// Change rendered to SVG and have MathJax display it
				MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "SVG"]);
    			MathJax.Hub.Queue(["Rerender", MathJax.Hub,elem], [function(){ 
    				MathJax.Hub.Queue(["Typeset",MathJax.Hub,elem], [Editor.copy_tex,elem,outer_div]);
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
Editor.get_canvas_elements_dimensions = function()
{
	var max_height = 0;
	var max_width = 0;
	var min_height = 9999;
	var min_width = 9999;
	for(var i = 0; i < RenderManager.segment_set_divs.length; i++){
		if(RenderManager.segment_set_divs[i].style.visibility == "visible"){
			var h = RenderManager.segment_set_divs[i].getBoundingClientRect();
			if(h.bottom > max_height)
				max_height = h.bottom;
			if(h.top < min_height)
				min_height = h.top;
			if(h.right > max_width)
				max_width = h.right;
			if(h.left < min_width)
				min_width = h.left;	
		}	
	}
	//console.log("Computed width: " +  (max_width - min_width) + "  height: " + (max_height - min_height));
	return new Tuple((max_width - min_width), (max_height - min_height));
}

/*
	Scale the SVG to fit the canvas by decreasing its font size by 5%
*/
Editor.scale_tex = function(elem){
	var root = document.getElementById("Alignment_Tex").getElementsByClassName("MathJax_SVG")[0].firstChild;
	var rect = root.firstChild.getBoundingClientRect();
	var math_width = rect.width;
	var math_height = rect.height;
	if(math_width > Editor.canvas_width || math_height > Editor.canvas_height){
		elem.style.fontSize = (parseInt(elem.style.fontSize.split("%")[0]) - 5) + "%";
		MathJax.Hub.Queue(["Rerender",MathJax.Hub,elem], [$.proxy(Editor.scale_tex(elem), this)]);
	}else{
		return;
	} 
}

/* Gets the MathJax rendered SVG from the div, sorts them and canvas segments before
   applying alignment to the symbols on the canvas.
*/
Editor.copy_tex = function(elem, outer_div)
{
	var dim_tuple = Editor.get_canvas_elements_dimensions(); // need to scale to fit canvas
	var root = document.getElementById("Alignment_Tex").getElementsByClassName("MathJax_SVG")[0].firstChild;
	var rect = root.firstChild.getBoundingClientRect();
	var target_width = (rect.width / rect.height) * dim_tuple.item2;
	var target_height = dim_tuple.item2; 
	
	// Calculate scale and append to g element of MathJax
	var scale = new Vector2( (target_width / rect.width), (target_height / rect.height) );
	var group = root.getElementsByTagName("g")[0]; // First group tag groups all MathJax SVGs
	group.setAttribute("transform", "scale("+scale.x+","+scale.y+") matrix(1 0 0 -1 0 0)");
	
	var root = document.getElementById("Alignment_Tex").getElementsByClassName("MathJax_SVG")[0].firstChild;
	group = root.getElementsByTagName("g")[0];
	elem.style.width = group.getBoundingClientRect().width + "px";
	
	// Make sure it fits the canvas
	Editor.scale_tex(elem); // Just reduces the font size by 5%
	root = document.getElementById("Alignment_Tex").getElementsByClassName("MathJax_SVG")[0].firstChild;
	
	// Retrieve symbols from the div element in previous routine
	var use_tag_array = root.getElementsByTagName("use");
	var rect_tag_array = root.getElementsByTagName("rect");
	use_tag_array = Array.prototype.slice.call(use_tag_array);
	rect_tag_array = Array.prototype.slice.call(rect_tag_array);
	var elements = use_tag_array.concat(rect_tag_array);
	
	// Sort the svg and canvas elements
	var canvas_elements = Editor.sort_canvas_elements();
	x_pos = Editor.group_svg([], root.firstChild);
	x_pos.sort(Editor.compare_numbers);
	Editor.print_sorted(x_pos, "use");
	Editor.print_sorted(canvas_elements, "canvas");	
	
	// Start transformation process and alignment process.
	var transform_action = new TransformSegments(Editor.segments);
	Editor.apply_alignment(x_pos, canvas_elements);
	transform_action.add_new_transforms(Editor.segments);
	transform_action.Apply();
	Editor.add_action(transform_action);
	x_pos = [];
	Editor.canvas_div.removeChild(outer_div);
	MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "HTML-CSS"]);
}

// Creates a square root horizontal line and appends it to RenderManager's div for the sqrt
Editor.create_segment = function(x_pos){
	var sqrt;
	var horizontal_bar;
	var found = false;
	var data = String.fromCharCode(parseInt("221A",16));
	var segs = x_pos.slice(0, x_pos.length);
	for(var i = 0; i < x_pos.length; i++){
		if(x_pos[i].item3.getAttribute("href") == "#MJMAIN-221A"){
			sqrt = x_pos[i].item3.getBoundingClientRect();
			for(var j = 0; j < segs.length; j++){
				var rect = segs[j].item3.getBoundingClientRect();
				if(rect.left < sqrt.right && segs[j].item3.tagName == "rect" && rect.top > sqrt.top){
					found = true;
					horizontal_bar = segs[j];
					break;
				}
			}
		}
		if(found)
			break;
	}
	
	if(found){
		// copy rect element and put in RenderManager div
		for(var k = 0; k < RenderManager.segment_set_divs.length; k++){
			if(RenderManager.segment_set_divs[k].getAttribute("data-recognition") == data){
				var BBox_rect = RenderManager.segment_set_divs[k].getBoundingClientRect();
				var clone = horizontal_bar.item3.cloneNode(true);
				clone.removeAttribute("x");
				clone.removeAttribute("y");
				clone.removeAttribute("stroke");
				clone.setAttribute("fill", Editor.segment_fill);
				var x = BBox_rect.right;
				var y = BBox_rect.top;
				clone.setAttribute("transform", "translate(" + x + "," + y + ")");
				RenderManager.segment_set_divs[k].getElementsByTagName("g")[0].appendChild(clone);
			}
		}
		
	}
}

/* Joins SVG segments as one because MathJax splits some of them up sometimes
 	Mainly groups elements with href #MJMAIN-AF
*/
Editor.group_svg = function(elements, g){
	
	var children = g.childNodes;
	var notcontains_g = g.getElementsByTagName("g");
	if(notcontains_g.length == 0){ // Base case reached	
		for(var j = 0; j < children.length; j++){
				if(children[j].getAttribute("width") == "0"){
					continue;  	// Don't add it to the elements array. Not needed
				}
				if(children[j].getAttribute("href") == "#MJMAIN-AF" ){ // Usually grouped together
					var parent_rect = g.getBoundingClientRect();
					var rect = children[j].getBoundingClientRect();
					var tuple_x = new Tuple(Math.round(rect.left), Math.round(rect.top), children[j], true, parent_rect.width, parent_rect.height);
					elements.push(tuple_x);
					break;
				}else{
					var rect = children[j].getBoundingClientRect();
					var tuple_x = new Tuple(Math.round(rect.left), Math.round(rect.top), children[j], false);
					elements.push(tuple_x);
				}
		}
		return elements;
		
	}else{ // More g tags to explore
		for(var i = 0; i < children.length; i++){
				if( (children[i].tagName == "use" || children[i].tagName == "rect") && children[i].getAttribute("width") != "0"){
					if(children[i].getAttribute("href") == "#MJMAIN-AF" ){
						var parent_rect = g.getBoundingClientRect();
						var rect = children[i].getBoundingClientRect();
						var tuple_x = new Tuple(Math.round(rect.left), Math.round(rect.top), children[i], true, parent_rect.width, parent_rect.height);
						elements.push(tuple_x);
						break;
						
					}else{
						var rect = children[i].getBoundingClientRect();
						var tuple_x = new Tuple(Math.round(rect.left), Math.round(rect.top), children[i], false);
						elements.push(tuple_x);
					}
				}else
					elements = Editor.group_svg(elements, children[i]);
		}
	
	}
	return elements;
}


/* Identifies elements on canvas to MathJax rendered SVG and then moves to around to 
   look just like the SVG.
   Note: This methods relies on the fact that Canvas segments have their recognition result
         as an instance. This is set in the RenderManager after recognition is gotten. 
         "PenStroke_Object".Text - Recognition result for the PenStroke
*/
Editor.apply_alignment = function(array, canvas_elements)
{
	var sqrt_text = String.fromCharCode(parseInt("221A",16));
	var transformed_segments = new Array(); // holds segment set_ids found
	for(var i = 0; i < array.length; i++){
		var svg_symbol = array[i].item3;
		var text = null;
		if(svg_symbol.getAttribute("href")){
			var unicode = svg_symbol.getAttribute("href").split("-")[1].toLowerCase();
			// Check our symbol table. If not there just convert the unicode
			var result = RecognitionManager.unicode_to_symbol["&#x"+unicode+";"];
			if(result == null)
				text = String.fromCharCode(parseInt(unicode,16));
			else
				text = result;
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
		
		// Apply transformation to segment - resize and move
		var size_f = new Vector2(0,0);
		var svg_symbol_rect = svg_symbol.getBoundingClientRect();
		if(array[i].item4){
			size_f.x = array[i].item5;
			size_f.y = array[i].item6;
		}else{
			size_f = new Vector2(svg_symbol_rect.width, svg_symbol_rect.height);
		}
		console.log("Size_f: " + size_f);
		//Editor.draw_rect(svg_symbol_rect);
		for(var k = 0; k < segments.length; k++){ 
			
			if(!segments[k].align_size){
				var rect = segments[k].inner_svg.firstChild.getBBox();
				if(rect.width == 0)
					rect.width = segments[k].world_mins.x;
				if(rect.height == 0)
					rect.height = segments[k].world_mins.y;
				rect.width += 12;
				var scale = new Vector2(size_f.x/ rect.width, size_f.y / rect.height);
				segments[k].scale = scale.clone();
				segments[k].align_size = true;
			}else{
			
				var new_mins = segments[k].worldMinDrawPosition();
				var new_maxs = segments[k].worldMaxDrawPosition();
				var min_0 = segments[k].world_mins;
				var max_0 = segments[k].world_maxs;
				if(!Vector2.Subtract(max_0, min_0).equals(Vector2.Subtract(new_maxs, new_mins))){
					min_0 = new_mins;
					max_0 = new_maxs;
				}
				min_0.x -= 6;

				var size_0 = Vector2.Subtract(max_0, min_0);
		
				if(size_0.y == 0)
					size_0.y = min_0.y;
				if(size_0.x == 0)
					size_0.x = min_0.x;
				var scale = new Vector2(size_f.x / size_0.x, size_f.y / size_0.y);
		
				// Scale segment[k]
				segments[k].resize(min_0, scale);
				segments[k].freeze_transform();
			
			}
			
			var translation = new Vector2(svg_symbol_rect.left, svg_symbol_rect.top);
			
			// Apply new translation segment[k]
			var in_offset = Vector2.Subtract(translation, segments[k].translation);
			segments[k].translate(in_offset);
			segments[k].freeze_transform();
			
			// Reset the world_min and world_max variables to reflect right dimensions
			
    		segments[k].world_mins = segments[k].worldMinDrawPosition();
    		segments[k].world_maxs = segments[k].worldMaxDrawPosition();
    		
        }
        if(tex_math.search("sqrt") != -1 && segments[0].text == sqrt_text){
				Editor.create_segment(array);
		}
	}
}

// Used for debugging alignment. Just draws a BBox
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
	div.style.backgroundColor = "red";
	div.style.opacity = "0.4";
}

/*
	A function that returns the world min and max position for joined segments like the 
	the plus symbol.
*/
Editor.get_seg_dimensions =  function(set_segments)
{
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

// Returns the BBox of an element
Editor.get_BBox = function(seg)
{
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
Editor.sort_svg_positions = function(array)
{
	var x_pos = new Array(); // all x coordinates
	var current_x, current_y;
	for(var i = 0; i < array.length; i++){
		current_x = parseInt(array[i].getBoundingClientRect().left.toFixed(2));
		current_y = parseInt(array[i].getBoundingClientRect().top.toFixed(2));
		var tuple_x = new Tuple(current_x,current_y, array[i]);
		x_pos.push(tuple_x);
	}
	x_pos.sort(Editor.compare_numbers);
	
	// Remove zero width elements
	for(var i = 0; i < x_pos.length; i++){
		if(x_pos[i].item3.getAttribute("width") == "0"){
			x_pos.splice(i, 1);
		}
		
	}
	return x_pos;
}

// Prints the sorted SVG and canvas segments
Editor.print_sorted = function(array, type)
{
	var s;
	if(type == "use")
		s = "Use tag: ";
	else
		s = "Canvas tag: ";
	for(var l = 0; l < array.length; l++){
		if(type == "use" && array[l].item3.tagName == "use"){
			var unicode = array[l].item3.getAttribute("href").split("-")[1];
			var text = String.fromCharCode(parseInt(unicode,16));
			s += text;
		}else if(type == "use" && array[l].item3.tagName == "rect"){
			s += "-";
		}else{
			s += array[l].item3.text;
		}
	}
	console.log(s);
}

// Sorts all svg elements by x and y
Editor.sort_canvas_elements = function()
{
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
Editor.compare_numbers = function(a, b)
{
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
    Editor.clear_selected_segments();    
    RenderManager.render();
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
   cb is a callback to call after the Correction hides itself.  
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
  This method(ParseImage) is complicated so let me explain what's going on:
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
    if(file_list[0].type == null)
    	return;
    else if(file_list[0].type == "text/plain")
		PermEvents.parse_text_file(file_list[0]);
	else
    	Editor.ParseImage(file_list[0]);
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

/* Methods that performs the search on expression on canvas.
	Retrieves the TeX and searches with it
*/
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
    //window.open(url + searchString);
	window.location = url + searchString;
}

Editor.goDPRL = function ()
{
    window.location = "http://www.cs.rit.edu/~dprl"
}

// Shows tool tips
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
