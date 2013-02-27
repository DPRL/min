/*
This file contains events and information specific to stroke selection.
*/

function StrokeSelectMode(){}
// For now this hierarchy doesn't matter, as we don't make instances
// of the SelectionMode. This will change.
StrokeSelectMode.prototype = new SelectionMode();


/*
Method stub for switching into StrokeSelectMode
*/
StrokeSelectMode.onMouseDown = function(e){
    // get the segments that are under the mouse click
    var click_result = CollisionManager.get_point_collides(Editor.mouse_position);
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

        //setTimeout(function() { Editor.touchAndHold(e); }, Editor.touchAndHoldTimeout);
    } else
    {
        Editor.state = EditorState.StrokeSelecting;
        
    }
    Editor.previous_stroke_position = Editor.mouse_position.clone();
    RenderManager.render();

}
