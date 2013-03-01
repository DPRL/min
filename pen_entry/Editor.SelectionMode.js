/*
This file contains events handlers that are used in Selection modes (Box/Stroke) 
of Min
*/

function SelectionMode(){}
// For now this hierarchy doesn't matter, as we don't make instances
// of the SelectionMode. This will change.
SelectionMode.prototype = new EditorMode();

SelectionMode.setup_touch_events = function(){
    // Pinch to resize events
    var bb = document.getElementById("bounding_box");
    console.log("applying hammer events");
    bb.hammer = new Hammer(bb, {
        transform: true,
        scale_threshold: .1,
        drag_min_distance: 0,
        // These events need to be suppressed because sometimes they would fire during
        // a transform and prevent ontransformend from being run, leaving the editor in a bad state.
        drag: false,
        swipe: false
    });

    bb.hammer.ontransformstart = SelectionMode.onPinchStart;
    bb.hammer.ontransform = SelectionMode.onPinch;
    bb.hammer.ontransformend = SelectionMode.onPinchEnd;

}

//-----------------
// Hammer Events
// ----------------
//   - onPinchStart 
//   - onPinch
//   - onPinchEnd
SelectionMode.onPinchStart = function(e){ // e is a Hammer.js event
    // Need to clear the moveQueue so that there is no velocity at the end of the touch
    Editor.add_action(new TransformSegments(Editor.selected_segments));
    Editor.state = EditorState.PinchResizing;
    
    Editor.original_bb = Editor.selected_bb.clone();
    var bb = Editor.original_bb;

    // Store the center of the bounding box as the anchor point for the resize
    var bb_size = Vector2.Subtract(bb.maxs, bb.mins);
    this.anchor = new Vector2(bb.mins.x  + bb_size.x / 2, bb.mins.y + bb_size.y / 2);
}

SelectionMode.onPinch = function(e){ 
    // For some reason the scale
    // returns 0 sometimes, this is why the object would suddenly get
    // tiny
    if(e.scale == 0)
        return;
    for(var n = 0; n < Editor.selected_segments.length; n++){
        Editor.selected_segments[n].resize(this.anchor, new Vector2(e.scale, e.scale));
    }

    Editor.update_selected_bb();
    RenderManager.render();
}

SelectionMode.onPinchEnd = function(e){
    // End the transform
    console.log("pinch end");
    for(var n = 0; n < Editor.selected_segments.length; n++){
        Editor.selected_segments[n].freeze_transform();
    }
    Editor.current_action.add_new_transforms(Editor.selected_segments);
    Editor.update_selected_bb();
    RenderManager.render();

    // Restore the previous state
    Editor.changeState(EditorState.SegmentsSelected);
    Editor.moveQueue = null;
}

SelectionMode.mouseDownSegmentsSelected = function(e){    
    var click_edge = Editor.selected_bb.edge_clicked(Editor.mouse_position);
    // check for resizing
    // TODO: make this an event on just the bb handles. 
    if(click_edge != -1)
    {
        Editor.add_action(new TransformSegments(Editor.selected_segments));
        Editor.state = EditorState.Resizing;
        Editor.grabbed_edge = click_edge;
        Editor.resize_offset = new Vector2(0,0);
        Editor.original_bb = Editor.selected_bb.clone();
    }
    else
    {
        // check translate
        if(Editor.selected_bb.point_collides(Editor.mouse_position))
        {
            Editor.add_action(new TransformSegments(Editor.selected_segments));
            Editor.state = EditorState.MovingSegments;
            Editor.moveQueue = new BoundedQueue(Editor.moveQueueLength);
            Editor.moveQueue.enqueue(new Vector2(e, Editor.mouse_position.clone()));
            setTimeout(function() { Editor.touchAndHold(e); }, Editor.touchAndHoldTimeout);
        }
        // reselect
        else
        {
            Editor.clear_selected_segments();
            var clicked_points = CollisionManager.get_point_collides(Editor.mouse_position);
            // clicking on a new segment
            if(clicked_points.length > 0)
            {
                for(var k = 0; k <clicked_points.length; k++)
                {
                    var segment = clicked_points[k];
                    Editor.add_selected_segment(segment);
                }
                Editor.state = EditorState.SegmentsSelected;


                setTimeout(function() { Editor.touchAndHold(e); }, Editor.touchAndHoldTimeout);
            }
            // selecting none
            else
            {
                if(Editor.selection_method == "Stroke")
                {
                    Editor.previous_stroke_position = Editor.mouse_position.clone();
                    Editor.state = EditorState.StrokeSelecting;
                }
                else
                {
                    Editor.start_rect_selection = Editor.mouse_position.clone();
                    Editor.end_rect_selection  = Editor.mouse_position.clone();
                    Editor.state = EditorState.RectangleSelecting;    
                }
            }
            RenderManager.render();
        }
    }
}

/**
   Move all selected segments between two positions.

   @param previous A Vector2 of the previous mouse position
   @param current A Vector2 of the current mouse position
**/
SelectionMode.moveSegments = function(previous, current){
    var translation = Vector2.Subtract(current, previous);
    for(var k = 0; k < Editor.selected_segments.length; k++)
    {
        seg = Editor.selected_segments[k];
        if(seg.clear != undefined) {
            seg.clear(Editor.contexts[0]);
        }                    
        seg.translate(translation);
    }
    Editor.selected_bb.translate(translation);
}

// Awkward name, try to change this later
SelectionMode.moveSegmentsFromMouseMove = function(e){
    if(e.timeStamp - Editor.moveQueue[Editor.moveQueue.length - 1].x.timeStamp > 40){
                    Editor.moveQueue.enqueue(new Vector2(e, Editor.mouse_position.clone()));
    }

    SelectionMode.moveSegments(Editor.mouse_position_prev, Editor.mouse_position);
    // redraw scene
    RenderManager.render();
}

SelectionMode.onDoubleClick = function(e){
    // RLAZ: allow relabeling and resegmenting using double tap.
        // Check for identical segment identifiers (relabel in that case)
        var singleObject = 0;
        if (Editor.selected_segments.length > 0) {
            var allSame = 1;
            var segmentId = Editor.selected_segments[0].set_id;

            // All selected objects belong to the same segment (id)
            for(var i = 1; i < Editor.selected_segments.length; i++) {
                if (Editor.selected_segments[i].set_id != segmentId ) {
                    allSame = 0;
                }
            }
            // All objects in the segmented have been selected.
            if (allSame > 0) {
                var totalInSegment = 0;
                for(var i = 0; i < Editor.segments.length; i++)
                {
                    if (Editor.segments[i].set_id == segmentId) {
                        totalInSegment++;
                    }
                }
                if(totalInSegment == Editor.selected_segments.length) {
                    singleObject = 1;
                }
            }
        }

        // Depending on selection, relabel or re-segment.
        var prev_state;
        if(Editor.selection_method == "Stroke")
            prev_state = EditorState.StrokeSelecting;
        else
            prev_state = EditorState.RectangleSelecting;
        
        Editor.state = EditorState.SegmentsSelected;
        if (singleObject > 0) {
            Editor.relabel(prev_state);
        } else {
            Editor.groupTool();
        }
}
