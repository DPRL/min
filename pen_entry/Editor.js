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
		Contains code for managing the canvas. Originally there was supposed to be a canvas for each
        layer (image layer, stroke layer, bounding box layer), but currently Min is implemented with
        only one.

        Methods:
                1. save_state/restore_state: Save and restore Min states in their
                entirety. Currently not used.
                2. 
                3. add_selected_segment - Mark a segment as selected so the bounding box appears
                around it.
                4. update_selected_bb - Update the location and size of the bounding box based on
                the location and sizes of the selected segments.
                5. remove_segment/remove_selected_segment
                6. add_canvas - create a canvas and add it to the list of contexts (canvases)
*/
function Editor() {}
    
Editor.instance = null;

// Possible EditorModes
Editor.modes = {
    "DrawMode": new DrawMode(),
    "RectSelectMode": new RectSelectMode()
};

// Code for modes/mode switching
Editor.current_mode = null;

/*
	The method that initializes Min by calling all necessary methods that needs to run
*/
Editor.initialize = function(in_equation_canvas_name, in_toolbar_name)
{
    if(Modernizr.touch == true)
    {
		$('body').addClass('touch');
        // remove over css
        for(var i = 0; i < document.styleSheets.length; i++)
        {
            if ( document.styleSheets[ i ].rules != null ) {
                for(var j = 0; j < document.styleSheets[i].rules.length; j++)
                {
                    if(document.styleSheets[i].rules[j].cssText.match("hover") != null)
                    {
                        document.styleSheets[i].deleteRule(j--);
                    }
                    //if(document.styleSheets[i].rules[j].mathch
                }
            }
        }
        
        // Disabled.
        //document.getElementById( "getInkMLbutton" ).innerHTML = "Save InkML";
    }
    
    Editor.canvas_div = document.getElementById(String(in_equation_canvas_name));
    Editor.toolbar_div = document.getElementById(String(in_toolbar_name));

    // canvas size beneath
    Editor.fit_to_screen();

    // array of div elements
    Editor.toolbar_buttons = new Array();
    
    // set up our divs (canvas, toolbar);
    Editor.build_buttons(in_toolbar_name);
    // top left hand corner of our canvases relative to window
    Editor.div_position = findPosition(Editor.canvas_div);
    
    // build our layers (two of each for double buffering)
    Editor.contexts = new Array();
    Editor.canvases = new Array();
    
    // get our convases
    Editor.add_canvas();     // canvas 0 - pen strokes

    // initialize managers
    RenderManager.initialize(Editor.canvas_width, Editor.canvas_width, Editor.canvases.length);
    CollisionManager.initialize();
    RecognitionManager.initialize();
    CorrectionMenu.initialize();

	// initialize slider
	Editor.slider = new Slider();
    
    // create the mouse setup other events
    Editor.setup_events();
    
    // list of segments we deal with
    Editor.segments = new Array();
    // segments currentlys elected
    Editor.selected_segments = new Array();

    // bounding box before we started resizing
    Editor.original_bb = null;
    // current bounding box
    Editor.selected_bb = null;
    
    // variables for resizing
    Editor.selected_size = new Vector2(0,0);
    Editor.selected_position = new Vector2(0,0);
    Editor.resize_offset = new Vector2(0,0);
    
    // can be either "Stroke" or "Rectangle"
    Editor.selection_method = null;
    
    // start and end positions for rectangle selection
    Editor.start_rect_selection = null;
    Editor.end_rect_selection = null;
    Editor.previous_stroke_position = null;
    
    // the stroke currently being created
    Editor.current_stroke = null;
    // an image object the load method will set
    Editor.temp_image = null;
    // a text object the user can type into
    Editor.current_text = null;
    // the edge we are currently grabbing in resize mode
    Editor.grabbed_edge = -1;
    

    // initialize mouse variables
    Editor.mouse1_down = false;
    Editor.mouse2_down = false;
    Editor.mouse_position = new Vector2(-1,-1);
    Editor.mouse_position_prev = new Vector2(-1,-1);
    
    Editor.undo_stack = new Array();
    Editor.redo_stack = new Array();
    // alla ctions including undo/redo stored here
    Editor.action_list = new Array();
    
    Editor.current_action = null;

    Editor.FileReader = true;
    // When we first start, switch to DrawMode manually
    $("#pen").trigger('click'); 

    Editor.current_expression_id = 0;
}

