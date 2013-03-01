/*
This file contains events and information specific to rectangle selection.
*/

function RectSelectMode(){}
// For now this hierarchy doesn't matter, as we don't make instances
// of the SelectionMode. This will change.
RectSelectMode.prototype = new SelectionMode();

RectSelectMode.onMouseDown = function(e){
    // get the segments that are under the mouse click
    var click_result = CollisionManager.get_point_collides_bb(Editor.mouse_position);

    if(click_result.length > 0)
    {
        // nothing selected at the moment, add all below mouse click to selected
        // add the last guy in the list (probably most recently added) to selected set
        var segment = click_result.pop();
        for(var k = 0; k < Editor.segments.length; k++)
            if(Editor.segments[k].set_id == segment.set_id)
                Editor.add_selected_segment(Editor.segments[k]);
        
        Editor.add_action(new TransformSegments(Editor.selected_segments));
        Editor.state = EditorState.SegmentsSelected;

        setTimeout(function() { Editor.touchAndHold(e); }, Editor.touchAndHoldTimeout);
    }
    else
    {
        Editor.start_rect_selection = Editor.mouse_position.clone();
        Editor.end_rect_selection  = Editor.mouse_position.clone();
        Editor.state = EditorState.RectangleSelecting;
    }
    RenderManager.render();

}

RectSelectMode.onMouseMove = function(e){
    var mouse_delta = Vector2.Subtract(Editor.mouse_position, Editor.mouse_position_prev);
    Editor.end_rect_selection.Add(mouse_delta);
    // get list of segments colliding with selection rectangle
    var rect_selected = CollisionManager.get_rectangle_collides(Editor.start_rect_selection, Editor.end_rect_selection);
    rect_selected = rect_selected.filter(function(elem) {
        return elem.expression_id == Editor.current_expression_id;
    });
    Editor.clear_selected_segments();
    // add segment set to seleced list
    for(var k = 0; k < rect_selected.length; k++)
    {
        var segment_set = Editor.get_segment_by_id(rect_selected[k].set_id);
        for(var j = 0; j < segment_set.length; j++)
            Editor.add_selected_segment(segment_set[j]);
    }
    
    RenderManager.render();

}
