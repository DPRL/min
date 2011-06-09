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
	for(var k = 0; k < 4; k++)
	{
		var div = document.createElement('div');
		div.className = 'segment_set';
		div.style.visibility='hidden';
		div.setAttribute("ontouchstart", "event.preventDefault();");
		Editor.canvas_div.appendChild(div);
		RenderManager.segment_set_divs.push(div);
	}
	
}


// render the helper grahics (bounding box, segments ets, rectangle select etc)
RenderManager.render_tools_layer = function()
{

	if(Editor.selected_bb != null)
		RenderManager.render_bb(Editor.selected_bb, 4);
	else
		RenderManager.bounding_box.style.visibility = "hidden";

	switch(Editor.state)
	{
		case EditorState.StrokeSelecting:
		case EditorState.RectangleSelecting:
		case EditorState.SegmentsSelected:
		case EditorState.MovingSegments:
		case EditorState.ReadyToStrokeSelect:
		case EditorState.ReadyToRectangleSelect:
		case EditorState.Resizing:
		case EditorState.Relabeling:
			RenderManager.render_set_field(4);
			break;
		default:
			RenderManager.unrender_set_field();
	}
	
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
	for(var k = 0; k < Editor.segments.length; k++)
	{
		var seg = Editor.segments[k];
		if(Editor.segment_selected(seg))
			seg.render_selected();
		else
			seg.render();
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
	RenderManager.bounding_box.style.top = in_bb.render_mins.y + "px";
	RenderManager.bounding_box.style.left = in_bb.render_mins.x + "px";
	RenderManager.bounding_box.style.width = (in_bb.render_maxs.x - in_bb.render_mins.x) + "px";
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

RenderManager.render_set_field = function(in_context_id)
{
	
	var set_segments = new Array();

	// segments are in order by set id
	Editor.segments.push(null);	// add null pointer so we can easily render last set in list
	var set_index = 0;
	for(var k = 0; k < Editor.segments.length; k++)
	{
		var seg = Editor.segments[k];
		if(set_segments.length == 0)
			set_segments.push(seg);
		else if(seg == null || seg.set_id != set_segments[0].set_id)
		{
			// render set segments
			//var mins = new Vector2(set_segments[0].position.x, set_segments[0].position.y);
			//var maxs = new Vector2(set_segments[0].position.x + set_segments[0].size.x, set_segments[0].position.y + set_segments[0].size.y);
			
			var mins = set_segments[0].worldMinDrawPosition();
			var maxs = set_segments[0].worldMaxDrawPosition();
			
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
			
			//context.fillRect(mins.x, mins.y, rect_size.x, rect_size.y);
			// need to dynamically make these if we run out
			// incrase number of these divs
			if(RenderManager.segment_set_divs.length == set_index)
			{
				var div = document.createElement('div');
				div.className = 'segment_set';
				div.style.visibility='hidden';
				Editor.canvas_div.appendChild(div);
				RenderManager.segment_set_divs.push(div);
			}			
			
			var ss_div = RenderManager.segment_set_divs[set_index++];
			ss_div.style.left = mins.x + "px";
			ss_div.style.top = mins.y + "px";
			ss_div.style.width = rect_size.x + "px";
			ss_div.style.height = rect_size.y + "px";
			ss_div.style.visibility = "visible";
			
			var recognition_result = RecognitionManager.getRecognition(set_segments[0].set_id);
			if(recognition_result != null)
			{
				var symbol = RecognitionManager.symbol_name_to_unicode[recognition_result.symbols[0]];
				if(symbol != undefined)
					ss_div.innerHTML = symbol;
				else
					ss_div.innerHTML = recognition_result.symbols[0];
				ss_div.style.fontSize = rect_size.y + "px";
				ss_div.style.lineHeight = rect_size.y + "px";
			}
			else
				ss_div.innerHTML = "";
			
			//now render recognition results
			/*
			var recognition_result = RecognitionManager.getRecognition(set_segments[0].set_id);
			
			
			if(recognition_result != null)
			{
				
				var text_context = Editor.contexts[3];
				
				text_context.save();
				var color = RGB.parseRGB(Editor.recognition_result_color);
				var sb = new StringBuilder();
				sb.append("rgba(").append(String(color.red)).append(",").append(String(color.green)).append(",").append(String(color.blue)).append(",").append(recognition_result.certainties[0]).append(")");
				//text_context.fillStyle = "#FF00FF";
				text_context.fillStyle=sb.toString();
				text_context.font = "500 16px Arial";
				var text_width = text_context.measureText(recognition_result.symbols[0]).width;
				var text_height = 16;
				text_context.textAlign="left";
				text_context.textBaseline="top";
				text_context.translate(mins.x, mins.y);
				var scale = new Vector2(rect_size.x / text_width, rect_size.y / text_height);
				text_context.scale(scale.x, scale.y);
				
				text_context.fillText(recognition_result.symbols[0], 0, 0);
				text_context.restore();
			}
			*/
			// ready for next segment set
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

/*
RenderManager.add_segment = function(in_segment)
{
	return;
	RenderManager.segments.push(in_segment);
}

RenderManager.remove_segment = function(in_segment)
{
	if(in_segment == null) return;
	
	for(var k = 0; k < RenderManager.segments.length; k++)
	{
		if(RenderManager.segments[k] == in_segment)
		{
			RenderManager.segments.splice(k,1);
			return;
		}
	}
}
*/

RenderManager.clear_canvas = function()
{
	var w = Editor.canvases[0].width;
	Editor.canvases[0].width = 1;
	Editor.canvases[0].width = w;
}