Editor.set_current_expression_id = function(id) {
    Editor.current_expression_id = id;
    RenderManager.render();
    Editor.clear_selected_segments();
}

/* 
	Saves the segments on the canvas used for debugging purposes only
*/
Editor.save_state = function(clear)
{
    var state = {
        segments: [],
		recognition_results: []
    };
    for (var i = 0; i < Editor.segments.length; i++) {
        var seg = Editor.segments[i];
        state.segments.push(seg.save_state());
    }
    for (var i = 0; i < RecognitionManager.result_table.length; i++) {
        var result = RecognitionManager.result_table[i];
        state.recognition_results.push(result.save_state());
    }
	if (clear) {
		RecognitionManager.result_table = [];
	}
    return JSON.stringify(state);
}

/* 
	Restores the segments in the json_string on the canvas
	Used for debugging purposes only
*/
Editor.restore_state = function(json_string)
{
    var state = JSON.parse(json_string);
    for (var i = 0; i < state.segments.length; i++) {
        seg_state = state.segments[i];
        var seg;
        switch(seg_state.type_id) {
            case PenStroke.type_id:
                seg = PenStroke.restore_state(seg_state);
                break;
            case SymbolSegment.type_id:
                seg = SymbolSegment.restore_state(seg_state);
                break;
        }
        Editor.add_segment(seg);
    }
    for (var i = 0; i < state.recognition_results.length; i++) {
        result = state.recognition_results[i];
		RecognitionManager.result_table.push(RecognitionResult.restore_state(result));
	}
	RenderManager.render();
}

// determines if the given segment is in the selected list
Editor.segment_selected = function(in_segment)
{
    for(var k = 0; k < Editor.selected_segments.length; k++)
    {
        if(Editor.selected_segments[k] == in_segment)
            return true;
/*            
        if(Editor.selected_segments[k].type_id == SegmentGroup.type_id)
        {
            if(Editor.selected_segments[k].contains_segment(in_segment))
                return true;
        }
*/        
    }
    
    return false;
}

Editor.get_segment_by_id = function(in_id)
{
    var result = new Array();

    for(var k = 0; k < Editor.segments.length; k++)
    {
        if(Editor.segments[k].set_id == in_id)
            result.push(Editor.segments[k]);
    }
    return result;
}

// add a segment to the editor's selected list
Editor.add_selected_segment = function(in_segment)
{
    if(Editor.selected_segments.contains(in_segment))
        return;

    var segment_mins = in_segment.worldMinPosition();
    var segment_maxs = in_segment.worldMaxPosition();

    var segment_draw_mins = in_segment.worldMinDrawPosition();
    var segment_draw_maxs = in_segment.worldMaxDrawPosition();
    
    // update selected bounding box
    if(Editor.selected_segments.length == 0)
    {
        Editor.selected_bb = new BoundingBox(segment_mins, segment_maxs, segment_draw_mins, segment_draw_maxs);
    }
    else
    {
        for(var k = 0; k < Editor.selected_segments.length; k++)
            if(Editor.selected_segments[k] == in_segment)
                return;
        // update logical extents
        if(segment_mins.x < Editor.selected_bb.mins.x)
            Editor.selected_bb.mins.x = segment_mins.x;
        if(segment_mins.y < Editor.selected_bb.mins.y)
            Editor.selected_bb.mins.y = segment_mins.y;
        
        if(segment_maxs.x > Editor.selected_bb.maxs.x)
            Editor.selected_bb.maxs.x = segment_maxs.x;
        if(segment_maxs.y > Editor.selected_bb.maxs.y)
            Editor.selected_bb.maxs.y = segment_maxs.y;
            
        // update render extents
        if(segment_draw_mins.x < Editor.selected_bb.render_mins.x)
            Editor.selected_bb.render_mins.x = segment_draw_mins.x;
        if(segment_draw_mins.y < Editor.selected_bb.render_mins.y)
            Editor.selected_bb.render_mins.y = segment_draw_mins.y;
        
        if(segment_draw_maxs.x > Editor.selected_bb.render_maxs.x)
            Editor.selected_bb.render_maxs.x = segment_draw_maxs.x;
        if(segment_draw_maxs.y > Editor.selected_bb.render_maxs.y)
            Editor.selected_bb.render_maxs.y = segment_draw_maxs.y;
    }

    // finally add to the selected lsit
    Editor.selected_segments.push(in_segment);
}

