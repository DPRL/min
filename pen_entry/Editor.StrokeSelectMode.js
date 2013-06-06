/*
This file contains events and information specific to stroke selection.
*/

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
// For now this hierarchy doesn't matter, as we don't make instances
// of the SelectionMode. This will change.
StrokeSelectMode.prototype = new SelectionMode();


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
    /*if(Editor.selected_segments.length > 0)
    {
        // nothing selected at the moment, add all below mouse click to selected
        // add the last guy in the list (probably most recently added) to selected set
        var segment = Editor.selected_segments[Editor.selected_segments.length-1];
        for(var k = 0; k < Editor.segments.length; k++){
        	if(Editor.segments[k].set_id == segment.set_id)
				Editor.add_selected_segment(Editor.segments[k]); 
        }
        Editor.add_action(new TransformSegments(Editor.selected_segments));
        Editor.state = EditorState.SegmentsSelected;

    } else
    {*/
    	StrokeSelectMode.add_event_to_segments();
        Editor.state = EditorState.StrokeSelecting;
        $("#equation_canvas").on(this.event_strings.onMove, this.onMoveNoSelectedSegments);
        $("#equation_canvas").one(this.event_strings.onUp, this.onUpNoSelectedSegments);
        
    //}
    Editor.previous_stroke_position = Editor.mouse_position.clone();
    RenderManager.render();

}

StrokeSelectMode.onMoveNoSelectedSegmentsBase = function(e){
    StrokeSelectMode.prototype.onMove.call(this, e);
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
    else{
        Editor.state = EditorState.ReadyToStrokeSelect;
    }
    for(var i=0; i < Editor.selected_segments.length; i++){
    		$(Editor.segments[i].root_svg).off('mouseover');
    }
    RenderManager.clear_canvas();
}

StrokeSelectMode.strokeSelectTool = function()
{
    if(Editor.button_states[Buttons.Stroke].enabled == false)
        return;
    Editor.clearButtonOverlays();
    Editor.button_states[Buttons.Stroke].setSelected(true);
    
    RenderManager.colorOCRbbs("segment_stroke_select");
    RenderManager.render();
    Editor.selection_method = "Stroke";
}

StrokeSelectMode.add_collided_segments = function(i)
{
	return function() { console.log("I is: " + i); };
	// return (function(e){
// 		var segment = Editor.segments[i];
// 		if(Editor.selected_segments.contains(segment))
// 			return;
// 
// 		Editor.add_selected_segment(segment);
// 	});
}

StrokeSelectMode.add_event_to_segments = function(){ 
	console.log('add_event_to_segments');
//		for(var i=0; i < Editor.segments.length; i++){
//     	$(Editor.segments[i].root_svg).one('mouseover', StrokeSelectMode.add_collided_segments(i));
//     }
		console.log(Editor.segments[0].root_svg);
		console.log(Editor.segments[1].root_svg);
	   	$(Editor.segments[0].root_svg).on('mouseover', StrokeSelectMode.add_collided_segments(0));
      	$(Editor.segments[1].root_svg).one('mouseover', StrokeSelectMode.add_collided_segments(1));

}