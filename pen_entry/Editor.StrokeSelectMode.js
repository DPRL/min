/*
This file contains events and information specific to stroke selection.
*/

StrokeSelectMode.prototype = new SelectionMode();
StrokeSelectMode.prototype.segment_style_class = "segment_stroke_select";

function StrokeSelectMode(){
    this.onDownNoSelectedSegments = $.proxy(StrokeSelectMode.onDownNoSelectedSegmentsBase, this);
    this.onMoveNoSelectedSegments = $.proxy(StrokeSelectMode.onMoveNoSelectedSegmentsBase, this);
    this.onUpNoSelectedSegments = $.proxy(StrokeSelectMode.onUpNoSelectedSegmentsBase, this);
    this.displaySelectionTool = StrokeSelectMode.strokeSelectTool.bind(this);

    if(Modernizr.touch){
        this.onDownNoSelectedSegments = EditorMode.mkIgnoreMultipleTouches(this.onDownNoSelectedSegments);
        this.onMoveNoSelectedSegments = EditorMode.mkIgnoreMultipleTouches(this.onMoveNoSelectedSegments);
        this.onUpNoSelectedSegments = EditorMode.mkIgnoreMultipleTouches(this.onUpNoSelectedSegments);
    }
}


StrokeSelectMode.prototype.init_mode = function(){
    SelectionMode.prototype.init_mode.call(this);
    this.displaySelectionTool();
    $("#equation_canvas").css("cursor", "crosshair");
    $("#equation_canvas").on(this.event_strings.onDown,
    this.onDownNoSelectedSegments);
}

StrokeSelectMode.prototype.close_mode = function(){
    SelectionMode.prototype.close_mode.call(this);
    $("#equation_canvas").css("cursor", "default");
    $("#equation_canvas").off(this.event_strings.onDown,
    this.onDownNoSelectedSegments);

    // CMS: TODO: When switching between stroke/rect - we should leave the
    // selected segments 
    Editor.clear_selected_segments();
    RenderManager.render();
}

/*
Method stub for switching into StrokeSelectMode
*/
StrokeSelectMode.onDownNoSelectedSegmentsBase = function(e){
    StrokeSelectMode.prototype.onDown.call(this, e);
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

    } else
    {
        Editor.state = EditorState.StrokeSelecting;
        $("#equation_canvas").on(this.event_strings.onMove, this.onMoveNoSelectedSegments);
        $("#equation_canvas").one(this.event_strings.onUp, this.onUpNoSelectedSegments);
        
    }
    Editor.previous_stroke_position = Editor.mouse_position.clone();
    RenderManager.render();

}

StrokeSelectMode.onMoveNoSelectedSegmentsBase = function(e){
    StrokeSelectMode.prototype.onMove.call(this, e);
    // see what we stroked through between move events
    var stroke_result = CollisionManager.get_line_collides(Editor.mouse_position_prev, Editor.mouse_position);
    // for each segment in result add to selected segments set (if they aren't there already)
    if(stroke_result.length > 0)
    {
        while(stroke_result.length > 0)
        {
            var segment = stroke_result.pop();
            Editor.add_selected_segment(segment);
        }
    }
    Editor.previous_stroke_position = Editor.mouse_position_prev.clone();
    RenderManager.render();
}

StrokeSelectMode.onUpNoSelectedSegmentsBase = function(e){
    StrokeSelectMode.prototype.onUp.call(this, e);
    $("#equation_canvas").off(this.event_strings.onMove, this.onMoveNoSelectedSegments);
    if(Editor.selected_segments.length > 0) {
        Editor.state = EditorState.SegmentsSelected;
        $("#equation_canvas").on(this.event_strings.onDown,
            this.onDownSegmentsSelected).off(this.event_strings.onDown,
            this.onDownNoSelectedSegments);
    }
        
    else
        Editor.state = EditorState.ReadyToStrokeSelect;
    RenderManager.clear_canvas();
}

StrokeSelectMode.strokeSelectTool = function()
{
    if(Editor.button_states[Buttons.Stroke].enabled == false)
        return;
    Editor.clearButtonOverlays();
    Editor.button_states[Buttons.Stroke].setSelected(true);
    
    RenderManager.colorOCRbbs(this.segment_style_class);
    RenderManager.render();
    Editor.selection_method = "Stroke";
}
