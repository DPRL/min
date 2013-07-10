/*
This file contains event handlers for use in the drawing
mode of Min.
*/

// For now this hierarchy doesn't matter, as we don't make instances
// of the SelectionMode. This will change.
DrawMode.prototype = new EditorMode();

DrawMode.prototype.segment_style_class = "segment_draw_mode";

function DrawMode(){
    // Call the super constructor
    // CMS: Might not need this
    EditorMode.call(this);
   
    // Make 'this' refer to this DrawMode object in 
    // the event handler.
    var onDown = DrawMode.onDownBase.bind( this);

    // Check for touch capability, if it exists, block multiple touches
    // TODO: Find out if we need to check for both mouse and touches
    if(Modernizr.touch)
        this.onDown = EditorMode.mkIgnoreMultipleTouches(onDown);
    else
        this.onDown = onDown;

    this.onUp = DrawMode.onUpBase.bind( this);
    this.onMove = DrawMode.onMoveBase.bind( this);
    this.onKeyPress = DrawMode.onKeyPress.bind( this);
    this.onDoubleClick = DrawMode.onDoubleClick.bind( this);
    this.selectPenTool = DrawMode.selectPenTool.bind(this);
    // List of segments associated with user's actions(click,dblclick etc)
    DrawMode.collided_segments = new Array();
    
    // An example of how to call a super method
    // DrawMode.prototype.onDown.call(this, e);
}

DrawMode.prototype.init_mode = function(){  
    RenderManager.colorOCRbbs(this.segment_style_class);
    this.selectPenTool();
    $("#equation_canvas").css("cursor", "default");

    /* The 'this' variable in an event handler points to the element
       that the event fired on, not the DrawMode object. Have
       JQuery pass a reference to this object to event handlers.

       Should I have just used something like EditorMode.onDown
       instead of attaching the function to the prototype?
     */
    // The boolean below is used to differentiate a click from a double click in the 
    // onDownBase function.
    this.single_click = false;
    $(Editor.canvas_div).on('mousedown touchstart',  this.onDown);
    $(Editor.canvas_div).on('mouseup touchend',  this.onUp);
    $(Editor.canvas_div).on('dblclick', this.onDoubleClick);
    $(document).on('keypress', this.onKeyPress);

}

DrawMode.prototype.close_mode = function(){
   if(Editor.current_text != null){
        this.stopTextInput();
        $(Editor.canvas_div).off(this.event_strings.onDown, this.stopTextInput);
   }

   $(Editor.canvas_div).off('mousedown touchstart', this.onDown); 
   $(Editor.canvas_div).off('mouseup touchend', this.onUp); 
   $(Editor.canvas_div).off('doubleclick', this.onDoubleClick);
   $(document).off('keypress', this.onKeyPress);
}

//var saveMouseState = function(){
//}
//
//DrawMode.prototype.getPosAndState = 

DrawMode.prototype.stopTextInput = function(e){
    Editor.current_text.finishEntry();
    if(Editor.current_action.toString() == "EditText")
        Editor.current_action.set_current_text(Editor.current_text.text);
    else if(Editor.current_action.toString() == "AddSegments")
        Editor.current_action.buildSegmentXML();                


    // build a new stroke object and save reference so we can add new points
    // Editor.current_stroke = new PenStroke(Editor.mouse_position.x,Editor.mouse_position.y, 6);
    // Editor.add_action(new AddSegments(new Array(Editor.current_stroke)));
    // Editor.add_segment(Editor.current_stroke);            
        
    Editor.state = EditorState.MiddleOfStroke;
    Editor.current_text = null;

    RenderManager.render();

}

DrawMode.onDownBase = function(e){

	if(this.single_click)
    { // double click
    	this.single_click = false;
    	$(Editor.canvas_div).off('mousemove touchmove', this.onMove);
    	
    }else
    { // single click
    	this.single_click = true;
    	$(Editor.canvas_div).on('mousemove touchmove', this.onMove);
    }

    DrawMode.prototype.onDown.call(this, e);
    // build a new stroke object and save reference so we can add new points
    Editor.current_stroke = new PenStroke(Editor.mouse_position.x,Editor.mouse_position.y, 6);
    Editor.add_action(new AddSegments(new Array(Editor.current_stroke)));
    Editor.add_segment(Editor.current_stroke);            
        
    Editor.state = EditorState.MiddleOfStroke;

    RenderManager.render();
}

