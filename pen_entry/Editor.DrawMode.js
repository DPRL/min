/* 
* This file is part of Min.
* 
* Min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* Min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with Min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright 2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	This file contains event handlers for use in the drawing
	mode of Min.
	
	The onDownBase, onMoveBase and onUpBase methods are responsible for collecting the 
	user's mouse movement coordinates and passing each coordinate to the PenStroke object
	associated with the particular user action. It also handles the typing input medium.
	The KeyPress method retrieves each character and send them to the SymbolSegment object
	created upon keyboard stroke detection.
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
    var onDown = $.proxy(DrawMode.onDownBase, this);

    // Check for touch capability, if it exists, block multiple touches
    // TODO: Find out if we need to check for both mouse and touches
    if(Modernizr.touch)
        this.onDown = EditorMode.mkIgnoreMultipleTouches(onDown);
    else
        this.onDown = onDown;

    this.onUp = $.proxy(DrawMode.onUpBase, this);
    this.onMove = $.proxy(DrawMode.onMoveBase, this);
    this.onMouseOut = $.proxy(DrawMode.onMouseOut, this);
    this.onKeyPress = $.proxy(DrawMode.onKeyPress, this);
    this.onDoubleClick = $.proxy(DrawMode.onDoubleClick, this);
    this.selectPenTool = DrawMode.selectPenTool.bind(this);
    // List of segments associated with user's actions(click,dblclick etc)
    DrawMode.collided_segments = new Array();
    
    // An example of how to call a super method
    // DrawMode.prototype.onDown.call(this, e);
}

// DrawMode's init method. Called when entering DrawMode
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
    Editor.canvas_div.style.cursor = "crosshair";
    $(document).on('keypress', this.onKeyPress);
    Editor.sent_request = false;
    RenderManager.decrease_stroke_opacity();
}

// DrawMode's close method. Called when leaving DrawMode
DrawMode.prototype.close_mode = function(){
   if(Editor.current_text != null){
        this.stopTextInput();
        $(Editor.canvas_div).off(this.event_strings.onDown, this.stopTextInput);
   }
   Editor.canvas_div.style.cursor = "default";	
   $(Editor.canvas_div).off('mousedown touchstart', this.onDown); 
   $(Editor.canvas_div).off('mouseup touchend', this.onUp); 
   $(Editor.canvas_div).off('doubleclick', this.onDoubleClick);
   $(document).off('keypress', this.onKeyPress);
}

// Called when user is done typing on the canvas
DrawMode.prototype.stopTextInput = function(e){
    Editor.current_text.finishEntry();
    if(Editor.current_action.toString() == "EditText")
        Editor.current_action.set_current_text(Editor.current_text.text);
    else if(Editor.current_action.toString() == "AddSegments")
        Editor.current_action.buildSegmentXML();                           
        
    Editor.state = EditorState.MiddleOfStroke;
    Editor.current_text = null;

    RenderManager.render();
}
* 
* // Called when user clicks on the canvas, binds move events too
* DrawMode.onDownBase = function(e){
* 
* 	if(this.single_click)
*     { // double click
*     	this.single_click = false;
*     	$(Editor.canvas_div).off('mousemove touchmove', this.onMove);
*     	$(Editor.canvas_div).off('mouseleave', this.onMouseOut);
*     	
*     }else
*     { // single click
*     	this.single_click = true;
*     	$(Editor.canvas_div).on('mousemove touchmove', this.onMove);
*     	$(Editor.canvas_div).on('mouseleave', this.onMouseOut);
*     }
* 
*     DrawMode.prototype.onDown.call(this, e);
    // build a new stroke object and save reference so we can add new points
    Editor.current_stroke = new PenStroke(Editor.mouse_position.x,Editor.mouse_position.y, 6);
    Editor.add_action(new AddSegments(new Array(Editor.current_stroke)));
    Editor.add_segment(Editor.current_stroke);            
        
    Editor.state = EditorState.MiddleOfStroke;
    RenderManager.render();
}

// Called when user lifts mouse or hand. Finishes stroke point collection and tests
// for collision
DrawMode.onUpBase = function(e){
	if(Editor.current_stroke == null)
		return;
	this.single_click = false; // reset the boolean used to differentiate click and a dblclick
	
    DrawMode.prototype.onUp.call(this, e);
    var set_id_changes = [];
    Editor.state = EditorState.ReadyToStroke;

	f = function(){ 
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
				$.proxy(DrawMode.onDoubleClick, this);
			}; // bind last seg to dblclick
		}

		// Unbind the move action
		$(Editor.canvas_div).off(Editor.current_mode.event_strings.onMove, Editor.current_mode.onMove);
		$(Editor.canvas_div).off('mouseleave', this.onMouseOut);
	}
	setTimeout(f, 80); // Creates time for strokes to test collisions
}

DrawMode.onMouseOut = function(e){
    $(Editor.canvas_div).off(Editor.current_mode.event_strings.onMove, Editor.current_mode.onMove);
	$(Editor.canvas_div).trigger({type:Editor.current_mode.event_strings.onUp+''});
}

// Collects pen stroke points and passes it to the pen stroke object for insertion
DrawMode.onMoveBase = function(e){
    DrawMode.prototype.onMove.call(this, e);

    // add a new point to this pen stroke
    // pen automatically draws stroke when point added
    Editor.current_stroke.add_point(Editor.mouse_position);
}

// Called when the user double clicks on a segment. Opens correction menu
DrawMode.onDoubleClick = function(e){
	// All Editor Modes(RectSelect and StrokeSelect) call DrawMode's
	// onDoubleClick when in the mode and an expression is double clicked on
	// Simply unbind the events already attached in those modes.
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

// Used for typing on the canvas. Gets each typed character or keyboard stroke and 
// processes it by passing stroke to SymbolSegment object that was created.
DrawMode.onKeyPress = function(e){
    // TODO: See if there's a better way to do this that would eliminate 
    // reliance on an Editor state. Local flag?
    
    if(e.keyCode == KeyCode.enter && Editor.enterHit){
    	// detects if user used enter to stopTextInput
    	Editor.enterHit = false;
    	return;
    }
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

// Selects the pen tool from the toolbar 
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
