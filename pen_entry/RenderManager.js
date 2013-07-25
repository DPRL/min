// IMPORTANT NOTE:
//
// The function that controls which objects are rendered in which layer is controlled
// by a switch statement in the RenderManager.render_set_field() function.a
//
// (rlaz)

/*
  5 layers:

  0 pen strokes
  1 equation image blobs
  2 typed text
  3 math recognition layer
  4 tools layer
*/

function RenderManager()
{
}

RenderManager.initialize = function(in_width, in_height, in_layers)
{
    RenderManager.width = in_width;
    RenderManager.height = in_height;
    RenderManager.layer_count = in_layers;
    
    RenderManager.segments = new Array();
    
    RenderManager.bounding_box = document.getElementById("bounding_box");
    RenderManager.bounding_box.style.visibility = "hidden";
    RenderManager.selection_box = document.getElementById("selection_rectangle");
    RenderManager.selection_box.style.visibility = "hidden";
    
    //  build a set of divs we can use for segment sets
    RenderManager.segment_set_divs = new Array();
}

// render the helper grahics (bounding box, segments ets, rectangle select etc)
RenderManager.render_tools_layer = function()
{
	RenderManager.render_set_field(4);

    // Show selection bounding box.
    if(Editor.selected_bb != null)
        RenderManager.render_bb(Editor.selected_bb, 4);
    else
        RenderManager.bounding_box.style.visibility = "hidden";

    
    // render selection rectangle
    if(Editor.start_rect_selection != null && Editor.end_rect_selection != null)
    {
        RenderManager.render_selection_box(Editor.start_rect_selection, Editor.end_rect_selection, 4);
    }
    else
        RenderManager.selection_box.style.visibility = "hidden";
    
    // render stroke select
    if(Editor.state == EditorState.StrokeSelecting)
    {
        // render
        var context = Editor.contexts[0];
        context.strokeStyle = Editor.stroke_select_color;
        context.lineWidth = Editor.stroke_select_width;
        context.lineCap = "round";
        context.lineJoin = "round";

        var point_a = Editor.previous_stroke_position;
        var point_b = Editor.mouse_position;
        
        
        context.beginPath();
        context.moveTo(point_a.x, point_a.y);
        context.lineTo(point_b.x, point_b.y);
        context.stroke();
        context.closePath();
    }
}

RenderManager.render = function()
{    
    var setid = -1;
    var all_same_setid = true;
    //var infobar = document.getElementById( "infobar" );
    
    for(var k = 0; k < Editor.segments.length; k++)
    {
        var seg = Editor.segments[k];
        
        // // Delete segment if it's an uninitialized ImageBlob
        if(seg.initialized == false && !seg.mins){
            Editor.segments.splice(k, 1);
            continue;
        }
            
        
        if(Editor.segment_selected(seg)) {
            if ( setid == -1 ) {
                setid = seg.set_id;
            } else if ( seg.set_id != setid ) {
                all_same_setid = false;
            }
            seg.render_selected();
        } else {
            seg.render();
        }
    }
    RenderManager.render_tools_layer();
}

RenderManager.render_selection_box = function(in_min, in_max, in_context_id)
{
    var left = Math.min(in_min.x, in_max.x);
    var right = Math.max(in_min.x, in_max.x);

    var top = Math.min(in_min.y, in_max.y);
    var bottom = Math.max(in_min.y, in_max.y);
    
    RenderManager.selection_box.style.top = top + "px";
    RenderManager.selection_box.style.left = left + "px";
    RenderManager.selection_box.style.width =(right - left) + "px";
    RenderManager.selection_box.style.height = (bottom - top) + "px";
    RenderManager.selection_box.style.visibility = "visible";
}

RenderManager.render_bb = function(in_bb, in_context_id)
{
    // rlaz: Modified to clean up appearance of selection boxes.
    RenderManager.bounding_box.style.top = in_bb.render_mins.y -3 + "px";
    RenderManager.bounding_box.style.left = in_bb.render_mins.x -3  + "px";
    RenderManager.bounding_box.style.width = (in_bb.render_maxs.x - in_bb.render_mins.x)  + "px";
    RenderManager.bounding_box.style.height = (in_bb.render_maxs.y - in_bb.render_mins.y) + "px";
    RenderManager.bounding_box.style.visibility = "visible";
    
    return;
}