// updates the extents of the selected bounding box
Editor.update_selected_bb = function()
{
    if(Editor.selected_segments.length == 0)
    {
        Editor.selected_bb = null;
        return;
    }
    else if(Editor.selected_segments.length == 1)
    {
        Editor.selected_bb = new BoundingBox(Editor.selected_segments[0].worldMinPosition(), Editor.selected_segments[0].worldMaxPosition(), Editor.selected_segments[0].worldMinDrawPosition(), Editor.selected_segments[0].worldMaxDrawPosition());
    }
    else
    {
        var mins = Editor.selected_segments[0].worldMinPosition();
        var maxs = Editor.selected_segments[0].worldMaxPosition();
        
        var render_mins = Editor.selected_segments[0].worldMinDrawPosition();
        var render_maxs = Editor.selected_segments[0].worldMaxDrawPosition();
        
        for(var k = 1; k < Editor.selected_segments.length; k++)
        {
            // lgoical extents
            var seg_mins = Editor.selected_segments[k].worldMinPosition();
            var seg_maxs = Editor.selected_segments[k].worldMaxPosition();
            
            if(seg_mins.x < mins.x)
                mins.x = seg_mins.x;
            if(seg_mins.y < mins.y)
                mins.y = seg_mins.y;
                
            if(seg_maxs.x > maxs.x)
                maxs.x = seg_maxs.x;
            if(seg_maxs.y > maxs.y)
                maxs.y = seg_maxs.y;
            
            // render extents
            var render_seg_mins = Editor.selected_segments[k].worldMinDrawPosition();
            var render_seg_maxs = Editor.selected_segments[k].worldMaxDrawPosition();
            
            if(render_seg_mins.x < render_mins.x)
                render_mins.x = render_seg_mins.x;
            if(render_seg_mins.y < render_mins.y)
                render_mins.y = render_seg_mins.y;
                
            if(render_seg_maxs.x > render_maxs.x)
                render_maxs.x = render_seg_maxs.x;
            if(render_seg_maxs.y > render_maxs.y)
                render_maxs.y = render_seg_maxs.y;            
        }
        Editor.selected_bb = new BoundingBox(mins, maxs, render_mins, render_maxs);
    }
}

// adds segment to be managed to the editor
Editor.add_segment = function(in_segment)
{
    if(Editor.segments.contains(in_segment))
        return;
    
    Editor.segments.push(in_segment);
}

// removes a segment from the editor's control
Editor.remove_segment = function(in_segment)
{
    if(in_segment == null) return;

    var ui = Segment.unique_id(in_segment);
    for(var k = 0; k < Editor.segments.length; k++)
    {
        if(Segment.unique_id(Editor.segments[k]) == ui)
        {
            Editor.segments.splice(k, 1);
            break;
        }
    }
}
// removes segment from selected segments list
Editor.remove_selected_segment = function(in_segment)
{
    if(in_segment == null) return;
    for(var k = 0; k < Editor.selected_segments.length; k++)
        if(Editor.selected_segments[k] == in_segment)
        {
            Editor.selected_segments.splice(k, 1);
            return;
        }
    
}

sort_segments = function(a, b)
{
    return a.set_id - b.set_id;
}

