/*
	This file contains events and information specific to rectangle selection.
*/

// CMS: Perhaps just use the object in Editor.modes instead of making another
// one?
RectSelectMode.prototype = new SelectionMode();

RectSelectMode.prototype.segment_style_class = "segment_rect_select";

function RectSelectMode(){
    this.onDownNoSelectedSegments = RectSelectMode.onDownNoSelectedSegmentsBase.bind( this);
    this.onMoveNoSelectedSegments = RectSelectMode.onMoveNoSelectedSegmentsBase.bind( this);
    this.onUpNoSelectedSegments = RectSelectMode.onUpNoSelectedSegmentsBase.bind( this);
    this.displaySelectionTool = RectSelectMode.rectSelectTool.bind(this);

    if(Modernizr.touch){
        this.onDownNoSelectedSegments = EditorMode.mkIgnoreMultipleTouches(this.onDownNoSelectedSegments);
        this.onMoveNoSelectedSegments = EditorMode.mkIgnoreMultipleTouches(this.onMoveNoSelectedSegments);
        this.onUpNoSelectedSegments = EditorMode.mkIgnoreMultipleTouches(this.onUpNoSelectedSegments);
    }
}

RectSelectMode.prototype.init_mode = function(){
    SelectionMode.prototype.init_mode.call(this); 
    this.displaySelectionTool();
    $("#equation_canvas").css("cursor", "default");
    $("#equation_canvas").on(this.event_strings.onDown, this.onDownNoSelectedSegments);
    console.log("rect select");
    RenderManager.increase_stroke_opacity();
}

RectSelectMode.prototype.close_mode = function(){
    SelectionMode.prototype.close_mode.call(this);
    $("#equation_canvas").off(this.event_strings.onDown, this.onDownNoSelectedSegments);
    // CMS: TODO: When switching between stroke/rect - we should leave the
    // selected segments
    Editor.clear_selected_segments();
    RenderManager.render();
    RenderManager.decrease_stroke_opacity();
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

        // Bind events for segments selected, then trigger so that we can
        // transition straight to a move if we like
        $("#equation_canvas").off(this.event_strings.onDown, 
        this.onDownNoSelectedSegments).on(this.event_strings.onDown,
        this.onDownSegmentsSelected);

        // CMS: When testing on iOS 5, I couldn't trigger the event properly
        // without causing errors, instead I just run it here if there's a touch
        // screen and then trigger it if it isn't. 
        if(Modernizr.touch)
            this.onDownSegmentsSelected(e);
        else{
            $("#equation_canvas").trigger(this.event_strings.onDown,
            e.originalEvent);
        }
    }
    else // We are rectangle selecting
    {
        Editor.start_rect_selection = Editor.mouse_position.clone();
        Editor.end_rect_selection  = Editor.mouse_position.clone();
        Editor.state = EditorState.RectangleSelecting;
        $("#equation_canvas").on(this.event_strings.onMove, this.onMoveNoSelectedSegments);
        $("#equation_canvas").one(this.event_strings.onUp, this.onUpNoSelectedSegments);
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
    $("#equation_canvas").off(this.event_strings.onMove, this.onMoveNoSelectedSegments);

    if(Editor.selected_segments.length > 0){
        Editor.state = EditorState.SegmentsSelected;
        $("#equation_canvas").off(this.event_strings.onDown,
        this.onDownNoSelectedSegments).on(this.event_strings.onDown,
                this.onDownSegmentsSelected);
    }
    else
        Editor.state = EditorState.ReadyToRectangleSelect;
    Editor.start_rect_selection = Editor.end_rect_selection = null;
    RenderManager.render();
}

/*
    This method sets the interface right interface to the right state.
 */
RectSelectMode.rectSelectTool = function()
{
    // DEBUG: was Buttons.Box -> Buttons.Rectangle
    if(Editor.button_states[Buttons.Rectangle].enabled == false)
        return;

    Editor.clearButtonOverlays();
    Editor.button_states[Buttons.Rectangle].setSelected(true);

    RenderManager.colorOCRbbs(this.segment_style_class);
    RenderManager.render();
}
