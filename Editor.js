/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
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

function Editor() { }
    

// Possible EditorModes
Editor.modes = {
    "DrawMode": new DrawMode(),
    "RectSelectMode": new RectSelectMode(),
};

// Code for modes/mode switching
Editor.current_mode = null;

Editor.instance = null;

Editor.initialize = function(in_equation_canvas_name, in_toolbar_name)
{
	// Make this red in annotation mode, as a reminder.
	Editor.segment_color = "#FF4444"; 

	// Support other tablet devices.
    Editor.using_tablet = Modernizr.touch;
	if(Editor.using_tablet == true)
    {
		$('body').addClass('touch');
        // removeh over css
        for(var i = 0; i < document.styleSheets.length; i++)
        {
            if ( document.styleSheets[ i ].rules != null ) {
                for(var j = 0; j < document.styleSheets[i].rules.length; j++)
                {
                    if(document.styleSheets[i].rules[j].cssText.match("hover") != null)
                    {
                        document.styleSheets[i].deleteRule(j--);
                    }
                }
            }
        }
        
        // Disabled. Kept as a clue for later on.
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

    // create the event bindings.
    Editor.setup_events();
    
    // list of segments we deal with
    Editor.segments = new Array();
    // segments currently selected
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
    Editor.action_list = new Array();
    
    Editor.current_action = null;
    
    
	Editor.FileReader = true;

	// When we first start, switch to DrawMode.
    $("#pen").trigger('click'); 



    Editor.current_expression_id = 0;

}

Editor.set_current_expression_id = function(id) {
    Editor.current_expression_id = id;
    RenderManager.render();
    Editor.clear_selected_segments();
}

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

// RZ: new (?) method to obtain the unique set ids for selected objects.
Editor.get_selected_set_ids = function()
{
	var idsFound = new Array();
	for (var k = 0; k < Editor.selected_segments.length; k++)
	{
		nextId = Editor.selected_segments[k].set_id;
		if ( ! idsFound.contains(nextId) )
			idsFound.push(nextId);
	}
	return idsFound;
}

// determines if the given segment is in the selected list
Editor.segment_selected = function(in_segment)
{
    for(var k = 0; k < Editor.selected_segments.length; k++)
    {
        if(Editor.selected_segments[k] == in_segment)
            return true;
        
		if(Editor.selected_segments[k].type_id == SegmentGroup.type_id)
        {
            if(Editor.selected_segments[k].contains_segment(in_segment))
                return true;
        }
    }
    
    return false;
}


// RZ: recover symbols using data and methods already in the grouping
// objects.
Editor.forget_symbol_groups = function()
{
	// Undo symbol groupings backward in time (on the Undo stack)
	for (var i = Editor.undo_stack.length - 1; i > -1; i--) 
	{
		nextAction = Editor.undo_stack[i];
		if (nextAction.isGrouping )
		{
			//console.log("forgetting..." + i);
			nextAction.ForgetSymbolGrouping();
			//console.log("Segment ids: " + Editor.get_current_segment_ids().length);
			//console.log(Editor.get_current_segment_ids());
		} else if (nextAction.isComposite)
		{
			for (var j = nextAction.action_list.length - 1; j > -1; j--)
			{
				nextCompositeAction = nextAction.action_list[j];
				if (nextCompositeAction.isGrouping)
				{
					//console.log("forgetting...compound " + i + " action " + j);
					nextCompositeAction.ForgetSymbolGrouping();
					//console.log("Segment ids: " + Editor.get_current_segment_ids().length);
					//console.log(Editor.get_current_segment_ids());
				}
			}
		}
	}
}

Editor.restore_symbol_groups = function()
{
	// Undo symbol groupings backward in time (on the Undo stack)
	for (var i = 0; i < Editor.undo_stack.length; i++)
	{
		nextAction = Editor.undo_stack[i];
		if (nextAction.isGrouping )
		{
			//console.log("restoring..." + i);
			nextAction.RestoreSymbolGrouping();
			//console.log("Segment ids:" + Editor.get_current_segment_ids().length);
			//console.log(Editor.get_current_segment_ids());
		} else if (nextAction.isComposite)
		{
			for (var j = 0; j < nextAction.action_list.length; j++)
			{
				nextCompositeAction = nextAction.action_list[j];
				if (nextCompositeAction.isGrouping)
				{
					//console.log("restoring...compound " + i + " action " + j);
					nextCompositeAction.RestoreSymbolGrouping();
					//console.log("Segment ids:" + Editor.get_current_segment_ids().length);
					//console.log(Editor.get_current_segment_ids());
				}
			}
		}
	}
}



// RZ: New method to get the current segment id set. Have to
// perform a linear scan of all the (primitive) segments to
// obtain this.
Editor.get_current_segment_ids = function()
{
	var result = new Array();

	for (var i = 0; i < Editor.segments.length; i++) {
		nextId = Editor.segments[i].set_id;
		if (! result.contains(nextId) )
			result.push(nextId);
	}
	return result;
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
    
	// OLD
	// var canvas = Editor.build_canvas();
    // canvas.style.zIndex = Editor.canvases.length;
    // Editor.canvases.push(canvas);
    // Editor.canvas_div.appendChild(canvas);
    //Editor.contexts.push(canvas);
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
		console.log("Undo stack contains: " + Editor.undo_stack.length);
		console.log("   Undone: " + action);
		if(action.shouldKeep())
        {
            action.Undo()
            Editor.redo_stack.push(action);
            switch(Editor.state)
            {
                case EditorState.StrokeSelecting:
                    Editor.state = EditorState.ReadyToStrokeSelect;
                    break;
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
   		console.log("Redo stack contains: " + Editor.redo_stack.length);
		console.log("   Redone: " + action);

		action.Apply();
		Editor.undo_stack.push(action);
        Editor.action_list.push(new Redo());
		
		RenderManager.render();
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

////////////////////////////////////////////////////////////////////////////////////
// Generating CROHME InkML Output
////////////////////////////////////////////////////////////////////////////////////

// DIFFERS from min : used by the slider in the GT version.
Editor.getStrokeString = function() {	
    var segments = new Array();
    var segarray = Editor.segments.slice( 0 );
    segarray.sort( function( o1, o2 ) { return o1.instance_id - o2.instance_id } );

	var inkml="";
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
        inkml += "\n<trace id=\"" + strokeid + "\" seg=\"" + segid + "\">";
        var strokedata = new Array();
        for ( var j = 0; j < stroke.points.length; j++ ) {
            strokedata.push( ( ( stroke.points[ j ].x * sx ) + tx ) + " " + ( ( stroke.points[ j ].y * sy ) + ty ) );
        }
        inkml += strokedata.join( ", " );
        inkml += "\n</trace>";        
    }
	return inkml;
}
    

// RZ: moved here from Editor.align, so that it could be used elsewhere easily.
Editor.MathJaxRender = function(tex_math)
{
	// Divs used for alignment   
	// !! RZ: This was tricky to find - this is how the expression
	//     becomes centered/moved after 'align' operations - see style.css.
	var outer_div = document.createElement("div");
	outer_div.setAttribute("id","outer_div");

	// Get BB (min, max coordinates) for segments on the canvas
	// or selection.
	var s = Editor.get_seg_dimensions(Editor.segments);
	if (Editor.selected_segments.length > 0 && EditorState.SegmentsSelected)
		s = Editor.get_seg_dimensions(Editor.selected_segments);

	// Main div with content in it
	var elem = document.createElement("div");
	elem.setAttribute("id","Alignment_Tex");
	elem.style.visibility = "hidden";
	elem.style.fontSize = "500%";
	elem.style.position = "absolute";
	elem.innerHTML = '\\[' + tex_math + '\\]'; 	// So MathJax can render it

	outer_div.appendChild(elem);
	Editor.canvas_div.appendChild(outer_div);

	// Change rendered to SVG and have MathJax display it
	// First re-render, then copy tex to the outer_div/canvas.
	MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "SVG"]);
	MathJax.Hub.Queue(["Rerender", MathJax.Hub, elem], 
			[ function() { 
				MathJax.Hub.Queue(["Typeset", MathJax.Hub, elem], 
					[Editor.copy_tex, elem, outer_div, s]);
				}]);

}


// Generate (CROHME) InkML output.
Editor.getInkML = function() {
	// Break groups apart so that segments match symbols, not whole symbol groups.
	Editor.forget_symbol_groups();

    var inkml = "<!-- CROHME InkML Data File -->\n<ink xmlns=\"http://www.w3.org/2003/InkML\">";
    
	// Annotation data - for ground truthing tool (*** DIFFERS FROM new min)
	inkml += "\n<traceFormat>";
	inkml += "\n<channel name=\"X\" type=\"decimal\"/>";
	inkml += "\n<channel name=\"Y\" type=\"decimal\"/>";
	inkml += "\n</traceFormat>";
	inkml += "\n<annotation type=\"truth\">$ " + Editor.slider.getCurrentExpression() + "$</annotation>";
	inkml += "\n<annotation type=\"writer\">" + Editor.slider.getCurrentFileName() + "</annotation>";
	
	//var strString = Editor.stroke_string; // Prevent modifying stroke attributes.
	// RZ: line below will use stroke string; but when annotating, we only want to use
	// the original stroke data collected from a writer.
	var strString = Editor.getStrokeString();

	// Find and replace segment id's, which may change.
    // slice(0) copies all elements of the array, which we then sort by
	// instance (i.e. primitive) identifier.
	var segarray = Editor.segments.slice( 0 );
    segarray.sort( function( o1, o2 ) { return o1.instance_id - o2.instance_id } );
	for ( var i = 0; i < segarray.length; i++ ) {
        var stroke = segarray[ i ];
        var strokeid = stroke.instance_id;
        var segid = stroke.set_id;
        
		console.log("Replace stroke id " + strokeid + " segment id as " + segid);

        // Replace segment id for each stroke.
		//console.log("strokeid: " + strokeid + " segid: " + segid);
		pattern = new RegExp("\"" + strokeid + "\" seg=\"\\d+\"","g");
		replacement = "\"" + strokeid + "\" seg=\"" + segid + "\"";
		strString = strString.replace(pattern,replacement);
	}
    inkml += strString;
	inkml += "\n</ink>";

	// Restore the symbol groupings (to keep canvas state consistent).
	Editor.restore_symbol_groups();

	return inkml;
}