// empties selected segments list
Editor.clear_selected_segments = function()
{
    Editor.selected_segments.length = 0;
    Editor.selected_bb = null;
    Editor.selected_position = new Vector2(0,0);
    Editor.selected_size = new Vector2(0,0);
}

// adds a new canvas to the contexts list 
Editor.add_canvas = function()
{    
    var svg_canvas = Editor.build_canvas();
    svg_canvas.style.zIndex = Editor.canvases.length;
	Editor.canvases.push(svg_canvas);
    
    Editor.canvas_div.appendChild(svg_canvas);

    Editor.contexts.push(svg_canvas);
}

// Builds the canvas which is an SVG object
Editor.build_canvas = function()
{
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("onclick", "event.preventDefault();");
	svg.setAttribute("ontouchmove", "event.preventDefault();");
	svg.setAttribute("ontouchstart", "event.preventDefault();");
	svg.setAttributeNS(null,"width", Editor.canvas_width);
	svg.setAttributeNS(null,"height", Editor.canvas_height);
	svg.style.position = "absolute";
	svg.setAttributeNS(null,"tabindex", "0");
	svg.style.left = "0px";
	svg.style.top = "0px";
	return svg;
}

Editor.add_action = function(action)
{
    Editor.redo_stack.length = 0;
    
    if(Editor.undo_stack.length > 0)
    {
        var prev_action = Editor.undo_stack.pop();
        if(prev_action.shouldKeep() == true)
            Editor.undo_stack.push(prev_action);
    }

    if(Editor.action_list.length > 0)
    {
        var prev_action = Editor.action_list.pop();
        if(prev_action.shouldKeep() == true)
            Editor.action_list.push(prev_action);
    }
    
    Editor.undo_stack.push(action);
    Editor.current_action = action;
    Editor.action_list.push(action);
}

Editor.undo = function()
{
    if(Editor.button_states[Buttons.Undo].enabled == false)
        return;

    //Editor.clear_selected_segments();
    while(Editor.undo_stack.length > 0)
    {
        
        var action = Editor.undo_stack.pop();
        if(action.shouldKeep())
        {
            action.Undo()
            console.log("Undo " + action.toString());
            Editor.redo_stack.push(action);
            switch(Editor.state)
            {
                case EditorState.RectangleSelecting:
                    Editor.state = EditorState.ReadyToRectangleSelect;
                    break;
                case EditorState.MiddleOfStroke:
                    Editor.state = EditorState.ReadyToStroke;
                    break;
                case EditorState.MiddleOfText:
                    Editor.state = EditorState.ReadyForText;
            }
            
            
            RenderManager.render();
            Editor.action_list.push(new Undo());
            return;
        }
    }
}

Editor.redo = function()
{
    if(Editor.button_states[Buttons.Redo].enabled == false)
        return;

    if(Editor.redo_stack.length > 0)
    {
        var action = Editor.redo_stack.pop();
        action.Apply();
        console.log("Redo " + action.toString());
        Editor.undo_stack.push(action);
        
        RenderManager.render();
        
        Editor.action_list.push(new Redo());
    }
}

Editor.printUndoStack = function()
{
    console.log("---");
    for(var k = 0; k < Editor.undo_stack.length; k++)
    {
        console.log(Editor.undo_stack[k].toXML());
    }
}

// Opens correction menu upon click on change recognition button
Editor.open_correction_menu = function(e)
{
	if(Editor.selected_segments.length > 0){
		var eq_canv = $("#equation_canvas").off(Editor.current_mode.event_strings.onUp,
    	Editor.current_mode.onUpAfterMove).off(Editor.current_mode.event_strings.onMove,
    	Editor.current_mode.beginMovingSegmentsFromMove).off(Editor.current_mode.event_strings.onDown,
    	Editor.current_mode.onDownSegmentsSelected);
		RenderManager.bounding_box.style.visibility = "visible";
    	Editor.state = EditorState.SegmentsSelected;
    	Editor.relabel();
	}
}
