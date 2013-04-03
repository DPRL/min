/*
This file contains events and information specific to rectangle selection.
*/

function RectSelectMode(){
    this.onDownNoSelectedSegments = $.proxy(RectSelectMode.onDownNoSelectedSegmentsBase, this);
    this.onMoveNoSelectedSegments = $.proxy(RectSelectMode.onMoveNoSelectedSegmentsBase, this);
    this.onUpNoSelectedSegments = $.proxy(RectSelectMode.onUpNoSelectedSegmentsBase, this);

    if(Modernizr.touch){
        this.onDownNoSelectedSegments = EditorMode.mkIgnoreMultipleTouches(this.onDownNoSelectedSegments);
        this.onMoveNoSelectedSegments = EditorMode.mkIgnoreMultipleTouches(this.onMoveNoSelectedSegments);
        this.onUpNoSelectedSegments = EditorMode.mkIgnoreMultipleTouches(this.onUpNoSelectedSegments);
    }
}

// CMS: Perhaps just use the object in Editor.modes instead of making another
// one?
RectSelectMode.prototype = new SelectionMode();

RectSelectMode.prototype.init_mode = function(){
    SelectionMode.prototype.init_mode.call(this); 
    Editor.rectangleSelectionTool();
    $("#equation_canvas").css("cursor", "default");
    $("#equation_canvas").on("touchstart mousedown", this.onDownNoSelectedSegments);

}

RectSelectMode.prototype.close_mode = function(){
    SelectionMode.prototype.close_mode.call(this);
    $("#equation_canvas").off("touchstart mousedown", this.onDownNoSelectedSegments);
}

RectSelectMode.onDownNoSelectedSegmentsBase = function(e){
    RectSelectMode.prototype.onDown.call(this, e);
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

        //this.timeoutID = setTimeout(function() { Editor.touchAndHold(e); }, Editor.touchAndHoldTimeout);
        $("#equation_canvas").off("touchstart mousedown", 
        this.onDownNoSelectedSegments);
        $("#equation_canvas").on("touchstart mousedown",
        this.onDownSegmentsSelected);

        this.onDownSegmentsSelected(e);
    }
    else // We are rectangle selecting
    {
        Editor.start_rect_selection = Editor.mouse_position.clone();
        Editor.end_rect_selection  = Editor.mouse_position.clone();
        Editor.state = EditorState.RectangleSelecting;
        $("#equation_canvas").on("touchmove mousemove", this.onMoveNoSelectedSegments);
        $("#equation_canvas").one("touchend mouseup", this.onUpNoSelectedSegments);
    }
    RenderManager.render();
}

RectSelectMode.onMoveNoSelectedSegmentsBase = function(e){
    RectSelectMode.prototype.onMove.call(this, e);
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

RectSelectMode.onUpNoSelectedSegmentsBase = function(e){
    RectSelectMode.prototype.onUp.call(this, e);
    $("#equation_canvas").off("touchmove mousemove", this.onMoveNoSelectedSegments);
    if(Editor.selected_segments.length > 0)
        Editor.state = EditorState.SegmentsSelected;
    else
        Editor.state = EditorState.ReadyToRectangleSelect;
    Editor.start_rect_selection = Editor.end_rect_selection = null;
    RenderManager.render();
}
