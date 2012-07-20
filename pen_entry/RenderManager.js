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

    // Find the checked element in the layer radio button form.
    // Use this to hide/show the background information.
    if (document.forms[0].layers.checked == false)
    {
        RenderManager.unrender_set_field();
    } else {
        RenderManager.render_set_field(4);
    }

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

RenderManager.editColorOCRbbs = function() {
    RenderManager.colorOCRbbs(true);
}

RenderManager.regColorOCRbbs = function() {
    RenderManager.colorOCRbbs(false);
}

// RLAZ: New method to colorize the bounding boxes for OCR results
// based on state.
RenderManager.colorOCRbbs = function(editing)
{
    var classname;
    if (editing) 
        classname = "segment_input_set";
    else
        classname = "segment_set";

    for (var i = 0; i < RenderManager.segment_set_divs.length; i++) {
        var segment = RenderManager.segment_set_divs[i];
        if (segment.className != "text_segment") {
            segment.className = classname;
        }
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
            var mins = set_segments[0].worldMinDrawPosition();
            var maxs = set_segments[0].worldMaxDrawPosition();
            
            // Find the extent of the symbol (BB)
            for(var j = 1; j < set_segments.length ; j++)
            {
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
            var rect_size = Vector2.Subtract(maxs, mins);

            // Generate divs to represent each symbol.
            if(RenderManager.segment_set_divs.length == set_index)
            {
                var div = document.createElement('div');

                // Chose the div class to obtain desired formatting.
                if (Editor.segments[k-1].constructor == SymbolSegment) {
                    div.className = 'text_segment';
                }
                else {
                    switch(Editor.state)
                    {
                    case EditorState.ReadyToStroke:
                    case EditorState.MiddleOfStroke:
                    case EditorState.ReadyForText:
                    case EditorState.MiddleOfText: 
                        div.className = 'segment_input_set';
                        break;
                    default:
                        div.className = 'segment_set';
                        break;
                    }
                }
                div.style.visibility='hidden';
                
                Editor.canvas_div.appendChild(div);
                RenderManager.segment_set_divs.push(div);

                // Add hammer events for this div if we're using an iPad
                if(Editor.using_ipad){
                    div.hammer = new Hammer(div, {
                        transform: true
                    });

                    div.hammer.ontransformstart = function(e){
                        this.startLocation = new Vector2(e.position.x, e.position.y);
                        this.resize_offset = new Vector2(0, 0);
                        Editor.add_action(new TransformSegments(Editor.selected_segments));
                        
                        console.log("transform start");
                        this.prev_state = Editor.state;
                        Editor.state = EditorState.resizing;
                    }
                    
                    div.hammer.ontransform = function(e) { // e is a Hammer.js event
                        var offset = Vector2.Subtract(this.startLocation, new Vector2(e.position.x, e.position.y));
                        var bb = Editor.selected_bb;
                        console.log("bounding box: " + bb);
                        
                        // anchor from the upper left corner of the bounding box
                        offset.x *= -1.0;
                        offset.y *= -1.0;
                        var anchor = bb.maxs;
                        var bb_size = Vector2.Subtract(bb.maxs, bb.mins);

                        this.resize_offset.Add(offset);
                        
                        //var pinch_reduce_scale = .5, pinch_enlarge_scale = 1.5, pinch_pivot = 1.0;
                        console.log("TRANSFORM: ");
                        
                        var anchor = new Vector2(e.position.x, e.position.y);
                        console.log("POSITION: " + e.position.x + " " + e.position.y);

                        console.log("SCALE: " + e.scale);
                        
                        var scale = new Vector2((this.resize_offset.x / bb_size.x) + 1.0, (this.resize_offset.y / bb_size.y) + 1.0);
                        
                        if((isNaN(scale.x) || isNaN(scale.y)) == false && (scale.x == 0.0 || scale.y == 0) == false)
                        {
                            for(var n = 0; n < Editor.selected_segments.length; n++){
                                Editor.selected_segments[n].resize(anchor, scale);
                            }
                            Editor.update_selected_bb();
                            RenderManager.render();
                        }
                        
                    }

                    div.hammer.ontransformend = function(e){
                        // End the transform 
                        for(var n = 0; n < Editor.selected_segments.length; n++){
                            Editor.selected_segments[n].freeze_transform();
                        }
                        Editor.current_action.add_new_transforms(Editor.selected_segments);
                        RenderManager.render();

                        // Restore the previous state
                        Editor.resize_offset = new Vector2(0, 0); 
                        if(this.prev_state == EditorState.ReadyToStroke){
                            Editor.selectPenTool();
                        }
                        else
                            Editor.state = this.prev_state;
                    }
                } 
            }


            // Add the new div to the RenderManager data structures,
            // set visiblity and BB properties.
            var ss_div = RenderManager.segment_set_divs[set_index++];
            ss_div.style.visibility = "visible";
            ss_div.style.left = mins.x + "px";
            ss_div.style.top = mins.y + "px";
            ss_div.style.width = rect_size.x + "px";
            ss_div.style.height = rect_size.y + "px";

            // Recognition result/label
            var recognition_result = RecognitionManager.getRecognition(set_segments[0].set_id);
            if(recognition_result != null && set_segments[0].constructor != SymbolSegment)
            {
                // Lines 
                var symbol = RecognitionManager.symbol_name_to_unicode[recognition_result.symbols[0]];
                if(symbol != undefined)
                    ss_div.innerHTML = symbol;
                else
                    ss_div.innerHTML = recognition_result.symbols[0];
                ss_div.style.fontSize = (rect_size.y * 1.25) + "px"; // scale font up to fill more of bb
                ss_div.style.lineHeight = rect_size.y + "px";
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
