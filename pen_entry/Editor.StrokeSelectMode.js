/*
This file contains events and information specific to stroke selection.
*/

function StrokeSelectMode(){}
// For now this hierarchy doesn't matter, as we don't make instances
// of the SelectionMode. This will change.
StrokeSelectMode.prototype = new SelectionMode();


StrokeSelectMode.prototype.init_mode = function(){
    SelectionMode.prototype.init_mode.call(this);
    Editor.strokeSelectionTool();
    $("#equation_canvas").css("cursor", "crosshair");
}

StrokeSelectMode.prototype.close_mode = function(){
    $("#equation_canvas").css("cursor", "default");
}

/*
Method stub for switching into StrokeSelectMode
*/
StrokeSelectMode.onDown = function(e){
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

StrokeSelectMode.onMove = function(e){
    // see what we stroked through between move events
    var stroke_result = CollisionManager.get_line_collides(Editor.mouse_position_prev, Editor.mouse_position);
    // for each segment in result add to selected segments set (if they aren't there already)
    if(stroke_result.length > 0)
    {
        var initial_length = Editor.selected_segments.length;
        while(stroke_result.length > 0)
        {
            var segment = stroke_result.pop();
            Editor.add_selected_segment(segment);
        }
    }
    Editor.previous_stroke_position = Editor.mouse_position_prev.clone();
    RenderManager.render();
}

StrokeSelectMode.onUp = function(e){
    if(Editor.selected_segments.length > 0)
        Editor.state = EditorState.SegmentsSelected;
    else
        Editor.state = EditorState.ReadyToStrokeSelect;
    RenderManager.clear_canvas();

}