RenderManager.render_bb_control_point = function(in_x, in_y, in_context)
{
    in_context.fillStyle = Editor.control_point_fill_color;
    in_context.strokeStyle = Editor.control_point_line_color;
    
    in_context.lineWidth = Editor.control_point_line_width;
    
    in_context.beginPath();
    in_context.arc(in_x, in_y, Editor.control_point_radius, 0, Math.PI * 2, true);
    in_context.closePath();
    in_context.fill();
    in_context.stroke();
}

// RLAZ: New method to colorize the bounding boxes for OCR results
// based on state.
RenderManager.colorOCRbbs = function(classname) {
    for (var i = 0; i < RenderManager.segment_set_divs.length; i++) {
        var segment = RenderManager.segment_set_divs[i];
        RenderManager.segment_set_divs[i].className = classname;
    }
}

RenderManager.render_set_field = function(in_context_id)
{
    // Uses fact that primitive are sorted according to set (segment)
    // identifiers.
    var set_segments = new Array();

    Editor.segments.push(null);    // add null pointer so we can easily render last set in list
    var set_index = 0;
    for(var k = 0; k < Editor.segments.length; k++)
    {
        var seg = Editor.segments[k];
        if(set_segments.length == 0) {
            set_segments.push(seg);
        }
        else if(seg == null || seg.set_id != set_segments[0].set_id)
        {
            // We have found the next symbol (primitive segment).
            var is_visible = set_segments[0].expression_id == Editor.current_expression_id;
            var mins = set_segments[0].worldMinDrawPosition();
            var maxs = set_segments[0].worldMaxDrawPosition();
            
            // Find the extent of the symbol (BB)
            for(var j = 1; j < set_segments.length ; j++)
            {
                var seg_min = set_segments[j].worldMinDrawPosition();
                var seg_max = set_segments[j].worldMaxDrawPosition();

                is_visible = is_visible && set_segments[j].expression_id == Editor.current_expression_id;
                
                if(seg_min.x < mins.x)
                    mins.x = seg_min.x;
                if(seg_min.y < mins.y)
                    mins.y = seg_min.y;
                
                if(seg_max.x > maxs.x)
                    maxs.x = seg_max.x;
                if(seg_max.y > maxs.y)
                    maxs.y = seg_max.y;
            }
            var rect_size = Vector2.Subtract(maxs, mins);

            // Generate divs to represent each symbol.
            if(RenderManager.segment_set_divs.length == set_index)
            {
                var div = document.createElement('div');

                div.className = Editor.current_mode.segment_style_class;
                div.style.visibility='hidden';
                
                Editor.canvas_div.appendChild(div);
                RenderManager.segment_set_divs.push(div);
                RenderManager.new_div = true; // Signals when to create SVG or update it
            }


            // Add the new div to the RenderManager data structures,
            // set visiblity and BB properties.
            var ss_div = RenderManager.segment_set_divs[set_index++];
            ss_div.style.visibility = "visible";
            ss_div.style.left = mins.x + "px";
            ss_div.style.top = mins.y + "px";
            ss_div.style.width = rect_size.x + "px";
            ss_div.style.height = rect_size.y + "px";
            $(ss_div).toggle(is_visible);

            // Recognition result/label
            var recognition_result = RecognitionManager.getRecognition(set_segments[0].set_id);
            if(recognition_result != null && set_segments[0].constructor != SymbolSegment && set_segments[0].constructor != TeX_Input)
            {
                // Lines 
                var symbol = RecognitionManager.symbol_name_to_unicode[recognition_result.symbols[0]];
                var tex;
                if(symbol != undefined)
                    tex = symbol;
                else
                    tex = recognition_result.symbols[0];
                /*console.log("Length of set_segments is: " + set_segments.length + " tex: " + tex);
                for(var p = 0; p < set_segments.length; p++)
                	set_segments[p].inner_svg.setAttribute("opacity","0");*/
                if(RenderManager.new_div && (!set_segments[0].text)){
					for(var w = 0; w < set_segments.length; w++)
						set_segments[w].text = tex;
					RenderManager.new_div = false;
					RenderManager.start_display(ss_div,tex);
				}else{
					if(set_segments[0].text == tex && ss_div.firstChild)
						RenderManager.render_svg(ss_div);// Update the SVG on BBox	
					else{
						for(var z = 0; z < set_segments.length; z++)
							set_segments[z].text = tex;
						if(ss_div.firstChild)
							ss_div.removeChild(ss_div.firstChild);
						RenderManager.start_display(ss_div,tex);
					}	
				}
            }
            else {
                // Typed characters ('SymbolSegments')
                //ss_div.innerHTML = Editor.segments[k-1].text; //seg.text;
                //ss_div.style.fontSize = (rect_size.y * 1.25) + "px"; // scale font up to fill more of bb
                //ss_div.style.lineHeight = rect_size.y + "px";
            }

            // 'Empty' list of primitives for next object, add current object to list.
            // Not sure why the length is being set to zero here.
            set_segments.length = 0;
            set_segments.push(seg);
        }
        else
            set_segments.push(seg);
    }
    Editor.segments.pop();

    for(var k = set_index; k < RenderManager.segment_set_divs.length; k++)
    {
        RenderManager.segment_set_divs[k].style.visibility = "hidden";
        RenderManager.segment_set_divs[k].innerHTML = "";
    }
}