DrawMode.onUpBase = function(e){
	this.single_click = false; // reset the boolean used to differentiate click and a dblclick
	
    DrawMode.prototype.onUp.call(this, e);
    var set_id_changes = [];
    Editor.state = EditorState.ReadyToStroke;
    if(Editor.current_stroke.finish_stroke()) {
        set_id_changes = Editor.current_stroke.test_collisions();
        RecognitionManager.enqueueSegment(Editor.current_stroke);
    } else {
        // This make sure that we remove the exact element of the array
        Editor.segments.splice(Editor.segments.indexOf(Editor.current_stroke), 1);
    }
    
    var stroke = Editor.current_stroke;
    Editor.current_stroke = null;
    Editor.current_action.set_id_changes = set_id_changes;
    Editor.current_action.buildSegmentXML();
    // bind the last penstroke's bounding box to a dblclick event
    var seg_array = $('.segment_draw_mode');
    if(seg_array.length > 0){
    	seg_array[seg_array.length-1].ondblclick = function(){
    		DrawMode.segment_clicked(stroke);
    		DrawMode.onDoubleClick.bind( this);}; // bind last seg to dblclick
	}

    // Unbind the move action
    $(Editor.canvas_div).off(this.event_strings.onMove, this.onMove);
}

DrawMode.onMoveBase = function(e){
    DrawMode.prototype.onMove.call(this, e);
    // add a new point to this pen stroke
    // pen automatically draws stroke when point added
    Editor.current_stroke.add_point(Editor.mouse_position);
}

DrawMode.onDoubleClick = function(e){
	// All Editor Modes(RectSelect and StrokeSelect) call DrawMode's
	// onDoubleClick when in the mode and an expression is double clicked on
	// Simple unbind the events already attached in those modes.
	var eq_canv = $("#equation_canvas").off(this.event_strings.onUp,
    this.onUpAfterMove).off(this.event_strings.onMove,
    this.beginMovingSegmentsFromMove).off(this.event_strings.onDown,
    this.onDownSegmentsSelected);
    
    var seg = DrawMode.collided_segments.pop();
    if(seg != null)
		Editor.add_selected_segment(seg);
    RenderManager.colorOCRbbs("segment_stroke_select");
    RenderManager.bounding_box.style.visibility = "visible";
    Editor.state = EditorState.SegmentsSelected;
    Editor.relabel();
    
}

DrawMode.onKeyPress = function(e){
    // TODO: See if there's a better way to do this that would eliminate 
    // reliance on an Editor state. Local flag?
    
    if(Editor.state == EditorState.MiddleOfText){
        textBox = document.getElementById("tex_result");
        if (document.querySelector(":focus") != textBox &&
                Editor.current_text != null) {
            if(e.keyCode == KeyCode.backspace){
                e.preventDefault();
                Editor.current_text.popCharacter();
            }
            else
                Editor.current_text.addCharacter(String.fromCharCode(e.which));
            
        }
        return;
    }

    textBox = document.getElementById("tex_result");
    if (document.querySelector(":focus") == textBox) {
        return;
    }

    Editor.typeTool();

    var s = new SymbolSegment(Editor.mouse_position);
    Editor.current_text = s;
    Editor.current_text.addCharacter(String.fromCharCode(e.which));

    Editor.state = EditorState.MiddleOfText;

    // Set up this event to fire and stop text input if the mouse goes down
    $(Editor.canvas_div).one('mousedown touchstart', this.stopTextInput);

}

DrawMode.selectPenTool = function()
{
    Editor.clearButtonOverlays();
    
    Editor.button_states[Buttons.Pen].setSelected(true);
    Editor.clear_selected_segments();
    Editor.current_stroke = null;
    
    switch(Editor.state)
    {
    case EditorState.MiddleOfText:
        Editor.current_text.finishEntry();
        if(Editor.current_action.toString() == "EditText")
            Editor.current_action.set_current_text(Editor.current_text.text);
        else if(Editor.current_action.toString() == "AddSegments")
            Editor.current_action.buildSegmentXML();
        Editor.current_text = null;
        break;
    }

    Editor.state = EditorState.ReadyToStroke;
    RenderManager.colorOCRbbs(this.segment_style_class);
    RenderManager.render();
}

// adds a clicked segment to the collided_segments array
DrawMode.segment_clicked = function(segment)
{
	if(DrawMode.collided_segments.contains(segment))
		return;

	DrawMode.collided_segments.push(segment);
}
