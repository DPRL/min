// editor object will have multiple layers (each a canvas):
	// imported image layer
	// stroke layer
	// bounding box layer

//  multiple tools
	// pen
	// select

function Editor()
{

}
	
Editor.instance = null;

Editor.initialize = function(in_equation_canvas_name, in_toolbar_name)
{
	Editor.using_ipad = navigator.userAgent.match(/iPad/i) != null;
	if(Editor.using_ipad == true)
	{
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
					//if(document.styleSheets[i].rules[j].mathch
				}
			}
		}
		
		// Disabled.
		//document.getElementById( "getInkMLbutton" ).innerHTML = "Save InkML";
	}
	
	Editor.canvas_div = document.getElementById(String(in_equation_canvas_name));
	Editor.toolbar_div = document.getElementById("toolbar");

	// canvas size beneath
	//Editor.canvas_width = Editor.canvas_div.offsetWidth;
	//Editor.canvas_height = Editor.canvas_div.offsetHeight;
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
	Editor.add_canvas(); 	// canvas 0 - pen strokes

	// initialize managers
	RenderManager.initialize(Editor.canvas_width, Editor.canvas_width, Editor.canvases.length);
	CollisionManager.initialize();
	RecognitionManager.initialize();
	CorrectionMenu.initialize();
	
	// create the mouse 
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
	
	Editor.selectPenTool();
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
	var canvas = Editor.build_canvas();
		canvas.style.zIndex = Editor.canvases.length;
		Editor.canvases.push(canvas);
	
	Editor.canvas_div.appendChild(canvas);

	var context = canvas.getContext('2d');
	Editor.contexts.push(context);
}

Editor.build_canvas = function()
{
	var canvas = document.createElement("canvas");
		canvas.setAttribute("onclick", "event.preventDefault();");
		canvas.setAttribute("ontouchmove", "event.preventDefault();");
		canvas.setAttribute("ontouchstart", "event.preventDefault();");
		canvas.setAttribute("width", Editor.canvas_width);
		canvas.setAttribute("height", Editor.canvas_height);
		canvas.style.position = "absolute";
		canvas.setAttribute("tabindex", "0");
		canvas.style.left = "0px";
		canvas.style.top = "0px";
	return canvas;
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