/* Inserts Tex into a DOM element and calls MathJax to render it. When MathJax is done,
	it calls insert_tex which inserts the tex into the BBox of the symbol on the canvas
*/
RenderManager.start_display = function(ss_div,tex){
	var elem = document.createElement("div");
	elem.setAttribute("id","RenderManager_Tex");
	elem.style.visibility = "visible"; 		// Hide the element
	elem.style.position = "absolute";
	elem.style.fontSize = "500%";
	elem.innerHTML = '\\[' + tex + '\\]'; 	// So MathJax can render it
	document.body.appendChild(elem);
	var index = RenderManager.segment_set_divs.length;
	MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "SVG"],
		["Typeset",MathJax.Hub,elem],[RenderManager.insert_teX,elem,ss_div,index]);
}

// Adjusts the SVG recognition result to fit the RenderManager's Box
// Note: Subtracted 2 from the BBox width because the SVG were being slightly cut off
// 		 It's not an error just that the BBox width is small
RenderManager.render_svg = function(BBox_div){
	var element,x_offset,y_offset;
	var svg_root = BBox_div.firstChild;
	var inner_svg = svg_root.getElementsByTagName("g")[0];
	inner_svg.removeAttribute("transform");
	var svg_width = parseInt(inner_svg.getBoundingClientRect().width);
	var svg_height = parseInt(inner_svg.getBoundingClientRect().height);
	var scale_x = (parseInt(BBox_div.getBoundingClientRect().width)-2)/svg_width;
	var scale_y = parseInt(BBox_div.getBoundingClientRect().height)/svg_height;
	inner_svg.setAttribute("transform", "scale("+scale_x+","+scale_y+")");
	var BBox_top = $(BBox_div).offset().top;
	var BBox_left = $(BBox_div).offset().left;
	element_height = $(inner_svg).offset().top;
	element_width = $(inner_svg).offset().left;
	x_tran = parseFloat(inner_svg.getAttribute("transform").split(" ")[0].split("(")[1].split(",")[0]);
	y_tran = parseFloat(inner_svg.getAttribute("transform").split(" ")[0].split("(")[1].split(",")[1]);
	if(parseFloat(BBox_top-element_height) != 0){
		y_offset = parseFloat(BBox_top-element_height);
	}
	if(parseFloat(BBox_left - element_width) != 0){
		x_offset = parseFloat(BBox_left - element_width);
	}
	inner_svg.setAttribute("transform", "translate("+(x_offset)+","+(y_offset)+") scale("+scale_x+","+scale_y+")");
}

// Inserts the SVG into the RenderManager's BBox for the symbol
// Note: Subtracted 2 from the BBox width because the SVG were being slightly cut off
// 		 It's not an error just that the BBox width is small
RenderManager.insert_teX = function(elem,BBox_div,index)
{
    var svg_width,svg_height,path_tag,rect_tag,x_offset,y_offset,element_height,
    	element_width,old_bottom;
	var svg_root = document.getElementById("RenderManager_Tex").getElementsByClassName("MathJax_SVG")[0].firstChild;
	var use_tag_array = svg_root.getElementsByTagName("use");
	var rect_tag_array = svg_root.getElementsByTagName("rect");
	use_tag_array = Array.prototype.slice.call(use_tag_array);
	rect_tag_array = Array.prototype.slice.call(rect_tag_array);
	var element = use_tag_array.concat(rect_tag_array); // should be only one symbol
    var root_svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    root_svg.setAttribute("class", "RenderManager "+index);
    root_svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    root_svg.setAttribute("style", "position: absolute; left: 0px; top: 0px;");
    root_svg.setAttribute("width", "100%");
    root_svg.setAttribute("height", "100%");
    root_svg.setAttribute("opacity", "0.6");
    var inner_svg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    for(var i = 0; i < element.length; i++){
    	var temp_root = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    	temp_root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    	temp_root.setAttribute("visibility", "hidden");
    	var offset = element[i].getBoundingClientRect();
		if(element[i].tagName.toString() == "use"){
			path_tag = document.getElementById(element[i].getAttribute("href").split("#")[1]).cloneNode(true);
			path_tag.setAttribute("visibility","visible");
			temp_root.appendChild(path_tag);
			document.body.appendChild(temp_root);
			var path_rect = path_tag.getBoundingClientRect();
			var elem_rect = element[i].getBoundingClientRect();
			var path_scale_x = elem_rect.width/path_rect.width;
			var path_scale_y = elem_rect.height/path_rect.height;
			if(old_bottom && old_bottom != parseInt(offset.bottom)){
				path_tag.setAttribute("transform", "translate("+offset.left+","+old_bottom+") scale("+path_scale_x+","+path_scale_y+") matrix(1 0 0 -1 0 0)");
			}else{
				path_tag.setAttribute("transform", "translate("+offset.left+","+offset.bottom+") scale("+path_scale_x+","+path_scale_y+") matrix(1 0 0 -1 0 0)");
				old_bottom = parseInt(offset.bottom);
			}
			inner_svg.appendChild(path_tag);
			document.body.removeChild(temp_root);
		}else{
			rect_tag = element[i].cloneNode(true);
			rect_tag.setAttribute("visibility","visible");
			temp_root.appendChild(rect_tag);
			document.body.appendChild(temp_root);
			var path_rect = rect_tag.getBoundingClientRect();
			var elem_rect = element[i].getBoundingClientRect();
			var path_scale_x = elem_rect.width/path_rect.width;
			var path_scale_y = elem_rect.height/path_rect.height;
			path_tag.setAttribute("transform", "translate("+offset.left+","+offset.bottom+") scale("+path_scale_x+","+path_scale_y+") matrix(1 0 0 -1 0 0)");
			rect_tag.removeAttribute("x");
			rect_tag.removeAttribute("y");
			inner_svg.appendChild(rect_tag);
			document.body.removeChild(temp_root);
		}
	}
	root_svg.appendChild(inner_svg);
	BBox_div.appendChild(root_svg);
	svg_width = parseInt(inner_svg.getBoundingClientRect().width);
	svg_height = parseInt(inner_svg.getBoundingClientRect().height);
	
	var BBox_rect = BBox_div.getBoundingClientRect();
	var scale_x = (parseInt(BBox_rect.width)-2)/svg_width;
	var scale_y = parseInt(BBox_rect.height)/svg_height;
	inner_svg.setAttribute("transform", "scale("+scale_x+","+scale_y+")");
	
	var BBox_top = $(BBox_div).offset().top;
	var BBox_left = $(BBox_div).offset().left;
	element_height = $(inner_svg).offset().top;
	element_width = $(inner_svg).offset().left;
	if(parseFloat(BBox_top - element_height) != 0){
		y_offset = parseFloat(BBox_top - element_height);
	}
	if(parseFloat(BBox_left - element_width) != 0){
		x_offset = parseFloat(BBox_left - element_width);
	}
	inner_svg.setAttribute("transform", "translate("+x_offset+","+y_offset+") scale("+scale_x+","+scale_y+")");
	document.body.removeChild(elem);
	MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "HTML-CSS"]);
}

RenderManager.unrender_set_field = function()
{
    for(var k = 0; k < RenderManager.segment_set_divs.length; k++)
    {
        RenderManager.segment_set_divs[k].style.visibility = "hidden";
    }
}

RenderManager.clear_canvas = function()
{
    var w = Editor.canvases[0].width;
    Editor.canvases[0].width = 1;
    Editor.canvases[0].width = w;
}
