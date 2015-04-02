/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	This file, Classifier, sends the collected points from the user to the classifier.
	When the result is returned, it parses the recognition result and adds it to the 
	RecognitionManager's result table.
*/

function Classifier()
{
    
}

/*
  This function takes a list of segments to be classified and organizes them into groups
  based on which classification server that they use so that the requests can all be sent at once.
*/
Classifier.prototype.group_by_server = function(in_segments){
    var classification_groups = {};
    for(var k = 0; k < in_segments.length; k++){
        var classification_server = in_segments[k].classification_server;
        
        // If this is a server we haven't encountered yet, add it
        if(!classification_groups[classification_server])
            classification_groups[classification_server] = new Array();

        // Add this segment to the list of segments associated with the current classification_server
        classification_groups[classification_server].push(in_segments[k]);
    }

    return classification_groups;
}

/*
	Sends the request to the appropriate classifier. Inserts response in the RecognitionManager's
	result_table and can be looked up using the set_id
*/
Classifier.prototype.request_classification = function(server_url, in_segments, should_segment){
    // change this to an asynchronous thing later

    // This assumes that each type of object uses the same type of list for segments
    var sb = new StringBuilder();
    sb.append("?segmentList=<SegmentList>");
    for(var k = 0; k < in_segments.length; k++)
        sb.append(in_segments[k].toXML());
    
    sb.append("</SegmentList>");
    if(should_segment == true)
        sb.append("&segment=true");
    else
        sb.append("&segment=false");
    
    $.get
    (
        server_url + sb.toString(), 
        function(data, textStatus, xmlhttp)
        {

            // build each recognition result from the xml
            var xmldoc = data;

            var result_list = xmldoc.getElementsByTagName("RecognitionResults");

            // If there are ConnectedComponents coming back, then create ImageBlobs on the canvas
            // assuming that there is just one image blob for classification
            if(xmldoc.getElementsByTagName("ConnectedComponents").length != 0){
                in_segments = ImageBlob.populateCanvasFromCCs(xmldoc, new Vector2(in_segments[0].image.width,
                                                                                  in_segments[0].image.height)); 
            }

            f = function(){
                for(var k = 0; k < result_list.length; k++)
                {
                    var recognition = new RecognitionResult();
                    recognition.fromXML(result_list[k]);

                    // identify which passed in segments belong to which set (based on classifier segmentation)
                    for(var i = 0; i < in_segments.length; i++)
                    {
                        for(var j = 0; j < recognition.instance_ids.length; j++)
                        {

                            if(in_segments[i].instance_id == recognition.instance_ids[j])
                            {
                                in_segments[i].set_id = recognition.set_id;
                                break;
                            }
                        }
                    }
                    RecognitionManager.result_table.push(recognition);
                }
                RenderManager.render();
            }
            if(xmldoc.getElementsByTagName("ConnectedComponents").length == 0){
            	f();
            }else{
        		setTimeout(f, 300); // Give enough time for images to load, there's probably a better way to do this
        	}
      
        }
    );
}

// Request classification by calling the request_classification method
Classifier.prototype.classify = function(in_segments, should_segment)
{
    var classification_groups = this.group_by_server(in_segments);
    var keys = Object.keys(classification_groups);
    for(var n = 0; n < keys.length; n++){
        this.request_classification(ClassificationServers[keys[n]], classification_groups[keys], should_segment);
    }
}
/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	This object is the parent of all modes for the editor.
	It defines the interface that an editor mode should have and also
	contains code to be used by all events descended from it.

	This constructor will check if we're on a touch device or a computer
	and then select the appropriate events from that.
*/
function EditorMode(){
    if(Modernizr.touch){
        this.onDown = EditorMode.onTouchStart;
        this.onMove = EditorMode.onTouchMove;

        /* 
        On mobile devices both a mouse event and a touch event could fire this
        creates problems in some cases such as when we need to check the number
        of touches. EventStrings are what we should use to bind in each case.
        Note that hammer events aren't included, they are fine with their own
        strings for now.
        */
        this.event_strings = {
            "onDown": "touchstart",
            "onMove": "touchmove",
            "onUp": "touchend"
            };
    }
    else{
        this.onDown = EditorMode.onMouseDown;
        this.onMove = EditorMode.onMouseMove;
        this.event_strings = {
            "onDown": "mousedown",
            "onMove": "mousemove",
            "onUp": "mouseup"
            };
    }
}

/*
This function is used for when we first switch into a mode in order
to set things up. e.g bind the event listeners, change colors, etc.
*/
EditorMode.prototype.init_mode = function(){
    alert("init_mode not implemented!");
}

/*
This function is used for when we are finished with a mode
and need to do teardown, such as unbinding event handlers.
*/
EditorMode.prototype.close_mode = function(){
    alert("close_mode not implemented!");
}

EditorMode.prototype.allEvents = function(e){
    this.tmpLast = Editor.lastEvent;
    Editor.lastEvent = e.originalEvent;
}

// Code to run for all modes with a mouse 
EditorMode.onMouseDown = function(e){
    this.allEvents(e);

    if(e.button == 0){
        Editor.mouse_position_prev = Editor.mouse_position;
        Editor.mouse_position = new Vector2(e.pageX - Editor.div_position[0], e.pageY - Editor.div_position[1]);
    }
}

// Code to run for all modes with a touch pad on touch
EditorMode.onTouchStart = function(e){
    this.allEvents(e);
    var first = e.originalEvent.changedTouches[0];
    Editor.mouse_position_prev = Editor.mouse_position;
    Editor.mouse_position = new Vector2(first.pageX - Editor.div_position[0], first.pageY - Editor.div_position[1]);
}

// Initial actions for a move event with a mouse.
EditorMode.onMouseMove = function(e){
    this.allEvents(e);
    Editor.mouse_position_prev = Editor.mouse_position;
    Editor.mouse_position = new Vector2(e.pageX - Editor.div_position[0], e.pageY - Editor.div_position[1]);
    Editor.mouse_move_distance = Vector2.Distance(Editor.mouse_position, Editor.mouse_position_prev);
}

// Initial actions for move with a finger
EditorMode.onTouchMove = function(e){
    this.allEvents(e);
    var first = e.originalEvent.changedTouches[0];
    Editor.mouse_position_prev = Editor.mouse_position;
    Editor.mouse_position = new Vector2(first.pageX - Editor.div_position[0], first.pageY - Editor.div_position[1]);
    Editor.mouse_move_distance = Vector2.Distance(Editor.mouse_position, Editor.mouse_position_prev);

}

EditorMode.prototype.onUp = function(e){
    this.allEvents(e);
}

EditorMode.prototype.onDoubleClick = function(e){
    this.allEvents(e);
}

/*
    This function creates another function for switching into
    a new mode. The returned function can then be bound to a
    button.
*/
    
EditorMode.mkModeSwitchFn = function(new_mode){
    return function(e){
       if(Editor.current_mode != null)
            Editor.current_mode.close_mode();
       
       Editor.current_mode = new_mode;
       Editor.current_mode.init_mode();
    };
}

// What do do for every keypress event in a mode
EditorMode.onKeyPress = function(e){
    this.allEvents(e);
    // TODO: This should eventually be uncommented
    //if(e.keyCode == KeyCode.enter) {
    //    Editor.search();
    //    return;
    //} 
}

/*
    This function take an event handler and returns a new one which
    will ignore multiple touches. This function assumes we will be receiving a
    jquery event.
*/
EditorMode.mkIgnoreMultipleTouches = function(wrap_fn){
    return function(e){
        // originalEvent is because JQuery only copies some event properties
        if(e.originalEvent.touches.length > 1)
            return;

        wrap_fn(e);
    };
}
/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
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
 
 // Called when user clicks on the canvas, binds move events too
 DrawMode.onDownBase = function(e){
 
 	if(this.single_click)
     { // double click
     	this.single_click = false;
     	$(Editor.canvas_div).off('mousemove touchmove', this.onMove);
     	$(Editor.canvas_div).off('mouseleave', this.onMouseOut);
     	
     }else
     { // single click
     	this.single_click = true;
     	$(Editor.canvas_div).on('mousemove touchmove', this.onMove);
     	$(Editor.canvas_div).on('mouseleave', this.onMouseOut);
     }
 
     DrawMode.prototype.onDown.call(this, e);
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
/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	This file contains events handlers that are used in Selection modes specifically the 
	rectangle selection mode currently present.
*/

SelectionMode.prototype = new EditorMode();

function SelectionMode(){
    
    this.onDownSegmentsSelected =
        SelectionMode.onDownSegmentsSelectedBase.bind( this);
    this.beginMovingSegmentsFromMove =
        SelectionMode.beginMovingSegmentsFromMove.bind( this);
    this.moveSegmentsFromMove =
        SelectionMode.moveSegmentsFromMoveBase.bind( this);
    this.onUpAfterMove = SelectionMode.onUpAfterMoveBase.bind( this);
    this.touchAndHold = SelectionMode.touchAndHold.bind( this);
    this.resizeSegmentsOnMove = SelectionMode.resizeSegmentsOnMoveBase.bind(this);
    this.onDoubleClick = SelectionMode.onDoubleClick.bind(this);
    this.onUpAfterResize = SelectionMode.onUpAfterResizeBase.bind(this);    

    if(Modernizr.touch){
        $("#bounding_box").hammer({
            transform: true,
            scale_threshold: .1,
            drag_min_distance: 0,
            // These events need to be suppressed because sometimes they would fire during
            // a transform and prevent ontransformend from being run, leaving the editor in a bad state.
            drag: false,
            swipe: false
            });

        this.onPinchStart = SelectionMode.onPinchStart.bind( this);
        this.onPinch = SelectionMode.onPinch.bind( this);
        this.onPinchEnd = SelectionMode.onPinchEnd.bind( this);
        this.onDownSegmentsSelected =
            EditorMode.mkIgnoreMultipleTouches(this.onDownSegmentsSelected);
        this.moveSegmentsFromMove =
            EditorMode.mkIgnoreMultipleTouches(this.moveSegmentsFromMove);
        this.resizeSegmentsOnMove =
            EditorMode.mkIgnoreMultipleTouches(this.resizeSegmentsOnMove);
        this.onDoubleClick =
            EditorMode.mkIgnoreMultipleTouches(this.onDoubleClick);
        this.onUpAfterResize =
        EditorMode.mkIgnoreMultipleTouches(this.onUpAfterResize);    
    }
}


SelectionMode.prototype.init_mode = function(){
    console.log("SelectionMode init_mode");

    // These gesture* events are iOS specific
    $("#bounding_box").hammer().on("ontransformstart gesturestart",
    this.onPinchStart).on("ontransform gesturechange",
    this.onPinch).on("ontransformend gestureend", this.onPinchEnd);
    $(document).on("keypress", SelectionMode.onKeyPress);
}

SelectionMode.prototype.close_mode = function(){
    $("#bounding_box").hammer().off("ontransformstart gesturestart",
    this.onPinchStart).off("ontransform gesturechange",
    this.onPinch).off("ontransformend gestureend", this.onPinchEnd);

    $("#equation_canvas").off(this.event_strings.onDown,
    this.onDownSegmentsSelected);
    $(document).off("keypress", SelectionMode.onKeyPress);
}

/*
    If touch and hold is happening, unbind the events.
*/
SelectionMode.touchAndHold = function(e){
    var eq_canv = $("#equation_canvas").off(this.event_strings.onUp,
    this.onUpAfterMove).off(this.event_strings.onMove,
    this.beginMovingSegmentsFromMove).off(this.event_strings.onDown,
    this.onDownSegmentsSelected);

    this.onDoubleClick(e);
}

//-----------------
// Hammer Events
// ----------------
//   - onPinchStart 
//   - onPinch
//   - onPinchEnd
SelectionMode.onPinchStart = function(e){ // e is a Hammer.js event
    // TODO: Bind/unbind the touchstart function to prevent that behavior from
    // happening here. Rebind in onPinchEnd.
    $("#equation_canvas").off("touchstart", this.onDownSegmentsSelected);

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

    // originalEvent in this case is the Hammer event
    var scale = e.originalEvent.scale;
    // TODO: See if this can be removed when the other events won't conflict
    // with it.
    if(scale == 0)
        return;
    for(var n = 0; n < Editor.selected_segments.length; n++){
        Editor.selected_segments[n].resize(this.anchor, new
        Vector2(scale, scale));
    }

    Editor.update_selected_bb();
    RenderManager.render();
}

SelectionMode.onPinchEnd = function(e){
    // End the transform
    for(var n = 0; n < Editor.selected_segments.length; n++){
        Editor.selected_segments[n].freeze_transform();
    }
    Editor.current_action.add_new_transforms(Editor.selected_segments);
    Editor.update_selected_bb();
    RenderManager.render();

    Editor.moveQueue = null;

    $("#equation_canvas").on(this.event_strings.onDown,
        this.onDownSegmentsSelected);
}

SelectionMode.resizeSegmentsOnMoveBase = function(e){
    SelectionMode.prototype.onMove.call(this, e);
    var offset = Vector2.Subtract(Editor.mouse_position, Editor.mouse_position_prev);
    var bb = Editor.original_bb;
    var anchor;

    switch(Editor.grabbed_edge)
    {
        // top edge
        case 0:
            offset.x = 0.0;
            offset.y *= -1.0;
            anchor = new Vector2(bb.mins.x, bb.maxs.y);
            break;
            // top right corner
        case 1:
            offset.y *= -1.0;
            anchor = new Vector2(bb.mins.x, bb.maxs.y);
            break;
            // right edge
        case 2:
            offset.y = 0.0;
            anchor = bb.mins;
            break;
            // bottom right corner
        case 3:
            anchor = bb.mins;
            break;
            // bottom edge
        case 4:
            anchor = new Vector2(bb.maxs.x, bb.mins.y);
            offset.x = 0.0;
            break;
            // bottom left corner
        case 5:
            anchor = new Vector2(bb.maxs.x, bb.mins.y);
            offset.x *= -1.0;
            break;
            // left edge
        case 6:
            anchor = bb.maxs
                offset.x *= -1.0;
            offset.y = 0.0;
            break;
            // top left corner
        case 7:
            offset.x *= -1.0;
            offset.y *= -1.0;
            anchor = bb.maxs;
            break;
    }
    Editor.resize_offset.Add(offset);
    var bb_size = Vector2.Subtract(bb.maxs, bb.mins);

    var scale = new Vector2((Editor.resize_offset.x / bb_size.x) + 1.0, (Editor.resize_offset.y / bb_size.y) + 1.0);

    if((isNaN(scale.x) || isNaN(scale.y)) == false && (scale.x == 0.0 || scale.y == 0) == false)
    {
        for(var k = 0; k < Editor.selected_segments.length; k++)
            Editor.selected_segments[k].resize(anchor, scale);
        Editor.update_selected_bb();
        RenderManager.render();
    }
}

SelectionMode.onDownSegmentsSelectedBase = function(e){    
    SelectionMode.prototype.onDown.call(this, e);
    var click_edge = Editor.selected_bb.edge_clicked(Editor.mouse_position);
    // check for resizing
    // CMS: TODO?: make this an event on just the bb handles. 
    if(click_edge != -1)
    {
        Editor.add_action(new TransformSegments(Editor.selected_segments));
        Editor.state = EditorState.Resizing;
        Editor.grabbed_edge = click_edge;
        Editor.resize_offset = new Vector2(0,0);
        Editor.original_bb = Editor.selected_bb.clone();
        $("#equation_canvas").on(this.event_strings.onMove,
        this.resizeSegmentsOnMove).one(this.event_strings.onUp,
        this.onUpAfterResize);
    }
    else
    {
        $("#equation_canvas").one(this.event_strings.onUp, this.onUpAfterMove);
        // check translate
        if(Editor.selected_bb.point_collides(Editor.mouse_position))
        {
            Editor.add_action(new TransformSegments(Editor.selected_segments));
            Editor.moveQueue = new BoundedQueue(Editor.moveQueueLength);
            Editor.moveQueue.enqueue(new Vector2(e, Editor.mouse_position.clone()));
            
            this.timeoutID = window.setTimeout(this.touchAndHold,
                    Editor.touchAndHoldTimeout, e);

            $("#equation_canvas").one(this.event_strings.onMove,
            this.beginMovingSegmentsFromMove);
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
               
                this.timeoutID = window.setTimeout(this.touchAndHold,
                        Editor.touchAndHoldTimeout, e); 
                $("#equation_canvas").one(this.event_strings.onMove,
                        this.beginMovingSegmentsFromMove);
            }
            // selecting none
            else
            {
                $("#equation_canvas").off(this.event_strings.onDown,
                this.onDownSegmentsSelected).off(this.event_strings.onUp,
                this.onUpAfterMove);
				
				// Rect Selection
				Editor.start_rect_selection = Editor.mouse_position.clone();
				Editor.end_rect_selection  = Editor.mouse_position.clone();
				Editor.state = EditorState.RectangleSelecting;    

                // Go back to whatever selection type we were using
                $("#equation_canvas").on(this.event_strings.onDown,
                        Editor.current_mode.onDownNoSelectedSegments);

                if(Modernizr.touch){
                    Editor.current_mode.onDownNoSelectedSegments(e);
                }
                else{
                    $("#equation_canvas").trigger(this.event_strings.onDown, e);
                }
            }
        }
        RenderManager.render();
    }
}

/**
   Move all selected segments between two positions. 
   This is a utility method, not an event.

   @param previous A Vector2 of the previous mouse position
   @param current A Vector2 of the current mouse position
**/
SelectionMode.moveSegments = function(previous, current){
    var translation = Vector2.Subtract(current, previous);
    for(var k = 0; k < Editor.selected_segments.length; k++)
    {
    	seg = Editor.selected_segments[k];
        seg.translate(translation);
    }
    Editor.selected_bb.translate(translation);
}

// This method has to be called once to start the mouse movement.
// It then binds the method to use from then on
SelectionMode.beginMovingSegmentsFromMove = function(e){
    // Clear the timeout so the menu doesn't appear
    window.clearTimeout(this.timeoutID);
    SelectionMode.prototype.onMove.call(this, e);
    Editor.state = EditorState.MovingSegments;
    Editor.moveQueue = new BoundedQueue(Editor.moveQueueLength);
    Editor.moveQueue.enqueue(new Vector2(e, Editor.mouse_position.clone()));
    $("#equation_canvas").on(this.event_strings.onMove, this.moveSegmentsFromMove);
    $("#equation_canvas").one(this.event_strings.onUp, this.onUpAfterMove);
}

// Awkward name, try to change this later
SelectionMode.moveSegmentsFromMoveBase = function(e){
    SelectionMode.prototype.onMove.call(this, e);
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

        if (singleObject > 0) {
            Editor.relabel(function(){
                Editor.current_mode.displaySelectionTool();
                $("#equation_canvas").on(this.event_strings.onDown,
                    this.onDownSegmentsSelected);
            }.bind(this));
        } else {
            Editor.groupTool();
            $("#equation_canvas").on(this.event_strings.onDown,
                    this.onDownSegmentsSelected);
        }
    
}

SelectionMode.onUpAfterMoveBase = function(e){
    window.clearTimeout(this.timeoutID);

    // We're done moving for now, so make sure these events aren't bound
    $("#equation_canvas").off(this.event_strings.onMove,
    this.moveSegmentsFromMove).off(this.event_strings.onMove,
    this.beginMovingSegmentsFromMove).off(this.event_strings.onMove,
    this.resizeSegmentsOnMove);

    // RLAZ: delete strokes if cursor moves out of the window.
    var canvasDims = document.getElementById('equation_canvas').getBoundingClientRect();
    var toolbarDims = document.getElementById('toolbar').getBoundingClientRect();

    var theEvent = e;
    var offSet = 10;
    if(e.originalEvent.type == "touchend") {
        theEvent = e.originalEvent.changedTouches[0];
    }

    /*
      This momentum code is adapted from code at http://jsfiddle.net/529KH/

      The license information on jsfiddle is as follows:
      Created and maintained by Piotr and Oskar.

      Hosted by DigitalOcean.

      It wouldn't exist without MooTools community.

      License

      All code belongs to the poster and no license is enforced.

      We are not responsible or liable for any loss or damage of any kind during the usage of provided code.
     */
    
    // Continue moving if there is momentum
    var recent = Editor.moveQueue.slice(-1)[0];
    var oldest = Editor.moveQueue.slice(0, 1)[0]
    var recent_pos = recent.y;
    var oldest_pos = oldest.y; 
    var recent_ts = recent.x.timeStamp;
    var oldest_ts = oldest.x.timeStamp;
    var delta_T = recent_ts - oldest_ts;
    
    var deltas = Vector2.Subtract(recent_pos, oldest_pos);
    var distance = Vector2.Distance(recent_pos, oldest_pos);
    // velocity in each dimension
    var velocity = new Vector2(Math.max(Math.min(deltas.x/delta_T, 1), -1),
                               Math.max(Math.min(deltas.y/delta_T, 1), -1));
    var duration = Math.max(velocity.x, velocity.y) * 2000;
    velocity = Vector2.Multiply(10, velocity);

    console.log("velocity outside: " + velocity);
    var box_momentum = function(step, duration, velocity, position, lastStepTime){
        if(duration < 0 || step < 0)
            return;

        var now = new Date();
        var stepDuration = now.getTime() - lastStepTime.getTime();
        var new_velocity = Vector2.Multiply(step * 1/10, velocity);

        var new_pos = Vector2.Add(position, Vector2.Multiply(stepDuration/4, velocity));
        SelectionMode.moveSegments(position, new_pos);
        Editor.current_action.add_new_transforms(Editor.selected_segments);
        RenderManager.render();
        
        if(new_pos.x > Editor.canvas_width || new_pos.x < 0
           || new_pos.y > Editor.canvas_height || new_pos.y < 0){
            /*
              Users will expect that when they undo, the
              object will both be undeleted and move to the
              starting position. Use a composite action to
              achieve this.
            */
            console.log("Deleting.");
            // Need to bind the movement functions for no selection
            // Can't use 'this' because of setTimeout's behavior
            $("#equation_canvas").off(Editor.current_mode.event_strings.onDown,
            Editor.current_mode.onDownSegmentsSelected).on(Editor.current_mode.event_strings.onDown,
            Editor.current_mode.onDownNoSelectedSegments);

            var action = new CompositeAction();

            // Delete the segments that were thrown off the screen
            var del_action = new DeleteSegments(Editor.selected_segments);
            del_action.Apply();
            Editor.clearSelectedSegments();

            // Create a composite object and register it with the Editor
            action.add_action(Editor.current_action);
            Editor.add_action(action);
            action.add_action(del_action);

            return;
        }
        window.setTimeout(box_momentum, 15, step - 1, duration - stepDuration, new_velocity, new_pos, now);
        
    }
    if(distance > 100){
        console.log("Editor state: " + Editor.state);
        window.setTimeout(box_momentum, 15, 10, duration, velocity, recent_pos, new Date());
        return;
    }

    // ipad: touchend occurs when finger physically leaves the screen.
    if (theEvent.pageX < offSet || theEvent.pageX > canvasDims.right - offSet ||
        theEvent.pageY  < toolbarDims.bottom || 
        theEvent.pageY > canvasDims.height - 2 * offSet ) {
        Editor.deleteTool();
    } else {
        Editor.state = EditorState.SegmentsSelected;
        Editor.current_action.add_new_transforms(Editor.selected_segments);
    }
}

SelectionMode.onKeyPress = function(e){
    if ( Editor.segments.length > 0
            && ( e.keyCode == KeyCode.left_arrow || e.keyCode == KeyCode.up_arrow ||
                e.keyCode == KeyCode.right_arrow || e.keyCode == KeyCode.down_arrow ) ) {

        if ( Editor.selected_segments.length == 0 ) {
            var seg_to_add = Editor.segments[ Editor.segments.length - 1 ];
            var seg_set_id = seg_to_add.set_id;
            for ( var i = 0; i < Editor.segments.length; i++ ) {
                if ( Editor.segments[ i ].set_id == seg_set_id ) Editor.add_selected_segment( Editor.segments[ i ] );
            }
            Editor.state = EditorState.SegmentsSelected;
            RenderManager.render();                    
        } else {

            var cur_seg = Editor.selected_segments[ 0 ]; // use first for location
            var cur_seg_loc = new Vector2( ( cur_seg.translation.x + ( cur_seg.translation.x + cur_seg.size.x ) ) / 2, ( cur_seg.translation.y + ( cur_seg.translation.y + cur_seg.size.y ) ) / 2 );
            var filter;

            switch ( e.keyCode ) {
                case KeyCode.left_arrow:
                    filter = function( s ) { return s.translation.x <= cur_seg.translation.x; };
                    break;

                case KeyCode.up_arrow: 
                    filter = function( s ) { return s.translation.y <= cur_seg.translation.y; };
                    break;

                case KeyCode.right_arrow:
                    filter = function( s ) { return s.translation.x >= cur_seg.translation.x; };
                    break;

                case KeyCode.down_arrow:
                    filter = function( s ) { return s.translation.y >= cur_seg.translation.y; };
                    break;

                default:
                    break;
            }

            var min_dist = -1;
            var min_dist_index = -1;

            for ( var n = 0; n < Editor.segments.length; n++ ) {
                var seg = Editor.segments[ n ];
                if ( seg.set_id == cur_seg.set_id || !filter( seg ) ) continue;

                var seg_loc = new Vector2(( seg.translation.x + seg.translation.x + seg.size.x ) / 2, ( seg.translation.y + seg.translation.y + seg.size.y ) / 2);

                var dist = Vector2.Distance( seg_loc, cur_seg_loc );
                if ( min_dist == -1 || dist < min_dist ) {
                    min_dist = dist;
                    min_dist_index = n;
                }
            }

            if ( min_dist_index == -1 ) return; // min_dist_index = Editor.segments.length - 1;

            Editor.clear_selected_segments();

            var seg_to_add = Editor.segments[ min_dist_index ];
            var seg_set_id = seg_to_add.set_id;
            for ( var i = 0; i < Editor.segments.length; i++ ) {
                if ( Editor.segments[ i ].set_id == seg_set_id ) Editor.add_selected_segment( Editor.segments[ i ] );
            }

            RenderManager.render();
        }
    } else {
        // These keycodes seem not to work properly in both the old version 
        // and this one.
        switch ( String.toLowerCase(String.fromCharCode(e.which))) {
            case KeyCode.group:
                Editor.groupTool();
                break;
            case KeyCode.relabel:
                Editor.relabel();
                break;
            case KeyCode.pen:
                Editor.selectPenTool();
                break;
            default:
        }
    }
}

SelectionMode.onUpAfterResizeBase = function(e){
    SelectionMode.prototype.onUp.call(this, e);
    $("#equation_canvas").off(this.event_strings.onMove,
    this.resizeSegmentsOnMove);
    for(var k = 0; k < Editor.selected_segments.length; k++)
        Editor.selected_segments[k].freeze_transform();
    Editor.current_action.add_new_transforms(Editor.selected_segments);
    RenderManager.render();
    Editor.resize_offset = new Vector2(0,0);
}
/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
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

// RectSelectMode's init method. Called when entering RectSelectMode
RectSelectMode.prototype.init_mode = function(){
    SelectionMode.prototype.init_mode.call(this); 
    this.displaySelectionTool();
    $("#equation_canvas").css("cursor", "default");
    $("#equation_canvas").on(this.event_strings.onDown, this.onDownNoSelectedSegments);
    console.log("rect select");
    RenderManager.increase_stroke_opacity();
}
// RectSelectMode's close method. Called when leaving RectSelectMode
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
/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
		Contains code for managing the canvas. Originally there was supposed to be a canvas for each
        layer (image layer, stroke layer, bounding box layer), but currently Min is implemented with
        only one.

        Methods:
                1. save_state/restore_state: Save and restore Min states in their
                entirety. Currently not used.
                2. 
                3. add_selected_segment - Mark a segment as selected so the bounding box appears
                around it.
                4. update_selected_bb - Update the location and size of the bounding box based on
                the location and sizes of the selected segments.
                5. remove_segment/remove_selected_segment
                6. add_canvas - create a canvas and add it to the list of contexts (canvases)
*/

function Editor() { }
    

// Possible EditorModes
Editor.modes = {
    "DrawMode": new DrawMode(),
    "RectSelectMode": new RectSelectMode(),
};

// Code for modes/mode switching
Editor.current_mode = null;

Editor.instance = null;

Editor.initialize = function(in_equation_canvas_name, in_toolbar_name)
{
	// Make this red in annotation mode, as a reminder.
	Editor.segment_color = "#FF4444"; 

	// Support other tablet devices.
    Editor.using_tablet = Modernizr.touch;
	if(Editor.using_tablet == true)
    {
		$('body').addClass('touch');
        // removeh over css
        for(var i = 0; i < document.styleSheets.length; i++)
        {
            if ( document.styleSheets[ i ].rules != null ) {
                for(var j = 0; j < document.styleSheets[i].rules.length; j++)
                {
                    if(document.styleSheets[i].rules[j].cssText.match("hover") != null)
                    {
                        document.styleSheets[i].deleteRule(j--);
                    }
                }
            }
        }
        
        // Disabled. Kept as a clue for later on.
        //document.getElementById( "getInkMLbutton" ).innerHTML = "Save InkML";
    }
    
    Editor.canvas_div = document.getElementById(String(in_equation_canvas_name));
    Editor.toolbar_div = document.getElementById(String(in_toolbar_name));

    // canvas size beneath
    Editor.fit_to_screen();

    // array of div elements
    Editor.toolbar_buttons = new Array();
    
    // set up our divs (canvas, toolbar);
    Editor.build_buttons(in_toolbar_name);
	
	// top left hand corner of our canvases relative to window
    Editor.div_position = findPosition(Editor.canvas_div);
    
    // build our layers (two of each for double buffering)
    Editor.contexts = new Array();
    Editor.canvases = new Array();
    
    // get our convases
    Editor.add_canvas();     // canvas 0 - pen strokes

    // initialize managers
    RenderManager.initialize(Editor.canvas_width, Editor.canvas_width, Editor.canvases.length);
    CollisionManager.initialize();
    RecognitionManager.initialize();
    CorrectionMenu.initialize();

	// initialize slider
	Editor.slider = new Slider();

    // create the event bindings.
    Editor.setup_events();
    
    // list of segments we deal with
    Editor.segments = new Array();
    // segments currently selected
    Editor.selected_segments = new Array();

    // bounding box before we started resizing
    Editor.original_bb = null;
    // current bounding box
    Editor.selected_bb = null;
    
    // variables for resizing
    Editor.selected_size = new Vector2(0,0);
    Editor.selected_position = new Vector2(0,0);
    Editor.resize_offset = new Vector2(0,0);
    
    // can be either "Stroke" or "Rectangle"
    Editor.selection_method = null;
    
    // start and end positions for rectangle selection
    Editor.start_rect_selection = null;
    Editor.end_rect_selection = null;
    Editor.previous_stroke_position = null;
    
    // the stroke currently being created
    Editor.current_stroke = null;
    // an image object the load method will set
    Editor.temp_image = null;
    // a text object the user can type into
    Editor.current_text = null;
    // the edge we are currently grabbing in resize mode
    Editor.grabbed_edge = -1;

    // initialize mouse variables
    Editor.mouse1_down = false;
    Editor.mouse2_down = false;
    Editor.mouse_position = new Vector2(-1,-1);
    Editor.mouse_position_prev = new Vector2(-1,-1);
    
    Editor.undo_stack = new Array();
    Editor.redo_stack = new Array();
    Editor.action_list = new Array();
    
    Editor.current_action = null;
    
    
	Editor.FileReader = true;

	// When we first start, switch to DrawMode.
    $("#pen").trigger('click'); 



    Editor.current_expression_id = 0;

}

Editor.set_current_expression_id = function(id) {
    Editor.current_expression_id = id;
    RenderManager.render();
    Editor.clear_selected_segments();
}

Editor.save_state = function(clear)
{
    var state = {
        segments: [],
		recognition_results: []
    };
    
	for (var i = 0; i < Editor.segments.length; i++) {
        var seg = Editor.segments[i];
        state.segments.push(seg.save_state());
    }
    for (var i = 0; i < RecognitionManager.result_table.length; i++) {
        var result = RecognitionManager.result_table[i];
        state.recognition_results.push(result.save_state());
    }
	if (clear) {
		RecognitionManager.result_table = [];
	}
    return JSON.stringify(state);
}

Editor.restore_state = function(json_string)
{
    var state = JSON.parse(json_string);
    for (var i = 0; i < state.segments.length; i++) {
        seg_state = state.segments[i];
        var seg;
        switch(seg_state.type_id) {
            case PenStroke.type_id:
                seg = PenStroke.restore_state(seg_state);
                break;
            case SymbolSegment.type_id:
                seg = SymbolSegment.restore_state(seg_state);
                break;
        }
        Editor.add_segment(seg);
    }
    for (var i = 0; i < state.recognition_results.length; i++) {
        result = state.recognition_results[i];
		RecognitionManager.result_table.push(RecognitionResult.restore_state(result));
	}
	RenderManager.render();
}

// RZ: new (?) method to obtain the unique set ids for selected objects.
Editor.get_selected_set_ids = function()
{
	var idsFound = new Array();
	for (var k = 0; k < Editor.selected_segments.length; k++)
	{
		nextId = Editor.selected_segments[k].set_id;
		if ( ! idsFound.contains(nextId) )
			idsFound.push(nextId);
	}
	return idsFound;
}

// determines if the given segment is in the selected list
Editor.segment_selected = function(in_segment)
{
    for(var k = 0; k < Editor.selected_segments.length; k++)
    {
        if(Editor.selected_segments[k] == in_segment)
            return true;
        
		if(Editor.selected_segments[k].type_id == SegmentGroup.type_id)
        {
            if(Editor.selected_segments[k].contains_segment(in_segment))
                return true;
        }
    }
    
    return false;
}


// RZ: recover symbols using data and methods already in the grouping
// objects.
Editor.forget_symbol_groups = function()
{
	// Undo symbol groupings backward in time (on the Undo stack)
	for (var i = Editor.undo_stack.length - 1; i > -1; i--) 
	{
		nextAction = Editor.undo_stack[i];
		if (nextAction.isGrouping )
		{
			//console.log("forgetting..." + i);
			nextAction.ForgetSymbolGrouping();
			//console.log("Segment ids: " + Editor.get_current_segment_ids().length);
			//console.log(Editor.get_current_segment_ids());
		} else if (nextAction.isComposite)
		{
			for (var j = nextAction.action_list.length - 1; j > -1; j--)
			{
				nextCompositeAction = nextAction.action_list[j];
				if (nextCompositeAction.isGrouping)
				{
					//console.log("forgetting...compound " + i + " action " + j);
					nextCompositeAction.ForgetSymbolGrouping();
					//console.log("Segment ids: " + Editor.get_current_segment_ids().length);
					//console.log(Editor.get_current_segment_ids());
				}
			}
		}
	}
}

Editor.restore_symbol_groups = function()
{
	// Undo symbol groupings backward in time (on the Undo stack)
	for (var i = 0; i < Editor.undo_stack.length; i++)
	{
		nextAction = Editor.undo_stack[i];
		if (nextAction.isGrouping )
		{
			//console.log("restoring..." + i);
			nextAction.RestoreSymbolGrouping();
			//console.log("Segment ids:" + Editor.get_current_segment_ids().length);
			//console.log(Editor.get_current_segment_ids());
		} else if (nextAction.isComposite)
		{
			for (var j = 0; j < nextAction.action_list.length; j++)
			{
				nextCompositeAction = nextAction.action_list[j];
				if (nextCompositeAction.isGrouping)
				{
					//console.log("restoring...compound " + i + " action " + j);
					nextCompositeAction.RestoreSymbolGrouping();
					//console.log("Segment ids:" + Editor.get_current_segment_ids().length);
					//console.log(Editor.get_current_segment_ids());
				}
			}
		}
	}
}



// RZ: New method to get the current segment id set. Have to
// perform a linear scan of all the (primitive) segments to
// obtain this.
Editor.get_current_segment_ids = function()
{
	var result = new Array();

	for (var i = 0; i < Editor.segments.length; i++) {
		nextId = Editor.segments[i].set_id;
		if (! result.contains(nextId) )
			result.push(nextId);
	}
	return result;
}

Editor.get_segment_by_id = function(in_id)
{
    var result = new Array();

    for(var k = 0; k < Editor.segments.length; k++)
    {
        if(Editor.segments[k].set_id == in_id)
            result.push(Editor.segments[k]);
    }
    return result;
}

// add a segment to the editor's selected list
Editor.add_selected_segment = function(in_segment)
{
    if(Editor.selected_segments.contains(in_segment))
        return;

    var segment_mins = in_segment.worldMinPosition();
    var segment_maxs = in_segment.worldMaxPosition();

    var segment_draw_mins = in_segment.worldMinDrawPosition();
    var segment_draw_maxs = in_segment.worldMaxDrawPosition();
    
    // update selected bounding box
    if(Editor.selected_segments.length == 0)
    {
        Editor.selected_bb = new BoundingBox(segment_mins, segment_maxs, segment_draw_mins, segment_draw_maxs);
    }
    else
    {
        for(var k = 0; k < Editor.selected_segments.length; k++)
            if(Editor.selected_segments[k] == in_segment)
                return;
        // update logical extents
        if(segment_mins.x < Editor.selected_bb.mins.x)
            Editor.selected_bb.mins.x = segment_mins.x;
        if(segment_mins.y < Editor.selected_bb.mins.y)
            Editor.selected_bb.mins.y = segment_mins.y;
        
        if(segment_maxs.x > Editor.selected_bb.maxs.x)
            Editor.selected_bb.maxs.x = segment_maxs.x;
        if(segment_maxs.y > Editor.selected_bb.maxs.y)
            Editor.selected_bb.maxs.y = segment_maxs.y;
            
        // update render extents
        if(segment_draw_mins.x < Editor.selected_bb.render_mins.x)
            Editor.selected_bb.render_mins.x = segment_draw_mins.x;
        if(segment_draw_mins.y < Editor.selected_bb.render_mins.y)
            Editor.selected_bb.render_mins.y = segment_draw_mins.y;
        
        if(segment_draw_maxs.x > Editor.selected_bb.render_maxs.x)
            Editor.selected_bb.render_maxs.x = segment_draw_maxs.x;
        if(segment_draw_maxs.y > Editor.selected_bb.render_maxs.y)
            Editor.selected_bb.render_maxs.y = segment_draw_maxs.y;
    }

    // finally add to the selected lsit
    Editor.selected_segments.push(in_segment);
}

// updates the extents of the selected bounding box
Editor.update_selected_bb = function()
{
    if(Editor.selected_segments.length == 0)
    {
        Editor.selected_bb = null;
        return;
    }
    else if(Editor.selected_segments.length == 1)
    {
        Editor.selected_bb = new BoundingBox(Editor.selected_segments[0].worldMinPosition(), Editor.selected_segments[0].worldMaxPosition(), Editor.selected_segments[0].worldMinDrawPosition(), Editor.selected_segments[0].worldMaxDrawPosition());
    }
    else
    {
        var mins = Editor.selected_segments[0].worldMinPosition();
        var maxs = Editor.selected_segments[0].worldMaxPosition();
        
        var render_mins = Editor.selected_segments[0].worldMinDrawPosition();
        var render_maxs = Editor.selected_segments[0].worldMaxDrawPosition();
        
        for(var k = 1; k < Editor.selected_segments.length; k++)
        {
            // lgoical extents
            var seg_mins = Editor.selected_segments[k].worldMinPosition();
            var seg_maxs = Editor.selected_segments[k].worldMaxPosition();
            
            if(seg_mins.x < mins.x)
                mins.x = seg_mins.x;
            if(seg_mins.y < mins.y)
                mins.y = seg_mins.y;
                
            if(seg_maxs.x > maxs.x)
                maxs.x = seg_maxs.x;
            if(seg_maxs.y > maxs.y)
                maxs.y = seg_maxs.y;
            
            // render extents
            var render_seg_mins = Editor.selected_segments[k].worldMinDrawPosition();
            var render_seg_maxs = Editor.selected_segments[k].worldMaxDrawPosition();
            
            if(render_seg_mins.x < render_mins.x)
                render_mins.x = render_seg_mins.x;
            if(render_seg_mins.y < render_mins.y)
                render_mins.y = render_seg_mins.y;
                
            if(render_seg_maxs.x > render_maxs.x)
                render_maxs.x = render_seg_maxs.x;
            if(render_seg_maxs.y > render_maxs.y)
                render_maxs.y = render_seg_maxs.y;            
        }
        Editor.selected_bb = new BoundingBox(mins, maxs, render_mins, render_maxs);
    }
}

// adds segment to be managed to the editor
Editor.add_segment = function(in_segment)
{
    if(Editor.segments.contains(in_segment))
        return;
    
    Editor.segments.push(in_segment);
}

// removes a segment from the editor's control
Editor.remove_segment = function(in_segment)
{
    if(in_segment == null) return;

    var ui = Segment.unique_id(in_segment);
    for(var k = 0; k < Editor.segments.length; k++)
    {
        if(Segment.unique_id(Editor.segments[k]) == ui)
        {
            Editor.segments.splice(k, 1);
            break;
        }
    }
}

Editor.remove_selected_segment = function(in_segment)
{
    if(in_segment == null) return;
    for(var k = 0; k < Editor.selected_segments.length; k++)
        if(Editor.selected_segments[k] == in_segment)
        {
            Editor.selected_segments.splice(k, 1);
            return;
        }
    
}

sort_segments = function(a, b)
{
    return a.set_id - b.set_id;
}

// empties selected segments list
Editor.clear_selected_segments = function()
{
    Editor.selected_segments.length = 0;
    Editor.selected_bb = null;
    Editor.selected_position = new Vector2(0,0);
    Editor.selected_size = new Vector2(0,0);
}

// adds a new canvas to the contexts list 
Editor.add_canvas = function()
{
    var svg_canvas = Editor.build_canvas();
    svg_canvas.style.zIndex = Editor.canvases.length;
	Editor.canvases.push(svg_canvas);
    Editor.canvas_div.appendChild(svg_canvas);
    Editor.contexts.push(svg_canvas);
    
	// OLD
	// var canvas = Editor.build_canvas();
    // canvas.style.zIndex = Editor.canvases.length;
    // Editor.canvases.push(canvas);
    // Editor.canvas_div.appendChild(canvas);
    //Editor.contexts.push(canvas);
}

// Builds the canvas which is an SVG object
Editor.build_canvas = function()
{
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("onclick", "event.preventDefault();");
	svg.setAttribute("ontouchmove", "event.preventDefault();");
	svg.setAttribute("ontouchstart", "event.preventDefault();");
	svg.setAttributeNS(null,"width", Editor.canvas_width);
	svg.setAttributeNS(null,"height", Editor.canvas_height);
	svg.style.position = "absolute";
	svg.setAttributeNS(null,"tabindex", "0");
	svg.style.left = "0px";
	svg.style.top = "0px";
	return svg;
}

Editor.add_action = function(action)
{
    Editor.redo_stack.length = 0;
    
    if(Editor.undo_stack.length > 0)
    {
        var prev_action = Editor.undo_stack.pop();
        if(prev_action.shouldKeep() == true)
            Editor.undo_stack.push(prev_action);
    }

    if(Editor.action_list.length > 0)
    {
        var prev_action = Editor.action_list.pop();
        if(prev_action.shouldKeep() == true)
            Editor.action_list.push(prev_action);
    }
    
    Editor.undo_stack.push(action);
    Editor.current_action = action;
    Editor.action_list.push(action);
}

Editor.undo = function()
{
    if(Editor.button_states[Buttons.Undo].enabled == false)
        return;

    //Editor.clear_selected_segments();
    while(Editor.undo_stack.length > 0)
    {
        
        var action = Editor.undo_stack.pop();
		console.log("Undo stack contains: " + Editor.undo_stack.length);
		console.log("   Undone: " + action);
		if(action.shouldKeep())
        {
            action.Undo()
            Editor.redo_stack.push(action);
            switch(Editor.state)
            {
                case EditorState.StrokeSelecting:
                    Editor.state = EditorState.ReadyToStrokeSelect;
                    break;
                case EditorState.RectangleSelecting:
                    Editor.state = EditorState.ReadyToRectangleSelect;
                    break;
                case EditorState.MiddleOfStroke:
                    Editor.state = EditorState.ReadyToStroke;
                    break;
                case EditorState.MiddleOfText:
                    Editor.state = EditorState.ReadyForText;
            }
            
            
            RenderManager.render();
            Editor.action_list.push(new Undo());
            return;
        }
    }
}

Editor.redo = function()
{
    if(Editor.button_states[Buttons.Redo].enabled == false)
        return;

    if(Editor.redo_stack.length > 0)
    {
        var action = Editor.redo_stack.pop();
   		console.log("Redo stack contains: " + Editor.redo_stack.length);
		console.log("   Redone: " + action);

		action.Apply();
		Editor.undo_stack.push(action);
        Editor.action_list.push(new Redo());
		
		RenderManager.render();
    }
}

Editor.printUndoStack = function()
{
    console.log("---");
    for(var k = 0; k < Editor.undo_stack.length; k++)
    {
        console.log(Editor.undo_stack[k].toXML());
    }
}

// Opens correction menu upon click on change recognition button
Editor.open_correction_menu = function(e)
{
	if(Editor.selected_segments.length > 0){
		var eq_canv = $("#equation_canvas").off(Editor.current_mode.event_strings.onUp,
    	Editor.current_mode.onUpAfterMove).off(Editor.current_mode.event_strings.onMove,
    	Editor.current_mode.beginMovingSegmentsFromMove).off(Editor.current_mode.event_strings.onDown,
    	Editor.current_mode.onDownSegmentsSelected);
		RenderManager.bounding_box.style.visibility = "visible";
    	Editor.state = EditorState.SegmentsSelected;
    	Editor.relabel();
	}
}

////////////////////////////////////////////////////////////////////////////////////
// Generating CROHME InkML Output
////////////////////////////////////////////////////////////////////////////////////

// DIFFERS from min : used by the slider in the GT version.
Editor.getStrokeString = function() {	
    var segments = new Array();
    var segarray = Editor.segments.slice( 0 );
    segarray.sort( function( o1, o2 ) { return o1.instance_id - o2.instance_id } );

	var inkml="";
	for ( var i = 0; i < segarray.length; i++ ) {
        var stroke = segarray[ i ];
        var strokeid = stroke.instance_id;
        var segid = stroke.set_id;
        
        // translation for absolute positioning
        var tx = stroke.translation.x;
        var ty = stroke.translation.y;
        var sx = stroke.scale.x;
        var sy = stroke.scale.y;
        // add to proper segment
        if ( segments[ segid ] == null ) segments[ segid ] = new Array();
        segments[ segid ].push( strokeid );
        
        // add stroke data to inkml
        inkml += "\n<trace id=\"" + strokeid + "\" seg=\"" + segid + "\">";
        var strokedata = new Array();
        for ( var j = 0; j < stroke.points.length; j++ ) {
            strokedata.push( ( ( stroke.points[ j ].x * sx ) + tx ) + " " + ( ( stroke.points[ j ].y * sy ) + ty ) );
        }
        inkml += strokedata.join( ", " );
        inkml += "\n</trace>";        
    }
	return inkml;
}
    

// RZ: moved here from Editor.align, so that it could be used elsewhere easily.
Editor.MathJaxRender = function(tex_math)
{
	// Divs used for alignment   
	// !! RZ: This was tricky to find - this is how the expression
	//     becomes centered/moved after 'align' operations - see style.css.
	var outer_div = document.createElement("div");
	outer_div.setAttribute("id","outer_div");

	// Get BB (min, max coordinates) for segments on the canvas
	// or selection.
	var s = Editor.get_seg_dimensions(Editor.segments);
	if (Editor.selected_segments.length > 0 && EditorState.SegmentsSelected)
		s = Editor.get_seg_dimensions(Editor.selected_segments);

	// Main div with content in it
	var elem = document.createElement("div");
	elem.setAttribute("id","Alignment_Tex");
	elem.style.visibility = "hidden";
	elem.style.fontSize = "500%";
	elem.style.position = "absolute";
	elem.innerHTML = '\\[' + tex_math + '\\]'; 	// So MathJax can render it

	outer_div.appendChild(elem);
	Editor.canvas_div.appendChild(outer_div);

	// Change rendered to SVG and have MathJax display it
	// First re-render, then copy tex to the outer_div/canvas.
	MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "SVG"]);
	MathJax.Hub.Queue(["Rerender", MathJax.Hub, elem], 
			[ function() { 
				MathJax.Hub.Queue(["Typeset", MathJax.Hub, elem], 
					[Editor.copy_tex, elem, outer_div, s]);
				}]);

}


// Generate (CROHME) InkML output.
Editor.getInkML = function() {
	// Break groups apart so that segments match symbols, not whole symbol groups.
	Editor.forget_symbol_groups();

    var inkml = "<!-- CROHME InkML Data File -->\n<ink xmlns=\"http://www.w3.org/2003/InkML\">";
    
	// Annotation data - for ground truthing tool (*** DIFFERS FROM new min)
	inkml += "\n<traceFormat>";
	inkml += "\n<channel name=\"X\" type=\"decimal\"/>";
	inkml += "\n<channel name=\"Y\" type=\"decimal\"/>";
	inkml += "\n</traceFormat>";
	inkml += "\n<annotation type=\"truth\">$ " + Editor.slider.getCurrentExpression() + "$</annotation>";
	inkml += "\n<annotation type=\"writer\">" + Editor.slider.getCurrentFileName() + "</annotation>";
	
	//var strString = Editor.stroke_string; // Prevent modifying stroke attributes.
	// RZ: line below will use stroke string; but when annotating, we only want to use
	// the original stroke data collected from a writer.
	var strString = Editor.getStrokeString();

	// Find and replace segment id's, which may change.
    // slice(0) copies all elements of the array, which we then sort by
	// instance (i.e. primitive) identifier.
	var segarray = Editor.segments.slice( 0 );
    segarray.sort( function( o1, o2 ) { return o1.instance_id - o2.instance_id } );
	for ( var i = 0; i < segarray.length; i++ ) {
        var stroke = segarray[ i ];
        var strokeid = stroke.instance_id;
        var segid = stroke.set_id;
        
		console.log("Replace stroke id " + strokeid + " segment id as " + segid);

        // Replace segment id for each stroke.
		//console.log("strokeid: " + strokeid + " segid: " + segid);
		pattern = new RegExp("\"" + strokeid + "\" seg=\"\\d+\"","g");
		replacement = "\"" + strokeid + "\" seg=\"" + segid + "\"";
		strString = strString.replace(pattern,replacement);
	}
    inkml += strString;
	inkml += "\n</ink>";

	// Restore the symbol groupings (to keep canvas state consistent).
	Editor.restore_symbol_groups();

	return inkml;
}

/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/* 
	This file contains events that are permanent and remain unchanged
	throughout throughout a run of Min. e.g. buttons and their event handlers.
	
	This method also handles URL argument passing which currently only works with TeX. 
	It retrieves the TeX from the URL, renders it using MathJax, creates a new TeX_Input 
	object for each character and adds it to the canvas.
	
	This file is also responsible for all drag and drop operations in Min.
*/

function PermEvents(){}

/* 	Add events to buttons, checks for window.filereader and if available insert the 
	image upload button also adds keyboard shortcuts
*/
PermEvents.setup_toolbar = function(){
    $("#pen").click(EditorMode.mkModeSwitchFn(Editor.modes.DrawMode));

    $("#change_recognition").click(Editor.open_correction_menu);
    
    $("#rectangle_select").click(EditorMode.mkModeSwitchFn(Editor.modes.RectSelectMode));

    document.getElementById("undo").addEventListener("click", Editor.undo, true);
    document.getElementById("redo").addEventListener("click", Editor.redo, true);
    document.getElementById("align").addEventListener("click",Editor.align, true);
	document.getElementById("create_grid").addEventListener("click", Editor.createGrid, true);
    document.getElementById("search").addEventListener("click", Editor.search, true);
    document.getElementById("add").addEventListener("click", function() { Editor.slider.addSlide(); }, true);
    document.getElementById("remove").addEventListener("click", function() { Editor.slider.removeSlide(); }, true);
	
    document.getElementById("pen").addEventListener("mouseover",Editor.showToolTip("pen", "Draw"), true);
    document.getElementById("change_recognition").addEventListener("mouseover",Editor.showToolTip("change_recognition","Change Symbol"), true);
    document.getElementById("rectangle_select").addEventListener("mouseover",Editor.showToolTip("rectangle_select","Select"), true);
    document.getElementById("upload_image").addEventListener("mouseover",Editor.showToolTip("upload_image","Load Image"), true);
    document.getElementById("undo").addEventListener("mouseover",Editor.showToolTip("undo","Undo"), true);
    document.getElementById("redo").addEventListener("mouseover",Editor.showToolTip("redo","Redo"), true);
    document.getElementById("align").addEventListener("mouseover",Editor.showToolTip("align","Parse"), true);
    document.getElementById("create_grid").addEventListener("mouseover",Editor.showToolTip("create_grid","Grid"), true);
    document.getElementById("search").addEventListener("mouseover",Editor.showToolTip("search","Search"), true);
    document.getElementById("add").addEventListener("mouseover",Editor.showToolTip("add","Add expression"), true);
    document.getElementById("remove").addEventListener("mouseover",Editor.showToolTip("remove","Delete expression"), true);
    
    //Keyboard shortcuts. This makes adding keyboard shortcuts easy. You can just type the keyboard
    // symbol and method to call on keypress like below.
    $.ctrl('Z', Editor.undo);
    $.ctrl('Y', Editor.redo);

    // add an upload image button to the canvas if this is supported
    if(window.FileReader){
        $("#upload_image").removeClass("hidden_toolbar_button");
        var file_input = document.createElement("input");
        var button_div = document.getElementById("upload_image");
        
        file_input.type = "file";
        file_input.id = "upload_image_input";
        file_input.style.display = "none";
        file_input.addEventListener("change", Editor.onImageLoad, true);

        button_div.appendChild(file_input);
        
        // Pass a click on the button div to the invisible file input
        button_div.addEventListener("mousedown", function(e){
            var file_input = document.getElementById("upload_image_input");        
            file_input.click();
        }, true);
        
    }
    // HTML5's drag and drop implemented below
    if(Modernizr.draganddrop && window.FileReader){ // check if browser supports drag and drop
    	var dropzone = $('#equation_canvas');
    	var text =  document.getElementsByClassName("Drop_text")[0];
        dropzone.on('dragover', function(e) {
        	text.style.display = "block";
        	dropzone.addClass('hover');
        	e.stopPropagation();
			e.preventDefault();
			return false;
		});
		dropzone.on('dragleave', function(e) {
			text.style.display = "none";
			dropzone.removeClass('hover');
			e.stopPropagation();
			e.preventDefault();
			return false;
		});
		dropzone.on('drop', function(e) {
			//prevent browser from opening the file after drop off
			text.style.display = "none";
			e.stopPropagation();
			e.preventDefault();
			dropzone.removeClass('hover');
			var file = e.originalEvent.dataTransfer.files;
			// Check if the type is a text file, if so parse it and get tex
			if(file[0].type == "text/plain")
				PermEvents.parse_text_file(file[0]);
			else
				Editor.ParseImage(file[0]);
			return false;
		});
    }
}

PermEvents.setup_window = function(){
    window.addEventListener("resize", Editor.fit_to_screen, true);
    window.addEventListener("orientationchange", Editor.fit_to_screen, false);

    // Prevent problem behavior from the iPad canvas.
    Editor.canvas_div.setAttribute("ontouchmove", "event.preventDefault();");
}

PermEvents.setup_document = function(){
    $(document).keypress(Editor.onKeyPress);
    $(document).keydown(Editor.mapCanvasBackspace);
}

// Parses a text file for Tex
PermEvents.parse_text_file = function(file){
	default_position_specified = false;
	var reader = new FileReader();
	reader.onload = function(e){
		tex = e.target.result;
		PermEvents.Start_TeX_Input(tex);
	};
	reader.readAsText(file);
}

					/** Tex Input starts here **/

// Checks Min's URL for any TeX parameter. If there is, create a new TeX_Input and
// move the rendered TeX(using MathJax) to the canvas
PermEvents.check_url = function(){
	// get the encoded query string.
    var query = window.location.search.slice(9);
    if(query){
    	tex = decodeURIComponent(query); // decode it to get its latex
		default_position_specified = false;
    	PermEvents.Start_TeX_Input(tex);
    }
}

// Inputs TeX from any source(Text files, URL parameter) into Min using MathJax
PermEvents.Start_TeX_Input = function(tex){
	var elem = document.createElement("div");
	elem.setAttribute("id","Hidden_Tex");
	elem.style.visibility = "hidden";
	elem.style.position = "absolute";
	elem.style.fontSize = "800%";
	elem.innerHTML = '\\[' + tex + '\\]'; 	// So MathJax can render it
	document.body.appendChild(elem); 
	
	// Change renderer to svg and make sure it has been processed before calling
	// PermEvents.callBack
	MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "SVG"]);
    MathJax.Hub.Queue(["Rerender", MathJax.Hub,elem], [function(){ 
    		MathJax.Hub.Queue(["Typeset",MathJax.Hub,elem], [PermEvents.stub,elem]);
    }]);
}

// Scales the Tex to fit canvas width and height before insertion
PermEvents.scale_tex = function(elem){
	var equation_canvas_width = $("#equation_canvas")[0].offsetWidth;
	var equation_canvas_height = $("#equation_canvas")[0].offsetHeight;
	var MathJax_div = document.getElementsByClassName("MathJax_SVG")[0].firstChild.getBoundingClientRect();
	var math_width = Math.round(MathJax_div.width);
	var math_height = Math.round(MathJax_div.height);
	if(default_position_specified){
		math_width += drop_position.x;
		math_height += drop_position.y;
	}
	if(math_width > (equation_canvas_width-15) || math_height > (equation_canvas_height-15)){ 
		elem.style.fontSize =  (parseInt(elem.style.fontSize.split("%")[0]) - 10) + "%";
		MathJax.Hub.Queue(["Rerender",MathJax.Hub,elem], [$.proxy(PermEvents.scale_tex(elem), this)]);
	}else{
		return;
	}
}
// Method that just helps with the recursion in scale_tex
PermEvents.stub = function(elem){
	PermEvents.scale_tex(elem); // scale tex
	PermEvents.MoveSVGSegmentsToCanvas(elem);
	document.body.removeChild(elem); // Remove elem from document body (Import done)
}

// Copies the rendered SVG in elem to the canvas
PermEvents.MoveSVGSegmentsToCanvas = function(elem){
	var svg_root = document.getElementById("Hidden_Tex").getElementsByClassName("MathJax_SVG")[0].firstChild;
	var use_tag_array = svg_root.getElementsByTagName("use");
	if(default_position_specified)
		default_position = drop_position; // Slider to canvas drop
	else{
		if(svg_root.getBoundingClientRect().width > 800){ // long expressions
			default_position = new Vector2(0,150); // arbitrary position on the screen
		}else{
			default_position = new Vector2(400,150); // arbitrary position on the screen
		}
	}
	var rect_tag_array = svg_root.getElementsByTagName("rect");
	use_tag_array = Array.prototype.slice.call(use_tag_array);
	rect_tag_array = Array.prototype.slice.call(rect_tag_array);
	var elements_array = use_tag_array.concat(rect_tag_array);
	var initial_offset; // Used to keep segments at user's click position
	for(var i = 0; i < elements_array.length; i++){
		var offset = $(elements_array[i]).offset();
		if(i == 0)
			initial_offset = offset;
		// Set up prototype inheritance chain and call query reformation 
		TeX_Input.prototype.__proto__ = subclassOf(PenStroke);
		var in_x = Math.round(default_position.x + offset.left-initial_offset.left);
		var in_y = Math.round(default_position.y + offset.top-initial_offset.top);
		var pen_stroke = new TeX_Input(elements_array[i], in_x, in_y, 6, null);
		pen_stroke.initialize(svg_root, i, elements_array[i].tagName.toString());
		
		// Add the pen_stroke object to the Editor
		Editor.add_action(new AddSegments(new Array(pen_stroke)));
		Editor.add_segment(pen_stroke);
		RenderManager.render();
		pen_stroke.correct_flip();
		Editor.state = EditorState.ReadyToStroke;
		RecognitionManager.addRecognitionForText(pen_stroke);
	}
	MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "HTML-CSS"]);
    MathJax.Hub.Queue(["Rerender", MathJax.Hub],[function(){
    	Editor.slider.updateSlide(tex); 		// Update the current slide
    }]);
}

// Used to implement inheritance
function subclassOf(base){
	_subclassOf.prototype= base.prototype;
    return new _subclassOf();
}
function _subclassOf() {};

/*
	I had to separate the drag and drop because methods that works for the desktops
	won't work for touch devices. All have the same basic structure though
*/

// Not really necessary but served a purpose during implementation
PermEvents.slider_dragging = function(e){
	if(Modernizr.touch){
		var first = e.originalEvent.changedTouches[0];
		if(parseInt(first.pageY) > 85 && (!PermEvents.first_drag_over)){
			$(e.currentTarget).on(Editor.current_mode.event_strings.onUp, PermEvents.slider_touch_done);
			PermEvents.drag_started = PermEvents.first_drag_over = true;
		}
	}
}

// Sets up the events that should happen upon clicking the slider
PermEvents.slider_touch_mouse_down = function(e){
	e.preventDefault();
	$(e.currentTarget).on(Editor.current_mode.event_strings.onMove, PermEvents.slider_dragging);
}

// Gets called on mouse up and calls function that inserts tex into min and canvas
PermEvents.slider_touch_done = function(e){
	if(PermEvents.drag_started){
		e.stopPropagation();
		e.preventDefault();
		PermEvents.drag_started = PermEvents.first_drag_over = false;
		default_position_specified = true;
		tex = Editor.slider.getCurrentExpression();
		var first = e.originalEvent.changedTouches[0];
		drop_position = new Vector2(first.pageX - Editor.div_position[0], first.pageY - Editor.div_position[1]);
		$(e.currentTarget).off(Editor.current_mode.event_strings.onMove, PermEvents.slider_dragging);
		Editor.canvas_div.style.cursor = "default";
		PermEvents.Start_TeX_Input(tex);
	}
}

/** Desktop Drop and Drag **/
// Sets up the events that should happen upon clicking the slider
PermEvents.slider_desktop_mouse_down = function(e){
	PermEvents.drag_started = true;
	Editor.current_mode.close_mode();
	$("#equation_canvas").on(Editor.current_mode.event_strings.onMove, PermEvents.slider_dragging);
	$("#equation_canvas").on(Editor.current_mode.event_strings.onUp, PermEvents.desktop_drag_done);
	if(navigator.userAgent.search("Firefox") != -1)
		Editor.canvas_div.style.cursor = "-moz-grabbing";
	else
		Editor.canvas_div.style.cursor = "-webkit-grabbing";
	e.preventDefault();
}

// Gets called on mouse up and calls function that inserts tex into min and canvas
PermEvents.desktop_drag_done = function(e){
	if(PermEvents.drag_started){
		e.stopPropagation();
		e.preventDefault();
		PermEvents.drag_started = false;
		default_position_specified = true;
		tex = Editor.slider.getCurrentExpression();
		drop_position = new Vector2(e.pageX - Editor.div_position[0], e.pageY - Editor.div_position[1]);
		$(".slider").trigger("mouseup");
		$("#equation_canvas").off("mousemove", PermEvents.slider_dragging);
		Editor.canvas_div.style.cursor = "default";
		PermEvents.Start_TeX_Input(tex);
		Editor.current_mode.init_mode();
	}
}

// Initializes Editor.current_mode
PermEvents.slider_desktop_end = function(e){
	Editor.current_mode.close_mode();
	$(".slider").trigger("mouseup");
	$("#equation_canvas").off("mousemove", PermEvents.slider_dragging);
	$("#equation_canvas").off("mouseup", PermEvents.desktop_drag_done);
	Editor.canvas_div.style.cursor = "default";
	Editor.current_mode.init_mode();
	e.stopPropagation();
	e.preventDefault();
}
/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	This class contains some of the logic and events for the Editor as a whole. 
        
        Events are defined for the following:
			onImageLoad (browsers supporting FileReader only)
        Methods that change the state of the editor are:
               1. groupTool - Adds selected segments to one segment group.
               2. deleteTool
               3. typeTool
               4. relabel
               5. clear
        Other methods:
               1. align - Align objects on the canvas and populate the query bar with a LaTeX
               string.
               2. createGrid - Convert objects into a grid (e.g. matrix).
               2. search - submit the LaTeX query to a search engine.
    		      etc
*/

var EditorState = 
    {
        // select tool states
        "ReadyToStrokeSelect" : 14,
        "StrokeSelecting" : 15,
		"ReadyToRectangleSelect" : 2,
        "RectangleSelecting" : 3,
        
        // pen states
        "ReadyToStroke" : 4, 
        "MiddleOfStroke" : 5,

        // text tool states
        "ReadyForText" : 6, "MiddleOfText" : 7,

        // Segment (and primitive) selection, labeling
        "SegmentsSelected" : 8,
        "MovingSegments" : 9,
        "Resizing" : 10,
        "Relabeling" : 11,
        "PinchResizing": 12,

        // Editing text box.
        "InTextBox" : 13,

        // New: moving a symbol in edit mode; touch and hold state.
    };

var TouchAndHoldState = {
    "NoTouchAndHold": 0,
    "MouseDownAndStationary": 1,
    "FingerDownAndStationary": 2 // same as the above state, but happening on a touchscreen
};

Editor.lastEvent = null;
Editor.moveQueue = null;
Editor.touchAndHoldFlag = TouchAndHoldState.NoTouchAndHold;

Editor.texFiles = "";
Editor.texFileList = "";
Editor.dataCollection = false;
Editor.stroke_string = "";

// Called when Min is starting up. Just calls other methods
Editor.setup_events = function()
{
    var button_index = 0; // Sets default initial state (pen/touch entry)
    Editor.timeStamp = null;
    Editor.prevTimeStamp = null;
    
    PermEvents.setup_window();

    PermEvents.setup_toolbar();
    PermEvents.setup_document();
    PermEvents.check_url();

	//var dataCollection = Editor.dataCollection;

    // Select the pen tool
	Editor.button_states[Buttons.Pen].enabled = true;
}


// RESTORED from earlier code.
Editor.setCursor = function ()
{
    var canvas = document.getElementById("equation_canvas");

    switch (Editor.state) 
    {
    case EditorState.StrokeSelecting:
    case EditorState.ReadyToStrokeSelect:
        canvas.style.cursor = "crosshair";
        break;
    default:
        canvas.style.cursor = "default";
        break;
    }
}


Editor.fit_to_screen = function(event)
{
    var root_div = document.getElementById("equation_editor_root");
    root_div.style.width = window.innerWidth + "px";
    root_div.style.height = window.innerHeight + "px";
    
    Editor.canvas_width = Editor.canvas_div.offsetWidth;
    Editor.canvas_height = Editor.canvas_div.offsetHeight;
    
    Editor.div_position = findPosition(Editor.canvas_div);
    
    window.scroll(0,0);
}

Editor.mapCanvasBackspace = function(e)
{
    if(e.keyCode == KeyCode.backspace)
    {
		// HACK: no text box now.
        // (for ground truth tools)
        textBox = document.getElementById("tex_result");
        if (document.querySelector(":focus") == textBox) {
            // Act as normal.
        } else {
            // If we're not in the text box, need to avoid going 'back'
            // when we press backspace in Safari and some other browsers.
            switch (Editor.state)
            {
            case EditorState.MiddleOfText:
                //e.preventDefault();
                //Editor.current_text.popCharacter();
                break;
            default:
                // Otherwise, delete any selections.
                e.preventDefault();
                Editor.deleteTool();
                $("#equation_canvas").off("keypress",Editor.current_mode.close_mode()).on("keypress", Editor.current_mode.init_mode());
				break;
            }
        }

        if(e.keyCode == KeyCode.del) {
            Editor.deleteTool();
            $("#equation_canvas").off("keypress",Editor.current_mode.close_mode()).on("keypress", Editor.current_mode.init_mode());
        }
    }
}


Editor.onKeyPress = function(e)
{
    // For touch-and-hold
    Editor.lastEvent = e;

    if (Editor.touchAndHoldFlag == TouchAndHoldState.MouseDownAndStationary)
        return;


    if(e.keyCode == KeyCode.enter && Editor.state == EditorState.MiddleOfText) {
    	$(Editor.canvas_div).off(Editor.current_mode.event_strings.onDown, Editor.current_mode.stopTextInput);
    	Editor.current_mode.stopTextInput(e);
    	e.stopPropagation();
    	Editor.enterHit = true;
        return;
    }
 
    // RLAZ: skip deletes (46) and backspaces (8), handled in mapCanvasBackspace()
    if(e.keyCode == KeyCode.backspace || e.keyCode == KeyCode.del)
        return;
}

// Calls DRACULAE 
Editor.align = function()
{
    switch(Editor.state)
    {
    case EditorState.MiddleOfText:
        Editor.current_text.finishEntry();
        if(Editor.current_action.toString() == "EditText")
            Editor.current_action.set_current_text(Editor.current_text.text);
        else if(Editor.current_action.toString() == "AddSegments")
            Editor.current_action.buildSegmentXML();                
        Editor.current_text = null;
    }
    RenderManager.clear_canvas();

    // an array of tuples
    // recognition result, min bb, max bb, set id
    var data = new Array();

    // iterate through all of the segment sets and identify each 
	// bounding box (and symbol)
    
	// segments are in order by set id
	// add null pointer so we can easily render last set in list
    
    var segSet = Editor.segments;
	if (Editor.state == EditorState.SegmentsSelected && 
		Editor.selected_segments.length > 0)
		segSet = Editor.selected_segments; 
	segSet.push(null);    
    
    var set_segments = new Array();
	for(var k = 0; k < segSet.length; k++)
    {
        var seg = segSet[k];
        if(set_segments.length == 0)
            set_segments.push(seg);
        else if(seg == null || seg.set_id != set_segments[0].set_id)
        {
            var mins = set_segments[0].worldMinPosition();
            var maxs = set_segments[0].worldMaxPosition();
            
            for(var j = 1; j < set_segments.length ; j++)
            {
                var seg_min = set_segments[j].worldMinPosition();
                var seg_max = set_segments[j].worldMaxPosition();
                
                if(seg_min.x < mins.x)
                    mins.x = seg_min.x;
                if(seg_min.y < mins.y)
                    mins.y = seg_min.y;
                
                if(seg_max.x > maxs.x)
                    maxs.x = seg_max.x;
                if(seg_max.y > maxs.y)
                    maxs.y = seg_max.y;
            }
            
            var origMins = mins.clone();
            var origMaxs = maxs.clone();
            var recognition_result = RecognitionManager.getRecognition(set_segments[0].set_id);
            
			// If a text segment, account for the DRACULAE making 
			// x's smaller than t's, etc
            if (set_segments[0].constructor == SymbolSegment) {
                size = Vector2.Subtract(maxs, mins);
                if (-1 != $.inArray(set_segments[0].text, Editor.x_height_chars)) {
                    mins.y += size.y / 2;
                }
                if (-1 != $.inArray(set_segments[0].text, Editor.descender_chars)) {
                    mins.y += size.y / 2;
                    maxs.y += size.y / 2;
                } 
            }
            var tuple = new Tuple(recognition_result, mins, maxs, origMins, origMaxs);
            data.push(tuple);
            
            set_segments.length = 0;
            set_segments.push(seg);
        }
        else
            set_segments.push(seg);
    }
    // Remove the null segment that we pushed on the list.
	segSet.pop();
    
     
	// Construct URL request here.
    var sb = new StringBuilder();
	var subexprs = new Array();
	var subBSTs = new Array();
    sb.append("?segments=<SegmentList>");
    for(var k = 0; k < data.length; k++)
    {
        var t = data[k];
        sb.append("<Segment symbol=\"");
        if(t.item1.symbols.length == 0)
            sb.append("?\" min=\"");
        else {
	    	var latex;
	    	if(t.item1.symbols[0] == "&lt;")
    			latex = "lt";
    		else if(t.item1.symbols[0] == ">")
    			latex = "gt";
			else if (t.item1.symbols[0] == ",")
				latex = ",";
			else if (t.item1.symbols[0] == "/")
				latex = "/";
			else
		    	latex = RecognitionManager.symbol_to_latex[ t.item1.symbols[0] ];
		    	//console.log("HELP! : " + t.item1.symbols[0] + " LATEX: " + latex);
				if(latex == null){
			    	latex = RecognitionManager.symbol_to_latex[RecognitionManager.unicode_to_symbol[ t.item1.symbols[0].toLowerCase() ]];
			    	if(latex == null) {
						// symbols not in our generic table: use substitutions to
						// avoid problems with tex characters (treated as centered objects
						// by DRACULAE).
						sb.append("SID" + subexprs.length).append("\" min=\""); 
						subexprs.push(new Tuple(t.item1.symbols[0].trim(), "SID" + subexprs.length));
						subBSTs.push(new Tuple(t.item1.bst, "SID" + subBSTs.length));
					}
						else
				    	sb.append(latex).append("\" min=\"");
		    	}
	            else
				    sb.append(latex).append("\" min=\"");
	    
		}
		// Simpler, single option from before....
		//sb.append(t.item1.symbols[0]).append("\" min=\"");
		
		
		sb.append(new Vector2(Math.floor(t.item2.x), Math.floor(t.item2.y)).toString()).append("\" max=\"");
        sb.append(new Vector2(Math.floor(t.item3.x), Math.floor(t.item3.y)).toString()).append("\" id=\"");
        sb.append(t.item1.set_id).append("\"/>");
    }
    sb.append("</SegmentList>");

	console.log(sb.toString());
	//console.log("Segment string");
    
	var mergedSymbols = false;
    $.ajax
    (
        {
            url: Editor.align_server_url + sb.toString(),
            success: function(in_data, textStatus, xmlhttp)
            {
                // parse response here
                var new_dimensions = new Array();

                // parse response xml
                // RZ: modified draculae server to provide BST information. 
				var xmldoc = in_data;
                var segment_nodes = xmldoc.getElementsByTagName("Segment");
                var tex_nodes = xmldoc.getElementsByTagName( "TexString" );
                var bsts = xmldoc.getElementsByTagName("BST");

				// Addition from new min.
                var joined_nodes = xmldoc.getElementsByTagName("JoinedSegments");
	
				// Composite action to collect symbol and subexpression merges.
				var allMergeActions = new CompositeAction();
				
				if(segment_nodes.length == 0)
                {
                    alert("DRACULAE Error: " + in_data);
                    return;
                }
                
				tex_math = "?";
                // Update the current slide with the TeX.
                if ( tex_nodes.length != 0 ) {
                    var tex_string = tex_nodes[ 0 ].textContent;
                    // get just the math, removing spaces; small change to preserve spacing.
                    var tex_math = tex_string.split("$").slice(1,-1).join("").replace( /\s+/g, " " );
					// Replace subexpressions and special characters.
					for (var i = 0; i < subexprs.length; i++)
						tex_math = tex_math.replace(subexprs[i].item2, subexprs[i].item1);


					// Pattern replacements to match CROHME 2014 expression grammar.
					// Replacements for matrices/vectors bound by parentheses ('()'),
					// brackets ('[]'), and braces ('{}').
					tex_math = tex_math.replace(/\(\s*\\begin\{array\}\{[^\}]*\}/g, "\\begin{pmatrix}");
					tex_math = tex_math.replace(/\\end\{array\}\s*\)/g, "\\end{pmatrix}");
					
					tex_math = tex_math.replace(/\\lbrack\s*\\begin\{array\}\{[^\}]*\}/g, "\\begin{bmatrix}");
					tex_math = tex_math.replace(/\\end\{array\}\s*\\rbrack/g, "\\end{bmatrix}");
					
					tex_math = tex_math.replace(/\{\s*\\begin\{array\}\{[^\}]*\}/g, "\\begin{Bmatrix}");
					tex_math = tex_math.replace(/\\end\{array\}\s*\}/g, "\\end{Bmatrix}");
					
					tex_math = tex_math.replace(/\|\s*\\begin\{array\}\{[^\}]*\}/g, "\\begin{vmatrix}");
					tex_math = tex_math.replace(/\\end\{array\}\s*\|/g, "\\end{vmatrix}");
					

					console.log("REWRITTEN LATEX:\n" + tex_math);



					// Filter \left and \right demarcators, handle delimiters.
					// CHANGE: use pmatrix, bmatrix etc. indicators (see Action.GroupSegments)
					/*tex_math = tex_math.replace(/\\left/g, "");
					tex_math = tex_math.replace(/\\right/g, "");
					tex_math = tex_math.replace(/\(/g, "\\left(");
					tex_math = tex_math.replace(/\)/g, "\\right)");
					tex_math = tex_math.replace(/\[/g, "\\left[");
					tex_math = tex_math.replace(/\]/g, "\\right]");
					tex_math = tex_math.replace(/\\{/g, "\\left\{");
					tex_math = tex_math.replace(/\\}/g, "\\right\}");
					tex_math = tex_math.replace(/\\lbrack/g, "\\left\\lbrack");
					tex_math = tex_math.replace(/\\rbrack/g, "\\right\\rbrack");*/

					// Clean up and save TeX to the current slider pane.
					// Ampersand (col. seprators) must be handled specially for HTML.
					var slider_tex = tex_math;
					slider_tex = slider_tex.replace(/&amp;/g, "&");
					Editor.slider.updateSlide( null, slider_tex );
					
					// Construct BST; save to current slider pane.
					var bstFinal = bsts[0].textContent;
					// Replace subexpressions and special characters.
					for (var i = 0; i < subBSTs.length; i++)
						bstFinal = bstFinal.replace(subBSTs[i].item2, subBSTs[i].item1);
                	
					// HACK! Remove SUBSC for ',' '.' and \dots.
					// DEBUG: '.' matches any character - had to remove this.
					bstFinal = bstFinal.replace(/,\s*SUBSC\s\{\s*([^\}]+)\}/g, "\n$1");
					bstFinal = bstFinal.replace(/\.\s*SUBSC\s\{\s*([^\}]+)\}/g, "\n$1");
					bstFinal = bstFinal.replace(/ldots\s*SUBSC\s\{\s*([^\}]+)\}/g, "\n$1");
					
					// Don't forget to replace ',' by 'COMMA')
					//bstFinal = bstFinal.replace(/\n\,/g, "\nCOMMA");

					Editor.slider.updateBST(bstFinal);

					//console.log("Align BST Output ------------------------");
					//console.log(bstFinal);

					// Modification from newer min: represent and classify merged
					// symbols (e.g. when DRACULAE detects two lines as an '=', etc.)
					// Go through and change text attribute of segments for JoinedSegments
                	//
					//
					// DEBUG: for labeling, this is a problem, e.g. merging decimal
					// numbers, which we *do not* want to merge.
					if(joined_nodes.length == -5){
                		console.log(joined_nodes);
						mergedSymbols = true;
						compoundSymbols = false; //DEBUG - square root expressions are
												 // returned as a 'join.'
						for(var i = 0; i < joined_nodes.length; i++) {
                			// Parse information on merged segments.
							var str = joined_nodes[i].attributes.getNamedItem("id").value;
                			var ids = str.substring(0,str.length-1).split(",");
                			var texSymbol = joined_nodes[i].attributes.getNamedItem("symbol").value; 
							var symbol = 
								RecognitionManager.latex_to_symbol[
								 joined_nodes[i].attributes.getNamedItem("symbol").value];
                			console.log("JOINED SYMBOL: " + texSymbol);
							if(symbol == null)
                				symbol = joined_nodes[i].attributes.getNamedItem(
										"symbol").value;
							else if (texSymbol == "sqrt")
								compoundSymbols = true;
							if(symbol == "")
                				break;

							// Create a new segment/group.
							var segs = new Array();
							for(var j = 0; j < ids.length; j++)
								segs.push( 
										Editor.get_segment_by_id( parseInt(ids[j]) )[0]);
                			allMergeActions.add_action_end(new GroupSegments(segs, symbol, false, compoundSymbols));
						}
                	}
				}
			
				// Update the MathJax SVG for the canvas if a subexpression has
				// not been selected.
				if ( Editor.selected_segments.length == 0)
					Editor.MathJaxRender(tex_math);

				// If a group was selected, then merge the symbols into
				// a new segment, labeled by the TeX result.
				// Also add BST output.
				//
				// ASSUMPTION: grouping only used to define individual cells;
				// no nesting of cells or grids in a cell.
				if (Editor.selected_segments.length > 1 
						&& Editor.get_selected_set_ids().length > 1 
						&& EditorState.SegmentsSelected)
					allMergeActions.add_action_end(
						new GroupSegments(Editor.selected_segments, tex_math, false, true,
								bsts[0].textContent));
				
				// If there are any merge actions, add as one composite action.
				if (allMergeActions.action_list.length > 0) 
						Editor.add_action(allMergeActions);

			
				// DEBUG: to obtain valid BST in ground truth output, we need to
				// make a recursive call, so that the BST is defined using merged symbols.
            	//if (mergedSymbols) {
					// Dirty, but works for now.
				//	Editor.align();
				//}

				// Make sure to visualize the new grouping(s)
				RenderManager.render();

			},
            error: function(jqXHR, textStatus, errorThrown)
            {
                console.log(jqXHR);
                console.log(textStatus);
                console.log(errorThrown);
            }
        }
    );
}

Editor.join_segments = function(new_recognition, symbol, set_id){
	var set_from_symbols_list = false;
	for ( var i = 0; i < new_recognition.symbols.length; i++ ) {
		if ( new_recognition.symbols[ i ] == symbol ) {
			var sym = symbol;
			var cer = new_recognition.certainties[ i ];
			new_recognition.symbols.splice( i, 1 );
			new_recognition.certainties.splice( i, 1 );
			new_recognition.symbols.unshift( sym );
			new_recognition.certainties.unshift( cer );
			new_recognition.set_id = set_id;
			RecognitionManager.result_table.push( new_recognition );
			set_from_symbols_list = true;
			break;
		}
	}
	// If no recognition was found in the result list, force the new symbol
	if(!set_from_symbols_list){
		var sym = symbol;
		var cer = 1;
		new_recognition.symbols.splice( 0, 1 );
		new_recognition.certainties.splice( 0, 1 );
		new_recognition.symbols.unshift( sym );
		new_recognition.certainties.unshift( cer );
		new_recognition.set_id = set_id;
		RecognitionManager.result_table.push( new_recognition );
	}
}


/*
	Scale the SVG to fit the canvas by decreasing its font size by 5%
*/
Editor.scale_tex = function(elem){
	var root = document.getElementById("Alignment_Tex").getElementsByClassName("MathJax_SVG")[0].firstChild;
	var rect = root.firstChild.getBoundingClientRect();
	var math_width = rect.left+rect.width;
	var math_height = rect.top+rect.height;
	if(math_width > (Editor.canvas_width-15) || math_height > (Editor.canvas_height-15)){
		elem.style.fontSize = (parseInt(elem.style.fontSize.split("%")[0]) - 10) + "%";
		MathJax.Hub.Queue(["Rerender",MathJax.Hub,elem], [$.proxy(Editor.scale_tex(elem), this)]);
	}else{
		return;
	} 
}

/* Gets the MathJax rendered SVG from the div, sorts them and canvas segments before
   applying alignment to the symbols on the canvas.
*/
// NOTE: 'itemx' is a reference to tuple element x (e.g. item1 for first tuple element).
// NOTE: if lower case letters on baseline, will move down slightly,
//       as top left will be where the "ascender" line is placed.
Editor.copy_tex = function(elem, outer_div, s)
{
	// Get the top-left and bottom right corner coordinates for symbols on canvas (as s).
	// Use only selected symbols if appropriate.

	// Obtain bounding box width and height for symbols on canvas; item1/item2 are
	// min and max (x,y) coordinates, respectively.
	var horMinOffset = 20; //pixels
	var verMinOffset = 20;
	var topLeft = new Vector2(horMinOffset, verMinOffset);
	//console.log("s: " + s.item1.x + "," + s.item1.y);
	//console.log("tld: " + topLeft.x + "," + topLeft.y);
	
	var rect_size = Vector2.Subtract(s.item2, s.item1);
	var dim_tuple = new Tuple(rect_size.x, rect_size.y); // need to scale to fit canvas elements
	
	// Obtain the rescaled width from MathJax.
	var root =
		document.getElementById("Alignment_Tex").getElementsByClassName("MathJax_SVG")[0].firstChild;
	var rect = root.firstChild.getBoundingClientRect();
	
	// Set the scale - take the canvas size into account from the MathJax
	// result.
	var target_width = (rect.width / rect.height) * dim_tuple.item2; 
	var	target_height = dim_tuple.item2; 
	
	var cwidth = $("#equation_canvas").width(); 
	var toolheight = $("#toolbar").height(); 
	var cheight = $("#equation_canvas").height() -
		toolheight; 
	//console.log("cwidth: " + cwidth + " theight: " + toolheight
	//			+ " cheight: " + cheight);

	// Scale to fit on the canvas.
	var threshold = 0.85;
	if (target_width > cwidth * threshold ) 
	{
		target_width =  cwidth * threshold;
		target_height = target_width * (rect.height / rect.width);
	}
	if (target_height > cheight * threshold)
	{
		target_height = cheight * threshold;
		target_width = target_height * (rect.width / rect.height);
	}

	//console.log("x: " + s.item1.x + " y: " + s.item1.y);
	//console.log("rect x:" + rect.left + " rect y: " + rect.top);
	
	// Calculate scale and append to g element of MathJax
	var scale = new Vector2( (target_width / rect.width), (target_height / rect.height) );
	// First group tag groups all MathJax SVGs
	var group = root.getElementsByTagName("g")[0]; 
	group.setAttribute("transform", "scale("+scale.x+","+scale.y+") matrix(1 0 0 -1 0 0)");

	var root = document.getElementById("Alignment_Tex").getElementsByClassName("MathJax_SVG")[0].firstChild;
	group = root.getElementsByTagName("g")[0];
	elem.style.width = group.getBoundingClientRect().width + "px";
	SVGTopLeft = new Vector2(group.getBoundingClientRect().left, group.getBoundingClientRect().top);

	// Displacement from the SVG rectangle to a point at top-left of the canvas.
	topLeftTranslation = new Vector2.Subtract(topLeft, SVGTopLeft);
	//console.log("SVGTopLeft: " + SVGTopLeft.x + ", " + SVGTopLeft.y);
	//console.log("TRANSLATION: " + topLeftTranslation.x + ", " + topLeftTranslation.y);
	// Make sure it fits the canvas
	//Editor.scale_tex(elem); // Just reduces the font size by 5%
	root = document.getElementById("Alignment_Tex").getElementsByClassName("MathJax_SVG")[0].firstChild;
	
	// Retrieve symbols from the div element in previous routine
	var use_tag_array = root.getElementsByTagName("use");
	var rect_tag_array = root.getElementsByTagName("rect");
	use_tag_array = Array.prototype.slice.call(use_tag_array);
	rect_tag_array = Array.prototype.slice.call(rect_tag_array);
	var elements = use_tag_array.concat(rect_tag_array);
	
	// Sort the svg and canvas elements
	Editor.forget_symbol_groups();
	var canvas_elements = Editor.sort_canvas_elements();
	
	x_pos = Editor.group_svg([], root.firstChild);
	x_pos.sort(Editor.compare_numbers);
	
	//Editor.print_sorted(x_pos, "use");
	//Editor.print_sorted(canvas_elements, "canvas");	
	
	// Start transformation process and alignment process.
	
	var transform_action = new TransformSegments(Editor.segments);
	Editor.apply_alignment(x_pos, canvas_elements, topLeftTranslation);
	transform_action.add_new_transforms(Editor.segments);
	transform_action.Apply();
	Editor.add_action(transform_action);
	
	Editor.restore_symbol_groups();

	x_pos = [];
	Editor.canvas_div.removeChild(outer_div);
	MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "HTML-CSS"]);
}


// Creates a square root horizontal line and appends it to RenderManager's div for the sqrt
Editor.create_segment = function(x_pos){
	var sqrt;
	var horizontal_bar;
	var found = false;
	var data = String.fromCharCode(parseInt("221A",16));
	var segs = x_pos.slice(0, x_pos.length);
	for(var i = 0; i < x_pos.length; i++){
		if(x_pos[i].item3.getAttribute("href") == "#MJMAIN-221A"){
			sqrt = x_pos[i].item3.getBoundingClientRect();
			for(var j = 0; j < segs.length; j++){
				var rect = segs[j].item3.getBoundingClientRect();
				if(rect.left < sqrt.right && segs[j].item3.tagName == "rect" && rect.top > sqrt.top){
					found = true;
					horizontal_bar = segs[j];
					break;
				}
			}
		}
		if(found)
			break;
	}
	
	if(found){
		// copy rect element and put in RenderManager div
		for(var k = 0; k < RenderManager.segment_set_divs.length; k++){
			if(RenderManager.segment_set_divs[k].getAttribute("data-recognition") == data){
				var BBox_rect = RenderManager.segment_set_divs[k].getBoundingClientRect();
				var clone = horizontal_bar.item3.cloneNode(true);
				clone.removeAttribute("x");
				clone.removeAttribute("y");
				clone.removeAttribute("stroke");
				clone.setAttribute("fill", Editor.segment_fill);
				var x = BBox_rect.right;
				var y = BBox_rect.top;
				clone.setAttribute("transform", "translate(" + x + "," + y + ")");
				RenderManager.segment_set_divs[k].getElementsByTagName("g")[0].appendChild(clone);
			}
		}
		
	}
}

/* Joins SVG segments as one because MathJax splits some of them up sometimes
 	Mainly groups elements with href #MJMAIN-AF
*/
Editor.group_svg = function(elements, g){
	
	var children = g.childNodes;
	var notcontains_g = g.getElementsByTagName("g");
	if(notcontains_g.length == 0){ // Base case reached	
		for(var j = 0; j < children.length; j++){
				if(children[j].getAttribute("width") == "0"){
					continue;  	// Don't add it to the elements array. Not needed
				}
				if(children[j].getAttribute("href") == "#MJMAIN-AF" ){ 
					// Usually grouped together
					var parent_rect = g.getBoundingClientRect();
					var rect = children[j].getBoundingClientRect();
					var tuple_x = new Tuple(Math.round(rect.left), Math.round(rect.top), children[j], true, parent_rect.width, parent_rect.height);
					elements.push(tuple_x);
					break;
				}else{
					var rect = children[j].getBoundingClientRect();
					var tuple_x = new Tuple(Math.round(rect.left), Math.round(rect.top), children[j], false);
					elements.push(tuple_x);
				}
		}
		return elements;
		
	}else{ 
		// More g tags to explore
		for(var i = 0; i < children.length; i++){
				if( (children[i].tagName == "use" || children[i].tagName == "rect") && children[i].getAttribute("width") != "0"){
					if(children[i].getAttribute("href") == "#MJMAIN-AF" ){
						var parent_rect = g.getBoundingClientRect();
						var rect = children[i].getBoundingClientRect();
						var tuple_x = new Tuple(Math.round(rect.left), Math.round(rect.top), children[i], true, parent_rect.width, parent_rect.height);
						elements.push(tuple_x);
						break;
						
					}else{
						var rect = children[i].getBoundingClientRect();
						var tuple_x = new Tuple(Math.round(rect.left), Math.round(rect.top), children[i], false);
						elements.push(tuple_x);
					}
				}else
					elements = Editor.group_svg(elements, children[i]);
		}
	
	}
	return elements;
}



/*
	A function that returns the world min and max position for joined segments like the 
	the plus symbol (top left, bottom right).
*/
Editor.get_seg_dimensions =  function(set_segments)
{
	var mins = set_segments[0].worldMinDrawPosition();
    var maxs = set_segments[0].worldMaxDrawPosition();
            
	// Find the extent of the symbol (BB)
	for(var j = 1; j < set_segments.length; j++){
		var seg_min = set_segments[j].worldMinDrawPosition();
		var seg_max = set_segments[j].worldMaxDrawPosition();
		
		if(seg_min.x < mins.x)
			mins.x = seg_min.x;
		if(seg_min.y < mins.y)
			mins.y = seg_min.y;
		
		if(seg_max.x > maxs.x)
			maxs.x = seg_max.x;
		if(seg_max.y > maxs.y)
			maxs.y = seg_max.y;
	}
	return new Tuple(mins, maxs);
}


// Returns (set_id, BBox) quintuples for a list of 'segments'
// (i.e. individual primitives).
//
// This was taken from ".align" for convenience.
Editor.get_segment_BBoxes = function (seg_list)
{
	var segSet = seg_list;
	segSet.push(null);
	data = new Array();
    
	var set_segments = new Array();
	for(var k = 0; k < segSet.length; k++)
    {
        var seg = segSet[k];
        if(set_segments.length == 0)
            set_segments.push(seg);
        else if(seg == null || seg.set_id != set_segments[0].set_id)
        {
            var mins = set_segments[0].worldMinPosition();
            var maxs = set_segments[0].worldMaxPosition();
            
            for(var j = 1; j < set_segments.length ; j++)
            {
                var seg_min = set_segments[j].worldMinPosition();
                var seg_max = set_segments[j].worldMaxPosition();
                
                if(seg_min.x < mins.x)
                    mins.x = seg_min.x;
                if(seg_min.y < mins.y)
                    mins.y = seg_min.y;
                
                if(seg_max.x > maxs.x)
                    maxs.x = seg_max.x;
                if(seg_max.y > maxs.y)
                    maxs.y = seg_max.y;
            }
            
            var tuple = new Tuple(set_segments[0].set_id, mins, maxs);
            data.push(tuple);
            
            set_segments.length = 0;
            set_segments.push(seg);
        }
        else
            set_segments.push(seg);
    }
    // Remove the null segment that we pushed on the list.
	segSet.pop();

	return data;
}


// Returns the BBox of an element
Editor.get_BBox = function(seg)
{
	var elem_rect;
	if(seg.constructor == SymbolSegment)
		elem_rect = seg.element.getBoundingClientRect();
	else
		elem_rect = seg.inner_svg.getBoundingClientRect();
	return elem_rect;
}

/* Sorts the render svg from mathjax from left to right and any segment whose x coordinate
   collides with another is sorted from top to bottom. Just compares the tops.
*/
Editor.sort_svg_positions = function(array)
{
	var x_pos = new Array(); // all x coordinates
	var current_x, current_y;
	for(var i = 0; i < array.length; i++){
		current_x = parseInt(array[i].getBoundingClientRect().left.toFixed(2));
		current_y = parseInt(array[i].getBoundingClientRect().top.toFixed(2));
		var tuple_x = new Tuple(current_x,current_y, array[i]);
		x_pos.push(tuple_x);
	}
	x_pos.sort(Editor.compare_numbers);
	
	// Remove zero width elements
	for(var i = 0; i < x_pos.length; i++){
		if(x_pos[i].item3.getAttribute("width") == "0"){
			x_pos.splice(i, 1);
		}
		
	}
	return x_pos;
}

// Prints the sorted SVG and canvas segments
Editor.print_sorted = function(array, type)
{
	var s;
	if(type == "use")
		s = "Use tag: ";
	else
		s = "Canvas tag: ";
	for(var l = 0; l < array.length; l++){
		if(type == "use" && array[l].item3.tagName == "use"){
			var unicode = array[l].item3.getAttribute("href").split("-")[1];
			var text = String.fromCharCode(parseInt(unicode,16));
			s += text;
		}else if(type == "use" && array[l].item3.tagName == "rect"){
			s += "-";
		}else{
			s += array[l].item3.text;
		}
	}
	console.log(s);
}

// Sorts all svg elements by x and y
// DIFF: if there are selected segments, consider only those.
Editor.sort_canvas_elements = function()
{
	var sorted = new Array();
	var sorted_set_ids = new Array();
	var current_x, current_y;
	var Segments = Editor.segments;
	//if(Editor.selected_segments.length > 0 && 
	//		Editor.state == EditorState.SegmentsSelected)
	//	Segments = Editor.selected_segments;
	for(var i = 0; i < Segments.length; i++){
		var seg = Segments[i];
		var seg_rect = Editor.get_BBox(seg);
		current_x = parseInt(seg_rect.left.toFixed(2));
		current_y = parseInt(seg_rect.top.toFixed(2))
		if(sorted_set_ids.contains(seg.set_id)){
			var last_element = sorted.pop();
			if(last_element.item1 > current_x) // use lowest x
				sorted.push(new Tuple(current_x,current_y,seg));
			else
				sorted.push(new Tuple(last_element.item1,last_element.item2,seg));
		}else{
			sorted.push(new Tuple(current_x,current_y,seg));
			sorted_set_ids.push(seg.set_id);
		}
	}
	sorted.sort(Editor.compare_numbers);
	return sorted;
}

// Sorts all svg elements by x and y for a given set of segments.
Editor.sort_segments = function( segments )
{
	var sorted = new Array();
	var sorted_set_ids = new Array();
	var current_x, current_y;
	for(var i = 0; i < segments.length; i++){
		var seg = segments[i];
		var seg_rect = Editor.get_BBox(seg);
		current_x = parseInt(seg_rect.left.toFixed(2));
		current_y = parseInt(seg_rect.top.toFixed(2))
		if(sorted_set_ids.contains(seg.set_id)){
			var last_element = sorted.pop();
			if(last_element.item1 > current_x) // use lowest x
				sorted.push(new Tuple(current_x,current_y,seg));
			else
				sorted.push(new Tuple(last_element.item1,last_element.item2,seg));
		}else{
			sorted.push(new Tuple(current_x,current_y,seg));
			sorted_set_ids.push(seg.set_id);
		}
	}
	sorted.sort(Editor.compare_numbers);
	return sorted;
}



// Compares passed in tuples by sorting by x and y
Editor.compare_numbers = function(a, b)
{
	if (a.item1 == b.item1 && a.item2 == b.item2) return 0;
  	else if (a.item1 == b.item1) return a.item2 > b.item2 ? 1 : -1;
  	else return a.item1 > b.item1 ? 1 : -1;
}

// Compare x coordinates.
Editor.compare_asc = function(a, b)
{
	if (a == b ) return 0;
	else return a > b ? 1 : -1;
}


Editor.orderBBLeftRight = function(t1, t2)
{
	console.log("t1");
	console.log(t1);
	var BB1Left = t1.item2.x;
	var BB2Left = t2.item2.x;

	return Editor.compare_asc(BB1Left, BB2Left);
}

Editor.orderRowsTopDown = function(t1, t2)
{
	var BB1Top = t1.x.item2.y;
	var BB2Top = t2.x.item2.y;

	return Editor.compare_asc(BB1Top, BB2Top);
}

/* Maps elements on canvas to corresponding MathJax rendered SVG symbol ('array')
 * and then moves symbols around to match the MathJax-generated SVG output.
   Note: This methods relies on the fact that Canvas segments have their
   recognition result as an instance. This is set in the RenderManager after
   recognition is gotten.  "PenStroke_Object".Text - Recognition result for the
   PenStroke

  topLeftTranslation - displacement from the rendered SVG to a chosen
  top-left position on the canvas.
*/
Editor.apply_alignment = function(array, canvas_elements, topLeftTranslation)
{
	//console.log(canvas_elements.length + " symbols received for alignment.");
	var sqrt_text = String.fromCharCode(parseInt("221A",16));
	var transformed_segments = new Array(); // holds segment set_ids found
	
	
	for(var i = 0; i < array.length; i++){
		var svg_symbol = array[i].item3;
		console.log("svg_symbol:");
		console.log(svg_symbol)

		// Recover the symbol label.
		var text = null;
		if(svg_symbol.getAttribute("href")){
			var unicode = svg_symbol.getAttribute("href").split("-")[1].toLowerCase();
			console.log("UNICODE: " + unicode);
			// Check our symbol table. If not there just convert the unicode
			var result = RecognitionManager.unicode_to_symbol["&#x"+unicode+";"];
			if(result == null)
				text = String.fromCharCode(parseInt(unicode,16));
			else
				text = result;
			// special case character. Has zero-width space -> Look it up
			if(text == "−")
				text = "-";
			if(text == "¯") // Min doesn't have support for overlays
				text = "-";
		}
		else
		{
			text = "-"; // rect element is usually a division symbol which is _dash in Min	
		}

		// Identify canvas segments (e.g. symbols) that correspond to the MathJax segments/
		// symbols in the passed 'array' argument.
		console.log("Tex: " +  text);
		// Segment that matched a given set_id. Can also contain joined strokes
		var segments = null; 
		// Used to index into RenderManager's segment_set_div to get height and width below
		var index; 
		for(var j = 0; j < canvas_elements.length; j++){ 
			// Find the segment on canvas
			var set_id = canvas_elements[j].item3.set_id;
			if(canvas_elements[j].item3.text == text && (!transformed_segments.contains(set_id))){
				console.log("Match found for tex: " + text);
				transformed_segments.push(set_id);
				segments = Editor.get_segment_by_id(set_id);
				canvas_elements.splice(j,1); // remove segment from array
				index = j;
				break;
			}
		}
		if(segments == null)
			continue;
		
		console.log(transformed_segments.length + " symbols to transform.");

		// Apply transformation to segment - resize and move
		var size_f = new Vector2(0,0);
		// This is the MathJax BB for the symbol.
		var svg_symbol_rect = svg_symbol.getBoundingClientRect();
		
		// ?? WHAT IS THIS CASE?
		if(array[i].item4){
			size_f.x = array[i].item5;
			size_f.y = array[i].item6;
		}else{
			// "Normal" case for a single stroke symbol?
			size_f = new Vector2(svg_symbol_rect.width, svg_symbol_rect.height);
		}

		var svg_coord = new Vector2(svg_symbol_rect.left, svg_symbol_rect.top);
		var dimensions = Editor.get_seg_dimensions(segments);

		// Scale and translate segments
		// Translates top-left corner of the symbol to target destination
		// ('svg_coord') SUBTRACT: arg 1 - arg 2   (destination - current)
		console.log("SVG (LOCAL): " + svg_coord.x + ", " + svg_coord.y);
		console.log("DIMENSIONS: " + dimensions.item1.x + ", " +
				dimensions.item1.y);
		
		var in_offset = new Vector2.Add(topLeftTranslation, svg_coord);
		in_offset = new Vector2.Subtract(in_offset, dimensions.item1);
		console.log("OFFSET: " + in_offset); for(var k = 0; k <
				segments.length; k++){ segments[k].translate(in_offset);
			segments[k].freeze_transform(); }
		
		// Updated dimensions after svg_coord.
		dimensions = Editor.get_seg_dimensions(segments);
		
		// BB for segments on the canvas (width, height)
		var rect_size = Vector2.Subtract(dimensions.item2, dimensions.item1);
		var scale = new Vector2(size_f.x / rect_size.x, size_f.y /
				rect_size.y);
		
		// **Fix the scale so that it fits into the canvas.
		
		for(var k = 0; k < segments.length; k++){
			segments[k].resize(dimensions.item1, scale);
			segments[k].freeze_transform(); }
		
		/*
		if(tex_math.search("sqrt") != -1 && segments[0].text == sqrt_text){
		Editor.create_segment(array); }
		*/
	} 
}


// Utility function used to see the bounding rectangle. Not being used, was used for debugging
// alignment during scaling and translation.
// Used for debugging alignment. Just draws a BBox
Editor.draw_rect = function(dim){
	var div = document.createElement('div');
	div.className = Editor.current_mode.segment_style_class;
	div.style.visibility='visible';
	document.body.appendChild(div)
	div.style.visibility = "visible";
	div.style.left = dim.left + "px";
	div.style.top = dim.top + "px";
	div.style.width = dim.width + "px";
	div.style.height = dim.height + "px";
	div.style.backgroundColor = "red";
	div.style.opacity = "0.4";
	
	// version 2
	/*var div = document.createElement('div');
	div.className = Editor.current_mode.segment_style_class;
	div.style.visibility='visible';
	Editor.canvas_div.appendChild(div)
	div.style.visibility = "visible";
	div.style.left = dimensions.item1.x + "px";
	div.style.top = dimensions.item1.y + "px";
	div.style.width = rect_size.x + "px";
	div.style.height = rect_size.y + "px";
	div.style.backgroundColor = "green";
	div.style.opacity = "0";*/
}



// NEW: added to invoke creating a grid from selected cells.
Editor.createGrid = function()
{
    if(Editor.selected_segments.length > 1 
			&& Editor.get_selected_set_ids().length > 1
			&& Editor.state == EditorState.SegmentsSelected)
    {
		// RZ: Simplified this by moving processing inside the action object.
        Editor.add_action(new GroupSegments(Editor.selected_segments, "", true));
		Editor.state = EditorState.SegmentsSelected;
    }

}


// adds currently selected segments to a single segment group object
// the individual segments in the group remain in their type's render layer, 
// so no need to remove or re-render
Editor.groupTool = function()
{
    if(Editor.selected_segments.length > 0 
			&& Editor.get_selected_set_ids().length > 0
			&& Editor.state == EditorState.SegmentsSelected)
    {
		// RZ: Simplified this by moving processing inside the action object.
        Editor.add_action(new GroupSegments(Editor.selected_segments));
		Editor.state = EditorState.SegmentsSelected;
    }
}

// will break apart selected segment group objects
Editor.ungroupTool = function()
{
    alert(Editor.state);
}

// deletes the currently selected segments
Editor.deleteTool = function()
{
    //if(Editor.button_states[Buttons.Delete].enabled == false)
    //    return;
    
    var action = new DeleteSegments(Editor.selected_segments)
    action.Apply();
    Editor.add_action(action);
    Editor.clearSelectedSegments();
}

/**
   Clear the selected segments from the canvas and then
   set the editor mode to the proper selection method.
**/
Editor.clearSelectedSegments = function(){
    Editor.clear_selected_segments();    
    RenderManager.render();
    //console.log(Editor.selection_method);
    Editor.state = EditorState.ReadyToRectangleSelect;
}

Editor.typeTool = function()
{
    Editor.selected_segments.length = 0;
    Editor.current_stroke = null;
    Editor.clearButtonOverlays();

    Editor.button_states[Buttons.Pen].setSelected(true);
    Editor.button_states[Buttons.Rectangle].setSelected(false);
    //Editor.button_states[Buttons.Stroke].setSelected(false);
    Editor.clear_selected_segments();
    
    switch(Editor.state)
    {
    case EditorState.SegmentsSelected:
        Editor.clear_selected_segments();
        break;
    case EditorState.MiddleOfText:
        if(Editor.current_action.toString() == "EditText")
            Editor.current_action.set_current_text(Editor.current_text.text);
        Editor.current_text = null;
        break;
    }
    Editor.state = EditorState.ReadyForText;
    RenderManager.render();
}

/*
   cb is a callback to call after the Correction hides itself.  
*/
Editor.relabel = function(callback)
{
    Editor.clearButtonOverlays();
    for(var k = 0; k < Editor.button_states.length; k++)
        Editor.button_states[k].setEnabled(false);
    CorrectionMenu.show(callback);
}


// clears all the data and sends action list to server for storage
Editor.clear = function()
{
    // get rid of last one if it' a bugger
    if(Editor.action_list.length > 0)
    {
        var prev_action = Editor.action_list.pop();
        if(prev_action.shouldKeep() == true)
            Editor.action_list.push(prev_action);
    }
    
    // save data
    var sb = new StringBuilder();
    sb.append("?actionList=<ActionList>");
    for(var k = 0; k < Editor.action_list.length; k++)
    {
        sb.append(Editor.action_list[k].toXML());
    }
    sb.append("</ActionList>");
    $.get
    (
        Editor.data_server_url + sb.toString(),
        function(data, textStatus, xmlhttp)
        {
            window.location.reload( true ); // href = Editor.editor_root + "index.xhtml";
        }
    );
}

Editor.getInkML = function() {
    var inkml = "<ink xmlns=\"http://www.w3.org/2003/InkML\">";
    var segments = new Array();
    var segarray = Editor.segments.slice( 0 );
    segarray.sort( function( o1, o2 ) { return o1.instance_id - o2.instance_id } );
    
    for ( var i = 0; i < segarray.length; i++ ) {
        var stroke = segarray[ i ];
        var strokeid = stroke.instance_id;
        var segid = stroke.set_id;
        
        // translation for absolute positioning
        var tx = stroke.translation.x;
        var ty = stroke.translation.y;
        var sx = stroke.scale.x;
        var sy = stroke.scale.y;
        // add to proper segment
        if ( segments[ segid ] == null ) segments[ segid ] = new Array();
        segments[ segid ].push( strokeid );
        
        // add stroke data to inkml
        inkml += "<trace id=\"" + strokeid + "\">";
        var strokedata = new Array();
        for ( var j = 0; j < stroke.points.length; j++ ) {
            strokedata.push( ( ( stroke.points[ j ].x * sx ) + tx ) + " " + ( ( stroke.points[ j ].y * sy ) + ty ) );
        }
        inkml += strokedata.join( ", " );
        inkml += "</trace>";        
    }
    
    for ( var i = 0; i < segments.length; i++ ) {
        if ( segments[ i ] == null ) continue;
        var strokeids = segments[ i ];
        
        inkml += "<traceGroup xml:id=\"TG" + i + "\">";
        
        // label
        inkml += "<annotation type=\"truth\">" + RecognitionManager.getRecognition( i ).symbols[ 0 ] + "</annotation>"
        
        for ( var j = 0; j < strokeids.length; j++ ) {
            inkml += "<traceView traceDataRef=\"" + strokeids[ j ] + "\" />";
        }
        
        inkml += "</traceGroup>";
    }
    inkml += "</ink>";
    
    if ( Modernizr.touch ) {
        
        // ask for filename
        var fname = prompt( "Enter filename (leave blank for random)." );
        if ( fname == null ) return; // "cancel"
        
        // save to server
        $.ajax(
            {
                url: Editor.inkml_save_server_url + "?fname=" + fname + "&s=" + escape( inkml ),
                success: function( in_data, textStatus, xmlhttp ) {      
                    alert( "Saved: " + in_data.split( "!" )[ 1 ] );
                },
                error: function( jqXHR, textStatus, errorThrown ) {
                    console.log( jqXHR );
                    console.log( textStatus );
                    console.log( errorThrown );
                    if ( jqXHR.status == 0 ) {
                        alert( "Error: server offline." );
                    } else {
                        alert( "Error: " + textStatus + "/" + errorThrown );
                    }
                }
            }
        );
        
    } else {
        
        // save locally
        var datauri = "data:text/inkml," + escape( inkml ); // yes, this is an invalid mime type
        window.open( datauri );
        
    }
}



/*
  This method is complicated so let me explain what's going on:
  FileReader's readAsDataURL method and apparently Image's .src property are
  Asynchrynous, so we need to fire an event to do work instead of doing it sequentially.
  When the file is read as a data url, the first method is called which sets the data url
  as the Image's source.  That doesn't happen immediately, so another event is made
  for when the image's src is finished being set.  When this happens, then we forward
  the image to the render manager and the collision manager.
*/

Editor.onImageLoad = function(e)
{
    var file_list = e.target.files;
    if(file_list[0].type == null)
    	return;
    else if(file_list[0].type == "text/plain")
		PermEvents.parse_text_file(file_list[0]);
	else
    	Editor.ParseImage(file_list[0]);
}

// This function is called when the user clicks on the upload image button
// And also when the user drags and drops a file on the canvas.
Editor.ParseImage = function(file){ 

    if(file)
    {
        var r = new FileReader();
        r.onload = function(e)
        {
            var loaded_image = new Image();
            
            // render image to canvas, get back the dataurl, send dataurl to server,
            // get back list of connected components in xml, add to managers
            var added_segments = new Array();
            loaded_image.onload = function(e)
            {
                var canvas = document.createElement("canvas");
                canvas.width = loaded_image.width;
                canvas.height = loaded_image.height;
                
                var context = canvas.getContext("2d");
                context.drawImage(loaded_image, 0, 0);
                
                // var dataUrl = canvas.toDataURL();
                inverseImage = ImageBlob.generateInverseImage(this);
                var blob = new ImageBlob(this, inverseImage);
                Editor.add_segment(blob);
                RecognitionManager.enqueueSegment(blob);
                
            }
            
            Editor.add_action(new AddSegments(added_segments));
            
            // set the result of the image load to the image object
            loaded_image.src = e.target.result;
        }
        r.readAsDataURL(file);

    }
    else
    {
        // file not loaded
    }
}

////////////////////////////////////////
// Search operation
////////////////////////////////////////
Editor.search = function(e) 
{
    // NOTE: CURRENTLY EXPERIMENTING WITH ONLY ONE TEXT BOX.
    var searchString = "";
    var engineType = document.getElementById("engineSelector").value;
	var keywords = document.getElementById("tex_result").value;
    var searchString = Editor.slider.getCurrentExpression();
	searchString = searchString.replace(/\s/g, "");
    if (keywords) {
		searchString += ' ' + keywords;
	}


    switch (engineType)
    {
    case 'LaTeX Search':
        url = 'http://latexsearch.com/latexFacets.do?searchInput=';
        searchString = searchString + '&stype=exact';
        break;
    case 'Wolfram Alpha':
        url='http://www.wolframalpha.com/input/?i=';
        break;
    case 'Google':
        url='http://www.google.com/search?q=';
        break;
    case 'Tangent':
        url = 'http://saskatoon.cs.rit.edu:9001/?query=';
        break;
    case 'Wikipedia':
        url = 'http://en.wikipedia.org/w/index.php?title=Special%3ASearch&search=';
        break;
    default:
        /* Currently NIST DLMF is the default (first list item) */
        url = 'http://dlmf.nist.gov/search/search?q=';
        break
    }
    searchString = encodeURIComponent(searchString);
    window.open(url + searchString);
}

Editor.goDPRL = function ()
{
    window.location = "http://www.cs.rit.edu/~dprl"
}

// Shows tool tips
Editor.showToolTip = function(target, use){
	if (!Modernizr.touch) {
		$('#' + target).tooltip({content: use, items: '#' + target});
	}
}
$.ctrl = function(key, callback, args) {
    $(document).keydown(function(e) {
        if(!args) args=[]; // IE barks when args is null 
        if(e.keyCode == key.charCodeAt(0) && e.ctrlKey) {
            callback.apply(this, args);
            return false;
        }
    });        
};
/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	This file contains event handlers and methods for changing the state of the buttons that
    appear along the top of min.

    ButtonState: An object which holds and manages the state of a button (enabled, touched).

    Methods:
        Editor.build_buttons - Add ButtonStates for each of the buttons at the top of min.
*/
function Buttons()
{

}

Buttons.COUNT = 0;

// RLAZ: Button modification.
Buttons.Pen = 0;
//Buttons.Text = 1;
Buttons.Rectangle = 1;
Buttons.Reselect = 2;
Buttons.UploadImage = 3;
Buttons.Undo = 4;
Buttons.Redo = 5;
Buttons.Align = 6;

Buttons.Grid = 7;

Buttons.Search = 8;
Buttons.AddSlide = 9;
Buttons.RemoveSlide = 10;

function ButtonState(button_id)
{
    this.overlay_div = document.getElementById(button_id).getElementsByClassName("toolbar_button_overlay").item(0);
    
    //console.log(button_id + " " + this.overlay_div.className);
    Buttons.COUNT++;
    this.enabled = false;
    this.touched = false;
}

ButtonState.prototype.setEnabled = function(enabled)
{
    this.enabled = enabled;
    if(this.enabled)
        this.overlay_div.className = "toolbar_button_overlay toolbar_button_enabled";
    else
        this.overlay_div.className = "toolbar_button_overlay toolbar_button_disabled";
}

ButtonState.prototype.setTouched = function(touched)
{
    this.touched = touched;
    if(this.enabled)
    {
        if(this.touched)
            this.overlay_div.className = "toolbar_button_overlay toolbar_button_touched";
        else
            this.overlay_div.className = "toolbar_button_overlay toolbar_button_enabled";
    }
}

ButtonState.prototype.setSelected = function(selected)
{
    this.selected = selected;
    if(this.enabled && this.selected)
        this.overlay_div.className = "toolbar_button_overlay toolbar_button_selected";
}

Editor.clearButtonOverlays = function()
{
    for(var k = 0; k < Editor.button_states.length; k++)
    {
        Editor.button_states[k].setTouched(false);
        Editor.button_states[k].setEnabled(true);
    }
}

Editor.build_buttons = function(in_div_name)
{
    Editor.toolbar_div = document.getElementById(String(in_div_name));
    Editor.toolbar_button_overlay = Editor.toolbar_div.getElementsByClassName('toolbar_button_overlay');

    /*
    These must be added in the same order as the numbers given at the
    top of this file.
    */ 
    Editor.button_states = new Array();
    Editor.button_states.push(new ButtonState("pen"));
    Editor.button_states.push(new ButtonState("rectangle_select"));
    Editor.button_states.push(new ButtonState("change_recognition"));
    Editor.button_states.push(new ButtonState("upload_image"));
    Editor.button_states.push(new ButtonState("undo"));
    Editor.button_states.push(new ButtonState("redo"));
    Editor.button_states.push(new ButtonState("align"));
    Editor.button_states.push(new ButtonState("create_grid")); 
    Editor.button_states.push(new ButtonState("search"));
    
    Editor.clearButtonOverlays();

}
/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
*	This file contains a set of constants affecting how min behaves such as the list of
    recognition servers and the server which performs alignment.
*/

/* Colors (3 byte hex) */
//Editor.segment_color = "#BBBBBB"; 
Editor.segment_color = "#FF4444"; 
//Editor.selected_segment_color = "#BBBBBB";
Editor.selected_segment_color = "#FF0101";

Editor.control_point_fill_color = "#FFAA00";

Editor.control_point_line_color =  "#FF6666"; 
//Editor.control_point_line_color = "#111111";
Editor.control_point_radius = 16;
Editor.control_point_line_width = 2.5;
//1.5;

Editor.recognition_result_color = "#111111";
Editor.segment_fill = "#4A4A4A";

Editor.stroke_width = 4;
Editor.selected_stroke_width = 4;
//Editor.stroke_select_color = "#44F";
Editor.stroke_select_color = "#FF6666";
Editor.stroke_select_width = 2;

/* Symbol classification and attributes */
// Hierarchical tree of available symbol classes
Editor.symbol_tree = "example_tree.xml";
Editor.generic_symbol_table = "generic_symbol_table.csv";

// The number of events to store in the event queue for momentum tracking
Editor.moveQueueLength = 2;

// Symbol layout classes (for DRACULAE)
Editor.ascender_chars = ['b','d','f','h','i','k','l','t'];
Editor.x_height_chars = ['a','c','e','m','n','o','r','s','u','v','w','x','z'];
Editor.descender_chars = ['g','j','p','q','y'];

Editor.recognition_timeout = 2500; // In milliseconds, used in RecognitionManager line 132.

// List of keycodes, I couldn't find a standard object for this
KeyCode = {
    backspace: 8,
    del: 46,
    enter: 13,
    left_arrow: 37,
    up_arrow: 38,
    right_arrow: 39,
    down_arrow: 40,
    group: "g",
    relabel: "l",
    pen: "p",
}

Editor.touchAndHoldTimeout = 800;
Editor.minTouchTimeDiff = 100;

Editor.DPRL_url = "http://www.cs.rit.edu/~dprl";
Editor.classifier = new Classifier();

//Editor.editor_root = "./";
Editor.editor_root = "http://129.21.34.109:";

/* Recognition servers and ports */
var saskatoon = "http://129.21.34.109:";
Editor.align_server_url = saskatoon + "6500"; 
// These two server URLs aren't used for normal operation, but 
// are used for collecting data such as for the CROHME competition.
Editor.data_server_url = saskatoon + "500"
Editor.inkml_save_server_url = saskatoon + "4205"

/* Clasification servers */
/*
  To add a new type of classifiction, just add the server URL to this
object and then create a 'classification_server' field on the new
stroke objects which references the correct URL in this one See
PenStroke.js for an example.
*/
ClassificationServers = {
    "PenStrokeClassifier": saskatoon + "1505", // Use part 2 (ICDAR 2011)
    "ImageBlobClassifier": saskatoon + "7006"
};

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
  This is the menu that allows the user to manually select the symbol that they want.
*/

function CorrectionMenu()
{
    
}

// sets up the correction menu
CorrectionMenu.initialize = function()
{
    CorrectionMenu.close_button = document.getElementById("rr_close_button");
    CorrectionMenu.close_button.addEventListener("click", CorrectionMenu.hide, true);

    CorrectionMenu.touch_start_position = null;
    CorrectionMenu.current_Y = 0;
    CorrectionMenu.div_moving = false;
    CorrectionMenu.div_speed = 0;
    CorrectionMenu.touchend_time;
    CorrectionMenu.touch_moving = false;
    
    CorrectionMenu.menu = document.getElementById("relabel_menu");
    CorrectionMenu.offset = 0;
    CorrectionMenu.label = document.getElementById("rr_node_label");
    CorrectionMenu.current_list = document.getElementById("rr_category_list");
    CorrectionMenu.current_grid = document.getElementById("rr_symbol_grid");
    
    // lists and grids get added to center panel
    CorrectionMenu.center_panel = document.getElementById("rr_center");
    if(Modernizr.touch)
    {
        CorrectionMenu.current_list.addEventListener("touchstart", CorrectionMenu.touchstart, true);
        CorrectionMenu.current_list.addEventListener("touchmove", CorrectionMenu.touchmove, true);
        CorrectionMenu.current_list.addEventListener("touchend", CorrectionMenu.touchend, true);
        
        CorrectionMenu.current_grid.addEventListener("touchstart", CorrectionMenu.touchstart, true);
        CorrectionMenu.current_grid.addEventListener("touchmove", CorrectionMenu.touchmove, true);
        CorrectionMenu.current_grid.addEventListener("touchend", CorrectionMenu.touchend, true);
    }
    
    
    CorrectionMenu.center_panel.removeChild(CorrectionMenu.current_list);
    CorrectionMenu.center_panel.removeChild(CorrectionMenu.current_grid);
    
    
    /** Get the SymbolTree we are going to use **/
    var url = Editor.editor_root + Editor.symbol_tree;
    //console.log(url);
    
    $.get
    (
        Editor.symbol_tree,
        function(data, textStatus, xmlhttp)
        {
            //console.log("url: " + url);
            //console.log("data: " + data);
            //console.log("textStatus: " + textStatus);
            //console.log("xmlhttp: " + xmlhttp.toString());
            // parse received XML and build symbol tree
            CorrectionMenu.symbol_tree = SymbolTree.parseXml(data);
            //console.log(CorrectionMenu.symbol_tree.toString());
            // add in category for recognition results
            CorrectionMenu.recognition_node = new CategoryNode();
            CorrectionMenu.recognition_node.category = "OCR";
            CorrectionMenu.recognition_node.children_type = NodeType.Symbol;
            CorrectionMenu.recognition_node.parent = CorrectionMenu.symbol_tree.root;
            CorrectionMenu.symbol_tree.root.children.splice(0,0,CorrectionMenu.recognition_node);
            
            // populate root panel node
            //CorrectionMenu.populateCategoryList(CorrectionMenu.current_list);
            
        },
        "xml"
    );
}

CorrectionMenu.build_title_html = function()
{
    
    var node = CorrectionMenu.symbol_tree.current;
    var node_names = new Array();
    
    do
    {
        node_names.unshift(node.category);
        node = node.parent;
    }
    while(node != null);
    
    var sb = new StringBuilder();
    for(var k = 0; k < node_names.length; k++)
    {
        sb.append("<span class=\"rr_node button\" onclick=\"CorrectionMenu_up(").append(node_names.length - 1 - k).append(");\">").append(node_names[k]).append("</span>");
        if(k != node_names.length - 1)
            //sb.append("  �  ");
            //sb.append("  \u2023  ");    // arrow bullet
            sb.append("<span class=\"rr_node_delimiter\">  \u25b7  </span>");

    }
    
    //console.log(sb.toString());
    return sb.toString();
}

CorrectionMenu.populateCategoryList = function(list_div, node, start_index)
{
    var child_nodes = node.children;
    var node_index = start_index;
    if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Category)
    {
        var child_divs = list_div.childNodes;
        while(child_divs.length > 0)
            list_div.removeChild(child_divs.item(0));
        
        // add each category node
        for(var k = 0; k < child_nodes.length; k++)
        {
            var div = document.createElement("div");
            div.className = "category_row button";
            div.innerHTML = child_nodes[k].category;
            div.addEventListener("click", CorrectionMenu.select_category, true);
            div.style.lineHeight = CorrectionMenu.center_panel.clientHeight / 5 + "px";
            CorrectionMenu.current_list.appendChild(div);
        }
        
        //CorrectionMenu.label.innerHTML = CorrectionMenu.symbol_tree.current.category;
        
        CorrectionMenu.label.innerHTML = CorrectionMenu.build_title_html();
        if(CorrectionMenu.symbol_tree.current != CorrectionMenu.symbol_tree.root)
            CorrectionMenu.up.innerHTML = "Up (" + CorrectionMenu.symbol_tree.current.parent.category + ")";        
        else
            CorrectionMenu.up.innerHTML = "";

        if(Modernizr.touch)
        {
            CorrectionMenu.current_list.style.setProperty('-webkit-transform', 'translate3d(0px,0px,0px)', null);
            CorrectionMenu.current_Y = 0;
        }
    }
}

CorrectionMenu.populateSymbolGrid = function(grid_div, node, start_index)
{
    var child_nodes = node.children;
    var node_index = start_index;
    if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Symbol)
    {
        var child_divs = grid_div.childNodes;
        while(child_divs.length > 0)
            grid_div.removeChild(child_divs.item(0));

        // add each cell node
        for(var k = 0; k < child_nodes.length; k++)
        {
            var div = document.createElement("div");
            div.className = "symbol_cell button";
            
            //console.log(child_nodes[k].symbol);
            
            div.innerHTML = child_nodes[k].symbol;
            
            //console.log(child_nodes[k].symbol);
            div.addEventListener("click", CorrectionMenu.select_symbol, true);
            div.style.lineHeight = CorrectionMenu.center_panel.clientHeight / 3 + "px";
            CorrectionMenu.current_grid.appendChild(div);
        }
        
        CorrectionMenu.label.innerHTML = CorrectionMenu.build_title_html();
        if(CorrectionMenu.symbol_tree.current != CorrectionMenu.symbol_tree.root)
            CorrectionMenu.up.innerHTML = "Up (" + CorrectionMenu.symbol_tree.current.parent.category + ")";
        if(Modernizr.touch)
        {
            CorrectionMenu.current_grid.style.setProperty('-webkit-transform', 'translate3d(0px,0px,0px)', null);
            CorrectionMenu.current_Y = 0;
        }
    }
}

CorrectionMenu.updateOCRList = function()
{
    // Produce OCR result correction menu data, if selected objects are a single segment.
    var segment_set = Editor.selected_segments[0].set_id;
    var all_same = true;
    for(var k = 1; k < Editor.selected_segments.length; k++)
    {
        if(segment_set != Editor.selected_segments[k].set_id)
        {
            all_same = false;
            break;
        }
    }
    // BUG (?) : if we have mutliple segments, we shouldn't provide OCR results.
    if(all_same)
    {
        var rec_result = RecognitionManager.getRecognition(segment_set);
        CorrectionMenu.recognition_node.children.length = 0;
        for(var k = 0; k < rec_result.results; k++)
        {
            var symbol_node = new SymbolNode();
            symbol_node.symbol = rec_result.symbols[k];
            if(typeof(symbol_node.symbol) == "undefined")
                symbol_node.symbol = "undefined";
            //console.log("symbol: " + symbol_node.symbol);
            CorrectionMenu.recognition_node.children.push(symbol_node);
        }
    }
}


/*
    hide_callback used by the hide() function to go back to the mode we were
    in previously.
*/
CorrectionMenu.show = function(callback)
{
    // Change state, make menu visible.
    Editor.state = EditorState.Relabeling;
    CorrectionMenu.menu.style.visibility = "visible";
    if(callback)
        CorrectionMenu.hide_callback = callback;
    else
        CorrectionMenu.hide_callback = null;

    // DEBUG: uncomment and fix the following code if we want to try and
    // restore the current menu state (e.g. to go back to the menu where a correction was
    // made.
    // Removes list of symbols from the current menu, if we selected a symbol last time.
    //if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Symbol)
    //{
    // Comment out: maintains current menu state.
    //    CorrectionMenu.center_panel.removeChild(CorrectionMenu.current_grid);
    //    CorrectionMenu.center_panel.appendChild(CorrectionMenu.current_list);
    //} else {
    // Produce top-level list.
	$("#tex_result")[0].disabled = true; // disable input field when correction menu pops up   
    CorrectionMenu.symbol_tree.current = CorrectionMenu.symbol_tree.root;
    CorrectionMenu.populateCategoryList(CorrectionMenu.current_list, CorrectionMenu.symbol_tree.current, 0);

    // Produce OCR results, place in the panel.
    CorrectionMenu.updateOCRList();
    CorrectionMenu.symbol_tree.current = CorrectionMenu.recognition_node;
    CorrectionMenu.populateSymbolGrid(CorrectionMenu.current_grid, CorrectionMenu.recognition_node, 0);
    CorrectionMenu.center_panel.appendChild(CorrectionMenu.current_grid);
    //}
}

CorrectionMenu.select_category = function(e)
{
    //console.log("selecting category");
    if(CorrectionMenu.touch_moving == true)
        return;

    var category = e.currentTarget.innerHTML;
    //console.log(category);
    // figure out new current
    for(var k = 0; k < CorrectionMenu.symbol_tree.current.children.length; k++)
    {
        if(CorrectionMenu.symbol_tree.current.children[k].category == category)
        {
            CorrectionMenu.symbol_tree.current = CorrectionMenu.symbol_tree.current.children[k]
            break;
        }
    }
    if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Category)
        CorrectionMenu.populateCategoryList(CorrectionMenu.current_list, CorrectionMenu.symbol_tree.current, 0);
    else if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Symbol)
    {
        CorrectionMenu.populateSymbolGrid(CorrectionMenu.current_grid, CorrectionMenu.symbol_tree.current, 0);
        CorrectionMenu.center_panel.removeChild(CorrectionMenu.current_list);
        CorrectionMenu.center_panel.appendChild(CorrectionMenu.current_grid);
    }
}

CorrectionMenu.select_symbol = function(e)
{
    if(CorrectionMenu.touch_moving == true)
        return;
    
    if (Editor.touchAndHoldFlag != 0) {
        return;
    }
    
    var symbol = e.currentTarget.innerHTML;
    if(symbol != "")
    {    
        var new_recognition = null;
        
        //console.log("Selected: " + symbol);
        var set_id = Segment.set_count++;
        for(var k = 0; k < Editor.selected_segments.length; k++)
        {
            if ( new_recognition == null ) new_recognition = RecognitionManager.getRecognition( Editor.selected_segments[ k ].set_id );
            
            //console.log("Removing: " + Editor.selected_segments[k].set_id);
            RecognitionManager.removeRecognition(Editor.selected_segments[k].set_id);
            
            Editor.selected_segments[k].set_id = set_id;
            
        }

        var set_from_symbols_list = false;
        for ( var i = 0; i < new_recognition.symbols.length; i++ ) {
            if ( new_recognition.symbols[ i ] == symbol ) {
                var sym = symbol;
                var cer = new_recognition.certainties[ i ];
                new_recognition.symbols.splice( i, 1 );
                new_recognition.certainties.splice( i, 1 );
                new_recognition.symbols.unshift( sym );
                new_recognition.certainties.unshift( cer );
                new_recognition.set_id = set_id;
                RecognitionManager.result_table.push( new_recognition );
                set_from_symbols_list = true;
                break;
            }
        }
        // If no recognition was found in the result list, force the new symbol
        if(!set_from_symbols_list){
            var sym = symbol;
            var cer = 1;
            new_recognition.symbols.splice( 0, 1 );
            new_recognition.certainties.splice( 0, 1 );
            new_recognition.symbols.unshift( sym );
            new_recognition.certainties.unshift( cer );
            new_recognition.set_id = set_id;
            RecognitionManager.result_table.push( new_recognition );
        }
        
        RenderManager.render();
        CorrectionMenu.hide();
    }
}

CorrectionMenu_up = function(node_count)
{
    if(node_count == 0)
        return;

    if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Symbol)
    {
        CorrectionMenu.center_panel.removeChild(CorrectionMenu.current_grid);
        CorrectionMenu.center_panel.appendChild(CorrectionMenu.current_list);
    }
    
    for(var k = 0; k < node_count; k++)
    {
        CorrectionMenu.symbol_tree.current = CorrectionMenu.symbol_tree.current.parent;
    }
    CorrectionMenu.populateCategoryList(CorrectionMenu.current_list, CorrectionMenu.symbol_tree.current, 0);
}

CorrectionMenu.up = function(node_count)
{
    if(CorrectionMenu.symbol_tree.current.parent != null)
    {
        if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Symbol)
        {
            CorrectionMenu.center_panel.removeChild(CorrectionMenu.current_grid);
            CorrectionMenu.center_panel.appendChild(CorrectionMenu.current_list);
        }
        CorrectionMenu.symbol_tree.current = CorrectionMenu.symbol_tree.current.parent;
        CorrectionMenu.populateCategoryList(CorrectionMenu.current_list, CorrectionMenu.symbol_tree.current, 0);
    }
    
    return;
}

CorrectionMenu.hide = function(){
    Editor.clearButtonOverlays();

    CorrectionMenu.menu.style.visibility = "hidden";
    
    if(CorrectionMenu.hide_callback)
        CorrectionMenu.hide_callback();
    $("#tex_result")[0].disabled = false;
    // Keep the current mode's button selected
    Editor.current_mode.close_mode();
    Editor.current_mode.init_mode();
    Editor.clear_selected_segments();
    RenderManager.render();
}

CorrectionMenu.touchstart = function(e)
{
    CorrectionMenu.touch_start_position = new Vector2(e.touches[0].clientX, e.touches[0].clientY);
    CorrectionMenu.div_moving = true;
    CorrectionMenu.div_speed = 0;
    CorrectionMenu.touch_moving = false;
}

CorrectionMenu.touchmove = function(e)
{
    CorrectionMenu.touch_moving = true;
    var to_move = null;
    var to_move_height;
    var center_height = CorrectionMenu.center_panel.clientHeight;
    if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Category)
    {
        if(CorrectionMenu.current_list.childNodes.length <= 5)    
            return;
        to_move = CorrectionMenu.current_list;
        
        to_move_height = CorrectionMenu.current_list.childNodes.length * center_height / 5.0;
    }
    else if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Symbol)
    {
        if(CorrectionMenu.current_grid.childNodes.length <= 9)
            return;
        to_move = CorrectionMenu.current_grid;
        if(CorrectionMenu.current_grid.childNodes.length % 3 != 0)
            to_move_height = (Math.floor(CorrectionMenu.current_grid.childNodes.length / 3) + 1) * (center_height / 3.0);
        else
            to_move_height = Math.floor(CorrectionMenu.current_grid.childNodes.length / 3) * (center_height / 3.0);
    }var touch_current_position = new Vector2(e.touches[0].clientX, e.touches[0].clientY);
    var delta = Vector2.Subtract(touch_current_position, CorrectionMenu.touch_start_position);

    CorrectionMenu.div_speed = delta.y;
    
    var new_position = CorrectionMenu.current_Y + delta.y;
    if(new_position > 0)
        new_position = 0;
    if(new_position < (center_height - to_move_height))
        new_position = center_height - to_move_height;

    CorrectionMenu.current_Y = new_position;
    
    
    
    var sb = new StringBuilder();
    sb.append("translate3d(0px,").append(CorrectionMenu.current_Y).append("px,0px)");
    to_move.style.setProperty('-webkit-transform', sb.toString(), null);
    //to_move.style.top = delta.y + "px";
    CorrectionMenu.touch_start_position = touch_current_position;
}

CorrectionMenu.touchend = function(e)
{
    CorrectionMenu.div_moving = true;
    CorrectionMenu.touchend_time = (new Date()).getTime();
    setTimeout(CorrectionMenu.animate);
}

CorrectionMenu.decelleration = 100;
CorrectionMenu.animate = function()
{
    var to_move = null;    
    var to_move_height;
    var center_height = CorrectionMenu.center_panel.clientHeight;
    if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Category)
    {
        if(CorrectionMenu.current_list.childNodes.length <= 5)    
            return;
        to_move = CorrectionMenu.current_list;
        
        to_move_height = CorrectionMenu.current_list.childNodes.length * center_height / 5.0;
    }
    else if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Symbol)
    {
        if(CorrectionMenu.current_grid.childNodes.length <= 9)
            return;
        to_move = CorrectionMenu.current_grid;
        if(CorrectionMenu.current_grid.childNodes.length % 3 != 0)
            to_move_height = (Math.floor(CorrectionMenu.current_grid.childNodes.length / 3) + 1) * (center_height / 3.0);
        else
            to_move_height = Math.floor(CorrectionMenu.current_grid.childNodes.length / 3) * (center_height / 3.0);
    }

    var current_time = (new Date()).getTime();
    if(CorrectionMenu.div_speed > 0)
    {
        CorrectionMenu.div_speed -= (current_time - CorrectionMenu.touchend_time)/1000.0 * CorrectionMenu.decelleration;
        if(CorrectionMenu.div_speed < 0)
            CorrectionMenu.div_speed = 0;
    }
    else if(CorrectionMenu.div_speed < 0)
    {
        CorrectionMenu.div_speed += (current_time - CorrectionMenu.touchend_time)/1000.0 * CorrectionMenu.decelleration;
        if(CorrectionMenu.div_speed > 0)
            CorrectionMenu.div_speed = 0;
    }
    CorrectionMenu.touchend_time = current_time

    if(CorrectionMenu.div_speed == 0.0)
    {
        CorrectionMenu.div_moving = false;
        return;
    }
    
    var new_position = CorrectionMenu.current_Y + CorrectionMenu.div_speed;
    if(new_position > 0)
    {
        new_position = 0;
        CorrectionMenu.div_moving = false;
    }
    if(new_position < (center_height - to_move_height))
    {
        new_position = center_height - to_move_height;
        CorrectionMenu.div_moving = false;
    }

    
    CorrectionMenu.current_Y = new_position;    
    var sb = new StringBuilder();
    sb.append("translate3d(0px,").append(CorrectionMenu.current_Y).append("px,0px)");
    to_move.style.setProperty('-webkit-transform', sb.toString(), null);
    
    if(CorrectionMenu.div_moving )
    {
        setTimeout(CorrectionMenu.animate);
    }
}
/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	As the name suggests, this file holds the correction menu's symbol tree.
   	It's essentially responsible for created a tree node which is used by pop up
 	correction menu when the user wants to correct a mis-recognized symbol.
*/
NodeType = {Symbol:0, Category:1}

function Node()
{
    this.parent = null;
    this.xml_node = null;
}

SymbolNode.prototype = new Node;
SymbolNode.prototype.constructor = SymbolNode;
function SymbolNode()
{
    this.name = null;
    this.symbol = null;
}

CategoryNode.prototype = new Node;
CategoryNode.prototype.constructor = CategoryNode;
function CategoryNode()
{
    this.children = new Array();
    this.category = null;
    this.children_type;
}

CategoryNode.prototype.getPath = function()
{
    var node_list = new Array();
    var n = this;
    while(n != null)
    {
        node_list.push(n.category);
        n = n.parent;
    }
    
    var sb = new StringBuilder();
    while(node_list.length > 0)
    {
        sb.append(node_list.pop()).append(" / ");
    }
    
    return sb.toString();
}

function SymbolTree()
{
    this.root = null;    
    this.current = null;
}

SymbolTree.prototype.toString = function()
{
    var sb = new StringBuilder();
    
    var stack = new Array();
    stack.push(this.root);
    stack.push(0);
    while(stack.length > 0)
    {
        var spaces = stack.pop();
        var node = stack.pop();
        for(var k = 0; k < spaces; k++)
            sb.append(' ');
        if(node instanceof SymbolNode)
            sb.append(node.symbol);
        else if(node instanceof CategoryNode)
        {
            sb.append(node.category);
            spaces++;
            for(var k = node.children.length - 1; k>= 0; k--)
            {
                stack.push(node.children[k]);
                stack.push(spaces);
            }
        }
        sb.appendLine();
    }
    
    return sb.toString();
    
}

/** Example xml schema:
    <SymbolTree>
    <Category name="Root">
    <Category name="Digits">
    <Symbol>0</Symbol>
    <Symbol>1</Symbol>
    <Symbol>2</Symbol>
    <Symbol>3</Symbol>
    <Symbol>4</Symbol>
    <Symbol>5</Symbol>
    <Symbol>6</Symbol>
    <Symbol>7</Symbol>
    <Symbol>8</Symbol>
    <Symbol>9</Symbol>
    </Category>
    <Category name="Operators">
    <Symbol>+</Symbol>
    <Symbol>-</Symbol>
    <Symbol>*</Symbol>
    <Symbol>/</Symbol>
    <Symbol>%</Symbol>
    </Category>
    <Category name="Punctuation">
    <Symbol>.</Symbol>
    <Symbol>,</Symbol>
    <Symbol>!</Symbol>
    <Symbol>?</Symbol>
    </Category>
    </Category>
    </SymbolTree>    
**/

SymbolTree.parseXml = function(in_xml)
{
    //var xmldoc = new DOMParser().parseFromString(in_xml, "text/xml");
    var xmldoc = in_xml;
    var node_list = xmldoc.getElementsByTagName("SymbolTree")
    if(node_list == null || node_list.length != 1)
    {
        console.log("Could not find root 'SymbolTree' node in:");
        console.log(new XMLSerializer().serializeToString(in_xml));
        return null;
    }
    
    var root_node = node_list[0];
    var child_nodes = root_node.childNodes;
    var child_elements = new Array();
    for(var k = 0; k < child_nodes.length; k++)
        if(child_nodes[k].nodeType == 1)    // element node http://www.w3schools.com/Dom/dom_nodetype.asp
            child_elements.push(child_nodes[k]);

    if(child_elements.length == 1)
    {
        if(child_elements[0].nodeName == "Category")
        {
            // parse
            var stack = new Array();
            var result = new SymbolTree();
            result.root = new CategoryNode();
            result.root.category = child_elements[0].getAttribute("name");
            stack.push(new Tuple(child_elements[0], result.root));
            while(stack.length > 0)
            {
                var pair = stack.pop();
                var xml_node = pair.item1;
                var tree_node = pair.item2;
                
                child_elements.length = 0;
                for(var k = 0; k < xml_node.childNodes.length; k++)
                    if(xml_node.childNodes[k].nodeType == 1)
                        child_elements.push(xml_node.childNodes[k]);
                
                if(xml_node.nodeName == "Category")
                {
                    var category_nodes = false;
                    var symbol_nodes = false;
                    
                    for(var k = 0; k < child_elements.length; k++)
                    {
                        if(child_elements[k].nodeName == "Category")
                        {
                            category_nodes = true;
                            
                            var cat = new CategoryNode();
                            cat.category = child_elements[k].getAttribute("name");
                            cat.parent = tree_node;
                            cat.parent.children.push(cat);
                            stack.push(new Tuple(child_elements[k], cat));
                        }
                        else if(child_elements[k].nodeName == "Symbol")
                        {
                            symbol_nodes = true;
                            if(child_elements[k].childNodes.length == 0)
                            {
                                var sym = new SymbolNode();
                                sym.parent = tree_node;
                                sym.symbol = child_elements[k].getAttribute("unicode");
                                sym.parent.children.push(sym);
                            }
                            else
                            {
                                console.log("Error: Problem parsing Symbol node: " + new XMLSerializer().serializeToString(child_elements[k]));
                                return null;
                            }
                        }
                        
                        if(symbol_nodes == true && category_nodes == true)
                        {
                            console.log("Error: This Category node contains both child Symbol and Category Nodes:\n");
                            console.log(new XMLSerializer().serializeToString(xml_node));
                            return null;
                        }
                        else if(symbol_nodes)
                        {
                            tree_node.children_type =  NodeType.Symbol;
                        }
                        else if(category_nodes)
                        {
                            tree_node.children_type = NodeType.Category;
                        }
                    }
                    
                }
                else
                {
                    console.log("Error: Unknown node type: " + xml_node.nodeName);
                    return null;
                }
                
            }
            result.current = result.root;
            return result;
        }
        else
        {
            console.log("Wrong root node name: " + child_elements[0].nodeName);
            return null;
        }
    }
    else
    {
        console.log("Error, there can be only 1 root Category node in SymbolTree");
        return null;
    }

    
    //var result 
}/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/* 
	This file has objects and functions for drawing objects on the canvas. Mainly 
	responsible for the visible bounding boxes that appear in rect select mode

    Major methods are:
		render_tools_layer: Render the boudning box, segments, rectangle selection box etc.
		render: Go through all object on screen and render them, this mainly updates SVG
		values, the browser actually draws the object on screen.
		colorOCRbbs: Set the color of the translucent blue/red boxes based on the Editor's
		state.
		render_set_field: Creates and renders the OCR layer above a symbol.
*/

function RenderManager()
{
}

// Called when Min starts up. It just initializes the RenderManager
RenderManager.initialize = function(in_width, in_height, in_layers)
{
    RenderManager.width = in_width;
    RenderManager.height = in_height;
    RenderManager.layer_count = in_layers;
    
    RenderManager.segments = new Array();
    
    RenderManager.bounding_box = document.getElementById("bounding_box");
    RenderManager.bounding_box.style.visibility = "hidden";
    RenderManager.selection_box = document.getElementById("selection_rectangle");
    RenderManager.selection_box.style.visibility = "hidden";
    
    //  build a set of divs we can use for segment sets
    RenderManager.segment_set_divs = new Array();
}

// render the helper graphics (bounding box, segments ets, rectangle select etc)
RenderManager.render_tools_layer = function()
{
	RenderManager.render_set_field(4);

    // Show selection bounding box.
    if(Editor.selected_bb != null)
        RenderManager.render_bb(Editor.selected_bb, 4);
    else
        RenderManager.bounding_box.style.visibility = "hidden";

    
    // render selection rectangle
    if(Editor.start_rect_selection != null && Editor.end_rect_selection != null)
    {
        RenderManager.render_selection_box(Editor.start_rect_selection, Editor.end_rect_selection, 4);
    }
    else
        RenderManager.selection_box.style.visibility = "hidden";
}

// Render all the segments on the canvas
RenderManager.render = function()
{    
    var setid = -1;
    var all_same_setid = true;
    //var infobar = document.getElementById( "infobar" );
    
    for(var k = 0; k < Editor.segments.length; k++)
    {
        var seg = Editor.segments[k];
        
        // // Delete segment if it's an uninitialized ImageBlob
        if(seg.initialized == false && !seg.mins){
            Editor.segments.splice(k, 1);
            continue;
        }
            
        
        if(Editor.segment_selected(seg)) {
            if ( setid == -1 ) {
                setid = seg.set_id;
            } else if ( seg.set_id != setid ) {
                all_same_setid = false;
            }
            seg.render_selected();
        } else {
            seg.render();
        }
    }

	// RZ: test for mode. Don't render recognition results when collecting data.
	if (! Editor.dataCollection)
   		RenderManager.render_tools_layer();
}

RenderManager.render_selection_box = function(in_min, in_max, in_context_id)
{
    var left = Math.min(in_min.x, in_max.x);
    var right = Math.max(in_min.x, in_max.x);

    var top = Math.min(in_min.y, in_max.y);
    var bottom = Math.max(in_min.y, in_max.y);
    
    RenderManager.selection_box.style.top = top + "px";
    RenderManager.selection_box.style.left = left + "px";
    RenderManager.selection_box.style.width =(right - left) + "px";
    RenderManager.selection_box.style.height = (bottom - top) + "px";
    RenderManager.selection_box.style.visibility = "visible";
}

// render the bounding box
RenderManager.render_bb = function(in_bb, in_context_id)
{
    // rlaz: Modified to clean up appearance of selection boxes.
    RenderManager.bounding_box.style.top = in_bb.render_mins.y -3 + "px";
    RenderManager.bounding_box.style.left = in_bb.render_mins.x -3  + "px";
    RenderManager.bounding_box.style.width = (in_bb.render_maxs.x - in_bb.render_mins.x)  + "px";
    RenderManager.bounding_box.style.height = (in_bb.render_maxs.y - in_bb.render_mins.y) + "px";
    RenderManager.bounding_box.style.visibility = "visible";
    
    return;
}

RenderManager.render_bb_control_point = function(in_x, in_y, in_context)
{
    in_context.fillStyle = Editor.control_point_fill_color;
    in_context.strokeStyle = Editor.control_point_line_color;
    
    in_context.lineWidth = Editor.control_point_line_width;
    
    in_context.beginPath();
    in_context.arc(in_x, in_y, Editor.control_point_radius, 0, Math.PI * 2, true);
    in_context.closePath();
    in_context.fill();
    in_context.stroke();
}

// RLAZ: New method to colorize the bounding boxes for OCR results
// based on state.
RenderManager.colorOCRbbs = function(classname) {
    for (var i = 0; i < RenderManager.segment_set_divs.length; i++) {
        var segment = RenderManager.segment_set_divs[i];
        RenderManager.segment_set_divs[i].className = classname;
    }
}

/*
	This method is responsible for displaying the bounding box over a segment
	and the SVG that's in the bounding box div.
	Each bounding box is a div 
*/
RenderManager.render_set_field = function(in_context_id)
{
    // Uses fact that primitive are sorted according to set (segment)
    // identifiers.
    var set_segments = new Array();

    Editor.segments.push(null);    // add null pointer so we can easily render last set in list
    var set_index = 0;
    for(var k = 0; k < Editor.segments.length; k++)
    {
        var seg = Editor.segments[k];
        if(set_segments.length == 0) {
            set_segments.push(seg);
        }
        else if(seg == null || seg.set_id != set_segments[0].set_id)
        {
            // We have found the next symbol (primitive segment).
            var is_visible = set_segments[0].expression_id == Editor.current_expression_id;
            var mins = set_segments[0].worldMinDrawPosition();
            var maxs = set_segments[0].worldMaxDrawPosition();
            
            // Find the extent of the symbol (BB)
            for(var j = 1; j < set_segments.length ; j++)
            {
                var seg_min = set_segments[j].worldMinDrawPosition();
                var seg_max = set_segments[j].worldMaxDrawPosition();

                is_visible = is_visible && set_segments[j].expression_id == Editor.current_expression_id;
                
                if(seg_min.x < mins.x)
                    mins.x = seg_min.x;
                if(seg_min.y < mins.y)
                    mins.y = seg_min.y;
                
                if(seg_max.x > maxs.x)
                    maxs.x = seg_max.x;
                if(seg_max.y > maxs.y)
                    maxs.y = seg_max.y;
            }
            var rect_size = Vector2.Subtract(maxs, mins);

            // Generate divs to represent each symbol.
            if(RenderManager.segment_set_divs.length == set_index)
            {
                var div = document.createElement('div');

                div.className = Editor.current_mode.segment_style_class;
                div.style.visibility='hidden';
                
                Editor.canvas_div.appendChild(div);
                RenderManager.segment_set_divs.push(div);
            }
			
            // Add the new div to the RenderManager data structures,
            // set visiblity and BB properties.
            var ss_div = RenderManager.segment_set_divs[set_index++];
            ss_div.style.visibility = "visible";
            ss_div.style.left = mins.x + "px";
            ss_div.style.top = mins.y + "px";
            ss_div.style.width = rect_size.x + "px";
            ss_div.style.height = rect_size.y + "px";
            $(ss_div).toggle(is_visible);
            
            // Create a connection between the bounding boxes and the segments
            for(var i = 0; i < set_segments.length; i++)
            	set_segments[i].index = set_index - 1;
            
            // Recognition result/label
            var recognition_result = RecognitionManager.getRecognition(set_segments[0].set_id);
            if(recognition_result != null && set_segments[0].constructor != SymbolSegment && set_segments[0].constructor != TeX_Input)
            {
                var tex = recognition_result.symbols[0];
                
				//console.log("HERE------------ (renderer) tex: " + tex);
				// copy set_segments array
				var segs = set_segments.slice(0, set_segments.length); 
                if(is_visible){
                	var recognition = ss_div.getAttribute("data-recognition");
                	//console.log("HERE------------ data-recognition:" + recognition);
					if(set_segments[0].constructor == ImageBlob && (tex.search("&#x") != -1)){
                			var latex = RecognitionManager.unicode_to_symbol[tex.toLowerCase()];
                			if(latex == null){
                				var unicode = tex.split("x")[1].split(";")[0];
                				latex = String.fromCharCode(parseInt(unicode,16));
                			}
                			tex = latex;
                	}
                	for(var z = 0; z < set_segments.length; z++){
                		set_segments[z].text = tex;
					}
					if(recognition != null && recognition == tex && ss_div.firstChild){		
						// update recognition - usually for resizing and movement
						RenderManager.render_svg(ss_div,segs);// Update the SVG on BBox	
					}else{ // change recognition or insert new recognition
						ss_div.setAttribute("data-recognition", tex);
						RenderManager.start_display(ss_div,tex,segs);	
					}
				}
            }else{
            	ss_div.setAttribute("data-recognition", set_segments[0].text);
            	while(ss_div.hasChildNodes()){
					ss_div.removeChild(ss_div.lastChild);
				}
            }
            	

            // 'Empty' list of primitives for next object, add current object to list.
            set_segments.length = 0;
            set_segments.push(seg);
        }
        else
            set_segments.push(seg);
    }
    Editor.segments.pop();

    for(var k = set_index; k < RenderManager.segment_set_divs.length; k++)
    {
    	var ss_div = RenderManager.segment_set_divs[k];
        ss_div.style.visibility = "hidden";
        while(ss_div.hasChildNodes()){
			ss_div.removeChild(ss_div.lastChild);
		}
    }
}

/* Inserts Tex into a DOM element and calls MathJax to render it. When MathJax is done,
	it calls insert_teX which inserts the tex into the BBox of the symbol on the canvas
*/
RenderManager.start_display = function(ss_div,tex,set_segments){

	//console.log("HERE------------ tex: " + tex);
	var elem = document.createElement("div");
	elem.setAttribute("id","RenderManager_Tex");
	elem.style.visibility = "hidden"; 		// Hide the element
	elem.style.position = "absolute";
	elem.style.fontSize = "500%";
	elem.innerHTML = "\\[ " + tex + " \\]"; 	// So MathJax can render it
	document.body.appendChild(elem);
	MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "SVG"],
		["Typeset",MathJax.Hub,elem],[RenderManager.insert_teX,elem,ss_div,set_segments]);
}

// Adjusts the SVG recognition result to fit the RenderManager's Box
// Called when user is resizing a bounding box or a group of them
RenderManager.render_svg = function(BBox_div, set_segments){
	var element,x_offset,y_offset;
	var svg_root = BBox_div.firstChild;
	var inner_svg = svg_root.getElementsByTagName("g")[0];
	
	inner_svg.removeAttribute("transform");
	var svg_width = parseInt(inner_svg.getBoundingClientRect().width);
	var svg_height = parseInt(inner_svg.getBoundingClientRect().height);
	var scale_x = (parseInt(BBox_div.getBoundingClientRect().width)-2)/svg_width;
	var scale_y = parseInt(BBox_div.getBoundingClientRect().height)/svg_height;
	
	inner_svg.setAttribute("transform", "scale("+scale_x+","+scale_y+")");
	var BBox_top = $(BBox_div).offset().top;
	var BBox_left = $(BBox_div).offset().left;
	element_height = $(inner_svg).offset().top;
	element_width = $(inner_svg).offset().left;
	x_tran = parseFloat(inner_svg.getAttribute("transform").split(" ")[0].split("(")[1].split(",")[0]);
	y_tran = parseFloat(inner_svg.getAttribute("transform").split(" ")[0].split("(")[1].split(",")[1]);
	if(parseFloat(BBox_top-element_height) != 0){
		y_offset = parseFloat(BBox_top-element_height);
	}
	if(parseFloat(BBox_left - element_width) != 0){
		x_offset = parseFloat(BBox_left - element_width);
	}
	inner_svg.setAttribute("transform", "translate("+(x_offset)+","+(y_offset)+") scale("+scale_x+","+scale_y+")");
	// Hide strokes by making sure we are in DrawMode and making sure the opacity is not set 
	// before hiding the stroke.
	//
	if(Editor.current_mode.segment_style_class == "segment_draw_mode"){ 
		for(var z = 0; z < set_segments.length; z++){
			if(set_segments[z].constructor == PenStroke && set_segments[z].inner_svg.style.opacity == "")
				$(set_segments[z].inner_svg).animate({opacity:0},600,function(){});
		}		
	}
	set_segments.length = 0;
}

/* Inserts the SVG into the RenderManager's BBox for the symbol
   Note: Subtracted 2 from the BBox width because the SVG were being slightly cut off
 		 It's not an error just that the BBox width is small
   		 Before an SVG is inserted into a BBox, I scale the individual symbols before 
   		 scaling SVG's inner_svg to fit the BBox on the canvas. I did it because of 
   		 symbols like log and 2. Scaling just the SVG's inner_svg to fit the BBox without
   		 scaling the symbols congests the symbols.
*/
RenderManager.insert_teX = function(elem, BBox_div, set_segments)
{
    var svg_width,svg_height,path_tag,rect_tag,x_offset,y_offset,element_height,
    	element_width,old_bottom;
	var svg_root = document.getElementById("RenderManager_Tex").getElementsByClassName("MathJax_SVG")[0].firstChild;
	
	var use_tag_array = svg_root.getElementsByTagName("use");
	var rect_tag_array = svg_root.getElementsByTagName("rect");
	use_tag_array = Array.prototype.slice.call(use_tag_array);
	rect_tag_array = Array.prototype.slice.call(rect_tag_array);

	// Originally designed expecting one symbol, one rectangle - no longer the case.
	var element = use_tag_array.concat(rect_tag_array); 
    var root_svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    root_svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    root_svg.setAttribute("style", "position: absolute; left: 0px; top: 0px; opacity:0;");
    root_svg.setAttribute("width", "100%");
    root_svg.setAttribute("height", "100%");
    var inner_svg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
	for(var i = 0; i < element.length; i++){
    	
		var temp_root = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    	temp_root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    	temp_root.setAttribute("visibility", "hidden");
    	var offset = element[i].getBoundingClientRect();
		var elem_rect = element[i].getBoundingClientRect();
		
		if(element[i].tagName.toString() == "use"){
			path_tag = document.getElementsByTagName("svg")[0].getElementById(element[i].getAttribute("href").split("#")[1]).cloneNode(true);
			path_tag.removeAttribute("id");
			path_tag.setAttribute("visibility","visible");
			temp_root.appendChild(path_tag);
			document.body.appendChild(temp_root);
			
			var path_rect = path_tag.getBoundingClientRect();
			//console.log("path_rect " + path_rect.left + ", " + path_rect.top
			//		+ "  " + path_rect.right + ", " + path_rect.bottom);
			var path_scale_x = elem_rect.width/path_rect.width;
			var path_scale_y = elem_rect.height/path_rect.height;
			
			// Scaling parameters need to be different for lines depending
			// on whether there are vertical structures.
			scale_x = path_scale_x;
			scale_y = path_scale_y;

 			var symbolCode = element[i].getAttribute("href").split("-")[1].toLowerCase();
			var symbol = RecognitionManager.unicode_to_symbol["&#x" + symbolCode + ";"];
			//console.log("Symbol: " + symbol);		
			
			if (element.length == 1) {
				scale_x = 1;
				scale_y = 1;
			}
			

			//console.log("THERE ---- ++ " + i);
			path_tag.setAttribute("transform",
				   "translate(" + offset.left + "," + offset.bottom + ")"
					+ " scale(" + scale_x + "," + scale_y + ") matrix(1 0 0 -1 0 0)");


			// Clean up.
			path_tag.removeAttribute("visibility");
			path_tag.setAttribute("fill", Editor.segment_fill);
			inner_svg.appendChild(path_tag);
	
		} else {
			// Vertical structures, e.g. fraction lines (?)
			//console.log("HERE------------ WHAAAH? " + i);
			rect_tag = element[i].cloneNode(true);
			rect_tag.setAttribute("visibility","visible");
			temp_root.appendChild(rect_tag);
			document.body.appendChild(temp_root);
			
			var path_rect = rect_tag.getBoundingClientRect();
			console.log("**path_rect " + path_rect.left + ", " + path_rect.top
					+ "  " + path_rect.right + ", " + path_rect.bottom);
			var path_scale_x = elem_rect.width/path_rect.width;
			var path_scale_y = elem_rect.height/path_rect.height;
			
			rect_tag.setAttribute("transform", "translate(" + offset.left + "," 
					+ offset.bottom
					+ ") scale(" + path_scale_x + "," + path_scale_y 
					+ ") matrix(1 0 0 -1 0 0)");
			// Clean up.
			rect_tag.removeAttribute("x");
			rect_tag.removeAttribute("y");
			rect_tag.removeAttribute("visibility");
			rect_tag.setAttribute("fill", Editor.segment_fill);
			inner_svg.appendChild(rect_tag);
		}
		document.body.removeChild(temp_root);
	}  // end for

	while(BBox_div.hasChildNodes()){ // removes previous recognition svg
		BBox_div.removeChild(BBox_div.lastChild);
	}

	// Fit result in bounding box for the passed div.
	root_svg.appendChild(inner_svg);
	BBox_div.appendChild(root_svg);
	svg_width = parseInt(inner_svg.getBoundingClientRect().width);
	//console.log("svg_width: " + svg_width);
	svg_height = parseInt(inner_svg.getBoundingClientRect().height);
	
	var BBox_rect = BBox_div.getBoundingClientRect();
	var scale_x = (parseInt(BBox_rect.width)-2)/svg_width;
	var scale_y = parseInt(BBox_rect.height)/svg_height;
	inner_svg.setAttribute("transform", "scale("+scale_x+","+scale_y+")");
	
	var BBox_top = $(BBox_div).offset().top;
	var BBox_left = $(BBox_div).offset().left;
	element_height = $(inner_svg).offset().top;
	element_width = $(inner_svg).offset().left;

	if(parseFloat(BBox_top - element_height) != 0)
		y_offset = parseFloat(BBox_top - element_height);
	if(parseFloat(BBox_left - element_width) != 0)
		x_offset = parseFloat(BBox_left - element_width);
	
	inner_svg.setAttribute("transform", "translate("+x_offset+","+y_offset+") scale("+scale_x+","+scale_y+")");
	
	// Visualize fade-in of TeX string.
	$(root_svg).fadeTo(450,1,function(){});
	
	for(var z = 0; z < set_segments.length; z++){
		if(set_segments[z].constructor == PenStroke)
			$(set_segments[z].inner_svg).animate({opacity:0},600,function(){});
	}
	document.body.removeChild(elem);

	// Clear array, reset MathJax rendering mode.
	set_segments.length = 0; 
	MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "HTML-CSS"]);
}

// Increases the opacity of strokes when in selection mode
RenderManager.increase_stroke_opacity = function(){
	for(var i = 0; i < Editor.segments.length; i++){
		if(Editor.segments[i].constructor == PenStroke) {
			$(Editor.segments[i].inner_svg).animate({opacity:0.9},600,function(){});
		}
	}
	for (var i = 0; i < RenderManager.segment_set_divs.length; i++) {
		$(RenderManager.segment_set_divs[i].firstChild).animate({opacity:0.15},600,function(){});
	}
}

// Decreases the opacity of strokes when exiting selection mode
RenderManager.decrease_stroke_opacity = function(){
	for(var i = 0; i < Editor.segments.length; i++){
		if(Editor.segments[i].constructor == PenStroke)
			$(Editor.segments[i].inner_svg).animate({opacity:0},600,function(){});
	}
	for (var i = 0; i < RenderManager.segment_set_divs.length; i++) {
		$(RenderManager.segment_set_divs[i].firstChild).animate({opacity:1.0},600,function(){});
	}

}

// Hide bounding boxes that are not used
RenderManager.unrender_set_field = function()
{
    for(var k = 0; k < RenderManager.segment_set_divs.length; k++)
    {
        RenderManager.segment_set_divs[k].style.visibility = "hidden";
    }
}

RenderManager.clear_canvas = function()
{
    var w = Editor.canvases[0].width;
    Editor.canvases[0].width = 1;
    Editor.canvases[0].width = w;
}
/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	Defines an object which stores Segments and can test if the mouse's position collides with
    one of the segments on the canvas. 
*/
function CollisionManager()
{
    
}

CollisionManager.initialize = function()
{

}

// return array of segmenets whose bounding boxes we collide with
CollisionManager.get_point_collides_bb = function(click_point)
{
    var result = new Array();
    var already_examined = new Array();
    for(var k = 0; k < Editor.segments.length; k++)
    {
        var segment = Editor.segments[k]
        //console.log(segment.set_id);
        
        // do a check to make suer we don't do same check multiple times
        if(already_examined[segment.set_id] != true)
        {
            already_examined[segment.set_id] = true;
            // find extents of entire segment set
            var segment_set = Editor.get_segment_by_id(segment.set_id)
            var min = segment_set[0].worldMinPosition();
            var max = segment_set[0].worldMaxPosition();

            for(var j = 1; j < segment_set.length; j++)
            {
                var new_min = segment_set[j].worldMinPosition();
                var new_max = segment_set[j].worldMaxPosition();
                
                min.x = Math.min(new_min.x, min.x);
                min.y = Math.min(new_min.y, min.y);
                
                max.x = Math.max(new_max.x, max.x);
                max.y = Math.max(new_max.y, max.y);
            }
            
            // do collision check
            if(min.x <= click_point.x && max.x >= click_point.x &&
               min.y <= click_point.y && max.y >= click_point.y)
            {
                result.push(Editor.segments[k]);
            }
        }
        
    }
    return result;
}

// returns array of objects which point collides with
CollisionManager.get_point_collides = function(click_point)
{
    var result = new Array();
    for(var k = 0; k < Editor.segments.length; k++)
    {
        var seg = Editor.segments[k];
        if(seg.point_collides(click_point))
            result.push(seg);
    }
    
    // sort by layer_index
    
    //return this.sort_by_layer(result);;
    return result;
}

CollisionManager.get_line_collides = function(point_a, point_b)
{
    var result = new Array();
    for(var k = 0; k < Editor.segments.length; k++)
    {
        var seg = Editor.segments[k];
        if(seg.line_collides(point_a,point_b))
            result.push(seg);
    }
    
    return result;
}

CollisionManager.get_rectangle_collides = function(corner_a, corner_b)
{
    var result = new Array();
    for(var k = 0; k < Editor.segments.length; k++)
    {
        var seg = Editor.segments[k];
        if(seg.rectangle_collides(corner_a, corner_b))
            result.push(seg);
    }
    
    
    return result;
}
/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
This file contains objects used for recognition results. It manages the classification
        queue, and also keeps a list of recognitions for display on Min's canvas.

        Some methods are:
			enqueue_segment: add a segment to the classification queue.
			classify_queued: Classify each object in the queue.
			fromXML: Give a RecognitionResult XML element and add the recognition to the system.
			addRecognitionForText: Add a recognition for a SymbolSegment.
			getRecognition: Returns the recognition associated with a set.
			addRecognitionForText: Adds a recognition for a SymbolSegment.
*/
function RecognitionResult()
{
    // list of symbols
    this.symbols = new Array();
    // associated list of certainties (from 0 to 1)
    this.certainties = new Array();
    
    this.results = 0;
    
    this.instance_ids = new Array();
    this.set_id = -1;
}

RecognitionResult.prototype.fromXML = function(in_xml_element)
{
    {
        var attributes = in_xml_element.attributes;
        var instance_ids = attributes.getNamedItem("instanceIDs").value.split(',');
        
        for(var k = 0; k < instance_ids.length; k++)
        {
            this.instance_ids.push(parseInt(instance_ids[k]));
        }

    }
    
    var result_nodes = in_xml_element.getElementsByTagName("Result");
    for(var k = 0; k < result_nodes.length; k++)
    {
        var attributes = result_nodes[k].attributes;
        var s_symbol = attributes.getNamedItem("symbol").value;
        var s_certainty = attributes.getNamedItem("certainty").value;
        
        this.certainties.push(parseFloat(s_certainty));
        this.symbols.push(s_symbol);
    }
    
    this.results = result_nodes.length;
    this.set_id = Segment.set_count++;
}

RecognitionResult.prototype.save_state = function() {
	return {
		symbols: this.symbols,
		certainties: this.certainties,
		results: this.results,
		instance_ids: this.instance_ids,
		set_id: this.set_id
	}
}

RecognitionResult.restore_state = function(state) {
	result = new RecognitionResult();
	result.symbols = state.symbols;
	result.certainties = state.certainties;
	result.results = state.results;
	result.instance_ids = state.instance_ids;
	result.set_id = state.set_id;
	return result;
}

function RecognitionManager()
{
    
}

RecognitionManager.initialize = function()
{
    RecognitionManager.result_table = new Array();
    RecognitionManager.segment_queue = new Array();
    RecognitionManager.timeout = null;
    RecognitionManager.max_segments = 1;
    RecognitionManager.symbol_to_latex = {};
    RecognitionManager.latex_to_symbol = {};
    RecognitionManager.unicode_to_symbol = {};
    RecognitionManager.build_symbol_table();
}

RecognitionManager.build_symbol_table = function(){
	$.get
    (
        Editor.generic_symbol_table,
        function(data, textStatus, xmlhttp){
            var data = xmlhttp.responseText;
        	var array = data.split("\n");
        	for(var i = 0; i < array.length; i++){ // build map(symbol to latex)
        		var temp = array[i].split(",");
        		if(temp[0] != "Codepoint" && temp.length > 1){
        			RecognitionManager.symbol_to_latex[temp[1]] = temp[3];
        			RecognitionManager.unicode_to_symbol[temp[0]] = temp[1];
        			if(temp[4] == null)
        				console.log(i);
        			var bar = temp[4].split("|");
        			for( var j = 0; j < bar.length; j++)
        				RecognitionManager.latex_to_symbol[bar[j]] = temp[1];
        		}
        	}
        }
    );
}

RecognitionManager.classify = function(in_set_id, should_segment)
{
    // first identify segments with this set id
    var segments_in_set = new Array();
    for(var k = 0; k < Editor.segments.length; k++)
        if(Editor.segments[k].set_id == in_set_id)
            segments_in_set.push(Editor.segments[k]);
    
    // if none exist, remove recognition result from table
    if(segments_in_set.length == 0)
    {
        for(var k = 0; k < RecognitionManager.result_table.length; k++)
        {
            if(RecognitionManager.result_table[k].set_id == in_set_id)
            {
                RecognitionManager.result_table.splice(k,1);
                return;
            }
        }
        return;
    }
    Editor.classifier.classify(segments_in_set, should_segment);
}

RecognitionManager.classify_queued = function(should_segment, should_assign_setid)
{
    var temp_list = new Array();
    var new_set_id = Segment.set_count++;
    
    var count = Math.min(RecognitionManager.max_segments, RecognitionManager.segment_queue.length);
    
    if ( count > 0 && !should_assign_setid ) new_set_id = RecognitionManager.segment_queue[ 0 ].set_id;
    
    for(var k = 0; k < count; k++)
    {
        temp_list.push(RecognitionManager.segment_queue[k]);
        temp_list[k].set_id = new_set_id;
    }
    RecognitionManager.segment_queue.splice(0,count);
    RecognitionManager.classify(new_set_id, should_segment);
}

RecognitionManager.enqueueSegment = function(segment)
{
    clearTimeout(RecognitionManager.timeout);

    RecognitionManager.segment_queue.push(segment);
    if(RecognitionManager.segment_queue.length >= RecognitionManager.max_segments)
    {
        RecognitionManager.classify_queued(false, segment.set_id == -1);
    }
    else
    {
        RecognitionManager.timeout = setTimeout("RecognitionManager.classify_queued(false," + ( segment.set_id == -1 ? "true" : "false" ) + ";", Editor.recognition_timeout);
    }
    
}

RecognitionManager.getRecognition = function(in_set_id)
{
    for(var k = 0; k < RecognitionManager.result_table.length; k++)
        if( RecognitionManager.result_table[k].set_id == in_set_id)
            return RecognitionManager.result_table[k];
    return null;
}

RecognitionManager.removeRecognition = function(in_set_id)
{
    for(var k = 0; k < RecognitionManager.result_table.length; k++)
        if( RecognitionManager.result_table[k].set_id == in_set_id)
            RecognitionManager.result_table.splice(k,1);
}

RecognitionManager.addRecognitionForText = function(textSegment) {
    RecognitionManager.removeRecognition(textSegment.set_id);
    
    result = new RecognitionResult();
    symbol = textSegment.text;
    if (symbol === undefined) {
        symbol = textSegment.text;
    }
    result.symbols.push(symbol);
    result.certainties.push(1);
    result.results = 1;
    result.set_id = textSegment.set_id;
    result.instance_ids.push(textSegment.instance_id);
    
    RecognitionManager.result_table.push(result);
}
/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	This file defines an object which represents the bounding box which surrounds objects
    on the canvas when they are clicked or selected.

    Methods:
		translate - translates the bounding box on the screen by a given offset.
		edge_clicked - determine which edge of the box was clicked based on a given point.
*/
function BoundingBox(corner_a, corner_b, render_corner_a, render_corner_b)
{
    // set up logical mins for resizing
    this.mins = new Vector2(0,0);
    this.maxs = new Vector2(0,0);
    if(corner_a.x < corner_b.x)
    {
        this.mins.x = corner_a.x;
        this.maxs.x = corner_b.x;
    }
    else
    {
        this.mins.x = corner_b.x;
        this.maxs.x = corner_a.x;
    }
    
    if(corner_a.y < corner_b.y)
    {
        this.mins.y = corner_a.y;
        this.maxs.y = corner_b.y;
    }
    else
    {
        this.mins.y = corner_b.y;
        this.maxs.y = corner_a.y;
    }
    
    // set up rendering mins
    
    this.render_mins = new Vector2(0,0);
    this.render_maxs = new Vector2(0,0);
    
    if(render_corner_a.x < render_corner_b.x)
    {
        this.render_mins.x = render_corner_a.x;
        this.render_maxs.x = render_corner_b.x;
    }
    else
    {
        this.render_mins.x = render_corner_b.x;
        this.render_maxs.x = render_corner_a.x;
    }
    
    if(render_corner_a.y < render_corner_b.y)
    {
        this.render_mins.y = render_corner_a.y;
        this.render_maxs.y = render_corner_b.y;
    }
    else
    {
        this.render_mins.y = render_corner_b.y;
        this.render_maxs.y = render_corner_a.y;
    }
}

BoundingBox.prototype.clone = function()
{
    return new BoundingBox(this.mins, this.maxs, this.render_mins, this.render_maxs);
}

BoundingBox.prototype.point_collides = function(in_point)
{
    if(in_point.x < this.render_mins.x)
        return false;
    if(in_point.x > this.render_maxs.x)
        return false;
    if(in_point.y < this.render_mins.y)
        return false;
    if(in_point.y > this.render_maxs.y)
        return false;
    return true;
}

BoundingBox.prototype.translate = function(in_offset)
{
    this.mins.Add(in_offset);
    this.maxs.Add(in_offset);
    
    this.render_mins.Add(in_offset);
    this.render_maxs.Add(in_offset);
}

BoundingBox.prototype.edge_clicked = function(in_point)
{
    var distance = Editor.control_point_radius + Editor.control_point_line_width/2.0;
    var distance2 = distance*distance;

    // top edge
    if(Vector2.SquareDistance(in_point, new Vector2( (this.render_mins.x + this.render_maxs.x)/2.0, this.render_mins.y)) <= distance2)
        return 0;
    // top right corner
    if(Vector2.SquareDistance(in_point, new Vector2(this.render_maxs.x, this.render_mins.y)) <= distance2)
        return 1;
    // right edge
    if(Vector2.SquareDistance(in_point, new Vector2(this.render_maxs.x, (this.render_mins.y + this.render_maxs.y)/2.0)) <= distance2)
        return 2;
    // botom right corner
    if(Vector2.SquareDistance(in_point, this.render_maxs) <= distance2)
        return 3;
    // bottom edge
    if(Vector2.SquareDistance(in_point, new Vector2( (this.render_mins.x + this.render_maxs.x)/2.0, this.render_maxs.y)) <= distance2)
        return 4;
    // bottom left corner
    if(Vector2.SquareDistance(in_point, new Vector2(this.render_mins.x, this.render_maxs.y)) <= distance2)
        return 5;
    //  left edge
    if(Vector2.SquareDistance(in_point, new Vector2(this.render_mins.x, (this.render_mins.y + this.render_maxs.y)/2.0)) <= distance2)
        return 6;
    // top left corner
    if(Vector2.SquareDistance(in_point, this.render_mins) <= distance2)
        return 7;
    
    return -1;
}

point_line_segment_distance = function(A, B, C)
{
    var AB = Vector2.Subtract(B, A);
    var t = Vector2.Dot(Vector2.Subtract(C, A), AB) / Vector2.Dot(AB, AB);

    if(t > 1)
        t = 1;
    if(t < 0)
        t = 0;
    
    var D = Vector2.Add(A, Vector2.Multiply(t, AB));
    
    var result = Vector2.Distance(D, C);
    
    return result;
}/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/* 
	This file defines the interface for Segments.
	The interface for all elements in the expression (image, stroke, text, etc)
*/
Segment.count = 0;
Segment.set_count = 0;
Segment.chalk_layer = true; // Whether or not this segment belongs to the chalk layer
Segment.last_id = 0;
function Segment()
{
    // identifiers to build unique id
    this.type_id;    // unique per class
    this.instance_id; // unique per object
    this.set_id;    // unique per 'set' of segments
    this.chalk_layer;
    
    // position information
    // top left hand corner of segment
    this.position;
    // width and height
    this.size;
    // the layer we are in, 0 is bottom N is top
    this.layer;
    // our axis aligned bounding box
    this.aabb;
    // the element this object contains, e.g. for Penstrokes and ImageBlobs this is an SVG.
    this.element;
}

Segment.next_set_id = function()
{
	// Many operations create "new" sets, both to create new segments, as well
	// as change attributes (e.g. symbol label/classification) of a given segment.
	// To avoid problems when data gets large, we are now book-keeping these ids
	// in the Segment class, and using a method to get the nextSetId.
	Segment.set_count++;
	while ( RecognitionManager.getRecognition( Segment.last_id ) != null )
		Segment.last_id++;

	return Segment.last_id;
}

// just draw to canvas using the given context
Segment.prototype.render = function(in_context)
{
    
}

// clears this segment
Segment.prototype.clear = function(in_context)
{

}

// draw method for when the segment is selected
Segment.prototype.render_selected = function(in_context)
{

}

// determine if the passed in point (screen space) collides with our geometery
Segment.prototype.point_collides = function(in_position)
{
    return false;
}

Segment.prototype.line_collides = function(point_a, point_b)
{
    return false;
}

// translate by this amount (Vector2)
Segment.prototype.translate = function(in_offset)
{

}

// resize a segment 
// origin - stationary point of parent group or set
// offset - distance mouse moved
Segment.prototype.resize = function(in_origin, in_scale)
{

}

Segment.prototype.freeze_transform = function()
{

}

Segment.unique_id = function(in_Segment)
{
    // type id will fill the top 8 bits, instance id will fill bottom 24
    if(in_Segment == null)
        return -1;
    return ((in_Segment.type_id << 24) + in_Segment.instance_id);
}

Segment.toXML = function()
{
    return "<Segment type=\"default\"/>";
}

Segment.parseXML = function(in_xml)
{
    
}
/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
 	Anything that has to do with the pen strokes and the points resides in this file.
  	It's instantiated whenever there is a mouse down event by the user.
  	The pen strokes points are collected and inserted inside an SVG object and then DOM. 
*/

// points are stored in local space
PenStroke.count = 0;
PenStroke.type_id = 2;
PenStroke.chalk_layer = true;
function PenStroke(in_x, in_y, in_line_width)
{
    // identifiers to build unique id
    this.instance_id = Segment.count++;
    this.type_id = PenStroke.type_id;
    this.set_id = Segment.set_count++;
    this.expression_id = Editor.current_expression_id;

    this.chalk_layer = PenStroke.chalk_layer;
    
    // line width
    this.line_width = in_line_width;
    this.line_half_width = this.line_width / 2;
    
    this.collision_radius = this.line_width / 2.0 * 7.0;
    this.squared_collision_radius = this.collision_radius * this.collision_radius;

    // layer information
    this.layer = 0;
    
    this.points = new Array();
    this.points.push(new Vector2(in_x,in_y));
    
    // transform information
    this.scale = new Vector2(1.0, 1.0);
    this.translation = new Vector2(0,0);
    
    this.temp_scale = new Vector2(1.0, 1.0);
    this.temp_translation = new Vector2(0.0, 0.0);

    // used to determine extents
    this.size = new Vector2(0.0, 0.0);
    
    this.world_mins = new Vector2(in_x,in_y);
    this.world_maxs = new Vector2(in_x,in_y);
    
    this.color = Editor.segment_color;
    this.stroke_width = Editor.stroke_width;

    // if true we need to update the SVG transform
    this.dirty_flag = false;
    
    this.element = null;
    this.classification_server = "PenStrokeClassifier";
    
    // add svg and apply appropriate transform here
    this.root_svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.root_svg.setAttribute("class", "pen_stroke");
    this.root_svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    this.root_svg.setAttribute("style", "position: absolute; left: 0px; top: 0px;");
    this.root_svg.setAttribute("width", "100%");
    this.root_svg.setAttribute("height", "100%");
    this.inner_svg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	
	// build polyline
	this.polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
	this.polyline.setAttribute("points", "");
	this.polyline.setAttribute("style", "fill:none; stroke:" + this.color +
	";stroke-width:" + Editor.stroke_width);
	this.inner_svg.appendChild(this.polyline);
    this.root_svg.appendChild(this.inner_svg);
    Editor.canvas_div.appendChild(this.root_svg);
}

PenStroke.prototype.update_extents = function()
{
    return;
}

PenStroke.prototype.worldMinPosition = function()
{
    var min = new Vector2(0,0).transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
    var max = this.size.transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
    
    return new Vector2(Math.min(min.x,max.x), Math.min(min.y, max.y));
}

PenStroke.prototype.worldMinDrawPosition = function()
{
    var result = this.worldMinPosition();
    result.x -= this.line_width ;
    result.y -= this.line_width ;
    return result;
}

PenStroke.prototype.worldMaxPosition = function()
{
    var min = new Vector2(0,0).transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
    var max = this.size.transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
    
    return new Vector2(Math.max(min.x,max.x), Math.max(min.y, max.y));
}

PenStroke.prototype.worldMaxDrawPosition = function()
{
    var result = this.worldMaxPosition();
    result.x += this.line_width ;
    result.y += this.line_width ;
    return result;
}

/*
	Method that adds each point while the user is drawing into the polyline object
*/
PenStroke.prototype.add_point = function(point_position)
{
     // just add the point to the list, render the line, and update the mins
    this.points.push(point_position);
    this.world_mins.x = Math.min(this.world_mins.x, point_position.x);
    this.world_mins.y = Math.min(this.world_mins.y, point_position.y);
    this.world_maxs.x = Math.max(this.world_maxs.x, point_position.x);
    this.world_maxs.y = Math.max(this.world_maxs.y, point_position.y);
    
    this.size = Vector2.Subtract(this.world_maxs, this.world_mins);
    var point_a = this.points[this.points.length - 2].clone();
	var point_b = this.points[this.points.length - 1].clone(); 

	// append points to polyline
	var point = this.root_svg.createSVGPoint();
	var point2 = this.root_svg.createSVGPoint();
	point.x = point_a.x;
	point.y = point_a.y;
	point2.x = point_b.x;
	point2.y = point_b.y;
	this.polyline.points.appendItem(point);
	this.polyline.points.appendItem(point2);	
}

/*
	Method is called when the user is done drawing on the canvas.
	It finalizes the segment drawing and sets its translation and scale
*/
PenStroke.prototype.finish_stroke = function(){
    if(this.points.length == 1){
        console.log("points: " + this.points.length);
        return false;
    }
    var sb = new StringBuilder();
    for(var k = 0; k < this.points.length; k++)
    {
        this.points[k] = Vector2.Subtract(this.points[k], this.world_mins);
        sb.append(this.points[k].x).append(',').append(this.points[k].y).append(' ');
    }
    
    this.polyline.setAttribute("points", sb.toString());
    this.polyline.setAttribute("style", "fill:none; stroke:" + this.color + ";stroke-width:" + this.stroke_width);
    this.translation = this.world_mins.clone();
    
    var sb = new StringBuilder();
	sb.append("translate(").append(this.temp_translation.x).append(',').append(this.temp_translation.y).append(") ");
	sb.append("scale(").append(this.temp_scale.x).append(',').append(this.temp_scale.y).append(") ");
	sb.append("translate(").append(this.translation.x).append(',').append(this.translation.y).append(") ");
	sb.append("scale(").append(this.scale.x).append(',').append(this.scale.y).append(')');
	this.inner_svg.setAttribute("transform", sb.toString());
    
    this.element = this.root_svg;
    return true;
}
/*
	This method is responsible for re-rendering the SVG by changing its translation
	and scale.
*/
PenStroke.prototype.private_render = function(in_color, in_width)
{
    $(this.element).toggle(this.expression_id == Editor.current_expression_id);
    if (this.dirty_flag == false && this.color == in_color && this.stroke_width == in_width) {
        return;
    }
    this.dirty_flag = false;
    this.color = in_color;
    this.stroke_width = in_width;
    
    var sb = new StringBuilder();
    sb.append("translate(").append(this.temp_translation.x).append(',').append(this.temp_translation.y).append(") ");
    sb.append("scale(").append(this.temp_scale.x).append(',').append(this.temp_scale.y).append(") ");
    sb.append("translate(").append(this.translation.x).append(',').append(this.translation.y).append(") ");
    sb.append("scale(").append(this.scale.x).append(',').append(this.scale.y).append(')');
    
    this.inner_svg.setAttribute("transform", sb.toString());

    // scale factor to give illusion of scale independent line width
    var mean_scale = (Math.abs(this.scale.x * this.temp_scale.x) + Math.abs(this.scale.y * this.temp_scale.y)) / 2.0;
    this.polyline.setAttribute("style", "fill:none;stroke:" + this.color + ";stroke-width:" + (this.stroke_width / mean_scale));
    
}

/*
	Called to re-render the SVG object
*/
PenStroke.prototype.render = function()
{
    this.private_render(Editor.segment_color, Editor.stroke_width);
}

/*
	Called when the penstroke object is selected and needs re-rendering
*/
PenStroke.prototype.render_selected = function(in_context)
{
    this.private_render(Editor.selected_segment_color, Editor.selected_stroke_width);
}

// determine if the passed in point (screen space) collides with our geometery
PenStroke.prototype.point_collides = function(click_point)
{
    var a = this.points[0].transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);

    if(Vector2.SquareDistance(click_point, a) < this.squared_collision_radius)
        return true;
    
    for(var k = 1; k < this.points.length; k++)
    {
        var b = this.points[k].transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
        
        if(Vector2.SquareDistance(click_point, b) < this.squared_collision_radius)
            return true;
        
        // from point 0 and point 1, do collision testing based on line width
        var ab = Vector2.Subtract(b,a);
        var ac = Vector2.Subtract(click_point, a);
        
        var t = Vector2.Dot(ac, ab) / Vector2.Dot(ab, ab);
        
        if(t > 0.0 && t < 1.0)
        {
            // calculate position of projected point
            var d = new Vector2(a.x + t * ab.x, a.y + t * ab.y);
            // if the project point and the click point are within the line radius, return true
            if(Vector2.SquareDistance(d, click_point) < this.squared_collision_radius)
                return true;
        }
        a = b;        
    }
    return false;
}

// Determines if the SVG collides with line from point_a to point_b
PenStroke.prototype.line_collides = function(point_a, point_b)
{
    //if(this.point_collides(point_a) || this.point_collides(point_b))
    //    return true;
    
    // compute closest pts between eacch line segment (modified page 149 of orange book)
    
    ClosestDistanceSegmentSegment = function(p1, q1, p2, q2)
    {
        Clamp = function(f, min, max)
        {
            if(f <= min)
                return min;
            if(f >= max)
                return max;
            return f;
        }
        
        var d1 = Vector2.Subtract(q1, p1);
        var d2 = Vector2.Subtract(q2, p2);
        var r = Vector2.Subtract(p1, p2);
        var a = Vector2.Dot(d1, d1);
        var e = Vector2.Dot(d2, d2);
        var f = Vector2.Dot(d2, r);
        var EPSILON = 0.0001;
        
        var s, t, c1, c2;
        
        if(a <= EPSILON && e <= EPSILON)
        {
            c1 = p1;
            c2 = p2;
            var c1c2 = Vector2.Subtract(c1, c2);
            return Vector2.Dot(c1c2, c1c2);
        }
        if(a <= EPSILON)
        {
            s = 0.0;
            t = f / e;
            t = Clamp(t, 0, 1);
        }
        else
        {
            var c = Vector2.Dot(d1, r);
            if(e <= EPSILON)
            {
                t = 0.0;
                s = Clamp(-c / a, 0, 1);
            }
            else
            {
                var b = Vector2.Dot(d1, d2);
                var denom = a*e - b*b;
                if(denom != 0)
                    s = Clamp((b*f - c*e)/denom, 0, 1);
                else
                    s = 0;
                t = (b*s + f)/e;
                
                if(t < 0)
                {
                    t = 0;
                    s = Clamp(-c / a, 0, 1);
                }
                else if(t > 1)
                {
                    t = 1;
                    s = Clamp((b - c) / a, 0, 1);
                }
            }
        }
        
        c1 = Vector2.Add(p1,Vector2.Multiply(s,d1));
        c2 = Vector2.Add(p2,Vector2.Multiply(t,d2));
        var c1c2 = Vector2.Subtract(c1, c2);
        return Vector2.Dot(c1c2, c1c2);
    }
    
    var a = point_a;
    var b = point_b;
    
    for(var k = 1; k < this.points.length; k++)
    {
        var c = this.points[k-1].transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
        var d = this.points[k].transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
        
        var distance = ClosestDistanceSegmentSegment(a,b,c,d);
        if(ClosestDistanceSegmentSegment(a,b,c,d) <= this.line_width * 0.5)
            return true;
    }
    return false;
}

PenStroke.prototype.rectangle_collides = function(in_corner_a, in_corner_b)
{
    var e = 0.2;

    var noShift = new Vector2( 0, 0 );
    var scaleAdjust = new Vector2( e, e );
    
    var rect_min = new Vector2();
    var rect_max = new Vector2();
    
    rect_min.x = Math.min(in_corner_a.x, in_corner_b.x);
    rect_min.y = Math.min(in_corner_a.y, in_corner_b.y);
    
    rect_max.x = Math.max(in_corner_a.x, in_corner_b.x);
    rect_max.y = Math.max(in_corner_a.y, in_corner_b.y);
    
    rect_max.transform( noShift, scaleAdjust );
    
    // expand fixed amount equal to stroke width
    rect_min.x -= Editor.stroke_width;
    rect_min.y -= Editor.stroke_width;
    rect_max.x += Editor.stroke_width;
    rect_max.y += Editor.stroke_width;
    
    var stroke_min = this.worldMinPosition();
    var stroke_max = this.worldMaxPosition();
    
    // easy check to see we aren't colliding
    
    if(rect_max.x < stroke_min.x || rect_min.x > stroke_max.x) return false;
    if(rect_max.y < stroke_min.y || rect_min.y > stroke_max.y) return false;
    
    // now see if we double overlap
    
    if(stroke_min.x > rect_min.x && stroke_max.x < rect_max.x) return true;
    if(stroke_min.y > rect_min.y && stroke_max.y < rect_max.y) return true;
    
    // test points
    for(var k = 0; k < this.points.length; k++)
    {
        var p1 = this.points[k].transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
        if ( p1.x == in_corner_a.x && p1.y == in_corner_a.y
        || p1.x == in_corner_b.x && p1.y == in_corner_b.y ) return true;
    }
    
    for(var k = 0; k < this.points.length - 1; k++)
    {
        var p1 = this.points[k].transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
        var p2 = this.points[k+1].transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
        
        var ra1 = new Vector2();
        var ra2 = new Vector2();
        ra1.x = Math.min( p1.x, p2.x );
        ra1.y = Math.min( p1.y, p2.y );
        ra2.x = Math.max( p1.x, p2.x );
        ra2.y = Math.max( p1.y, p2.y );
        
        if ( ra1.x < rect_max.x && ra2.x > rect_min.x && ra1.y < rect_max.y && ra2.y > rect_min.y ) return true;
    }
    return false;
}

// translate by this amount
PenStroke.prototype.translate = function(in_offset)
{
    this.translation.Add(in_offset);
    
    this.update_extents();
    this.dirty_flag = true;
}

/* Resizes the SVG object to scale
	Note that the temp variables are used during resizing and moving. When resizing is 
	done, its values are moved to the original scale and translation variables
*/
PenStroke.prototype.resize = function(in_origin, in_scale)
{
    this.temp_scale = new Vector2(in_scale.x, in_scale.y);
    this.temp_translation = Vector2.Subtract(in_origin, Vector2.Pointwise(in_origin, in_scale));
    
    this.update_extents();
    this.dirty_flag = true;
}
// Moves values from temps to original scale and translation variables
PenStroke.prototype.freeze_transform = function()
{
    // here we move the temp transform info to the final transform
    this.translation = Vector2.Add(this.temp_translation, Vector2.Pointwise(this.temp_scale, this.translation));
    this.scale = Vector2.Pointwise(this.scale, this.temp_scale);

    this.temp_scale = new Vector2(1,1);
    this.temp_translation = new Vector2(0,0);
    this.dirty_flag = true;
    this.update_extents();
}

// Converts the penstroke object to XML. Used when sending the stroke to Lei_Classifier
PenStroke.prototype.toXML = function()
{
    var sb = new StringBuilder();
    sb.append("<Segment type=\"pen_stroke\" instanceID=\"");
    sb.append(String(this.instance_id));
    sb.append("\" scale=\"");
    sb.append(this.scale.toString());
    sb.append("\" translation=\"");
    sb.append(this.translation.toString());
    sb.append("\" points=\"");
    sb.append(this.points[0].toString());
    for(var k = 1; k < this.points.length; k++)
        sb.append("|").append(this.points[k].toString());
    sb.append("\"/>");
        
    return sb.toString();
}

/*
	The methods sava_state and restore_state are for debugging purposes only.
	Used during debugging to accurately test the same segments across browsers
*/
PenStroke.prototype.save_state = function() 
{
    var state = {
        instance_id: this.instance_id,
        type_id: this.type_id,
        set_id: this.set_id,
        points: this.points,
        scale: this.scale,
		size: this.size,
        translation: this.translation,
        temp_scale: this.temp_scale,
        temp_translation: this.temp_translation,
        world_mins: this.world_mins,
        world_maxs: this.world_maxs
    };
    return state;
}

PenStroke.restore_state = function(state) {
    seg = new PenStroke(0, 0, 6);
    seg.instance_id = state.instance_id;
    seg.set_id = state.set_id;
    seg.scale = new Vector2(state.scale.x, state.scale.y);
	seg.size = new Vector2(state.size.x, state.size.y);
    seg.translation = new Vector2(state.translation.x, state.translation.y);
    seg.temp_scale = new Vector2(state.temp_scale.x, state.temp_scale.y);
    seg.temp_translation = new Vector2(state.temp_translation.x, state.temp_translation.y);
    seg.world_mins = new Vector2(state.world_mins.x, state.world_mins.y);
    seg.world_maxs = new Vector2(state.world_maxs.x, state.world_maxs.y);
    seg.points = state.points.map(function(coords) {
        return Vector2.Add(new Vector2(coords.x, coords.y), seg.world_mins);
    });
    seg.finish_stroke();
    return seg;
}

/**
 * Find any segments that intersect with this stroke.
 * If any are found, create a new set_id and assign each stroke's set_id to it.
 * If none are found, assign this stroke's set_id to -1.
 * Return a list of the instance_id and set_id of any stroke that had a change of set_id
 * (empty list if no changes, this is passed to the undo/redo action).
 */
PenStroke.prototype.test_collisions = function() {
    var collided_segments = new Array();
    for ( var i = 0; i < this.points.length - 1; i++ ) {
        var pa = this.points[ i ].transform( this.scale, this.translation );
        var pb = this.points[ i + 1 ].transform( this.scale, this.translation );
        
        for ( var j = 0; j < Editor.segments.length; j++ ) {
            if ( Editor.segments[ j ].instance_id == this.instance_id ) continue;
            
            if ( Editor.segments[ j ].rectangle_collides( pa, pb )  && Editor.segments[j].constructor != TeX_Input) {
                // console.log( Editor.segments[ j ] );
                if ( !collided_segments.contains( Editor.segments[ j ] ) ) collided_segments.push( Editor.segments[ j ] );
            }
        }
    }
    
    // if we collided with any segments, get new setid
    if ( collided_segments.length >= 1 ) {
        var set_id_changes = [];
        var newsetid = Segment.set_count++;
        this.set_id = newsetid;
        for ( var i = 0; i < collided_segments.length; i++ ) {
            set_id_changes.push({
                instance_id: collided_segments[i].instance_id,
                old_set_id: collided_segments[i].set_id
            });
            collided_segments[ i ].set_id = newsetid;
        }
        return set_id_changes;
    } else {
        this.set_id = -1;
        return [];
    }
}
/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	Represents an image that has been uploaded to Min from the user's desktop.

    Methods:
		initialize_blob: take coordinates for the image blob to be displayed at and add
		   it to the canvas. This needs to be run after the ImageBlob constructor to work.
		populateCanvasFromCCs: Takes an xmldoc coming from the image recognition server
		containing image blobs and populates the screen with them. This takes care of the
		fact that one ImageBlob will probably turn into many ImageBlobs after being sent
		through the recognition server.

*/
ImageBlob.count = 0;
ImageBlob.type_id = 4;    // unique per class
ImageBlob.chalk_layer = true;

/*
  This function creates a barebones ImageBlob object, by storing the parameters of the image
  it represents. It will not render it to the canvas though, initialize_blob needs to be run
  for that.
*/
function ImageBlob(in_image, in_inverse_image)
{
    // identifiers to build unique id
    this.instance_id = Segment.count++; // unique per object
    this.type_id = ImageBlob.type_id;
    this.set_id = Segment.set_count++;
    this.expression_id = Editor.current_expression_id;

    this.chalk_layer = ImageBlob.chalk_layer;
    
    // the layer we are in, 0 is bottom N is top
    this.layer = 1;
    // a javascript image object
    this.image = (in_image);
    this.inverse_image = in_inverse_image;
    
    // transform info
    this.scale = new Vector2(1.0, 1.0);

    this.temp_scale = new Vector2(1.0, 1.0);
    this.temp_translation = new Vector2(0.0, 0.0);
    
    this.size = new Vector2(in_image.width, in_image.height);
    
    this.dirty_flag = false; // Need to update the SVG on the screen

    this.classification_server = "ImageBlobClassifier";
    this.initialized = false;
}

/*
  This function will intialize an ImageBlob and display it at the given point.  This is a separate
  function because an ImageBlob is first added when the user uploads it, but then it gets broken
  into multiple connected_components later, and the CCs are the only thing that needs to be
  displayed.
*/
ImageBlob.prototype.initialize_blob = function(x, y, context_size){
    // Create an SVG element with the image embedded within it, this is what will actually be displayed on the page
    this.translation = new Vector2((Editor.canvas_width / 2) - (context_size.x / 2 - x)
                                   ,(Editor.canvas_height / 2) - (context_size.y / 2 - y));
    this.world_mins = this.translation.clone();
    this.world_maxs = Vector2.Add(this.translation, this.size);
    
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute("xmlns", "http://www.w3.org/2000/svg"); 
    this.svg.setAttribute('name', parseInt(this.image.name));
    this.svg.setAttribute("style", "position: absolute; left: 0px; top: 0px;");
    this.svg.setAttribute("width", "100%");
    this.svg.setAttribute("height", "100%");
    this.svg.setAttribute("opacity", "0"); // Hide image blob
    this.element = this.svg; // Compatibility with code that expects this object to have an 'element' member

    this.svg_image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    this.svg_image.setAttribute('width', this.image.width);
    this.svg_image.setAttribute('height', this.image.height);
    this.svg_image.setAttributeNS("http://www.w3.org/1999/xlink", 'xlink:href', this.image.src);

    this.svg_image_inverse = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    this.svg_image_inverse.setAttribute('width', this.inverse_image.width);
    this.svg_image_inverse.setAttribute('height', this.inverse_image.height);
    this.svg_image_inverse.setAttributeNS("http://www.w3.org/1999/xlink", 'xlink:href', this.inverse_image.src);

    // This is the current version of the image being displayed
    this.inner_svg = this.svg_image;
    this.svg.appendChild(this.inner_svg);
    this.dirty_flag = true;
    this.initialized = true;
}

/*  This method expects an image element which can be placed in an svg element as shown in the
    constructor */  
ImageBlob.prototype.private_render = function(image) {
    this.inner_svg = image;
    if(this.dirty_flag == false)
        return;
    this.dirty_flag = false;
    
    var transform = new StringBuilder();
    transform.append("translate(").append(this.temp_translation.x).append(',').append(this.temp_translation.y).append(") ");
    transform.append("scale(").append(this.temp_scale.x).append(',').append(this.temp_scale.y).append(") ");
    transform.append("translate(").append(this.translation.x).append(',').append(this.translation.y).append(") ");
    transform.append("scale(").append(this.scale.x).append(',').append(this.scale.y).append(')');
    this.inner_svg.setAttribute("transform", transform.toString());

    if(this.svg.childNodes[0] != this.inner_svg){ 
        this.svg.removeChild(this.svg.childNodes[0]);
        this.svg.appendChild(this.inner_svg);
    }

}

ImageBlob.prototype.finishImageLoad = function(in_canvas){
    in_canvas.appendChild(this.svg);
}

ImageBlob.prototype.render = function()
{
    this.private_render(this.inner_svg);
}

ImageBlob.prototype.render_selected = function()
{
    this.private_render(this.inner_svg);
}

// determine if the passed in point (screen space) collides with our geometery
ImageBlob.prototype.point_collides = function(in_position)
{
    var mins = this.worldMinPosition();
    var maxs = this.worldMaxPosition();

    if(in_position.x < mins.x || in_position.x > maxs.x || in_position.y < mins.y || in_position.y > maxs.y)
        return false;
    return true;    
}

ImageBlob.prototype.line_collides = function(point_a, point_b)
{
    if(this.point_collides(point_a) || this.point_collides(point_b))
        return true;
    return false;
}

ImageBlob.prototype.rectangle_collides = function(in_corner_a, in_corner_b)
{
    var mins = new Vector2();
    var maxs = new Vector2();
    if(in_corner_a.x < in_corner_b.x)
    {
        mins.x = in_corner_a.x;
        maxs.x = in_corner_b.x;
    }
    else
    {
        mins.x = in_corner_b.x;
        maxs.x = in_corner_a.x;
    }
    
    if(in_corner_a.y < in_corner_b.y)
    {
        mins.y = in_corner_a.y;
        maxs.y = in_corner_b.y;
    }
    else
    {
        mins.y = in_corner_b.y;
        maxs.y = in_corner_a.y;
    }
    
    var my_mins = this.worldMinPosition();
    var my_maxs = this.worldMaxPosition();
    
    if(maxs.x < my_mins.x || mins.x > my_maxs.x) return false;
    if(maxs.y < my_mins.y || mins.y > my_maxs.y) return false;
    
    return true;
}

// translate by this amount
ImageBlob.prototype.translate = function(in_offset)
{
    this.translation.Add(in_offset);
    this.dirty_flag = true;
    this.update_extents();
}

ImageBlob.prototype.update_extents  = function()
{
    // because scale can be negative, this gives us opposing corners, not mins and maxs
    var corner_a = new Vector2(0,0).transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
    var corner_b = Vector2.Add(corner_a, Vector2.Pointwise(Vector2.Pointwise(this.size, this.scale), this.temp_scale));
    
    // figure out the actual mins and maxs based on absolute position
    if(corner_a.x < corner_b.x)
    {
        this.world_mins.x = corner_a.x;
        this.world_maxs.x = corner_b.x;
    }
    else
    {
        this.world_mins.x = corner_b.x;
        this.world_maxs.x = corner_a.x;
    }
    
    if(corner_a.y < corner_b.y)
    {
        this.world_mins.y = corner_a.y;
        this.world_maxs.y = corner_b.y;
    }
    else
    {
        this.world_mins.y = corner_b.y;
        this.world_maxs.y = corner_a.y;
    }
}

ImageBlob.prototype.worldMinPosition = function()
{
    return this.world_mins.clone();
}

ImageBlob.prototype.worldMaxPosition = function()
{
    return this.world_maxs.clone();    
}

ImageBlob.prototype.worldMinDrawPosition = function()
{
    return this.world_mins.clone();
}

ImageBlob.prototype.worldMaxDrawPosition = function()
{
    return this.world_maxs.clone();    
}

ImageBlob.prototype.resize = function(in_origin, in_scale)
{
    this.temp_scale = new Vector2(in_scale.x, in_scale.y);
    this.temp_translation = Vector2.Subtract(in_origin, Vector2.Pointwise(in_origin, in_scale));
    this.update_extents();
    this.dirty_flag = true;
}

ImageBlob.prototype.freeze_transform = function()
{
    // here we move the temp transform info to the final transform
    this.translation = Vector2.Add(this.temp_translation, Vector2.Pointwise(this.temp_scale, this.translation));
    this.scale = Vector2.Pointwise(this.scale, this.temp_scale);

    this.temp_scale = new Vector2(1,1);
    this.temp_translation = new Vector2(0,0); 
    this.update_extents();
    this.dirty_flag = true;
}

ImageBlob.prototype.toXML = function()
{
    var sb = new StringBuilder();
    //    sb.append("<Segment type=\"image_blob\" instanceID=\"").append(String(this.instance_id)).append("\"/>");
    sb.append("<Segment type=\"image_blob\" instanceID=\"");
    // Add 1 since the new segment will occur after this one
    sb.append(String(this.instance_id));
    // sb.append("\" scale=\"");
    // sb.append(this.scale.toString());
    // sb.append("\" translation=\"");
    // sb.append(this.translation.toString());
    sb.append("\" image=\"");
    sb.append(this.image.src).append("\"/>");

    return sb.toString();
}

/*
  This function takes image data and creates an inverse image
  and then returns it as a dataURL.
*/
ImageBlob.generateInverseImage = function(image){
    
    var temp_canvas = document.createElement("canvas");
    temp_canvas.width = image.width;
    temp_canvas.height = image.height;
    var temp_context = temp_canvas.getContext("2d");
    temp_context.drawImage(image, 0, 0);
    var inverse_image_data = temp_context.getImageData(0,0,image.width, image.height);
    var pix = inverse_image_data.data;
    
    var rgb = RGB.parseRGB(Editor.selected_segment_color);
    for (var i = 0, n = pix.length; i < n; i += 4) 
    {
        var brightness = (pix[i] * 0.299 +  pix[i+1] * 0.587 + pix[i+2] * 0.114) / 255.0;
        if(brightness < 0.5)
        {
            pix[i] = rgb.red;
            pix[i+1] = rgb.green;
            pix[i+2] = rgb.blue;
        }
    }
    temp_context.putImageData(inverse_image_data, 0, 0);

    return temp_canvas.toDataURL();
}

/**
   Add ccs from xml and return the new segment list
**/
ImageBlob.populateCanvasFromCCs = function(xmldoc, full_image_size){
    Editor.clear_selected_segments();
    var root_node = xmldoc;
    /*
      Expects a response in this format
      <ConnectedComponents>
      <Image position="10,20">
      data:image/PNG;base64,ASOIUROIJDLAKJSDLFJOEURABRDLJFKLDSetc
      </Image>
      <Image...
      </ConnectedComponents>
    */
    
    var image_nodes = root_node.getElementsByTagName("Image");
    
    var image_list = new Array(image_nodes.length);
    var position_list = new Array(image_nodes.length);
    var added_segments = new Array();

    for(var k = 0; k < image_nodes.length; k++){
        var position = image_nodes[k].getAttribute("position").split(',');

        var img_data = image_nodes[k].textContent;
        var instance_id = parseInt(image_nodes[k].getAttribute("instanceID"));

        image_list[k] = new Image();
        image_list[k].name = String(k);
        image_list[k].instance_id = instance_id;

        position_list[k] = [parseInt(position[0]), parseInt(position[1])];

        image_list[k].onload = function() {
            var my_k = parseInt(this.name);
            // create inverse image

            var inverse_image = new Image();
            inverse_image.name = this.name;



            // This is for making inverse images, currently we don't use it.
            // // once it loads, add the image blob to the system
            inverse_image.onload = function(){                   
                var b = new ImageBlob(image_list[my_k], this);
                b.initialize_blob(position_list[my_k][0], position_list[my_k][1], full_image_size);
                // Because we are replacing the original image, set the instance id
                b.instance_id = image_list[my_k].instance_id;
                Segment.instance_id = instance_id + 1;
                
                Editor.add_segment(b);
                added_segments.push(b);
                if(added_segments.length == image_nodes.length)
                    Editor.current_action.buildSegmentXML();
                
                RenderManager.render();
                Editor.canvas_div.appendChild(b.svg);
                // Now that the tools layer has been added, add the svg image to the canvas
                b.finishImageLoad(Editor.canvas_div);
                Editor.add_action(new AddSegments(added_segments));
            }
            
            // inverse_image.src = ImageBlob.generateInverseImage(this);
            // Forego making an inverse_image
            inverse_image.src = this.src;


        }
        image_list[k].src = img_data;
    }
    
    return added_segments;
}
/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	This file contains objects which represent segments added to the canvas via keyboard.

    Methods:
		addCharacter: Add another character to this SymbolSegment.
		popCharacter: Remove a character from this SymbolSegment.
		finishEntry: This function takes the string in this SymbolSegment and uses the 
					TeX_Input class to render the typed in expression.

*/

SymbolSegment.count = 0;
SymbolSegment.type_id = 3;
SymbolSegment.chalk_layer = false;

function SymbolSegment(in_position) {
    this.instance_id = Segment.count++;
    this.type_id = SymbolSegment.type_id;
    this.set_id = Segment.set_count++;
    this.expression_id = Editor.current_expression_id;
    
    this.chalk_layer = SymbolSegment.chalk_layer;
    
    this.layer = 2;
    
    this.text = "";
    this.text_width = 0;
    this.text_height = 32;
    
    this.scale = new Vector2(1.0, 1.0);
    this.translation = in_position.clone();
    
    this.temp_scale = new Vector2(1.0, 1.0);
    this.temp_translation = new Vector2(0.0, 0.0);
    
    this.size = new Vector2(0, 0);
    
    this.world_mins = in_position.clone();
    this.world_maxs = in_position.clone();
    
    this.is_empty = true;
    
    this.textDiv = $('<div/>', {
        'class': 'textDiv'
    });

    this.textDiv.appendTo(Editor.canvas_div);
    this.element = this.textDiv[0];
    this.render();
}
// adds a character to the div
SymbolSegment.prototype.addCharacter = function(in_char) {
    this.is_empty = false;
    this.text += in_char;
    this.update_extents();

    // Render is required.
    this.render();
};

// adds a space to the div
SymbolSegment.prototype.addSpace = function() {
    this.is_empty = false;
    this.text += '-';
    this.update_extents();

    // Render is required.
    this.render();
    this.textDiv.text(' ');
};
// removes the last character added
SymbolSegment.prototype.popCharacter = function() {
    if(this.text.length > 0) {
        this.text = this.text.substring(0, this.text.length - 1);
        this.update_extents();
        this.render();
    }
};

// This method converts the individual characters in the current
// object to a list of individual characters on the canvas,
// when the user clicks elsewhere (focus is lost).
SymbolSegment.prototype.finishEntry = function() {
    //letters = this.text.split("");

    // Don't record the temporary text object.
    var action = new DeleteSegments(new Array(this));
    action.Apply();
    
    var elem = document.createElement("div");
	elem.setAttribute("id","SymbolSegment_Tex");
	elem.style.visibility = "hidden"; 		// Hide the element
	elem.style.position = "absolute";
	elem.style.fontSize = "800%";
	elem.innerHTML = '\\[' + this.text + '\\]'; 	// So MathJax can render it
	document.body.appendChild(elem); 		// don't forget to remove it later
	
	// Change renderer to svg and make sure it has been processed before calling
	// SymbolSegment's callBack
	var translation = this.translation.clone();
	MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "SVG"],["Typeset",MathJax.Hub,elem], 
			[SymbolSegment.stub,elem,translation]);

};

// Scales the Tex to fit canvas width and height before insertion
// Moved here because many classes will make use of it
SymbolSegment.scale_tex = function(elem,translation){
	var equation_canvas_width = $("#equation_canvas")[0].offsetWidth;
	var equation_canvas_height = $("#equation_canvas")[0].offsetHeight;
	var MathJax_div = document.getElementsByClassName("MathJax_SVG")[0].firstChild.getBoundingClientRect();
	var math_width = Math.round(MathJax_div.width) + translation.x;
	var math_height = Math.round(MathJax_div.height) + translation.y;
	if(math_width > (equation_canvas_width-20) || math_height > (equation_canvas_height-20)){ 
		elem.style.fontSize = (parseInt(elem.style.fontSize.split("%")[0]) - 10) + "%";
		MathJax.Hub.Queue(["Rerender",MathJax.Hub,elem], [$.proxy(SymbolSegment.scale_tex(elem, translation), this)]);
	}else{
		return;
	}
}

// Method that just helps with the recursion in scale_tex
SymbolSegment.stub = function(elem,translation){
	SymbolSegment.scale_tex(elem, translation); // scale tex
	SymbolSegment.switch_to_svg(elem,translation);
	document.body.removeChild(elem); // Remove elem from document body (Import done)
}

// Copies the rendered SVG in elem to the canvas
SymbolSegment.switch_to_svg = function(elem,translation){
	var svg_root = document.getElementsByClassName("MathJax_SVG")[0].firstChild;
	var use_tag_array = svg_root.getElementsByTagName("use");
	var rect_tag_array = svg_root.getElementsByTagName("rect");
	var default_position = translation; // Mouse down point
	use_tag_array = Array.prototype.slice.call(use_tag_array);
	rect_tag_array = Array.prototype.slice.call(rect_tag_array);
	var elements_array = use_tag_array.concat(rect_tag_array);
	var initial_offset; // Used to keep segments at user's click position
	for(var i = 0; i < elements_array.length; i++){
		var offset = $(elements_array[i]).offset();
		if(i == 0)
			initial_offset = offset;
		// Set up prototype inheritance chain and call query reformation 
		TeX_Input.prototype.__proto__ = subclassOf(PenStroke);
		var in_x = parseInt((default_position.x + offset.left-initial_offset.left).toFixed(2));
		var in_y = parseInt((default_position.y + offset.top-initial_offset.top).toFixed(2));
		var pen_stroke = new TeX_Input(elements_array[i], in_x, in_y, 6, null);
		pen_stroke.initialize(svg_root, i, elements_array[i].tagName.toString());
		
		// Add the pen_stroke object to the Editor
		Editor.add_action(new AddSegments(new Array(pen_stroke)));
		Editor.add_segment(pen_stroke);
		RenderManager.render();
		pen_stroke.correct_flip();
		Editor.state = EditorState.ReadyToStroke;
		RecognitionManager.addRecognitionForText(pen_stroke);
	}
	MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "HTML-CSS"]);
}

// Used to implement inheritance
function subclassOf(base){
	_subclassOf.prototype= base.prototype;
    return new _subclassOf();
}
function _subclassOf() {};

SymbolSegment.prototype.render = function() {        

    transform = 'translate(' + this.temp_translation.x + 'px,' + this.temp_translation.y + 'px) ';
    transform += 'scale(' + this.temp_scale.x + ',' + this.temp_scale.y + ') ';
    transform += 'translate(' + this.translation.x + 'px,' + this.translation.y + 'px) ';
    transform += 'scale(' + this.scale.x + ',' + this.scale.y + ') ';
    
    this.textDiv.css('-webkit-transform', transform);
    this.textDiv.css('-moz-transform', transform);
    
    
    this.textDiv.text(this.text);
    
    this.size = new Vector2($(this.textDiv).outerWidth(), $(this.textDiv).outerHeight());
};

SymbolSegment.prototype.render_selected = function() {
    this.render();
};

SymbolSegment.prototype.point_collides = function(in_position) {
    var mins = this.worldMinPosition();
    var maxs = this.worldMaxPosition();

    if(in_position.x < mins.x || in_position.x > maxs.x || in_position.y < mins.y || in_position.y > maxs.y) {
        return false;
    }
    return true;    
};

SymbolSegment.prototype.rectangle_collides = function(in_corner_a, in_corner_b) {
    var mins = new Vector2();
    var maxs = new Vector2();
    if(in_corner_a.x < in_corner_b.x) {
        mins.x = in_corner_a.x;
        maxs.x = in_corner_b.x;
    }
    else {
        mins.x = in_corner_b.x;
        maxs.x = in_corner_a.x;
    }
    
    if(in_corner_a.y < in_corner_b.y) {
        mins.y = in_corner_a.y;
        maxs.y = in_corner_b.y;
    }
    else {
        mins.y = in_corner_b.y;
        maxs.y = in_corner_a.y;
    }

    var my_mins = this.worldMinPosition();
    var my_maxs = this.worldMaxPosition();
    
    if(maxs.x < my_mins.x || mins.x > my_maxs.x) return false;
    if(maxs.y < my_mins.y || mins.y > my_maxs.y) return false;
    
    return true;
};

SymbolSegment.prototype.line_collides = function(point_a, point_b) {
    if(this.point_collides(point_a) || this.point_collides(point_b))
        return true;
    return false;
};

SymbolSegment.prototype.translate = function(in_offset) {
    this.translation.Add(in_offset);
    
    this.update_extents();
};

SymbolSegment.prototype.update_extents  = function() {
    // because scale can be negative, this gives us opposing corners, not mins and maxs
    var corner_a = new Vector2(0,0).transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
    var corner_b = Vector2.Add(corner_a, Vector2.Pointwise(Vector2.Pointwise(this.size, this.scale), this.temp_scale));
    
    // figure out the actual mins and maxs based on absolute position
    if(corner_a.x < corner_b.x) {
        this.world_mins.x = corner_a.x;
        this.world_maxs.x = corner_b.x;
    }
    else {
        this.world_mins.x = corner_b.x;
        this.world_maxs.x = corner_a.x;
    }
    
    if(corner_a.y < corner_b.y) {
        this.world_mins.y = corner_a.y;
        this.world_maxs.y = corner_b.y;
    }
    else {
        this.world_mins.y = corner_b.y;
        this.world_maxs.y = corner_a.y;
    }
};

SymbolSegment.prototype.worldMinPosition = function() {
    return this.world_mins.clone();
};

SymbolSegment.prototype.worldMaxPosition = function() {
    return this.world_maxs.clone();    
};

SymbolSegment.prototype.worldMinDrawPosition = function() {
    return this.world_mins.clone();
};

SymbolSegment.prototype.worldMaxDrawPosition = function() {
    return this.world_maxs.clone();    
};

SymbolSegment.prototype.resize = function(in_origin, in_scale) {
    this.temp_scale = new Vector2(in_scale.x, in_scale.y);
    this.temp_translation = Vector2.Subtract(in_origin, Vector2.Pointwise(in_origin, in_scale));
    
    this.update_extents();
};

SymbolSegment.prototype.freeze_transform = function() {
    // here we move the temp transform info to the final transform
    this.translation = Vector2.Add(this.temp_translation, Vector2.Pointwise(this.temp_scale, this.translation));
    this.scale = Vector2.Pointwise(this.scale, this.temp_scale);

    this.temp_scale = new Vector2(1,1);
    this.temp_translation = new Vector2(0,0);
    
    this.update_extents();
};

SymbolSegment.prototype.isEmpty = function() {
    return this.is_empty;
};

SymbolSegment.prototype.save_state = function() {
    var state = {
        instance_id: this.instance_id,
        type_id: this.type_id,
        set_id: this.set_id,
        text: this.text,
        scale: this.scale,
        translation: this.translation,
        temp_scale: this.temp_scale,
        temp_translation: this.temp_translation
    };
    return state;
}

SymbolSegment.restore_state = function(state) {
    seg = new SymbolSegment(0,0);
    seg.instance_id = state.instance_id;
    seg.set_id = state.set_id;
    seg.text = state.text;
    seg.scale = new Vector2(state.scale.x, state.scale.y);
    seg.translation = new Vector2(state.translation.x, state.translation.y);
    seg.temp_scale = new Vector2(state.temp_scale.x, state.temp_scale.y);
    seg.temp_translation = new Vector2(state.temp_translation.x, state.temp_translation.y);
    seg.render();
    seg.update_extents();
    return seg;
}

SymbolSegment.prototype.toXML = function() {
    var sb = new StringBuilder();
    sb.append("<Segment type=\"symbol\" instanceID=\"");
    sb.append(String(this.instance_id));
    sb.append("\" scale=\"").append(this.scale.toString());
    sb.append("\" translation=\"").append(this.translation.toString());
    sb.append("\" text=\"").append(this.text).append("\"/>");
    //sb.append("\" text=\"").append(this.text).append("\" scale=\"");
    //sb.append(this.scale.toString()).append("\" translation=\"").append(this.translation.toString()).append("\"/>");
    return sb.toString();
};
/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/* 
	This file contains methods for grouped segments
*/
SegmentGroup.count = 0;
SegmentGroup.type_id = 1;
function SegmentGroup()
{
    this.instance_id = SegmentGroup.count++;
    this.type_id = SegmentGroup.type_id;
    
    this.position = null;
    this.size = new Vector2(0, 0);

    this.aabb = null;
    
    this.layer = -1;

    this.segments = new Array();
}

SegmentGroup.prototype.contains_segment = function(in_segment)
{
    for(var k = 0; k < this.segments.length; k++)
    {
        if(this.segments[k] == in_segment)
            return true;
        if(this.segments[k].type_id == SegmentGroup.type_id)
            if(this.segments[k].contains_segment(in_segment))
                return true;
    }
    return false;
}

SegmentGroup.prototype.add_segment = function(in_segment)
{
    this.segments.push(in_segment);

    if(this.position == null || this.size == null)
    {
        this.position = new Vector2(in_segment.position.x, in_segment.position.y);
        this.size = new Vector2(in_segment.size.x, in_segment.size.y);
    }
    else
    {
        if(in_segment.position.x < this.position.x)
        {
            old_x = this.position.x;
            this.position.x = in_segment.position.x;
            this.size.x = old_x + this.size.x - this.position.x;
        }
        if(in_segment.position.x + in_segment.size.x > this.position.x + this.size.x)
            this.size.x = in_segment.position.x + in_segment.size.x - this.position.x;

        if(in_segment.position.y < this.position.y)
        {
            old_y = this.position.y;
            this.position.y = in_segment.position.y;
            this.size.y = old_y + this.size.y - this.position.y;
        }
            
        if(in_segment.position.y + in_segment.size.y > this.position.y + this.size.y)
            this.size.y = in_segment.position.y + in_segment.size.y - this.position.y;
    }
    
    this.aabb = new AxisAlignedBoundingBox(this.position, this.size);
    RenderManager.render();        
}

SegmentGroup.prototype.render = function(in_context)
{
    for(var k = 0; k < this.segments.length; k++)
    {
        in_context.save();
        this.segments[k].render(in_context);
        in_context.restore();
    }
}

SegmentGroup.prototype.render_selected = function(in_context)
{
    for(var k = 0; k < this.segments.length; k++)
    {
        in_context.save();
        this.segments[k].render_selected(in_context);
        in_context.restore();
    }
}

SegmentGroup.prototype.point_collides = function(in_position)
{
    if(this.aabb.point_collides(in_position) == false)
        return false;
        
    for(var k = 0; k < this.segments.length; k++)
        if(this.segments[k].point_collides(in_position))
            return true;
    
    return false;
}

SegmentGroup.prototype.line_collides = function(point_a, point_b)
{
    if(this.aabb.line_collides(point_a, point_b) == false)
        return false;
        
    for(var k = 0; k < this.segments.length; k++)
        if(this.segments[k].line_collides(point_a, point_b))
            return true;
    
    return false;
}

SegmentGroup.prototype.translate = function(in_offset)
{
    this.position.x += in_offset.x;
    this.position.y += in_offset.y;
    
    this.aabb.position.x += in_offset.x;
    this.aabb.position.y += in_offset.y;
    
    for(var k = 0; k < this.segments.length; k++)
        this.segments[k].translate(in_offset);
}/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
 	Defines the interface for command objects that can be undone/redone.
  	Actions are things the user can undo (adding segments, deleting segments,
  	moving segments, and resizing segments).
*/
 
 Action = function()
 {
 
 }
 
 
 Action.prototype.Undo = function()
 {
 
 }
 
 // called by Editor when new action is added to see if the previous action should be discarded
 Action.prototype.shouldKeep = function()
 {
    return false;
 }
 
 //this method will apply the given action
 Action.prototype.Apply = function()
 {
 
 }
 
 // this method will convert an action to appropriate XML
 // schema will be like this:
 /*
    <Action type="action_type" attribute="one"/>
 */
 Action.prototype.toXML = function()
 {
    return "<Action type=\"default\"/>";
 }
 
 // this static method parses an xml string and returns an appropriate action
 Action.parseAction = function(in_xml)
 {
    return new Action();
 }
 
 Action.prototype.toString = function()
 {
    return "Action";
 }/* 
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
   Composite Actions are comprised of several other actions.
*/
CompositeAction.prototype = new Action();

function CompositeAction(){
   	this.isComposite = true;
	this.action_list = new Array();
}

CompositeAction.prototype.shouldKeep = function(){
    return true;
}
CompositeAction.prototype.toString = function(){
    // cms: possibly extend to list constituents
    return "CompositeAction";
}

/**
   This function will add an action to the list of actions.
**/
CompositeAction.prototype.add_action = function(action){
    console.log("adding action");
    this.action_list.unshift(action);
}


/**
   This function will add an action to the end of the list of actions.
**/
CompositeAction.prototype.add_action_end = function(action){
    console.log("adding action");
    this.action_list.push(action);
}


/*
  Running the Apply() method will execute the Apply methods of
  the constituents in the order that they were added
*/
CompositeAction.prototype.Apply = function(){
    for(var i = 0; i < this.action_list.length; i++){
        this.action_list[i].Apply();
    }
}

/*
  Undo will undo the actions of the constituents in the reverse
  order that they were added
*/
CompositeAction.prototype.Undo = function(){
    console.log("Undo the actions!");
    console.log("action list: " + this.action_list);
    for(var i = this.action_list.length - 1; i >= 0; i--){
        this.action_list[i].Undo();
        console.log("action: " + this.action_list[i].toString());
    }
}
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
	This file is responsible for adding new segments into min. It's called whenever 
	a new segment is created either a PenStroke, TeX_Input or Image object.
*/

AddSegments = function(in_segments)
{
    this.segments = in_segments;
    this.segment_xmls = new Array();
    this.set_id_changes = new Array();

}

AddSegments.prototype.buildSegmentXML = function()
{    
    this.segment_xmls.length = 0;
    for(var k = 0; k < this.segments.length; k++)
    {
        this.segment_xmls.push(this.segments[k].toXML());
    }
}

AddSegments.prototype.Undo = function()
{
    for(var k = 0; k < this.segments.length; k++)
    {
        Editor.remove_selected_segment(this.segments[k]);
        Editor.remove_segment(this.segments[k]);
        this.segments[k].element.style.visibility = "hidden";
    }

    // Change all of the collided strokes back to their original sets.
    for (var k = 0; k < this.set_id_changes.length; k++) {
        var change = this.set_id_changes[k];
        for (var j = 0; j < Editor.segments.length; j++) {
            if (Editor.segments[j].instance_id == change.instance_id) {
                Editor.segments[j].set_id = change.old_set_id;
                break;
            }
        }
    }

    Editor.update_selected_bb();
}

AddSegments.prototype.shouldKeep = function()
{
    // discard empty text segment
    if(this.segments.length == 1)
    {
        if(this.segments[0].type_id == SymbolSegment.type_id)
            if(this.segments[0].text == "")
                return false;
    }
    // discard length 1 pen strokes (ie, dots)
    if(this.segments.length == 1)
    {
        if(this.segments[0].type_id == PenStroke.type_id)
            if(this.segments[0].points.length == 1)
                return false;
    }
    
    return true;
}

AddSegments.prototype.Apply = function()
{
    for(var k = 0; k < this.segments.length; k++)
    {
        Editor.add_segment(this.segments[k]);
        this.segments[k].element.style.visibility = "visible";
    }

    // Change all of the collided strokes to be in the same set.
    for (var k = 0; k < this.set_id_changes.length; k++) {
        var change = this.set_id_changes[k];
        for (var j = 0; j < Editor.segments.length; j++) {
            if (Editor.segments[j].instance_id == change.instance_id) {
                Editor.segments[j].set_id = this.segments[0].set_id;
                break;
            }
        }
    }
}

AddSegments.prototype.toXML = function()
{
    var sb = new StringBuilder();
    sb.append("<Action type=\"add_segments\">").appendLine();
    for(var k = 0; k < this.segments.length; k++)
    {
        //sb.append("\t").append(this.segments[k].toXML()).appendLine();
        sb.append("\t").append(this.segment_xmls[k]).appendLine();
    }
    sb.append("</Action>");
    return sb.toString();
}

AddSegments.prototype.toString = function()
{
    return "AddSegments";
}


/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	This file is responsible for handling all the animation that occurs when undo, redoing 
	, and resizing segments on the canvas.
	It does some of it job by storing the old translation, scale and any other objects that
	are needed and also applying the new values to the canvas segment(s).
*/
TransformSegments.animation_length = 0.25;

function TransformSegments(in_segments)
{
    this.segments = new Array();
    this.backup_scale = new Array();
    this.backup_translation = new Array();
    this.backup_world = new Array(); // Tuple representing world_mins, world_maxs
    
    this.new_scale = new Array();
    this.new_translation = new Array();
    this.new_world = new Array();
    
    for(var k = 0; k < in_segments.length; k++)
    {
        var segment = in_segments[k];
        this.segments.push(segment);
        this.backup_scale.push(segment.scale.clone());
        this.backup_translation.push(segment.translation.clone());
        this.backup_world.push(new Tuple(segment.world_mins.clone(), segment.world_maxs.clone()));
    }
    
    this.frames = 0.0;
    this.start_time = 0;
    this.undoing = true;
    
    this.should_keep = false;
}

// need to call this to get the new values for each transform
TransformSegments.prototype.add_new_transforms = function(in_segments)
{
    if(in_segments.length != this.segments.length)
        console.log("ERROR in TransformSegments.prototype.add_new_transforms");

    this.should_keep = true;
    
    for(var k = 0; k < in_segments.length; k++)
    {
        var segment = in_segments[k];
        
        this.new_scale.push(segment.scale.clone());
        this.new_translation.push(segment.translation.clone());
        this.new_world.push(new Tuple(segment.world_mins.clone(), segment.world_maxs.clone()));
    }
}

TransformSegments.current;

TransformSegments.prototype.rescale = function(elapsed, utc_ms)
{
    var current_time = (new Date()).getTime();
    var delta = (current_time- utc_ms) / 1000.0;    // time since last frame in seconds
    
    if(elapsed == 0.0)
        TransformSegments.current = this;
    var fraction = elapsed / TransformSegments.animation_length;
    if(fraction > 1.0)
        fraction = 1.0;
    
    if(this.undoing)
    {
        for(var j = 0; j < this.segments.length; j++)
        {
            var segment = this.segments[j]; 
            segment.align_size = false;
            segment.scale.Set(Vector2.Add(this.new_scale[j],Vector2.Multiply(fraction, Vector2.Subtract(this.backup_scale[j], this.new_scale[j]))));
            segment.translation.Set(Vector2.Add(this.new_translation[j],Vector2.Multiply(fraction, Vector2.Subtract(this.backup_translation[j], this.new_translation[j]))));
            segment.world_mins.Set(Vector2.Add(this.new_world[j].item1,Vector2.Multiply(fraction, Vector2.Subtract(this.backup_world[j].item1, this.new_world[j].item1))));
            segment.world_maxs.Set(Vector2.Add(this.new_world[j].item2,Vector2.Multiply(fraction, Vector2.Subtract(this.backup_world[j].item2, this.new_world[j].item2))));
            segment.update_extents();
        }
    }
    else
    {
        for(var j = 0; j < this.segments.length; j++)
        {
            var segment = this.segments[j];    
            segment.scale.Set(Vector2.Add(this.backup_scale[j],Vector2.Multiply(fraction, Vector2.Subtract(this.new_scale[j], this.backup_scale[j]))));
            segment.translation.Set(Vector2.Add(this.backup_translation[j],Vector2.Multiply(fraction, Vector2.Subtract(this.new_translation[j], this.backup_translation[j]))));
            segment.world_mins.Set(Vector2.Add(this.backup_world[j].item1,Vector2.Multiply(fraction, Vector2.Subtract(this.new_world[j].item1, this.backup_world[j].item1))));
            segment.world_maxs.Set(Vector2.Add(this.backup_world[j].item2,Vector2.Multiply(fraction, Vector2.Subtract(this.new_world[j].item2, this.backup_world[j].item2))));
            segment.update_extents();
        }    
    }
    
    // set dirty flag
    
    for(var j = 0; j < this.segments.length; j++)
    {
        this.segments[j].dirty_flag = true;
    }
    
    Editor.update_selected_bb();
    RenderManager.render();
    
    // Added because each TeX_Input element in the 'this.segments' array has to
    // compensate for horizontal flip
    for(var j = 0; j < this.segments.length; j++)
    {
    	if(this.segments[j].constructor == TeX_Input){
    		this.segments[j].dirty_flag = true;
        	this.segments[j].change_offset = true;
        	this.segments[j].render();
        }
    }
    
    this.frames++;
    
    if(fraction == 1.0)
    {
        // bail out
        TransformSegments.current = null;
        var total_time = ((current_time - this.start_time) / 1000.0);
        console.log("total time: " + total_time);
        console.log("mean framerate: " + (this.frames / total_time));
        return;
    }
    
    var total_delta = ((new Date()).getTime()- utc_ms) / 1000.0;
    
    
    var sb = new StringBuilder();
    sb.append("TransformSegments.current.rescale(").append(String(elapsed + total_delta)).append(',').append((new Date()).getTime()).append(");");
    setTimeout(sb.toString());
}

TransformSegments.prototype.Undo = function()
{
    this.framerate = 0.0;
    this.frames = 0.0;
    this.start_time = (new Date()).getTime();
    this.undoing = true;
    this.rescale(0.0, this.start_time);
}

TransformSegments.prototype.shouldKeep = function()
{
    return this.should_keep;
    // TODO: The block below isn't necessary. Comment left by ako9833
    for(var k = 0; k < this.segments.length; k++)
    {
        var segment = this.segments[k];
        if(segment.scale.equals(this.backup_scale[k]) == false)
            return true;
        if(segment.translation.equals(this.backup_translation[k]) == false)
            return true;
    }
    return false;
}


TransformSegments.prototype.Apply = function()
{
    this.framerate = 0.0;
    this.frames = 0.0;
    this.start_time = (new Date()).getTime();
    this.undoing = false;
    this.rescale(0.0, this.start_time);
}

TransformSegments.prototype.toXML = function()
{
    var sb = new StringBuilder();
    sb.append("<Action type=\"transform_segments\">").appendLine();
    for(var k = 0; k < this.segments.length; k++)
    {
        var segment = this.segments[k];
        sb.append("\t").append("<Transform instanceID=\"").append(String(segment.instance_id)).append("\" ");
        sb.append("scale=\"").append(this.new_scale[k].toString()).append("\" translation=\"").append(this.new_translation[k].toString()).append("\"/>");
        sb.append("world_mins=\"").append(this.new_world[k].item1.toString()).append("\" world_maxs=\"").append(this.new_world[k].item2.toString()).append("\"/>");
        sb.appendLine();
        
    }
    sb.append("</Action>");
    return sb.toString();
}


TransformSegments.prototype.toString = function()
{
    return "TransformSegments";
}/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright 2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	Defines and object to group segments together into a single set. For example,
    selecting multiple strokes with stroke select, then clicking/touching and holding
    them creates and applies a GroupSegments object.
*/

GroupSegments = function(in_segments, in_label, boolCreateGrid, boolAlignGroup, bst)
{
	// Identify that this is a grouping action.
	this.isGrouping = true;

	// Create a new integer identifier for this group.
	this.set_id = Segment.next_set_id();
	
	this.segments = new Array();
	this.previous_set = new Array();
    this.previous_classes = new Array();
	this.previous_labels = new Array();
	this.label = null;
	if (in_label != null)
		this.label = in_label.trim();
	
	this.isGrid = false;
	if (boolCreateGrid != null)
		this.isGrid = boolCreateGrid;
	
	this.isAlign = false;
	if (boolAlignGroup != null)
		this.isAlign = boolAlignGroup;
	console.log("BAG: " + this.isAlign);
	this.bst = bst;
	
	// Record contained symbols (by default, this is empty).
	this.parentSymbolMap = new Array();
	this.symbolParentMap = new Array();

	// Store information needed for Undo.
	//
	// NOTE: segment is a misnomer - the segment array contains
	// primitives (e.g. strokes), not primitives grouped into
	// segments. set_id values are used to identify groupings
	// in the code.
	console.log("Grouping ------------------------");
	for(var k = 0; k < in_segments.length; k++)
    {
        var segment = in_segments[k];
		console.log("IN SET_ID: " + segment.set_id);
		this.segments.push(segment);
        this.previous_classes.push(segment.type_id);
        this.previous_set.push(segment.set_id);
		this.previous_labels.push(segment.text);
	}

	// Create a grid if this has been requested.
	if ( this.isGrid ) {
		var setIdList = new Array();
		this.label = "";

		// Obtain list of (seg_id, minCoordinate, maxCoordinate) triples.
		segBBs = Editor.get_segment_BBoxes(in_segments);
		segBBs.sort(Editor.orderBBLeftRight);
		
		// Construct grid representation, as list (rows) of lists (cells)
		// of segments represented by set_id and bounding box triples.
		rows = new Array();
		rows.push(new Vector2(segBBs[0], new Array()));
		maxLengthRow = 1;
		for (var i=1; i < segBBs.length; i++) {
				currentTop = segBBs[i].item2.y;
				currentBottom = segBBs[i].item3.y;
				currentHeight = currentBottom - currentTop;

				// Add to an existing row if overlapping.
				var overlapsRow = false;
				for (j=0; j < rows.length; j++)
				{
					rowTop = rows[j].x.item2.y;
					rowBottom = rows[j].x.item3.y;
					rowHeight  = rowBottom - rowTop;

					// To be more intuitive, using vertical overlap
					// percentage rather than center points to detect overlap
					// within rows.
					var lowestTop = Math.max(currentTop, rowTop);
					var highestBottom = Math.min(currentBottom, rowBottom);
					var overlap = highestBottom - lowestTop;
					var currentOverlapPercentage = overlap / currentHeight;
					var rowOverlapPercentage = overlap / rowHeight;
					
					var threshold = 0.25;
					
					if (currentOverlapPercentage > threshold || rowOverlapPercentage > threshold)
					{
						rows[j].y.push(segBBs[i]);

						// Keep track of table 'width' (max. number of cells in a row,
						// normally the number of columns in the grid).
						if ( maxLengthRow < rows[j].y.length + 1 )
							maxLengthRow = rows[j].y.length + 1
						overlapsRow = true;
					}
				}

				// Create a new row - note that we are not reprsenting columns,
				// so rows that start at the right of the leftmost column will not
				// be distinguished in the data structure.
				if (! overlapsRow ) 
					rows.push( new Vector2(segBBs[i], new Array()) );
		}

		// Sort the rows data structure top-down by leftmost cell
		// (BBs were previously sorted left-right).
		rows.sort(Editor.orderRowsTopDown);

		// Generate LaTeX string. Simple for now - no newlines.
		this.label = "\\begin{array}{";
		for (var i=0; i < maxLengthRow; i++)
			this.label += " c";
		this.label += " }\n";
		
		for (var i=0; i < rows.length; i++)
		{
			this.label += RecognitionManager.getRecognition( rows[i].x.item1 ).symbols[0];
			for (var j=0; j < rows[i].y.length; j++)
				// DEBUG: cannot use bare & in HTML strings. 
				this.label += " \&amp; "  
					+ RecognitionManager.getRecognition( rows[i].y[j].item1 ).symbols[0];
			
			if (i < rows.length - 1)
				this.label += " \\\\\n"; // end the row - requires escape characters.
			else
				this.label += "\n";
		}
		this.label += "\\end{array}";
	
		// Remove ampersand escape sequences, and update the slider.
		// // Remove ampersand escape sequences, and update the slider.
		var slider_math = this.label;
		slider_math = slider_math.replace(/&amp;/g, "&");
		Editor.slider.updateSlide(null, slider_math);
		
		//console.log("Generated TeX:");
		//console.log(this.label);

		// Generate BST string. For explicit structure, produce an
		// explicit HTML-style row-based table.
		this.bst = "<mtable>\n";
		for (var i = 0; i < rows.length; i++)
		{
			nextRowId = i + 1;
			this.bst += "<mtr>\n"; // " + nextRowId + ">\n";
			this.bst += "<mtd>\n";
			// For leftmost cell
			if (RecognitionManager.getRecognition( rows[i].x.item1 ).bst == null)
				this.bst += constructBSTforSymbol( rows[i].x.item1 );
			else
					this.bst += RecognitionManager.getRecognition( rows[i].x.item1 ).bst;
			
			this.bst += "</mtd>\n\n";

			// Remaining cells in the row.
			for (var j=0; j < rows[i].y.length; j++) {
				nextCellId = j+1;
				this.bst += "<mtd>\n";// " + nextCellId + ">\n"; 
				if (RecognitionManager.getRecognition( rows[i].y[j].item1 ).bst == null)
					this.bst += constructBSTforSymbol( rows[i].y[j].item1 );
				else
					this.bst += RecognitionManager.getRecognition( rows[i].y[j].item1 ).bst;
				this.bst += "\n";
				this.bst += "</mtd>\n";
			}
			this.bst += "</mtr>\n";
		}
		this.bst += "</mtable>\n";
		
		//console.log("Generated BST Grid -----------------------");
		//console.log(this.bst);
	}
	this.Apply();
	
}

// Create placeholders for individual symbols in grids.
constructBSTforSymbol = function(set_id)
{
	firstBSTHeader = "************************************************************\n** DRACULAE version 0.2\n** Baseline Structure Trees\n**     Origin: Top Left\n************************************************************\n\n*************************************\nI. Baseline Structure Tree\n*************************************\n"
	secondBSTHeader = "*************************************\nII. Token Lexed BST\n*************************************\n"
	thirdBSTHeader = "*************************************\nIII. Relation Lexed BST\n*************************************\n"
	
	symbolString = RecognitionManager.getRecognition( set_id ).symbols[0]  + " ( (1, 1), (1, 1) ) (1, 1) FFES_id : " + set_id + "\n\n";
	
	return firstBSTHeader + symbolString+ secondBSTHeader+ symbolString + thirdBSTHeader + symbolString;
}

GroupSegments.prototype.ForgetSymbolGrouping = function()
{
	if (this.isAlign || this.isGrid ) {
		// Restore the segment set and type for member segments.
    	for(var k = 0; k < this.segments.length; k++)
    	{
       		this.segments[k].set_id = this.previous_set[k];
       	 	this.segments[k].type_id = this.previous_classes[k];
    		this.segments[k].text = this.previous_labels[k];
		}
	}
	// Don't render - only for generating symbol data.
}

GroupSegments.prototype.RestoreSymbolGrouping = function()
{
	if (this.isAlign || this.isGrid) {
    	for(var k = 0; k < this.segments.length; k++)
		{
        	this.segments[k].set_id = this.set_id;
		}
	}
	// No need to re-label (stored in RecognitionManager)

	// Don't render - only for generating symbol data.
}



GroupSegments.prototype.Undo = function()
{
	// Restore the segment set and type for the symbol.
    for(var k = 0; k < this.segments.length; k++)
    {
        this.segments[k].set_id = this.previous_set[k];
        this.segments[k].type_id = this.previous_classes[k];
		this.segments[k].text = this.previous_labels[k];
    
		console.log("Restoring segment: " + this.previous_set[k]);
	}

    RenderManager.render()
}

GroupSegments.prototype.Apply = function()
{
	// Re-assign set id for each child segment (e.g. symbol)
    for(var k = 0; k < this.segments.length; k++)
        this.segments[k].set_id = this.set_id;

	// Only classify/apply a label if this has not been done already.
	if ( RecognitionManager.getRecognition(this.set_id) == null ) 
	{
		if (this.label == null && ! this.isGrid )
			RecognitionManager.classify(this.set_id);
		else 
		{
			// Create a "recognition result" object to store
			// the passed label in the RecognitionManager.
			var sym = this.label;
			var cer = 1;
			var new_recognition = new RecognitionResult();
			new_recognition.symbols.splice( 0, 1 );
			new_recognition.certainties.splice( 0, 1 );
			new_recognition.symbols.unshift( sym );
			new_recognition.certainties.unshift( cer );
		
			console.log("SYMBOL: " + sym);
			console.log("NEW SET ID: " + this.set_id);
			new_recognition.set_id = this.set_id;
			new_recognition.bst = this.bst;

			RecognitionManager.result_table.push( new_recognition );
		}
	}

	// DEBUG: Somehow calling the renderer was causing problems when
	// multi-stroke symbols are found by DRACULAE in the first align
	// request. 
	RenderManager.render()
}

GroupSegments.prototype.toXML = function()
{
    var sb = new StringBuilder();
    sb.append("<Action type=\"group_segments\" ");
    sb.append("newSetID=\"");
    sb.append(String(this.new_set_id));
    sb.append("\" instanceIDs=\"");
    sb.append(String(this.segments[0].instance_id));
    for(var k = 1; k < this.segments.length; k++)
    {
        sb.append(',');
        sb.append(String(this.segments[k].instance_id));
    }
    sb.append("\"/>");
    return sb.toString();
}


GroupSegments.prototype.shouldKeep = function()
{
    return true;
}

GroupSegments.prototype.toString = function()
{
    return "GroupSegments";
}
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
	Defines a command object to undo/redo text additions to the canvas via keyboard.
*/
EditText = function(in_text_segment)
{
    this.text_segment = in_text_segment;
    this.previous_text = String(in_text_segment.text);
    this.current_text = "";
}

EditText.prototype.Undo = function()
{
    this.text_segment.text = this.previous_text;
    var context = Editor.contexts[2];
    this.text_segment.text_width = context.measureText(this.text_segment.text).width;    
    this.text_segment.size.x = this.text_segment.text_width;
    this.text_segment.update_extents();
}

EditText.prototype.set_current_text = function(in_text)
{
    this.current_text = new String(in_text);
}

EditText.prototype.shouldKeep = function()
{
    if(this.text_segment.text == this.previous_text)
        return false;
    return true;
}

EditText.prototype.Apply = function()
{
    this.text_segment.text = this.current_text;
    var context = Editor.contexts[2];
    this.text_segment.text_width = context.measureText(this.text_segment.text).width;    
    this.text_segment.size.x = this.text_segment.text_width;
    this.text_segment.update_extents();
}

EditText.prototype.toXML = function()
{
    var sb = new StringBuilder();
    sb.append("<Action type=\"edit_text\" instanceID=\"");
    sb.append(String(this.text_segment.instance_id));
    sb.append("\" newText=\"");
    sb.append(this.current_text);
    sb.append("\" oldText=\"");
    sb.append(this.previous_text);
    sb.append("\"/>");
    return sb.toString();
    //    return "<Action type=\"edit_text\" " + \>";
}

EditText.prototype.toString = function()
{
    return "EditText";
}/* 
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
	Defines a command object which deletes segments from the canvas when applied.
*/
DeleteSegments = function(in_segments)
{
    this.segments = in_segments.clone();
}

DeleteSegments.prototype.Undo = function()
{
    for(var k = 0; k < this.segments.length; k++)
    {
        var segment = this.segments[k];
        segment.element.style.visibility = "visible";
        Editor.add_segment(segment);
    }
    RenderManager.render();
}

DeleteSegments.prototype.shouldKeep = function()
{
    if(this.segments.length == 0)
        return false;
    return true;
}

DeleteSegments.prototype.Apply = function()
{
    for(var k = 0; k < this.segments.length; k++)
    {
        if(this.segments[k].clear != undefined)
            this.segments[k].clear()
        else
            this.segments[k].element.style.visibility = "hidden";

        Editor.remove_segment(this.segments[k]);
    }
}

DeleteSegments.prototype.toXML = function()
{
    var sb = new StringBuilder();
    sb.append("<Action type=\"delete_segments\" instanceIDs=\"");
    sb.append(String(this.segments[0].instance_id));
    for(var k = 1; k < this.segments.length; k++)
        sb.append(",").append(this.segments[k].instance_id);
    sb.append("\"/>");

    return sb.toString();
}

DeleteSegments.prototype.toString = function()
{
    return "DeleteSegments";    
}/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	These objects represent undo actions, but are never, and should never actually
    be used.
*/
function Undo()
{

}

Undo.prototype.Undo = function()
{
    alert("Undo action should never be on the undo stack");
}

Undo.prototype.shouldKeep = function()
{
    return true;
}

Undo.prototype.Apply = function()
{
    alert("Undo action should never be on the redo stack");
}

Undo.prototype.toXML = function()
{
    return "<Action type=\"undo\"/>";
}

Undo.prototype.toString = function()
{
    return "Undo";    
}
/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	These objects represent redo actions, but are never, and should never actually
    be used.
*/
function Redo()
{

}

Redo.prototype.Undo = function()
{
    alert("Redo action should never be on the undo stack");
}

Redo.prototype.shouldKeep = function()
{
    return true;
}

Redo.prototype.Apply = function()
{
    alert("Redo action should never be on the redo stack");
}

Redo.prototype.toXML = function()
{
    return "<Action type=\"redo\"/>";
}

Redo.prototype.toString = function()
{
    return "Redo";    
}/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/* 
 	Contains the Vector2 object which is used to create vectors of length 2 and methods for
    doing math on them. Vector2s are typically used in Min to represent (x,y) coordinates.

    Methods includes but not limited to:
		Pointwise
		SquareDistance
		Distance
		Subtract
		Multiply
		transform: Translates and scales a Vector2
*/
function Tuple(a,b,c,d,e,f,g,h)
{
    this.item1 = a;
    this.item2 = b;
    this.item3 = c;
    this.item4 = d;
    this.item5 = e;
    this.item6 = f;
    this.item7 = g;
    this.item8 = h;
}


/// RGB

function RGB(in_red, in_green, in_blue)
{
    this.red = in_red;
    this.green = in_green;
    this.blue = in_blue;
}

// expects string in the format: #XXXXXX for hex color
RGB.parseRGB = function(in_hex_string)
{
    if(in_hex_string.length != 7)
    {
        return new RGB(255,0,255);
    }
    else
    {
        var red = parseInt(in_hex_string.substring(1, 3), 16);
        var green = parseInt(in_hex_string.substring(3, 5), 16);
        var blue = parseInt(in_hex_string.substring(5, 7), 16);
        
        if(isNaN(red) || isNaN(green) || isNaN(blue))
            return new RGB(255, 0, 255);
        return new RGB(red, green, blue);
    }
}

/// Vector2

// simple vector 2 objecct

function Vector2(in_x, in_y)
{
    this.x = in_x;
    this.y = in_y;
}

parseVector2 = function(in_string)
{
    var strings = in_string.split(',');
    var x = parseFloat(strings[0]);
    var y = parseFloat(strings[1]);
    return new Vector2(x,y);
}

Vector2.prototype.Set = function(in_vector)
{
    this.x = in_vector.x;
    this.y = in_vector.y;
}

Vector2.prototype.magnitude = function()
{
    return Math.sqrt(this.x * this.x + this.y*this.y);
}

Vector2.prototype.normalize = function()
{
    var mag = this.magnitude();
    this.x /= mag;
    this.y /= mag;
    return this;
}

Vector2.prototype.toString = function()
{
    
    return  this.x + "," + this.y;
}

Vector2.Dot = function(a, b)
{
    return a.x * b .x + a.y * b.y;
}

Vector2.Pointwise = function(a, b)
{
    return new Vector2(a.x * b.x, a.y * b.y);
}

Vector2.SquareDistance = function(a,b)
{
    var diff_x = a.x - b.x;
    var diff_y = a.y - b.y;
    return diff_x * diff_x + diff_y * diff_y;
}

Vector2.Distance = function(a,b)
{
    
    return Math.sqrt(Vector2.SquareDistance(a,b));
}

Vector2.Subtract = function(a, b)
{
    return new Vector2(a.x - b.x, a.y - b.y);
}

Vector2.Add = function(a, b)
{
    return new Vector2(a.x + b.x, a.y + b.y);
}

Vector2.prototype.Add = function(a)
{
    this.x += a.x;
    this.y += a.y;
}

Vector2.prototype.Subtract = function(a)
{
    this.x -= a.x;
    this.y -= a.y;
}

Vector2.Multiply = function(f, v)
{
    return new Vector2(v.x * f, v.y * f);
}

Vector2.prototype.equals = function(a)
{
    return this.x == a.x && this.y == a.y;
}

Vector2.Equals = function(a,b)
{
    return a.x == b.x && a.y == b.y;
}

Vector2.prototype.transform = function(in_scale, in_translation)
{
    return new Vector2(this.x * in_scale.x + in_translation.x, this.y * in_scale.y + in_translation.y);
}

Vector2.prototype.clone  = function()
{
    return new Vector2(this.x, this.y);
}

/// StringBuilder

// Initializes a new instance of the StringBuilder class

// and appends the given value if supplied

function StringBuilder(value)
{
    this.strings = new Array("");
    this.append(value);
}

// Appends the given value to the end of this instance.

StringBuilder.prototype.append = function (value)
{
    this.strings.push(value);
    return this;
}

StringBuilder.prototype.appendLine = function()
{
    this.strings.push("\n");
    return this;
}

// Clears the string buffer

StringBuilder.prototype.clear = function ()
{
    this.strings.length = 1;
}

// Converts this instance to a String.

StringBuilder.prototype.toString = function ()
{
    return this.strings.join("");
}

/// Array

Array.prototype.contains = function(value)
{
    for(var k = 0; k < this.length; k++)
        if(value == this[k])
            return true;
    return false;
}

Array.prototype.clone = function()
{
    var result = new Array();
    for(var k = 0; k < this.length; k++)
    {
        result.push(this[k]);
    }
    return result;
}

/// Canvas

// stolen from: http://davidowens.wordpress.com/2010/09/07/html-5-canvas-and-dashed-lines/
// pattern in an array of lengths (alternate for dash and space between dash)
// ie:
// var pattern = new Array(1, 2)
// renders as:
// -  -  -  -  -  -  -  -  -
// var pattern = new Array(3, 2)
// renders as:
// ---  ---  ---  ---  ---  
CanvasRenderingContext2D.prototype.dashedLineTo = function (fromX, fromY, toX, toY, pattern) 
{

    // Our growth rate for our line can be one of the following:
    //   (+,+), (+,-), (-,+), (-,-)
    // Because of this, our algorithm needs to understand if the x-coord and
    // y-coord should be getting smaller or larger and properly cap the values
    // based on (x,y).
    var lt = function (a, b) { return a <= b; };
    var gt = function (a, b) { return a >= b; };
    var capmin = function (a, b) { return Math.min(a, b); };
    var capmax = function (a, b) { return Math.max(a, b); };

    var checkX = { thereYet: gt, cap: capmin };
    var checkY = { thereYet: gt, cap: capmin };

    if (fromY - toY > 0) {
        checkY.thereYet = lt;
        checkY.cap = capmax;
    }
    if (fromX - toX > 0) {
        checkX.thereYet = lt;
        checkX.cap = capmax;
    }

    this.moveTo(fromX, fromY);
    var offsetX = fromX;
    var offsetY = fromY;
    var idx = 0, dash = true;
    while (!(checkX.thereYet(offsetX, toX) && checkY.thereYet(offsetY, toY))) 
    {
        var ang = Math.atan2(toY - fromY, toX - fromX);
        var len = pattern[idx];

        offsetX = checkX.cap(toX, offsetX + (Math.cos(ang) * len));
        offsetY = checkY.cap(toY, offsetY + (Math.sin(ang) * len));

        if (dash) this.lineTo(offsetX, offsetY);
        else this.moveTo(offsetX, offsetY);

        idx = (idx + 1) % pattern.length;
        dash = !dash;
    }
    
};

/// Math class extentions

Math.sign = function(f)
{
    if(f > 0)
        return 1;
    if(f < 0)
        return -1;
    return 0;
}

/** Helper method to find aboslute location of our parent div **/
function findPosition(in_obj)
{
    var left = 0;
    var top = 0;
    if(in_obj.offsetParent)
    {
        do
        {
            left += in_obj.offsetLeft;
            top += in_obj.offsetTop;
        }
        while(in_obj = in_obj.offsetParent);
    }
    
    return [left, top];
}

/* A bounded queue defines a queue which is bounded to some
   maximum value. Adding an item which would go over the boundary
   results in the oldest item being removed and the new item being added to the list.
*/
BoundedQueue.prototype = new Array();
function BoundedQueue(upperBound){
    console.log(upperBound);
    this.upperBound = upperBound;
}

BoundedQueue.prototype.enqueue = function(item){
    if(this.length == this.upperBound){
        this.shift();
    }
    
    this.push(item);
}

BoundedQueue.prototype.clear = function(){
    this.splice(0, this.upperBound);
}/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*  
	This file is responsible for transferring the MathJax rendered SVG in the 
	div with id Hidden_Tex to the canvas. It is a sub class of the PenStroke file.
	Note: The polyline gotten from the path element has to be converted to an image in order
		  to allow for reclassification.
	Software: Uses the Raphael software to successfully convert the SVG path element to 
			  equivalent polyline representation.
*/
TeX_Input.type_id = 5;    // unique per class
function TeX_Input(MathJax_symbol, in_x, in_y, in_line_width, index){

	// create a subclass of PenStroke
	PenStroke.call(this, in_x, in_y, 6);
	
	// Remove div inserted during call to super class
    Editor.canvas_div.removeChild(this.root_svg);
    this.root_svg = this.polyline = this.inner_svg = this.classification_server = null;
	
	this.MathJax_element =  MathJax_symbol; 	// use_tag_array
	this.screen_position = new Vector2(in_x, in_y);
	this.translation = new Vector2(in_x, in_y);
	this.instance_id = Segment.count++;
	this.index = index; // used to index the RenderManager's segment_set_div
	this.type_id = TeX_Input.type_id;
	this.set_id = Segment.set_count++;
	this.expression_id = Editor.current_expression_id;
	this.chalk_layer = false;
}

// Inserts the MathJax SVG element inside a canvas SVG
TeX_Input.prototype.initialize = function(svg_root, i, type){
	
	// add root_svg and apply appropriate transform here
    this.root_svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.root_svg.setAttribute("class", "Tex_Input");
    this.root_svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    this.root_svg.setAttribute("style", "position: absolute; left: 0px; top: 0px; opacity:1;");
    this.root_svg.setAttribute("width", "100%");
    this.root_svg.setAttribute("height", "100%");
    this.inner_svg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    var new_width = null;
    var new_height = null;
    if(type == "use"){
		this.unicode = this.MathJax_element.getAttribute("href").split("-")[1];
		var result = RecognitionManager.unicode_to_symbol["&#x"+this.unicode+";"];
		if(result == null)
			this.text = String.fromCharCode(parseInt(this.unicode,16));
		else
			this.text = result;
		this.path_tag = document.getElementById(this.MathJax_element.getAttribute("href").split("#")[1]).cloneNode(true);
		this.path_tag.removeAttribute("id");
		this.path_tag.setAttribute("fill", Editor.segment_fill);
		this.inner_svg.appendChild(this.path_tag);
		
    	this.root_svg.appendChild(this.inner_svg);
    	Editor.canvas_div.appendChild(this.root_svg);
    	
    	new_width = parseInt(this.path_tag.getBoundingClientRect().width);
    	new_height = parseInt(this.path_tag.getBoundingClientRect().height);
    	this.element_type = "path";
    	
	}else{ // divisor symbol -> svg rect element
		this.rect_tag = this.MathJax_element.cloneNode();
		this.rect_tag.removeAttribute("x");
		this.rect_tag.removeAttribute("y");
		this.text = "-";
		this.rect_tag.setAttribute("fill", Editor.segment_fill);
		this.inner_svg.appendChild(this.rect_tag);
    	this.root_svg.appendChild(this.inner_svg);
   		Editor.canvas_div.appendChild(this.root_svg);
   		
   		// Append polyline points(two points) to polyline
		this.polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
		this.polyline.setAttribute("points", "150,100 300,100");
   		
   		new_width = parseInt(this.rect_tag.getBoundingClientRect().width);
    	new_height = parseInt(this.rect_tag.getBoundingClientRect().height);
    	this.element_type = "rect";
	}
	// Set the size, width and height of the path
    this.size = new Vector2(new_width, new_height);
    
	// Calculate scale from original MathJax rendering which has already been scaled to fit canvas    
    var original_width = parseInt(this.MathJax_element.getBoundingClientRect().width);
    var original_height = parseInt(this.MathJax_element.getBoundingClientRect().height);
    
	var scale = parseFloat((Math.min(original_width / new_width, original_height / new_height)).toFixed(2));
	this.scale = new Vector2(scale,scale);
	
	// Build transform from new scale
	var sb = new StringBuilder();
    sb.append("translate(").append(this.temp_translation.x).append(',').append(this.temp_translation.y).append(") ");
    sb.append("scale(").append(this.temp_scale.x).append(',').append(this.temp_scale.y).append(") ");
    sb.append("translate(").append(this.translation.x).append(',').append(this.translation.y).append(") ");
    sb.append("scale(").append(this.scale.x).append(',').append(this.scale.y).append(')');
    this.inner_svg.setAttribute("transform", sb.toString() + " matrix(1 0 0 -1 0 0)");
    this.element = this.root_svg;
	RenderManager.clear_canvas();
	
	// set world_min and world_max
	var rect = this.inner_svg.getBoundingClientRect();
	this.world_mins = new Vector2(rect.left,rect.top);
    this.world_maxs = new Vector2(rect.right,rect.bottom);
	
	if(type == "use"){
		/* 	Handles all SVG Path computations. It includes: Converting the Path data
			commands to absolute positions, applying path transformation to path data
			commands, parsing the new path data to retrieve the command points so that
			polyline points can be gotten, etc
		*/
		this.get_polyline_points();
	}
}

// Positions the SVG element inside the Bounding Box. Needed it because after the 
// horizontal flip, the SVG element needs to be translated back into the BBox.
TeX_Input.prototype.correct_flip = function(){

	var overlay_height = $(RenderManager.segment_set_divs[this.index]).offset().top;
	var overlay_width = $(RenderManager.segment_set_divs[this.index]).offset().left;
	var element_height = null;
	var element_width = null;
	this.x_offset = this.flip_offset = 0; // initial values
	if(this.element_type == "path"){
		element_height = $(this.path_tag).offset().top;
		element_width = $(this.path_tag).offset().left;
	}else{
		element_height = $(this.rect_tag).offset().top;
		element_width = $(this.rect_tag).offset().left;
	}
	if(parseFloat(overlay_height - element_height) != 0){
		this.flip_offset = parseFloat(overlay_height - element_height);
	}
	if(parseFloat(overlay_width - element_width) != 0){
		this.x_offset = parseFloat(overlay_width - element_width);
	}
	var sb = new StringBuilder();
    sb.append("translate(").append(this.temp_translation.x).append(',').append(this.temp_translation.y).append(") ");
    sb.append("scale(").append(this.temp_scale.x).append(',').append(this.temp_scale.y).append(") ");
    sb.append("translate(").append(this.translation.x + this.x_offset).append(',').append(this.translation.y + this.flip_offset).append(") ");
    sb.append("scale(").append(this.scale.x).append(',').append(this.scale.y).append(')');
    this.inner_svg.setAttribute("transform", sb.toString() + " matrix(1 0 0 -1 0 0)");
}

// Over writing pen_strokes render functions 
TeX_Input.prototype.private_render = function(in_color, in_width)
{
    $(this.element).toggle(this.expression_id == Editor.current_expression_id);
    if (this.dirty_flag == false && this.color == in_color && this.stroke_width == in_width) {
        return;
    }
    this.dirty_flag = false;
    this.color = in_color;
    this.stroke_width = in_width;
    
    // Build transform from new scale and add height offset to y attribute of translation
	// to compensate for the horizontal flip
	if(this.change_offset){
		this.flip_offset = 0;
		this.x_offset = 0;
	}
    var sb = new StringBuilder();
    sb.append("translate(").append(this.temp_translation.x).append(',').append(this.temp_translation.y).append(") ");
    sb.append("scale(").append(this.temp_scale.x).append(',').append(this.temp_scale.y).append(") ");
    sb.append("translate(").append(this.translation.x + this.x_offset).append(',').append(this.translation.y + this.flip_offset).append(") ");
    sb.append("scale(").append(this.scale.x).append(',').append(this.scale.y).append(')');
    this.inner_svg.setAttribute("transform", sb.toString() + " matrix(1 0 0 -1 0 0)");
    
    // Redundant? - yes but needed to make it fit in the box after resizing the element
    if(this.change_offset){
    	this.correct_flip();
    	this.change_offset = false;
    }
}

TeX_Input.prototype.update_extents = function()
{
    return;
}

// just draw using the given context
TeX_Input.prototype.render = function()
{
    this.private_render(Editor.segment_color, Editor.stroke_width);
}

TeX_Input.prototype.worldMinPosition = function()
{
    var min = new Vector2(0,0).transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
    var max = this.size.transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
    
    return new Vector2(Math.min(min.x,max.x), Math.min(min.y, max.y));
}

TeX_Input.prototype.worldMinDrawPosition = function()
{
    var result = this.worldMinPosition();
    result.x += this.line_width ;
    result.y += this.line_width ;
    return result;
}

TeX_Input.prototype.worldMaxPosition = function()
{
    var min = new Vector2(0,0).transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
    var max = this.size.transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
    
    return new Vector2(Math.max(min.x,max.x), Math.max(min.y, max.y));
}

TeX_Input.prototype.worldMaxDrawPosition = function()
{
    var result = this.worldMaxPosition();
    result.x += this.line_width ;
    result.y += this.line_width ;
    return result;
}

// translate by this amount
TeX_Input.prototype.translate = function(in_offset)
{
    this.translation.Add(in_offset);
    
    this.update_extents();
    this.dirty_flag = true;
}

TeX_Input.prototype.resize = function(in_origin, in_scale)
{
    this.temp_scale = new Vector2(in_scale.x, in_scale.y);
    this.temp_translation = Vector2.Subtract(in_origin, Vector2.Pointwise(in_origin, in_scale));
    
    this.update_extents();
    this.dirty_flag = true;
}

TeX_Input.prototype.freeze_transform = function()
{
    // here we move the temp transform info to the final transform
    this.change_offset = true;
    this.translation = Vector2.Add(this.temp_translation, Vector2.Pointwise(this.temp_scale, this.translation));
    this.scale = Vector2.Pointwise(this.scale, this.temp_scale);
	
    this.temp_scale = new Vector2(1,1);
    this.temp_translation = new Vector2(0,0);
    this.dirty_flag = true;
    this.update_extents();
}

// determine if the passed in point (screen space) collides with our geometery
TeX_Input.prototype.point_collides = function(in_position)
{
    var mins = this.worldMinPosition();
    var maxs = this.worldMaxPosition();

    if(in_position.x < mins.x || in_position.x > maxs.x || in_position.y < mins.y || in_position.y > maxs.y)
        return false;
    return true;    
}

TeX_Input.prototype.line_collides = function(point_a, point_b)
{
    if(this.point_collides(point_a) || this.point_collides(point_b))
        return true;
    return false;
}

/* SVG PATH TRANSFORMATIONS AND PATH DATA CONVERSION HAPPENS BELOW */

// Returns the polyline points associated with a path
TeX_Input.prototype.get_points = function(path){
	var points = "";
	var temp = {'x':0, 'y':0}; 			// current point variable
	var cubic_ctrl_1 = {'x':0, 'y':0};	// used as first control point for cubic bezier curve
	var cubic_ctrl_2 = {'x':0, 'y':0};	// used as second control point for cubic bezier curve
	
	var quad_ctrl_1 = {'x':0, 'y':0};	// used as first control point for quadratic bezier curve
	
	var end_point = {'x':0, 'y':0}; 	// used as end point for each bezier curve
	var bezier_points = null;			// holds the points returned from each bezier curve
	var point_array = new Array(); 		// An array to hold the start point, control point(s) and end point
	var last_command = null; 			// Used by shorthand bezier curves (S and T) to determine first ctrl point
	
	for(var i = 0; i < path.pathSegList.numberOfItems; i++){
		var item = path.pathSegList.getItem(i);
		var command = item.pathSegTypeAsLetter;
		if(command == "M"){
			temp.x = parseInt(item.x);
			temp.y = parseInt(item.y);
			points += item.x +","+item.y + " ";
		}else if(command == "L"){ // Line to
			temp.x = parseInt(item.x);
			temp.y = parseInt(item.y);
			points += item.x +","+item.y + " ";
		}else if(command == "H"){ // Horizontal line
			temp.x = parseInt(item.x);
			points += item.x +"," + temp.y + " ";
		}else if(command == "V"){ // Vertical line
			temp.y = parseInt(item.y);
			points += temp.x +","+item.y + " ";
		}else if(command == "C"){ // curve to - order: 3
			cubic_ctrl_1.x = parseInt(item.x1);
			cubic_ctrl_1.y = parseInt(item.y1);
			cubic_ctrl_2.x = parseInt(item.x2);
			cubic_ctrl_2.y = parseInt(item.y2);
			end_point.x = item.x;
			end_point.y = item.y;
			// get bezier curve points and reset current point. item.x and y is end point
			point_array = []; // clear the array
			point_array.push(temp); // starting point for the curve
			point_array.push(cubic_ctrl_1);
			point_array.push(cubic_ctrl_2);
			point_array.push(end_point);
			points += this.get_bezier_points(point_array, 3);
			temp.x = parseInt(item.x);
			temp.y = parseInt(item.y);
		}else if(command == "S"){ // smooth curve to - order: 3
			// The first control point is assumed to be the reflection of the second control
			// point on the previous command relative to the current point
			if(last_command == "C" || last_command == "S"){
				cubic_ctrl_1.x = 2*temp.x - cubic_ctrl_2.x;
				cubic_ctrl_1.y = 2*temp.y - cubic_ctrl_2.y;
			}else{
				// if not C or S, assume coincident with current point
				cubic_ctrl_1.x = temp.x;
				cubic_ctrl_1.y = temp.y;
			}
			ctrl_2.x = parseInt(item.x2);
			ctrl_2.y = parseInt(item.y2);
			// get bezier curve points and reset current point. item.x and y is end point
			point_array = []; // clear the array
			point_array.push(temp); // starting point for the curve
			point_array.push(cubic_ctrl_1);
			point_array.push(cubic_ctrl_2);
			point_array.push(end_point);
			points += this.get_bezier_points(point_array, 3);
			temp.x = parseInt(item.x);
			temp.y = parseInt(item.y);
		}else if(command == "Q"){ // Quadratic Bezier Curve (x1,y1 x,y) - order: 4
			quad_ctrl_1.x = parseInt(item.x1);
			quad_ctrl_1.y = parseInt(item.y1);
			end_point.x = item.x;
			end_point.y = item.y;
			// get bezier curve points and reset current point. item.x and y is end point
			point_array = []; // clear the array
			point_array.push(temp); // starting point for the curve
			point_array.push(quad_ctrl_1);
			point_array.push(end_point);
			points += this.get_bezier_points(point_array, 4);
			temp.x = parseInt(item.x);
			temp.y = parseInt(item.y);
		}else if(command == "T"){ // smooth quadratic Bézier curve to - order: 4
			if(last_command == "Q" || last_command == "T"){
				quad_ctrl_1.x = 2*temp.x - quad_ctrl_1.x;
				quad_ctrl_1.y = 2*temp.y - quad_ctrl_1.y;
			}else{
				// if not Q or T, assume coincident with current point
				quad_ctrl_1.x = temp.x;
				quad_ctrl_1.y = temp.y;
			}
			end_point.x = item.x;
			end_point.y = item.y;
			// get bezier curve points and reset current point. item.x and y is end point
			point_array = []; // clear the array
			point_array.push(temp); // starting point for the curve
			point_array.push(quad_ctrl_1);
			point_array.push(end_point);
			points += this.get_bezier_points(point_array, 4);
			temp.x = parseInt(item.x);
			temp.y = parseInt(item.y);
		}else if(command == "A"){ // elliptical Arc
			points += this.convert_arc_to_bezier(temp,item,false); // Arc to Cubic bezier
			temp.x = parseInt(item.x);
			temp.y = parseInt(item.y);
		}
		last_command = command;
	}
	return points;
}

// Converts an arc command to cubic bezier curve using Raphael Library's path2curve method
// Raphael is small javascript library that has svg functions needed by programmers daily
TeX_Input.prototype.convert_arc_to_bezier = function(temp,arc,recursive){
	// Create a new path command so Raphael can convert it to cubic bezier curve
	var path = "M " + temp.x + "," + temp.y + " A " + arc.r1 + "," + arc.r2 + " " + arc.angle;
	if(arc.largeArcFlag){
		path += " 1";
	}else{
		path += " 0";
	}
	if(arc.sweepFlag){
		path += ",1 ";
	}else{
		path += ",0 ";
	}
	path += arc.x + "," + arc.y;
	var c_bezier = Raphael.path2curve(path);
	var points = "";
	var cubic_ctrl_1 = {'x':0, 'y':0};	// used as first control point for cubic bezier curve
	var cubic_ctrl_2 = {'x':0, 'y':0};	// used as second control point for cubic bezier curve
	var end_point = {'x':0, 'y':0}; 	// used as end point for each bezier curve
	for(var i = 1; i < c_bezier.length; i++){ //skip move to command
		cubic_ctrl_1.x = parseInt(c_bezier[i][1]);
		cubic_ctrl_1.y = parseInt(c_bezier[i][2]);
		cubic_ctrl_2.x = parseInt(c_bezier[i][3]);
		cubic_ctrl_2.y = parseInt(c_bezier[i][4]);
		end_point.x = parseInt(c_bezier[i][5]);
		end_point.y = parseInt(c_bezier[i][6]);
		// get bezier curve points and reset current point. item.x and y is end point
		point_array = []; // clear the array
		point_array.push(temp); // starting point for the curve
		point_array.push(cubic_ctrl_1);
		point_array.push(cubic_ctrl_2);
		point_array.push(end_point);
		points += this.get_bezier_points(point_array, 3);
		temp.x = parseInt(end_point.x);
		temp.y = parseInt(end_point.y);
	}
	return points;
}

// Implements a simple linear interpolation between two points
TeX_Input.prototype.calc_point =  function(a,b,t){

	var dest = {'x':0, 'y':0};
	dest.x = a.x + (b.x - a.x) * t;
    dest.y = a.y + (b.y - a.y) * t;
    return dest;
}

// Gets a point on the bezier curve. t ranges from 0 to 1
// The smaller t is, more accurate the point is
TeX_Input.prototype.bezier = function(data, order, t){
	var point = null;
	if(order == 3){ // cubic bezier curve
		var ab = this.calc_point(data[0], data[1],t); // mid point btw a and b
		var bc = this.calc_point(data[1], data[2],t); // mid point btw b and c
		var cd = this.calc_point(data[2], data[3],t); // mid point btw c and d
		var abbc = this.calc_point(ab, bc,t);		  // mid point btw ab and bc
		var bccd = this.calc_point(bc, cd,t);		  // mid point btw bc and cd
		point = this.calc_point(abbc, bccd,t);	  // point on bezier curve
		
	}else{ 			// Quadratic bezier curve
		var ab = this.calc_point(data[0], data[1],t); // mid point btw a and b
		var bc = this.calc_point(data[1], data[2],t); // mid point btw b and c
		point = this.calc_point(ab, bc, t);		  // point on the bezier curve
	}
	return point;
}

// A function that returns the points along a bezier curve
// The smaller t is, more accurate the point is
TeX_Input.prototype.get_bezier_points = function(data, order){
	var points = "";
	for(var i = 0; i < 10; i++){
		var t = parseFloat(i/9.0);
		var point = this.bezier(data, order, t);
		if(i != 0){ // stop repetition of start point since already in points string above
			points += parseFloat(point.x.toFixed(2)) + "," + parseFloat(point.y.toFixed(2)) + " ";
		}
	}
	return points;
}

// Retrieves the polyline points corresponding to each SVG path element
TeX_Input.prototype.get_polyline_points = function(){
	// Get the path tag, flip it horizontally because transformation is only applied to 
	// g element which the 'this.path_tag' is inside of, then convert all to their absolute coordinates
	// Created this root svg because firefox requires the path element to be in the document 
	// before the getCTM() method can be applied. 
	var root = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	root.setAttribute("style", "visibility:hidden");
	var path = this.path_tag.cloneNode(true);
	path.setAttribute("transform", "matrix(1 0 0 -1 0 0)");
	root.appendChild(path);
	document.body.appendChild(root);
	var CTM = path.getCTM();
	this.absolutizePath(path);
	
	// Transform each data point in the path by applying horizontal flip transformation
	var new_path = document.createElementNS("http://www.w3.org/2000/svg", "path");// Will be the path with new data
	var lastAbsolutePosition = this.root_svg.createSVGPoint();
	for(var i = 0; i < path.pathSegList.numberOfItems; i++){
        var seg = path.pathSegList.getItem(i);
        var command = seg.pathSegTypeAsLetter;
		if(command == "M"){
			var p1 = this.transformPoint(seg.x, seg.y,CTM);
			lastAbsolutePosition.x = seg.x;
			lastAbsolutePosition.y = seg.y;
			var newSeg = new_path.createSVGPathSegMovetoAbs(p1.x, p1.y);
			new_path.pathSegList.appendItem(newSeg);
		}else if(command == "L"){
			var p1 = this.transformPoint(seg.x, seg.y ,CTM);
			lastAbsolutePosition.x = seg.x;
			lastAbsolutePosition.y = seg.y;
			var newSeg = new_path.createSVGPathSegLinetoAbs(p1.x, p1.y);
			new_path.pathSegList.appendItem(newSeg);
		}else if(command == "H"){
			var p1 = this.transformPoint(seg.x, lastAbsolutePosition.y, CTM);
			lastAbsolutePosition.x = seg.x;
			var newSeg = new_path.createSVGPathSegLinetoAbs(p1.x, p1.y);
			new_path.pathSegList.appendItem(newSeg);
		}else if(command == "V"){
			var p1 = this.transformPoint(lastAbsolutePosition.x, seg.y, CTM);
			lastAbsolutePosition.y = seg.y;
			var newSeg = new_path.createSVGPathSegLinetoAbs(p1.x, p1.y);
			new_path.pathSegList.appendItem(newSeg);
		}else if(command == "C"){
			var p1 = this.transformPoint(seg.x, seg.y, CTM);
			var p2 = this.transformPoint(seg.x1, seg.y1, CTM);
			var p3 = this.transformPoint(seg.x2, seg.y2, CTM);
			var newSeg = new_path.createSVGPathSegCurvetoCubicAbs(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
			lastAbsolutePosition.x = seg.x;
			lastAbsolutePosition.y = seg.y;
			new_path.pathSegList.appendItem(newSeg);
		}else if(command == "S"){ 
			var p1 = this.transformPoint(seg.x, seg.y, CTM);
			var p3 = this.transformPoint(seg.x2, seg.y2, CTM);
			var newSeg = new_path.createSVGPathSegCurvetoCubicSmoothAbs(p1.x, p1.y, p3.x, p3.y);
			lastAbsolutePosition.x = seg.x;
			lastAbsolutePosition.y = seg.y;
			new_path.pathSegList.appendItem(newSeg);
		}else if(command == "Q"){ 
			var p1 = this.transformPoint(seg.x, seg.y, CTM);
			var p2 = this.transformPoint(seg.x1, seg.y1, CTM);
			var newSeg = new_path.createSVGPathSegCurvetoQuadraticAbs(p1.x, p1.y, p2.x, p2.y);
			lastAbsolutePosition.x = seg.x;
			lastAbsolutePosition.y = seg.y;
			new_path.pathSegList.appendItem(newSeg);
		}else if(command == "T"){ 
			var p1 = this.transformPoint(seg.x, seg.y, CTM);
			var newSeg = new_path.createSVGPathSegCurvetoQuadraticSmoothAbs(p1.x, p1.y);
			lastAbsolutePosition.x = seg.x;
			lastAbsolutePosition.y = seg.y;
			new_path.pathSegList.appendItem(newSeg);
		}else if(command == "A"){
			var p1 = this.transformPoint(seg.x, seg.y, CTM);
			var rot = Math.atan(t.c/t.d)*(180/Math.PI)
			var newSeg = new_path.createSVGPathSegArcAbs(p1.x, p1.y, seg.r1, seg.r2, seg.angle-rot, seg.largeArcFlag, seg.sweepFlag);
			lastAbsolutePosition.x = seg.x;
			lastAbsolutePosition.y = seg.y;
			new_path.pathSegList.appendItem(newSeg);
		}else{ // Z - close Path
			var newSeg = new_path.createSVGPathSegClosePath();
			new_path.pathSegList.appendItem(newSeg);
		}
    }
	path.removeAttribute("transform"); // remove transform
	document.body.removeChild(root); // remove root
	
	// Create polyline and append polyline points from path to polyline
	this.polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
	var polyline_points = this.get_points(new_path);
	this.polyline.setAttribute("points", polyline_points.toString());
}

// Transform each data point parsed in using the CTM
TeX_Input.prototype.transformPoint = function(x,y,CTM){
	point = this.root_svg.createSVGPoint();
	point.x = x;
	point.y = y;
	point = point.matrixTransform(CTM);
	return point;
} 

/* 	Converts all path data to its absolute coordinates, simplifies the parsing
	This is gotten from a Stack OverFlow Solution - refer to the website below
http://stackoverflow.com/questions/9677885/convert-svg-path-to-absolute-commands/9677915#9677915
 The method below works and I tested it several times before using it.
*/
TeX_Input.prototype.absolutizePath = function(path){
	var x0,y0,x1,y1,x2,y2,segs = path.pathSegList;
  	for(var x=0,y=0,i=0,len=segs.numberOfItems;i<len;++i){
		var seg = segs.getItem(i), c=seg.pathSegTypeAsLetter;
    	if (/[MLHVCSQTA]/.test(c)){
      		if ('x' in seg)
      			x=seg.x;
      		if ('y' in seg) 
      			y=seg.y;
    	}else{
			if ('x1' in seg)
				x1=x+seg.x1;
		  	if ('x2' in seg)
		  		x2=x+seg.x2;
		  	if ('y1' in seg) 
		  		y1=y+seg.y1;
		  	if ('y2' in seg)
		  		y2=y+seg.y2;
		  	if ('x'  in seg)
		  		x+=seg.x;
		  	if ('y'  in seg)
		  		y+=seg.y;
		  	switch(c){
				case 'm': 
					segs.replaceItem(path.createSVGPathSegMovetoAbs(x,y),i);
					break;
				case 'l':
					segs.replaceItem(path.createSVGPathSegLinetoAbs(x,y),i);                   
					break;
				case 'h':
					segs.replaceItem(path.createSVGPathSegLinetoHorizontalAbs(x),i);           
					break;
				case 'v':
					segs.replaceItem(path.createSVGPathSegLinetoVerticalAbs(y),i);             
					break;
				case 'c': 
					segs.replaceItem(path.createSVGPathSegCurvetoCubicAbs(x,y,x1,y1,x2,y2),i); 
					break;
				case 's':
					segs.replaceItem(path.createSVGPathSegCurvetoCubicSmoothAbs(x,y,x2,y2),i); 
					break;
				case 'q': 
					segs.replaceItem(path.createSVGPathSegCurvetoQuadraticAbs(x,y,x1,y1),i);   
					break;
				case 't': 
					segs.replaceItem(path.createSVGPathSegCurvetoQuadraticSmoothAbs(x,y),i);   
					break;
				case 'a': 
					segs.replaceItem(path.createSVGPathSegArcAbs(x,y,seg.r1,seg.r2,seg.angle,seg.largeArcFlag,seg.sweepFlag),i);   
					break;
				case 'z': case 'Z': x=x0; y=y0; break;
			}
		}
		// Record the start of a subpath
		if (c=='M' || c=='m'){
			x0=x;
			y0=y;
		}
	}
}
/*
 * jQuery Easing v1.3 - http://gsgd.co.uk/sandbox/jquery/easing/
 *
 * Uses the built in easing capabilities added In jQuery 1.1
 * to offer multiple easing options
 *
 * TERMS OF USE - jQuery Easing
 * 
 * Open source under the BSD License. 
 * 
 * Copyright © 2008 George McGinley Smith
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, 
 * are permitted provided that the following conditions are met:
 * 
 * Redistributions of source code must retain the above copyright notice, this list of 
 * conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list 
 * of conditions and the following disclaimer in the documentation and/or other materials 
 * provided with the distribution.
 * 
 * Neither the name of the author nor the names of contributors may be used to endorse 
 * or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY 
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 *  COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 *  GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED 
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
 * OF THE POSSIBILITY OF SUCH DAMAGE. 
 *
*/

// t: current time, b: begInnIng value, c: change In value, d: duration
jQuery.easing['jswing'] = jQuery.easing['swing'];

jQuery.extend( jQuery.easing,
{
	def: 'easeOutQuad',
	swing: function (x, t, b, c, d) {
		//alert(jQuery.easing.default);
		return jQuery.easing[jQuery.easing.def](x, t, b, c, d);
	},
	easeInQuad: function (x, t, b, c, d) {
		return c*(t/=d)*t + b;
	},
	easeOutQuad: function (x, t, b, c, d) {
		return -c *(t/=d)*(t-2) + b;
	},
	easeInOutQuad: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t + b;
		return -c/2 * ((--t)*(t-2) - 1) + b;
	},
	easeInCubic: function (x, t, b, c, d) {
		return c*(t/=d)*t*t + b;
	},
	easeOutCubic: function (x, t, b, c, d) {
		return c*((t=t/d-1)*t*t + 1) + b;
	},
	easeInOutCubic: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t + b;
		return c/2*((t-=2)*t*t + 2) + b;
	},
	easeInQuart: function (x, t, b, c, d) {
		return c*(t/=d)*t*t*t + b;
	},
	easeOutQuart: function (x, t, b, c, d) {
		return -c * ((t=t/d-1)*t*t*t - 1) + b;
	},
	easeInOutQuart: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
		return -c/2 * ((t-=2)*t*t*t - 2) + b;
	},
	easeInQuint: function (x, t, b, c, d) {
		return c*(t/=d)*t*t*t*t + b;
	},
	easeOutQuint: function (x, t, b, c, d) {
		return c*((t=t/d-1)*t*t*t*t + 1) + b;
	},
	easeInOutQuint: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b;
		return c/2*((t-=2)*t*t*t*t + 2) + b;
	},
	easeInSine: function (x, t, b, c, d) {
		return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
	},
	easeOutSine: function (x, t, b, c, d) {
		return c * Math.sin(t/d * (Math.PI/2)) + b;
	},
	easeInOutSine: function (x, t, b, c, d) {
		return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
	},
	easeInExpo: function (x, t, b, c, d) {
		return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
	},
	easeOutExpo: function (x, t, b, c, d) {
		return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
	},
	easeInOutExpo: function (x, t, b, c, d) {
		if (t==0) return b;
		if (t==d) return b+c;
		if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
		return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
	},
	easeInCirc: function (x, t, b, c, d) {
		return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
	},
	easeOutCirc: function (x, t, b, c, d) {
		return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
	},
	easeInOutCirc: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
		return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
	},
	easeInElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
	},
	easeOutElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
	},
	easeInOutElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
		return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
	},
	easeInBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*(t/=d)*t*((s+1)*t - s) + b;
	},
	easeOutBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
	},
	easeInOutBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158; 
		if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
		return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
	},
	easeInBounce: function (x, t, b, c, d) {
		return c - jQuery.easing.easeOutBounce (x, d-t, 0, c, d) + b;
	},
	easeOutBounce: function (x, t, b, c, d) {
		if ((t/=d) < (1/2.75)) {
			return c*(7.5625*t*t) + b;
		} else if (t < (2/2.75)) {
			return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
		} else if (t < (2.5/2.75)) {
			return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
		} else {
			return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
		}
	},
	easeInOutBounce: function (x, t, b, c, d) {
		if (t < d/2) return jQuery.easing.easeInBounce (x, t*2, 0, c, d) * .5 + b;
		return jQuery.easing.easeOutBounce (x, t*2-d, 0, c, d) * .5 + c*.5 + b;
	}
});

/*
 *
 * TERMS OF USE - EASING EQUATIONS
 * 
 * Open source under the BSD License. 
 * 
 * Copyright © 2001 Robert Penner
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, 
 * are permitted provided that the following conditions are met:
 * 
 * Redistributions of source code must retain the above copyright notice, this list of 
 * conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list 
 * of conditions and the following disclaimer in the documentation and/or other materials 
 * provided with the distribution.
 * 
 * Neither the name of the author nor the names of contributors may be used to endorse 
 * or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY 
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 *  COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 *  GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED 
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
 * OF THE POSSIBILITY OF SUCH DAMAGE. 
 *
 *//*
 * iosSlider - http://iosscripts.com/iosslider/
 * 
 * A jQuery Horizontal Slider for iPhone/iPad Safari 
 * This plugin turns any wide element into a touch enabled horizontal slider.
 * 
 * Copyright (c) 2012 Marc Whitbread
 * 
 * Version: v1.1.48 (12/18/2012)
 * Minimum requirements: jQuery v1.4+
 *
 * Advanced requirements:
 * 1) jQuery bind() click event override on slide requires jQuery v1.6+
 *
 * Terms of use:
 *
 * 1) iosSlider is licensed under the Creative Commons – Attribution-NonCommercial 3.0 License.
 * 2) You may use iosSlider free for personal or non-profit purposes, without restriction.
 *	  Attribution is not required but always appreciated. For commercial projects, you
 *	  must purchase a license. You may download and play with the script before deciding to
 *	  fully implement it in your project. Making sure you are satisfied, and knowing iosSlider
 *	  is the right script for your project is paramount.
 * 3) You are not permitted to make the resources found on iosscripts.com available for
 *    distribution elsewhere "as is" without prior consent. If you would like to feature
 *    iosSlider on your site, please do not link directly to the resource zip files. Please
 *    link to the appropriate page on iosscripts.com where users can find the download.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 * GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
 * OF THE POSSIBILITY OF SUCH DAMAGE. 
 */

;(function($) {
	
	/* global variables */
	var scrollbarNumber = 0;
	var xScrollDistance = 0;
	var yScrollDistance = 0;
	var scrollIntervalTime = 10;
	var scrollbarDistance = 0;
	var isTouch = 'ontouchstart' in window;
	var supportsOrientationChange = 'onorientationchange' in window;
	var isWebkit = false;
	var has3DTransform = false;
	var isIe7 = false;
	var isIe8 = false;
	var isIe9 = false;
	var isIe = false;
	var isGecko = false;
	var grabOutCursor = 'pointer';
	var grabInCursor = 'pointer';
	var onChangeEventLastFired = new Array();
	var autoSlideTimeouts = new Array();
	var iosSliders = new Array();
	var iosSliderSettings = new Array();
	var isEventCleared = new Array();
	var slideTimeouts = new Array();
	var activeChildOffsets = new Array();
	var activeChildInfOffsets = new Array();
	var infiniteSliderOffset = new Array();
	var sliderMin = new Array();
	var sliderMax = new Array();
	var sliderAbsMax = new Array();
	var touchLocks = new Array();
	
	/* private functions */
	var helpers = {
    
        showScrollbar: function(settings, scrollbarClass) {
			
			if(settings.scrollbarHide) {
				$('.' + scrollbarClass).css({
					opacity: settings.scrollbarOpacity,
					filter: 'alpha(opacity:' + (settings.scrollbarOpacity * 100) + ')'
				});
			}
			
		},
		
		hideScrollbar: function(settings, scrollTimeouts, j, distanceOffsetArray, scrollbarClass, scrollbarWidth, stageWidth, scrollMargin, scrollBorder, sliderNumber) {
			
			if(settings.scrollbar && settings.scrollbarHide) {
					
				for(var i = j; i < j+25; i++) {
					
					scrollTimeouts[scrollTimeouts.length] = helpers.hideScrollbarIntervalTimer(scrollIntervalTime * i, distanceOffsetArray[j], ((j + 24) - i) / 24, scrollbarClass, scrollbarWidth, stageWidth, scrollMargin, scrollBorder, sliderNumber, settings);
					
				}
			
			}
			
		},
		
		hideScrollbarInterval: function(newOffset, opacity, scrollbarClass, scrollbarWidth, stageWidth, scrollMargin, scrollBorder, sliderNumber, settings) {
	
			scrollbarDistance = (newOffset * -1) / (sliderMax[sliderNumber]) * (stageWidth - scrollMargin - scrollBorder - scrollbarWidth);
			
			helpers.setSliderOffset('.' + scrollbarClass, scrollbarDistance);
			
			$('.' + scrollbarClass).css({
				opacity: settings.scrollbarOpacity * opacity,
				filter: 'alpha(opacity:' + (settings.scrollbarOpacity * opacity * 100) + ')'
			});
			
		},
		
		slowScrollHorizontalInterval: function(node, slideNodes, newOffset, scrollbarClass, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, activeChildOffset, originalOffsets, childrenOffsets, infiniteSliderWidth, numberOfSlides, sliderNumber, centeredSlideOffset, endOffset, settings) {

			if(settings.infiniteSlider) {
				
				if(newOffset <= (sliderMax[sliderNumber] * -1)) {

					var scrollerWidth = $(node).width();

					if(newOffset <= (sliderAbsMax[sliderNumber] * -1)) {
						
						var sum = originalOffsets[0] * -1;
						$(slideNodes).each(function(i) {
							
							helpers.setSliderOffset($(slideNodes)[i], sum + centeredSlideOffset);
							if(i < childrenOffsets.length) {
								childrenOffsets[i] = sum * -1;
							}
							sum = sum + $(this).outerWidth(true);
							
						});
						
						newOffset = newOffset + childrenOffsets[0] * -1;
						sliderMin[sliderNumber] = childrenOffsets[0] * -1 + centeredSlideOffset;
						sliderMax[sliderNumber] = sliderMin[sliderNumber] + scrollerWidth - stageWidth;
						infiniteSliderOffset[sliderNumber] = 0;
						
					} else {
						
						var lowSlideNumber = 0;
						var lowSlideOffset = helpers.getSliderOffset($(slideNodes[0]), 'x');
						$(slideNodes).each(function(i) {
							
							if(helpers.getSliderOffset(this, 'x') < lowSlideOffset) {
								lowSlideOffset = helpers.getSliderOffset(this, 'x');
								lowSlideNumber = i;
							}
							
						});
						
						var tempOffset = sliderMin[sliderNumber] + scrollerWidth;
						helpers.setSliderOffset($(slideNodes)[lowSlideNumber], tempOffset);
						
						sliderMin[sliderNumber] = childrenOffsets[1] * -1 + centeredSlideOffset;
						sliderMax[sliderNumber] = sliderMin[sliderNumber] + scrollerWidth - stageWidth;

						childrenOffsets.splice(0, 1);
						childrenOffsets.splice(childrenOffsets.length, 0, tempOffset * -1 + centeredSlideOffset);

						infiniteSliderOffset[sliderNumber]++;
						
					}
					
				}
				
				if((newOffset >= (sliderMin[sliderNumber] * -1)) || (newOffset >= 0)) {
					
					var scrollerWidth = $(node).width();
					
					if(newOffset >= 0) {

						var sum = originalOffsets[0] * -1;
						$(slideNodes).each(function(i) {
							
							helpers.setSliderOffset($(slideNodes)[i], sum + centeredSlideOffset);
							if(i < childrenOffsets.length) {
								childrenOffsets[i] = sum * -1;
							}
							sum = sum + $(this).outerWidth(true);
							
						});
						
						newOffset = newOffset - childrenOffsets[0] * -1;
						sliderMin[sliderNumber] = childrenOffsets[0] * -1 + centeredSlideOffset;
						sliderMax[sliderNumber] = sliderMin[sliderNumber] + scrollerWidth - stageWidth;
						infiniteSliderOffset[sliderNumber] = numberOfSlides;
						
						while(((childrenOffsets[0] * -1 - scrollerWidth + centeredSlideOffset) > 0)) {

							var highSlideNumber = 0;
							var highSlideOffset = helpers.getSliderOffset($(slideNodes[0]), 'x');
							$(slideNodes).each(function(i) {
								
								if(helpers.getSliderOffset(this, 'x') > highSlideOffset) {
									highSlideOffset = helpers.getSliderOffset(this, 'x');
									highSlideNumber = i;
								}
								
							});

							var tempOffset = sliderMin[sliderNumber] - $(slideNodes[highSlideNumber]).outerWidth(true);
							helpers.setSliderOffset($(slideNodes)[highSlideNumber], tempOffset);
							
							childrenOffsets.splice(0, 0, tempOffset * -1 + centeredSlideOffset);
							childrenOffsets.splice(childrenOffsets.length-1, 1);

							sliderMin[sliderNumber] = childrenOffsets[0] * -1 + centeredSlideOffset;
							sliderMax[sliderNumber] = sliderMin[sliderNumber] + scrollerWidth - stageWidth;

							infiniteSliderOffset[sliderNumber]--;
							activeChildOffsets[sliderNumber]++;
							
						}

					} 
					
					if(newOffset < 0) {
					
						var highSlideNumber = 0;
						var highSlideOffset = helpers.getSliderOffset($(slideNodes[0]), 'x');
						$(slideNodes).each(function(i) {
							
							if(helpers.getSliderOffset(this, 'x') > highSlideOffset) {
								highSlideOffset = helpers.getSliderOffset(this, 'x');
								highSlideNumber = i;
							}
							
						});						
					
						var tempOffset = sliderMin[sliderNumber] - $(slideNodes[highSlideNumber]).outerWidth(true);
						helpers.setSliderOffset($(slideNodes)[highSlideNumber], tempOffset);
						
						childrenOffsets.splice(0, 0, tempOffset * -1 + centeredSlideOffset);
						childrenOffsets.splice(childrenOffsets.length-1, 1);

						sliderMin[sliderNumber] = childrenOffsets[0] * -1 + centeredSlideOffset;
						sliderMax[sliderNumber] = sliderMin[sliderNumber] + scrollerWidth - stageWidth;

						infiniteSliderOffset[sliderNumber]--;
						
					}
				
				}
				
			}

			var slideChanged = false;
			var newChildOffset = helpers.calcActiveOffset(settings, newOffset, childrenOffsets, stageWidth, infiniteSliderOffset[sliderNumber], numberOfSlides, activeChildOffset, sliderNumber);
			var tempOffset = (newChildOffset + infiniteSliderOffset[sliderNumber] + numberOfSlides)%numberOfSlides;
			
			if(settings.infiniteSlider) {
								
				if(tempOffset != activeChildInfOffsets[sliderNumber]) {
					slideChanged = true;
				}
					
			} else {
			
				if(newChildOffset != activeChildOffsets[sliderNumber]) {
					slideChanged = true;
				}
			
			}
			
			if(slideChanged) {
				
				var args = new helpers.args(settings, node, $(node).children(':eq(' + tempOffset + ')'), tempOffset, endOffset, true);
				$(node).parent().data('args', args);
				
				if(settings.onSlideChange != '') {
				
					settings.onSlideChange(args);
				
				}
			
			}
			
			activeChildOffsets[sliderNumber] = newChildOffset;
			activeChildInfOffsets[sliderNumber] = tempOffset;
			
			newOffset = Math.floor(newOffset);
			
			helpers.setSliderOffset(node, newOffset);

			if(settings.scrollbar) {
				
				scrollbarDistance = Math.floor((newOffset * -1 - sliderMin[sliderNumber]) / (sliderMax[sliderNumber] - sliderMin[sliderNumber]) * (scrollbarStageWidth - scrollMargin - scrollbarWidth));
				var width = scrollbarWidth - scrollBorder;
				
				if(newOffset >= (sliderMin[sliderNumber] * -1)) {

					width = scrollbarWidth - scrollBorder - (scrollbarDistance * -1);
					
					helpers.setSliderOffset($('.' + scrollbarClass), 0);
					
					$('.' + scrollbarClass).css({
						width: width + 'px'
					});
				
				} else if(newOffset <= ((sliderMax[sliderNumber] * -1) + 1)) {
					
					width = scrollbarStageWidth - scrollMargin - scrollBorder - scrollbarDistance;
					
					helpers.setSliderOffset($('.' + scrollbarClass), scrollbarDistance);
					
					$('.' + scrollbarClass).css({
						width: width + 'px'
					});
					
				} else {
					
					helpers.setSliderOffset($('.' + scrollbarClass), scrollbarDistance);
					
					$('.' + scrollbarClass).css({
						width: width + 'px'
					});
				
				}
				
			}
			
		},
		
		slowScrollHorizontal: function(node, slideNodes, scrollTimeouts, scrollbarClass, xScrollDistance, yScrollDistance, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, originalOffsets, childrenOffsets, sliderNumber, infiniteSliderWidth, numberOfSlides, currentEventNode, snapOverride, centeredSlideOffset, settings) {
			
			var distanceOffsetArray = new Array();
			var xScrollDistanceArray = new Array();
			var nodeOffset = helpers.getSliderOffset(node, 'x');
			var snapDirection = 0;
			var maxSlideVelocity = 25 / 1024 * stageWidth;
			var changeSlideFired = false;
			frictionCoefficient = settings.frictionCoefficient;
			elasticFrictionCoefficient = settings.elasticFrictionCoefficient;
			snapFrictionCoefficient = settings.snapFrictionCoefficient;
				
			if((xScrollDistance > 5) && settings.snapToChildren && !snapOverride) {
				snapDirection = 1;
			} else if((xScrollDistance < -5) && settings.snapToChildren && !snapOverride) {
				snapDirection = -1;
			}
			
			if(xScrollDistance < (maxSlideVelocity * -1)) {
				xScrollDistance = maxSlideVelocity * -1;
			} else if(xScrollDistance > maxSlideVelocity) {
				xScrollDistance = maxSlideVelocity;
			}
			
			if(!($(node)[0] === $(currentEventNode)[0])) {
				snapDirection = snapDirection * -1;
				xScrollDistance = xScrollDistance * -2;
			}
			
			var tempInfiniteSliderOffset = infiniteSliderOffset[sliderNumber];
			
			if(settings.infiniteSlider) {
			
				var tempSliderMin = sliderMin[sliderNumber];
				var tempSliderMax = sliderMax[sliderNumber];
			
			}
			
			var tempChildrenOffsets = new Array();
			var tempSlideNodeOffsets = new Array();

			for(var i = 0; i < childrenOffsets.length; i++) {
				
				tempChildrenOffsets[i] = childrenOffsets[i];
				
				if(i < slideNodes.length) {
					tempSlideNodeOffsets[i] = helpers.getSliderOffset($(slideNodes[i]), 'x');
				}
				
			}
			
			while((xScrollDistance > 1) || (xScrollDistance < -1)) {
				
				xScrollDistance = xScrollDistance * frictionCoefficient;
				nodeOffset = nodeOffset + xScrollDistance;

				if(((nodeOffset > (sliderMin[sliderNumber] * -1)) || (nodeOffset < (sliderMax[sliderNumber] * -1))) && !settings.infiniteSlider) {
					xScrollDistance = xScrollDistance * elasticFrictionCoefficient;
					nodeOffset = nodeOffset + xScrollDistance;
				}
				
				if(settings.infiniteSlider) {
					
					if(nodeOffset <= (tempSliderMax * -1)) {
						
						var scrollerWidth = $(node).width();
							
						var lowSlideNumber = 0;
						var lowSlideOffset = tempSlideNodeOffsets[0];
						for(var i = 0; i < tempSlideNodeOffsets.length; i++) {
							
							if(tempSlideNodeOffsets[i] < lowSlideOffset) {
								lowSlideOffset = tempSlideNodeOffsets[i];
								lowSlideNumber = i;
							}
							
						}
						
						var newOffset = tempSliderMin + scrollerWidth;
						tempSlideNodeOffsets[lowSlideNumber] = newOffset;
						
						tempSliderMin = tempChildrenOffsets[1] * -1 + centeredSlideOffset;
						tempSliderMax = tempSliderMin + scrollerWidth - stageWidth;

						tempChildrenOffsets.splice(0, 1);
						tempChildrenOffsets.splice(tempChildrenOffsets.length, 0, newOffset * -1 + centeredSlideOffset);

						tempInfiniteSliderOffset++;
						
					}
					
					if(nodeOffset >= (tempSliderMin * -1)) {
						
						var scrollerWidth = $(node).width();
						
						var highSlideNumber = 0;
						var highSlideOffset = tempSlideNodeOffsets[0];
						for(var i = 0; i < tempSlideNodeOffsets.length; i++) {
							
							if(tempSlideNodeOffsets[i] > highSlideOffset) {
								highSlideOffset = tempSlideNodeOffsets[i];
								highSlideNumber = i;
							}
							
						}

						var newOffset = tempSliderMin - $(slideNodes[highSlideNumber]).outerWidth(true);
						tempSlideNodeOffsets[highSlideNumber] = newOffset;
						
						tempChildrenOffsets.splice(0, 0, newOffset * -1 + centeredSlideOffset);
						tempChildrenOffsets.splice(tempChildrenOffsets.length-1, 1);

						tempSliderMin = tempChildrenOffsets[0] * -1 + centeredSlideOffset;
						tempSliderMax = tempSliderMin + scrollerWidth - stageWidth;

						tempInfiniteSliderOffset--;
					
					}
						
				}
				
				distanceOffsetArray[distanceOffsetArray.length] = nodeOffset;
				xScrollDistanceArray[xScrollDistanceArray.length] = xScrollDistance;

			}

			var slideChanged = false;
			var newChildOffset = helpers.calcActiveOffset(settings, nodeOffset, tempChildrenOffsets, stageWidth, tempInfiniteSliderOffset, numberOfSlides, activeChildOffsets[sliderNumber], sliderNumber);
			var tempOffset = (newChildOffset + tempInfiniteSliderOffset + numberOfSlides)%numberOfSlides;

			if(settings.snapToChildren) {
			
				if(settings.infiniteSlider) {
				
					if(tempOffset != activeChildInfOffsets[sliderNumber]) {
						slideChanged = true;
					}
						
				} else {
				
					if(newChildOffset != activeChildOffsets[sliderNumber]) {
						slideChanged = true;
					}
				
				}

				if((snapDirection < 0) && !slideChanged) {
				
					newChildOffset++;
					
					if((newChildOffset >= childrenOffsets.length) && !settings.infinteSlider) newChildOffset = childrenOffsets.length - 1;
					
				} else if((snapDirection > 0) && !slideChanged) {
				
					newChildOffset--;
					
					if((newChildOffset < 0) && !settings.infinteSlider) newChildOffset = 0;
					
				}
			
			}

			if(settings.snapToChildren || (((nodeOffset > (sliderMin[sliderNumber] * -1)) || (nodeOffset < (sliderMax[sliderNumber] * -1))) && !settings.infiniteSlider)) {
				
				nodeOffset = helpers.getSliderOffset(node, 'x');
				distanceOffsetArray.splice(0, distanceOffsetArray.length);
				
				while((nodeOffset < (tempChildrenOffsets[newChildOffset] - 0.5)) || (nodeOffset > (tempChildrenOffsets[newChildOffset] + 0.5))) {
					
					nodeOffset = ((nodeOffset - (tempChildrenOffsets[newChildOffset])) * snapFrictionCoefficient) + (tempChildrenOffsets[newChildOffset]);
					distanceOffsetArray[distanceOffsetArray.length] = nodeOffset;
					
				}

				distanceOffsetArray[distanceOffsetArray.length] = tempChildrenOffsets[newChildOffset];
	
			}

			var jStart = 1;
			if((distanceOffsetArray.length%2) != 0) {
				jStart = 0;
			}
			
			var lastTimeoutRegistered = 0;
			var count = 0;
			
			for(var j = 0; j < scrollTimeouts.length; j++) {
				clearTimeout(scrollTimeouts[j]);
			}
			
			var endOffset = (newChildOffset + tempInfiniteSliderOffset + numberOfSlides)%numberOfSlides;

			var lastCheckOffset = 0;
			for(var j = jStart; j < distanceOffsetArray.length; j = j + 2) {
				
				if((j == jStart) || (Math.abs(distanceOffsetArray[j] - lastCheckOffset) > 1) || (j >= (distanceOffsetArray.length - 2))) {
				
					lastCheckOffset	= distanceOffsetArray[j];
					
					scrollTimeouts[scrollTimeouts.length] = helpers.slowScrollHorizontalIntervalTimer(scrollIntervalTime * j, node, slideNodes, distanceOffsetArray[j], scrollbarClass, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, newChildOffset, originalOffsets, childrenOffsets, infiniteSliderWidth, numberOfSlides, sliderNumber, centeredSlideOffset, endOffset, settings);
				
				}
				
			}
			
			var slideChanged = false;
			var tempOffset = (newChildOffset + infiniteSliderOffset[sliderNumber] + numberOfSlides)%numberOfSlides;
			
			if(settings.infiniteSlider) {
				
				if(tempOffset != activeChildInfOffsets[sliderNumber]) {
					slideChanged = true;
				}
					
			} else {
			
				if(newChildOffset != activeChildOffsets[sliderNumber]) {
					slideChanged = true;
				}
			
			}
				
			if(settings.onSlideComplete != '') {

				scrollTimeouts[scrollTimeouts.length] = helpers.onSlideCompleteTimer(scrollIntervalTime * (j + 1), settings, node, $(node).children(':eq(' + tempOffset + ')'), tempOffset, sliderNumber);
				
			}
			
			slideTimeouts[sliderNumber] = scrollTimeouts;
			
			helpers.hideScrollbar(settings, scrollTimeouts, j, distanceOffsetArray, scrollbarClass, scrollbarWidth, stageWidth, scrollMargin, scrollBorder, sliderNumber);
				
		},
		
		onSlideComplete: function(settings, node, slideNode, newChildOffset, sliderNumber) {
			
			var isChanged = (onChangeEventLastFired[sliderNumber] != newChildOffset) ? true : false;
			var args = new helpers.args(settings, $(node), slideNode, newChildOffset, newChildOffset, isChanged);
			$(node).parent().data('args', args);
				
			if(settings.onSlideComplete != '') {
				
				settings.onSlideComplete(args);
			
			}
			
			onChangeEventLastFired[sliderNumber] = newChildOffset;
		
		},
		
		getSliderOffset: function(node, xy) {
			
			var sliderOffset = 0;
			if(xy == 'x') {
				xy = 4;
			} else {
				xy = 5;
			}
			
			if(has3DTransform && !isIe7 && !isIe8) {
				
				var transforms = new Array('-webkit-transform', '-moz-transform', 'transform');
				
				for(var i = 0; i < transforms.length; i++) {
					
					if($(node).css(transforms[i]) != undefined) {
						
						if($(node).css(transforms[i]).length > 0) {
						
							var transformArray = $(node).css(transforms[i]).split(',');
							
							break;
							
						}
					
					}
				
				}
				
				sliderOffset = parseInt(transformArray[xy], 10);
					
			} else {
			
				sliderOffset = parseInt($(node).css('left'), 10);
			
			}
			
			return sliderOffset;
		
		},
		
		setSliderOffset: function(node, sliderOffset) {
			
			if(has3DTransform && !isIe7 && !isIe8) {
				
				$(node).css({
					'webkitTransform': 'matrix(1,0,0,1,' + sliderOffset + ',0)',
					'MozTransform': 'matrix(1,0,0,1,' + sliderOffset + ',0)',
					'transform': 'matrix(1,0,0,1,' + sliderOffset + ',0)'
				});
			
			} else {

				$(node).css({
					left: sliderOffset + 'px'
				});
			
			}
						
		},
		
		setBrowserInfo: function() {
			
			if(navigator.userAgent.match('WebKit') != null) {
				isWebkit = true;
				grabOutCursor = '-webkit-grab';
				grabInCursor = '-webkit-grabbing';
			} else if(navigator.userAgent.match('Gecko') != null) {
				isGecko = true;
				grabOutCursor = 'move';
				grabInCursor = '-moz-grabbing';
			} else if(navigator.userAgent.match('MSIE 7') != null) {
				isIe7 = true;
				isIe = true;
			} else if(navigator.userAgent.match('MSIE 8') != null) {
				isIe8 = true;
				isIe = true;
			} else if(navigator.userAgent.match('MSIE 9') != null) {
				isIe9 = true;
				isIe = true;
			}
			
		},
		
		has3DTransform: function() {
			
			var has3D = false;
			
			var testElement = $('<div />').css({
				'webkitTransform': 'matrix(1,1,1,1,1,1)',
				'MozTransform': 'matrix(1,1,1,1,1,1)',
				'transform': 'matrix(1,1,1,1,1,1)'
			});
			
			if(testElement.attr('style') == '') {
				has3D = false;
			} else if(testElement.attr('style') != undefined) {
				has3D = true;
			}
			
			return has3D;
			
		},
		
		getSlideNumber: function(slide, sliderNumber, numberOfSlides) {
			
			return (slide - infiniteSliderOffset[sliderNumber] + numberOfSlides) % numberOfSlides;
		
		}, 

        calcActiveOffset: function(settings, offset, childrenOffsets, stageWidth, infiniteSliderOffset, numberOfSlides, activeChildOffset, sliderNumber) {
								
			var isFirst = false;
			var arrayOfOffsets = new Array();
			var newChildOffset;

			for(var i = 0; i < childrenOffsets.length; i++) {
				
				if((childrenOffsets[i] <= offset) && (childrenOffsets[i] > (offset - stageWidth))) {
				
					if(!isFirst && (childrenOffsets[i] != offset)) {
						
						arrayOfOffsets[arrayOfOffsets.length] = childrenOffsets[i-1];
						
					}
					
					arrayOfOffsets[arrayOfOffsets.length] = childrenOffsets[i];
					
					isFirst = true;
						
				}
			
			}
			
			if(arrayOfOffsets.length == 0) {
				arrayOfOffsets[0] = childrenOffsets[childrenOffsets.length - 1];
			}
			
			var distance = stageWidth;
			var closestChildOffset = 0;
			
			for(var i = 0; i < arrayOfOffsets.length; i++) {
				
				var newDistance = Math.abs(offset - arrayOfOffsets[i]);
				
				if(newDistance < distance) {
					closestChildOffset = arrayOfOffsets[i];
					distance = newDistance;
				}
				
			}
			
			for(var i = 0; i < childrenOffsets.length; i++) {
				
				if(closestChildOffset == childrenOffsets[i]) {
					
					newChildOffset = i;
					
				}
				
			}
			
			return newChildOffset;
		
		},
		
		changeSlide: function(slide, node, slideNodes, scrollTimeouts, scrollbarClass, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, originalOffsets, childrenOffsets, sliderNumber, infiniteSliderWidth, numberOfSlides, centeredSlideOffset, settings) {

			helpers.autoSlidePause(sliderNumber);
			
			for(var j = 0; j < scrollTimeouts.length; j++) {
				clearTimeout(scrollTimeouts[j]);
			}
			
			var steps = Math.ceil(settings.autoSlideTransTimer / 10) + 1;
			var startOffset = helpers.getSliderOffset(node, 'x');
			var endOffset = childrenOffsets[slide];
			var offsetDiff = endOffset - startOffset;
			
			if(settings.infiniteSlider) {
				
				slide = (slide - infiniteSliderOffset[sliderNumber] + numberOfSlides * 2)%numberOfSlides;
				
				var appendArray = false;
				if((slide == 0) && (numberOfSlides == 2)) {
					
					slide = numberOfSlides;
					childrenOffsets[slide] = childrenOffsets[slide-1] - $(slideNodes).eq(0).outerWidth(true);
					appendArray = true;
					
				}
				
				endOffset = childrenOffsets[slide];
				offsetDiff = endOffset - startOffset;
				
				var offsets = new Array(childrenOffsets[slide] - $(node).width(), childrenOffsets[slide] + $(node).width());
				
				if(appendArray) {
					childrenOffsets.splice(childrenOffsets.length-1, 1);
				}
				
				for(var i = 0; i < offsets.length; i++) {
					
					if(Math.abs(offsets[i] - startOffset) < Math.abs(offsetDiff)) {
						offsetDiff = (offsets[i] - startOffset);
					}
				
				}
				
			}
			
			var stepArray = new Array();
			var t;
			var nextStep;

			helpers.showScrollbar(settings, scrollbarClass);

			for(var i = 0; i <= steps; i++) {

				t = i;
				t /= steps;
				t--;
				nextStep = startOffset + offsetDiff*(Math.pow(t,5) + 1);
				
				stepArray[stepArray.length] = nextStep;
				
			}
			
			var lastCheckOffset = 0;
			for(var i = 0; i < stepArray.length; i++) {
				
				if((i == 0) || (Math.abs(stepArray[i] - lastCheckOffset) > 1) || (i >= (stepArray.length - 2))) {

					lastCheckOffset	= stepArray[i];
					
					scrollTimeouts[i] = helpers.slowScrollHorizontalIntervalTimer(scrollIntervalTime * (i + 1), node, slideNodes, stepArray[i], scrollbarClass, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, slide, originalOffsets, childrenOffsets, infiniteSliderWidth, numberOfSlides, sliderNumber, centeredSlideOffset, slide, settings);
						
				}
				
				if((i == 0) && (settings.onSlideStart != '')) {
					var tempOffset = (activeChildOffsets[sliderNumber] + infiniteSliderOffset[sliderNumber] + numberOfSlides)%numberOfSlides;		
				
					settings.onSlideStart(new helpers.args(settings, node, $(node).children(':eq(' + tempOffset + ')'), tempOffset, slide, false));
				}
					
			}

			var slideChanged = false;
			var tempOffset = (slide + infiniteSliderOffset[sliderNumber] + numberOfSlides)%numberOfSlides;
			
			if(settings.infiniteSlider) {
				
				if(tempOffset != activeChildInfOffsets[sliderNumber]) {
					slideChanged = true;
				}
					
			} else {
			
				if(slide != activeChildOffsets[sliderNumber]) {
					slideChanged = true;
				}
			
			}
				
			if(slideChanged && (settings.onSlideComplete != '')) {

				scrollTimeouts[scrollTimeouts.length] = helpers.onSlideCompleteTimer(scrollIntervalTime * (i + 1), settings, node, $(node).children(':eq(' + tempOffset + ')'), tempOffset, sliderNumber);
			}
			
			slideTimeouts[sliderNumber] = scrollTimeouts;
			
			helpers.hideScrollbar(settings, scrollTimeouts, i, stepArray, scrollbarClass, scrollbarWidth, stageWidth, scrollMargin, scrollBorder, sliderNumber);
			
			helpers.autoSlide(node, slideNodes, scrollTimeouts, scrollbarClass, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, originalOffsets, childrenOffsets, sliderNumber, infiniteSliderWidth, numberOfSlides, centeredSlideOffset, settings);
			
		},
		
		autoSlide: function(scrollerNode, slideNodes, scrollTimeouts, scrollbarClass, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, originalOffsets, childrenOffsets, sliderNumber, infiniteSliderWidth, numberOfSlides, centeredSlideOffset, settings) {
			
			if(!settings.autoSlide) return false;
			
			helpers.autoSlidePause(sliderNumber);

			autoSlideTimeouts[sliderNumber] = setTimeout(function() {

				if(!settings.infiniteSlider && (activeChildOffsets[sliderNumber] > childrenOffsets.length-1)) {
					activeChildOffsets[sliderNumber] = activeChildOffsets[sliderNumber] - numberOfSlides;
				}
				
				var nextSlide = (activeChildOffsets[sliderNumber] + infiniteSliderOffset[sliderNumber] + numberOfSlides + 1)%numberOfSlides;

				helpers.changeSlide(nextSlide, scrollerNode, slideNodes, scrollTimeouts, scrollbarClass, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, originalOffsets, childrenOffsets, sliderNumber, infiniteSliderWidth, numberOfSlides, centeredSlideOffset, settings);
				
				helpers.autoSlide(scrollerNode, slideNodes, scrollTimeouts, scrollbarClass, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, originalOffsets, childrenOffsets, sliderNumber, infiniteSliderWidth, numberOfSlides, centeredSlideOffset, settings);
				
			}, settings.autoSlideTimer + settings.autoSlideTransTimer);
			
		},
		
		autoSlidePause: function(sliderNumber) {
			
			clearTimeout(autoSlideTimeouts[sliderNumber]);

		},
		
		isUnselectable: function(node, settings) {

			if(settings.unselectableSelector != '') {
				if($(node).closest(settings.unselectableSelector).size() == 1) return true;
			}
			
			return false;
			
		},
		
		/* timers */
		slowScrollHorizontalIntervalTimer: function(scrollIntervalTime, node, slideNodes, step, scrollbarClass, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, slide, originalOffsets, childrenOffsets, infiniteSliderWidth, numberOfSlides, sliderNumber, centeredSlideOffset, endOffset, settings) {
		
			var scrollTimeout = setTimeout(function() {
				helpers.slowScrollHorizontalInterval(node, slideNodes, step, scrollbarClass, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, slide, originalOffsets, childrenOffsets, infiniteSliderWidth, numberOfSlides, sliderNumber, centeredSlideOffset, endOffset, settings);
			}, scrollIntervalTime);
			
			return scrollTimeout;
		
		},
		
		onSlideCompleteTimer: function(scrollIntervalTime, settings, node, slideNode, slide, scrollbarNumber) {
			
			var scrollTimeout = setTimeout(function() {
				helpers.onSlideComplete(settings, node, slideNode, slide, scrollbarNumber);
			}, scrollIntervalTime);
			
			return scrollTimeout;
		
		},
		
		hideScrollbarIntervalTimer: function(scrollIntervalTime, newOffset, opacity, scrollbarClass, scrollbarWidth, stageWidth, scrollMargin, scrollBorder, sliderNumber, settings) {

			var scrollTimeout = setTimeout(function() {
				helpers.hideScrollbarInterval(newOffset, opacity, scrollbarClass, scrollbarWidth, stageWidth, scrollMargin, scrollBorder, sliderNumber, settings);
			}, scrollIntervalTime);
		
			return scrollTimeout;
		
		},
						
		args: function(settings, node, activeSlideNode, newChildOffset, targetSlideOffset, isChanged) {
			this.settings = settings;
			this.data = $(node).parent().data('iosslider');
			this.slideChanged = isChanged;
			this.sliderObject = node;
			this.sliderContainerObject = $(node).parent();
			this.currentSlideObject = activeSlideNode;
			this.currentSlideNumber = newChildOffset + 1;
			this.targetSlideObject = $(node).children(':eq(' + targetSlideOffset + ')');
			this.targetSlideNumber = targetSlideOffset + 1;
			this.currentSliderOffset = helpers.getSliderOffset(node, 'x') * -1;
		},
		
		preventDrag: function(event) {
			event.preventDefault();
		},
		
		preventClick: function(event) {
			event.stopImmediatePropagation();
			return false;
		},
		
		enableClick: function() {
			return true;
		}
        
    }
    
    helpers.setBrowserInfo();
    
    var methods = {
		
		init: function(options, node) {
			
			has3DTransform = helpers.has3DTransform();
			
			var settings = $.extend(true, {
				'elasticPullResistance': 0.6, 		
				'frictionCoefficient': 0.92,
				'elasticFrictionCoefficient': 0.6,
				'snapFrictionCoefficient': 0.92,
				'snapToChildren': false,
				'snapSlideCenter': false,
				'startAtSlide': 1,
				'scrollbar': false,
				'scrollbarDrag': false,
				'scrollbarHide': true,
				'scrollbarLocation': 'top',
				'scrollbarContainer': '',
				'scrollbarOpacity': 0.4,
				'scrollbarHeight': '4px',
				'scrollbarBorder': '0',
				'scrollbarMargin': '5px',
				'scrollbarBackground': '#000',
				'scrollbarBorderRadius': '100px',
				'scrollbarShadow': '0 0 0 #000',
				'scrollbarElasticPullResistance': 0.9,
				'desktopClickDrag': false,
				'keyboardControls': false,
				'responsiveSlideContainer': true,
				'responsiveSlides': true,
				'navSlideSelector': '',
				'navPrevSelector': '',
				'navNextSelector': '',
				'autoSlideToggleSelector': '',
				'autoSlide': false,
				'autoSlideTimer': 5000,
				'autoSlideTransTimer': 750,
				'infiniteSlider': false,
				'stageCSS': {
					position: 'relative',
					top: '0',
					left: '0',
					overflow: 'hidden',
					zIndex: 1
				},
				'unselectableSelector': '',
				'onSliderLoaded': '',
				'onSliderUpdate': '',
				'onSliderResize': '',
				'onSlideStart': '',
				'onSlideChange': '',
				'onSlideComplete': ''
			}, options);
			
			if(node == undefined) {
				node = this;
			}
			
			return $(node).each(function(i) {
				
				scrollbarNumber++;
				var sliderNumber = scrollbarNumber;
				var scrollTimeouts = new Array();
				iosSliderSettings[sliderNumber] = settings;
				sliderMin[sliderNumber] = 0;
				sliderMax[sliderNumber] = 0;
				var minTouchpoints = 0;
				var xCurrentScrollRate = new Array(0, 0);
				var yCurrentScrollRate = new Array(0, 0);
				var scrollbarBlockClass = 'scrollbarBlock' + scrollbarNumber;
				var scrollbarClass = 'scrollbar' + scrollbarNumber;
				var scrollbarNode;
				var scrollbarBlockNode;
				var scrollbarStageWidth;
				var scrollbarWidth;
				var containerWidth;
				var containerHeight;
				var centeredSlideOffset = 0;
				var stageNode = $(this);
				var stageWidth;
				var stageHeight;
				var slideWidth;
				var scrollMargin;
				var scrollBorder;
				var lastTouch;
				var isFirstInit = true;
				var newChildOffset = -1;
				var webkitTransformArray = new Array();
				var childrenOffsets;
				var originalOffsets = new Array();
				var scrollbarStartOpacity = 0;
				var xScrollStartPosition = 0;
				var yScrollStartPosition = 0;
				var currentTouches = 0;
				var scrollerNode = $(this).children(':first-child');
				var slideNodes;
				var slideNodeWidths;
				var slideNodeOuterWidths;
				var numberOfSlides = $(scrollerNode).children().not('script').size();
				var xScrollStarted = false;
				var lastChildOffset = 0;
				var isMouseDown = false;
				var currentSlider = undefined;
				var sliderStopLocation = 0;
				var infiniteSliderWidth;
				infiniteSliderOffset[sliderNumber] = 0;
				var shortContent = false;
				onChangeEventLastFired[sliderNumber] = -1;
				var isAutoSlideToggleOn = false;
				iosSliders[sliderNumber] = stageNode;
				isEventCleared[sliderNumber] = false;
				var currentEventNode;
				var intermediateChildOffset = 0;
				var tempInfiniteSliderOffset = 0;
				var preventXScroll = false;
				var snapOverride = false;
				var scrollerWidth;
				var clickEvent = isTouch ? 'touchstart.iosSliderEvent' : 'click.iosSliderEvent';
				var anchorEvents;
				var onclickEvents;
				var allScrollerNodeChildren;
				touchLocks[sliderNumber] = false;
				slideTimeouts[sliderNumber] = new Array();
				if(settings.scrollbarDrag) {
					settings.scrollbar = true;
					settings.scrollbarHide = false;
				}
				var $this = $(this);
				var data = $this.data('iosslider');	
				if(data != undefined) return true;
           		
           		$(this).find('img').bind('dragstart.iosSliderEvent', function(event) { event.preventDefault(); });

				if(settings.infiniteSlider) {
					settings.scrollbar = false;
				}
						
				if(settings.scrollbar) {
					
					if(settings.scrollbarContainer != '') {
						$(settings.scrollbarContainer).append("<div class = '" + scrollbarBlockClass + "'><div class = '" + scrollbarClass + "'></div></div>");
					} else {
						$(scrollerNode).parent().append("<div class = '" + scrollbarBlockClass + "'><div class = '" + scrollbarClass + "'></div></div>");
					}
				
				}
				
				if(!init()) return true;
				
				$(this).find('a').bind('mousedown', helpers.preventDrag);
				$(this).find("[onclick]").bind('click', helpers.preventDrag).each(function() {
					
					$(this).data('onclick', this.onclick);
				
				});
				
				var newChildOffset = helpers.calcActiveOffset(settings, helpers.getSliderOffset($(scrollerNode), 'x'), childrenOffsets, stageWidth, infiniteSliderOffset[sliderNumber], numberOfSlides, undefined, sliderNumber);
				var tempOffset = (newChildOffset + infiniteSliderOffset[sliderNumber] + numberOfSlides)%numberOfSlides;
				
				var args = new helpers.args(settings, scrollerNode, $(scrollerNode).children(':eq(' + tempOffset + ')'), tempOffset, tempOffset, false);
				$(stageNode).data('args', args);

				if(settings.onSliderLoaded != '') {

					settings.onSliderLoaded(args);
					
				}
				
				onChangeEventLastFired[sliderNumber] = tempOffset;

				function init() {
					
					helpers.autoSlidePause(sliderNumber);
					
					anchorEvents = $(scrollerNode).find('a');
					onclickEvents = $(scrollerNode).find('[onclick]');
					allScrollerNodeChildren = $(scrollerNode).find('*');
					
					$(stageNode).css('width', '');
					$(stageNode).css('height', '');
					$(scrollerNode).css('width', '');
					slideNodes = $(scrollerNode).children().not('script').get();
					slideNodeWidths = new Array();
					slideNodeOuterWidths = new Array();
					
					$(slideNodes).css('width', '');
					
					sliderMax[sliderNumber] = 0;
					childrenOffsets = new Array();
					containerWidth = $(stageNode).parent().width();
					stageWidth = $(stageNode).outerWidth(true);
					
					if(settings.responsiveSlideContainer) {
						stageWidth = ($(stageNode).outerWidth(true) > containerWidth) ? containerWidth : $(stageNode).outerWidth(true);
					}

					$(stageNode).css({
						position: settings.stageCSS.position,
						top: settings.stageCSS.top,
						left: settings.stageCSS.left,
						overflow: settings.stageCSS.overflow,
						zIndex: settings.stageCSS.zIndex,
						'webkitPerspective': 1000,
						'webkitBackfaceVisibility': 'hidden',
						width: stageWidth
					});
					
					$(settings.unselectableSelector).css({
						cursor: 'default'
					});
						
					for(var j = 0; j < slideNodes.length; j++) {
						
						slideNodeWidths[j] = $(slideNodes[j]).width();
						slideNodeOuterWidths[j] = $(slideNodes[j]).outerWidth(true);
						var newWidth = slideNodeOuterWidths[j];
						
						if(settings.responsiveSlides) {

							if(slideNodeOuterWidths[j] > stageWidth) {
								
								newWidth = stageWidth + (slideNodeOuterWidths[j] - slideNodeWidths[j]) * -1;
								
							} else {

								newWidth = slideNodeWidths[j];
								
							}
							
							$(slideNodes[j]).css({
								width: newWidth
							});
					
						}
						
						$(slideNodes[j]).css({
							'webkitBackfaceVisibility': 'hidden',
							position: 'absolute',
							top: 0
						});
						
						childrenOffsets[j] = sliderMax[sliderNumber] * -1;
						
						sliderMax[sliderNumber] = sliderMax[sliderNumber] + newWidth;
					
					}
					
					if(settings.snapSlideCenter) {
						centeredSlideOffset = (stageWidth - slideNodeOuterWidths[0]) * 0.5;
						
						if(settings.responsiveSlides && (slideNodeOuterWidths[0] > stageWidth)) {
							centeredSlideOffset = 0;
						}
					}
					
					sliderAbsMax[sliderNumber] = sliderMax[sliderNumber] * 2;
					
					for(var j = 0; j < slideNodes.length; j++) {
						
						helpers.setSliderOffset($(slideNodes[j]), childrenOffsets[j] * -1 + sliderMax[sliderNumber] + centeredSlideOffset);
						
						childrenOffsets[j] = childrenOffsets[j] - sliderMax[sliderNumber];
					
					}
					
					if(!settings.infiniteSlider && !settings.snapSlideCenter) {
					
						for(var i = 0; i < childrenOffsets.length; i++) {
							
							if(childrenOffsets[i] <= ((sliderMax[sliderNumber] * 2 - stageWidth) * -1)) {
								break;
							}
							
							lastChildOffset = i;
							
						}
						
						childrenOffsets.splice(lastChildOffset + 1, childrenOffsets.length);
						childrenOffsets[childrenOffsets.length] = (sliderMax[sliderNumber] * 2 - stageWidth) * -1;
					
					}
					
					for(var i = 0; i < childrenOffsets.length; i++) {
						originalOffsets[i] = childrenOffsets[i];
					}
					
					if(isFirstInit) {
						settings.startAtSlide = (iosSliderSettings[sliderNumber].startAtSlide > childrenOffsets.length) ? childrenOffsets.length : iosSliderSettings[sliderNumber].startAtSlide;
						if(settings.infiniteSlider) {
							settings.startAtSlide = (iosSliderSettings[sliderNumber].startAtSlide - 1 + numberOfSlides)%numberOfSlides;
							activeChildOffsets[sliderNumber] = (iosSliderSettings[sliderNumber].startAtSlide);
						} else {
							settings.startAtSlide = ((iosSliderSettings[sliderNumber].startAtSlide - 1) < 0) ? childrenOffsets.length-1 : iosSliderSettings[sliderNumber].startAtSlide;	
							activeChildOffsets[sliderNumber] = (iosSliderSettings[sliderNumber].startAtSlide-1);
						}
						activeChildInfOffsets[sliderNumber] = activeChildOffsets[sliderNumber];
					}
					
					sliderMin[sliderNumber] = sliderMax[sliderNumber] + centeredSlideOffset;
					
					$(scrollerNode).css({
						position: 'relative',
						cursor: grabOutCursor,
						'webkitPerspective': '0',
						'webkitBackfaceVisibility': 'hidden',
						width: sliderMax[sliderNumber] + 'px'
					});
					
					scrollerWidth = sliderMax[sliderNumber];
					sliderMax[sliderNumber] = sliderMax[sliderNumber] * 2 - stageWidth + centeredSlideOffset * 2;
					
					shortContent = (scrollerWidth < stageWidth) ? true : false;

					if(shortContent) {
						
						$(scrollerNode).css({
							cursor: 'default'
						});
						
					}
					
					containerHeight = $(stageNode).parent().outerHeight(true);
					stageHeight = $(stageNode).height();
					
					if(settings.responsiveSlideContainer) {
						stageHeight = (stageHeight > containerHeight) ? containerHeight : stageHeight;
					}
					
					$(stageNode).css({
						height: stageHeight
					});

					helpers.setSliderOffset(scrollerNode, childrenOffsets[activeChildOffsets[sliderNumber]]);
					
					if(settings.infiniteSlider && !shortContent) {
						
						var currentScrollOffset = helpers.getSliderOffset($(scrollerNode), 'x');
						var count = (infiniteSliderOffset[sliderNumber] + numberOfSlides)%numberOfSlides * -1;

						while(count < 0) {
								
							var lowSlideNumber = 0;
							var lowSlideOffset = helpers.getSliderOffset($(slideNodes[0]), 'x');
							$(slideNodes).each(function(i) {
								
								if(helpers.getSliderOffset(this, 'x') < lowSlideOffset) {
									lowSlideOffset = helpers.getSliderOffset(this, 'x');
									lowSlideNumber = i;
								}
								
							});
							
							var newOffset = sliderMin[sliderNumber] + scrollerWidth;
							helpers.setSliderOffset($(slideNodes)[lowSlideNumber], newOffset);
							
							sliderMin[sliderNumber] = childrenOffsets[1] * -1 + centeredSlideOffset;
							sliderMax[sliderNumber] = sliderMin[sliderNumber] + scrollerWidth - stageWidth;

							childrenOffsets.splice(0, 1);
							childrenOffsets.splice(childrenOffsets.length, 0, newOffset * -1 + centeredSlideOffset);

							count++;
							
						}
						
						while(((childrenOffsets[0] * -1 - scrollerWidth + centeredSlideOffset) > 0) && settings.snapSlideCenter && isFirstInit) {
							
							var highSlideNumber = 0;
							var highSlideOffset = helpers.getSliderOffset($(slideNodes[0]), 'x');
							$(slideNodes).each(function(i) {
								
								if(helpers.getSliderOffset(this, 'x') > highSlideOffset) {
									highSlideOffset = helpers.getSliderOffset(this, 'x');
									highSlideNumber = i;
								}
								
							});

							var newOffset = sliderMin[sliderNumber] - slideNodeOuterWidths[highSlideNumber];
							helpers.setSliderOffset($(slideNodes)[highSlideNumber], newOffset);
							
							childrenOffsets.splice(0, 0, newOffset * -1 + centeredSlideOffset);
							childrenOffsets.splice(childrenOffsets.length-1, 1);

							sliderMin[sliderNumber] = childrenOffsets[0] * -1 + centeredSlideOffset;
							sliderMax[sliderNumber] = sliderMin[sliderNumber] + scrollerWidth - stageWidth;

							infiniteSliderOffset[sliderNumber]--;
							activeChildOffsets[sliderNumber]++;
							
						}
					
					}
					
					helpers.setSliderOffset(scrollerNode, childrenOffsets[activeChildOffsets[sliderNumber]]);
					
					if(!isTouch && !settings.desktopClickDrag) {
						
						$(scrollerNode).css({
							cursor: 'default'
						});
						
					}
					
					if(settings.scrollbar) {
						
						$('.' + scrollbarBlockClass).css({ 
							margin: settings.scrollbarMargin,
							overflow: 'hidden',
							display: 'none'
						});
						
						$('.' + scrollbarBlockClass + ' .' + scrollbarClass).css({ 
							border: settings.scrollbarBorder
						});
						
						scrollMargin = parseInt($('.' + scrollbarBlockClass).css('marginLeft')) + parseInt($('.' + scrollbarBlockClass).css('marginRight'));
						scrollBorder = parseInt($('.' + scrollbarBlockClass + ' .' + scrollbarClass).css('borderLeftWidth'), 10) + parseInt($('.' + scrollbarBlockClass + ' .' + scrollbarClass).css('borderRightWidth'), 10);
						scrollbarStageWidth = (settings.scrollbarContainer != '') ? $(settings.scrollbarContainer).width() : stageWidth;
						scrollbarWidth = (scrollbarStageWidth - scrollMargin) / numberOfSlides;
		
						if(!settings.scrollbarHide) {
							scrollbarStartOpacity = settings.scrollbarOpacity;
						}
						
						$('.' + scrollbarBlockClass).css({ 
							position: 'absolute',
							left: 0,
							width: scrollbarStageWidth - scrollMargin + 'px',
							margin: settings.scrollbarMargin
						});
						
						if(settings.scrollbarLocation == 'top') {
							$('.' + scrollbarBlockClass).css('top', '0');
						} else {
							$('.' + scrollbarBlockClass).css('bottom', '0');
						}
						
						$('.' + scrollbarBlockClass + ' .' + scrollbarClass).css({ 
							borderRadius: settings.scrollbarBorderRadius,
							background: settings.scrollbarBackground,
							height: settings.scrollbarHeight,
							width: scrollbarWidth - scrollBorder + 'px',
							minWidth: settings.scrollbarHeight,
							border: settings.scrollbarBorder,
							'webkitPerspective': 1000,
							'webkitBackfaceVisibility': 'hidden',
							'position': 'relative',
							opacity: scrollbarStartOpacity,
							filter: 'alpha(opacity:' + (scrollbarStartOpacity * 100) + ')',
							boxShadow: settings.scrollbarShadow
						});
						
						helpers.setSliderOffset($('.' + scrollbarBlockClass + ' .' + scrollbarClass), Math.floor((childrenOffsets[activeChildOffsets[sliderNumber]] * -1 - sliderMin[sliderNumber] + centeredSlideOffset) / (sliderMax[sliderNumber] - sliderMin[sliderNumber]) * (scrollbarStageWidth - scrollMargin - scrollbarWidth)));
		
						$('.' + scrollbarBlockClass).css({
							display: 'block'
						});
						
						scrollbarNode = $('.' + scrollbarBlockClass + ' .' + scrollbarClass);
						scrollbarBlockNode = $('.' + scrollbarBlockClass);						
						
					}
					
					if(settings.scrollbarDrag && !shortContent) {
						$('.' + scrollbarBlockClass + ' .' + scrollbarClass).css({
							cursor: grabOutCursor
						});
					}
					
					if(settings.infiniteSlider) {
					
						infiniteSliderWidth = (sliderMax[sliderNumber] + stageWidth) / 3;
						
					}
					
					if(settings.navSlideSelector != '') {
								
						$(settings.navSlideSelector).each(function(j) {
						
							$(this).css({
								cursor: 'pointer'
							});
							
							$(this).unbind(clickEvent).bind(clickEvent, function() {

								helpers.changeSlide(j, scrollerNode, slideNodes, scrollTimeouts, scrollbarClass, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, originalOffsets, childrenOffsets, sliderNumber, infiniteSliderWidth, numberOfSlides, centeredSlideOffset, settings);
								
							});
						
						});
								
					}	
					
					if(settings.navPrevSelector != '') {
						
						$(settings.navPrevSelector).css({
							cursor: 'pointer'
						});
						
						$(settings.navPrevSelector).unbind(clickEvent).bind(clickEvent, function() {	
						
							var slide = (activeChildOffsets[sliderNumber] + infiniteSliderOffset[sliderNumber] + numberOfSlides)%numberOfSlides;
											
							if((slide > 0) || settings.infiniteSlider) {
								helpers.changeSlide(slide - 1, scrollerNode, slideNodes, scrollTimeouts, scrollbarClass, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, originalOffsets, childrenOffsets, sliderNumber, infiniteSliderWidth, numberOfSlides, centeredSlideOffset, settings);
							}
						});
					
					}
					
					if(settings.navNextSelector != '') {
						
						$(settings.navNextSelector).css({
							cursor: 'pointer'
						});
						
						$(settings.navNextSelector).unbind(clickEvent).bind(clickEvent, function() {
							
							var slide = (activeChildOffsets[sliderNumber] + infiniteSliderOffset[sliderNumber] + numberOfSlides)%numberOfSlides;
							
							if((slide < childrenOffsets.length-1) || settings.infiniteSlider) {
								helpers.changeSlide(slide + 1, scrollerNode, slideNodes, scrollTimeouts, scrollbarClass, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, originalOffsets, childrenOffsets, sliderNumber, infiniteSliderWidth, numberOfSlides, centeredSlideOffset, settings);
							}
						});
					
					}
					
					if(settings.autoSlide && !shortContent) {
						
						if(settings.autoSlideToggleSelector != '') {
						
							$(settings.autoSlideToggleSelector).css({
								cursor: 'pointer'
							});
							
							$(settings.autoSlideToggleSelector).unbind(clickEvent).bind(clickEvent, function() {
								
								if(!isAutoSlideToggleOn) {
								
									helpers.autoSlidePause(sliderNumber);
									isAutoSlideToggleOn = true;
									
									$(settings.autoSlideToggleSelector).addClass('on');
									
								} else {
									
									helpers.autoSlide(scrollerNode, slideNodes, scrollTimeouts, scrollbarClass, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, originalOffsets, childrenOffsets, sliderNumber, infiniteSliderWidth, numberOfSlides, centeredSlideOffset, settings);
									
									isAutoSlideToggleOn = false;
									
									$(settings.autoSlideToggleSelector).removeClass('on');
									
								}
							
							});
						
						}
						
						if(!isAutoSlideToggleOn && !shortContent) {
							helpers.autoSlide(scrollerNode, slideNodes, scrollTimeouts, scrollbarClass, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, originalOffsets, childrenOffsets, sliderNumber, infiniteSliderWidth, numberOfSlides, centeredSlideOffset, settings);
						}
	
						if(!isTouch) {
							
							$(stageNode).bind('mouseenter.iosSliderEvent', function() {
								helpers.autoSlidePause(sliderNumber);
							});
							
							$(stageNode).bind('mouseleave.iosSliderEvent', function() {
								if(!isAutoSlideToggleOn && !shortContent) {
									helpers.autoSlide(scrollerNode, slideNodes, scrollTimeouts, scrollbarClass, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, originalOffsets, childrenOffsets, sliderNumber, infiniteSliderWidth, numberOfSlides, centeredSlideOffset, settings);
								}
							});
						
						} else {
							
							$(stageNode).bind('touchend.iosSliderEvent', function() {
							
								if(!isAutoSlideToggleOn && !shortContent) {
									helpers.autoSlide(scrollerNode, slideNodes, scrollTimeouts, scrollbarClass, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, originalOffsets, childrenOffsets, sliderNumber, infiniteSliderWidth, numberOfSlides, centeredSlideOffset, settings);
								}
							
							});
						
						}
					
					}
					
					$(stageNode).data('iosslider', {
						obj: $this,
						settings: settings,
						scrollerNode: scrollerNode,
						slideNodes: slideNodes,
						numberOfSlides: numberOfSlides,
						centeredSlideOffset: centeredSlideOffset,
						sliderNumber: sliderNumber,
						originalOffsets: originalOffsets,
						childrenOffsets: childrenOffsets,
						sliderMax: sliderMax[sliderNumber],
						scrollbarClass: scrollbarClass,
						scrollbarWidth: scrollbarWidth, 
						scrollbarStageWidth: scrollbarStageWidth,
						stageWidth: stageWidth, 
						scrollMargin: scrollMargin, 
						scrollBorder: scrollBorder, 
						infiniteSliderOffset: infiniteSliderOffset[sliderNumber], 
						infiniteSliderWidth: infiniteSliderWidth						
					});
					
					isFirstInit = false;
					
					return true;
				
				}
				
				if(iosSliderSettings[sliderNumber].responsiveSlides || iosSliderSettings[sliderNumber].responsiveSlideContainer) {
					
					var orientationEvent = supportsOrientationChange ? 'orientationchange' : 'resize';
					
					$(window).bind(orientationEvent + '.iosSliderEvent', function() {
							
						if(!init()) return true;
						
						var args = $(stageNode).data('args');
				
						if(settings.onSliderResize != '') {
					    	settings.onSliderResize(args);
					    }
						
					});
					
				}
				
				if(settings.keyboardControls && !shortContent) {
					
					$(document).bind('keydown.iosSliderEvent', function(e) {
						
						if((!isIe7) && (!isIe8)) {
							var e = e.originalEvent;
						}
						
						switch(e.keyCode) {
							
							case 37:
								
								var slide = (activeChildOffsets[sliderNumber] + infiniteSliderOffset[sliderNumber] + numberOfSlides)%numberOfSlides;

								if((slide > 0) || settings.infiniteSlider) {
									helpers.changeSlide(slide - 1, scrollerNode, slideNodes, scrollTimeouts, scrollbarClass, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, originalOffsets, childrenOffsets, sliderNumber, infiniteSliderWidth, numberOfSlides, centeredSlideOffset, settings);
								} 
								
							break;
							
							case 39:
								
								var slide = (activeChildOffsets[sliderNumber] + infiniteSliderOffset[sliderNumber] + numberOfSlides)%numberOfSlides;
								
								if((slide < childrenOffsets.length-1) || settings.infiniteSlider) {
									helpers.changeSlide(slide + 1, scrollerNode, slideNodes, scrollTimeouts, scrollbarClass, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, originalOffsets, childrenOffsets, sliderNumber, infiniteSliderWidth, numberOfSlides, centeredSlideOffset, settings);
								}
								
							break;
							
						}
					
					});
					
				}
					
				if(isTouch || settings.desktopClickDrag) {
					
					var touchStartEvent = isTouch ? 'touchstart.iosSliderEvent' : 'mousedown.iosSliderEvent';
					var touchSelection = $(scrollerNode);
					var touchSelectionMove = $(scrollerNode);
					var preventDefault = null;
					var isUnselectable = false;
					
					if(settings.scrollbarDrag) {
					
						touchSelection = touchSelection.add(scrollbarNode);
						touchSelectionMove = touchSelectionMove.add(scrollbarBlockNode);
						
					}
					
					$(touchSelection).bind(touchStartEvent, function(e) {
						
						if(touchLocks[sliderNumber] || shortContent) return true;
						
						isUnselectable = helpers.isUnselectable(e.target, settings);
						
						if(isUnselectable) return true;
						
						currentEventNode = ($(this)[0] === $(scrollbarNode)[0]) ? scrollbarNode : scrollerNode;
						
						if((!isIe7) && (!isIe8)) {
							var e = e.originalEvent;
						}

						helpers.autoSlidePause(sliderNumber);
						
						allScrollerNodeChildren.unbind('.disableClick');
						
						if(!isTouch) {
							
							if (window.getSelection) {
								if (window.getSelection().empty) {
									window.getSelection().empty();
								} else if (window.getSelection().removeAllRanges) {
									window.getSelection().removeAllRanges();
								}
							} else if (document.selection) {
								document.selection.empty();
							}
							
							eventX = e.pageX;
							eventY = e.pageY;
							
							isMouseDown = true;
							currentSlider = scrollerNode;

							$(this).css({
								cursor: grabInCursor
							});
							
						} else {
						
							eventX = e.touches[0].pageX;
							eventY = e.touches[0].pageY;

						}
						
						xCurrentScrollRate = new Array(0, 0);
						yCurrentScrollRate = new Array(0, 0);
						xScrollDistance = 0;
						xScrollStarted = false;
						
						for(var j = 0; j < scrollTimeouts.length; j++) {
							clearTimeout(scrollTimeouts[j]);
						}
						
						var scrollPosition = helpers.getSliderOffset(scrollerNode, 'x');

						if(scrollPosition > (sliderMin[sliderNumber] * -1 + centeredSlideOffset + scrollerWidth)) {
							
							scrollPosition = sliderMin[sliderNumber] * -1 + centeredSlideOffset + scrollerWidth;

							helpers.setSliderOffset($('.' + scrollbarClass), scrollPosition);
							
							$('.' + scrollbarClass).css({
								width: (scrollbarWidth - scrollBorder) + 'px'
							});
							
						} else if(scrollPosition < (sliderMax[sliderNumber] * -1)) {
						
							scrollPosition = sliderMax[sliderNumber] * -1;

							helpers.setSliderOffset($('.' + scrollbarClass), (scrollbarStageWidth - scrollMargin - scrollbarWidth));
							
							$('.' + scrollbarClass).css({
								width: (scrollbarWidth - scrollBorder) + 'px'
							});
							
						} 
						
						var scrollbarSubtractor = ($(this)[0] === $(scrollbarNode)[0]) ? (sliderMin[sliderNumber]) : 0;
						
						xScrollStartPosition = (helpers.getSliderOffset(this, 'x') - eventX - scrollbarSubtractor) * -1;
						yScrollStartPosition = (helpers.getSliderOffset(this, 'y') - eventY) * -1;
						
						xCurrentScrollRate[1] = eventX;
						yCurrentScrollRate[1] = eventY;
						
						snapOverride = false;
						
					});
					
					var touchMoveEvent = isTouch ? 'touchmove.iosSliderEvent' : 'mousemove.iosSliderEvent';
					
					$(touchSelectionMove).bind(touchMoveEvent, function(e) {

						if((!isIe7) && (!isIe8)) {
							var e = e.originalEvent;
						}
						
						if(touchLocks[sliderNumber] || shortContent) return true;
						
						if(isUnselectable) return true;
						
						var edgeDegradation = 0;

						if(!isTouch) {
							
							if (window.getSelection) {
								if (window.getSelection().empty) {
									window.getSelection().empty();
								} else if (window.getSelection().removeAllRanges) {
									window.getSelection().removeAllRanges();
								}
							} else if (document.selection) {
								document.selection.empty();
							}
							
						}
						
						if(isTouch) {
							eventX = e.touches[0].pageX;
							eventY = e.touches[0].pageY;
						} else {
							eventX = e.pageX;
							eventY = e.pageY;
							
							if(!isMouseDown) {
								return false;
							}
							
							if(!isIe) {
								if((typeof e.webkitMovementX != 'undefined' || typeof e.webkitMovementY != 'undefined') && e.webkitMovementY === 0 && e.webkitMovementX === 0) {
									return false;
								}
							}
							
						}
						
						xCurrentScrollRate[0] = xCurrentScrollRate[1];
						xCurrentScrollRate[1] = eventX;
						xScrollDistance = (xCurrentScrollRate[1] - xCurrentScrollRate[0]) / 2;
						
						yCurrentScrollRate[0] = yCurrentScrollRate[1];
						yCurrentScrollRate[1] = eventY;
						yScrollDistance = (yCurrentScrollRate[1] - yCurrentScrollRate[0]) / 2;
						
						if(!xScrollStarted) {
						
							var slide = (activeChildOffsets[sliderNumber] + infiniteSliderOffset[sliderNumber] + numberOfSlides)%numberOfSlides;
							var args = new helpers.args(settings, scrollerNode, $(scrollerNode).children(':eq(' + slide + ')'), slide, slide, false);
							$(stageNode).data('args', args);

							if(settings.onSlideStart != '') {
								settings.onSlideStart(args);
							}
							
						}
						
						if(((yScrollDistance > 3) || (yScrollDistance < -3)) && ((xScrollDistance < 3) && (xScrollDistance > -3)) && (isTouch) && (!xScrollStarted)) {
							preventXScroll = true;
						}
						
						if(((xScrollDistance > 5) || (xScrollDistance < -5)) && (isTouch)) {
						
							e.preventDefault();
							xScrollStarted = true;
							
						} else if(!isTouch) {
							
							xScrollStarted = true;
							
						}
						
						if(xScrollStarted && !preventXScroll) {
							
							var scrollPosition = helpers.getSliderOffset(scrollerNode, 'x');
							var scrollbarSubtractor = ($(this)[0] === $(scrollbarBlockNode)[0]) ? (sliderMin[sliderNumber]) : 0;
							var scrollbarMultiplier = ($(this)[0] === $(scrollbarBlockNode)[0]) ? ((sliderMin[sliderNumber] - sliderMax[sliderNumber]) / (scrollbarStageWidth - scrollMargin - scrollbarWidth)) : 1;
							var elasticPullResistance = ($(this)[0] === $(scrollbarBlockNode)[0]) ? settings.scrollbarElasticPullResistance : settings.elasticPullResistance;

							if(isTouch) {
								if(currentTouches != e.touches.length) {
									xScrollStartPosition = (scrollPosition * -1) + eventX;
								}
								
								currentTouches = e.touches.length;
							}
							
							if(settings.infiniteSlider) {

								if(scrollPosition <= (sliderMax[sliderNumber] * -1)) {
									
									var scrollerWidth = $(scrollerNode).width();
									
									if(scrollPosition <= (sliderAbsMax[sliderNumber] * -1)) {
										
										var sum = originalOffsets[0] * -1;
										$(slideNodes).each(function(i) {
											
											helpers.setSliderOffset($(slideNodes)[i], sum + centeredSlideOffset);
											if(i < childrenOffsets.length) {
												childrenOffsets[i] = sum * -1;
											}
											sum = sum + $(this).outerWidth(true);
											
										});
										
										xScrollStartPosition = xScrollStartPosition - childrenOffsets[0] * -1;
										sliderMin[sliderNumber] = childrenOffsets[0] * -1 + centeredSlideOffset;
										sliderMax[sliderNumber] = sliderMin[sliderNumber] + scrollerWidth - stageWidth;
										infiniteSliderOffset[sliderNumber] = 0;
										
									} else {
										
										var lowSlideNumber = 0;
										var lowSlideOffset = helpers.getSliderOffset($(slideNodes[0]), 'x');
										$(slideNodes).each(function(i) {
											
											if(helpers.getSliderOffset(this, 'x') < lowSlideOffset) {
												lowSlideOffset = helpers.getSliderOffset(this, 'x');
												lowSlideNumber = i;
											}
											
										});
										
										var newOffset = sliderMin[sliderNumber] + scrollerWidth;
										helpers.setSliderOffset($(slideNodes)[lowSlideNumber], newOffset);
										
										sliderMin[sliderNumber] = childrenOffsets[1] * -1 + centeredSlideOffset;
										sliderMax[sliderNumber] = sliderMin[sliderNumber] + scrollerWidth - stageWidth;

										childrenOffsets.splice(0, 1);
										childrenOffsets.splice(childrenOffsets.length, 0, newOffset * -1 + centeredSlideOffset);

										infiniteSliderOffset[sliderNumber]++;
										
									}
									
								}
								
								if((scrollPosition >= (sliderMin[sliderNumber] * -1)) || (scrollPosition >= 0)) {
		
									var scrollerWidth = $(scrollerNode).width();
									
									if(scrollPosition >= 0) {
									
										var sum = originalOffsets[0] * -1;
										$(slideNodes).each(function(i) {
											
											helpers.setSliderOffset($(slideNodes)[i], sum + centeredSlideOffset);
											if(i < childrenOffsets.length) {
												childrenOffsets[i] = sum * -1;
											}
											sum = sum + $(this).outerWidth(true);
											
										});
										
										xScrollStartPosition = xScrollStartPosition + childrenOffsets[0] * -1;
										sliderMin[sliderNumber] = childrenOffsets[0] * -1 + centeredSlideOffset;
										sliderMax[sliderNumber] = sliderMin[sliderNumber] + scrollerWidth - stageWidth;
										infiniteSliderOffset[sliderNumber] = numberOfSlides;
										
										while(((childrenOffsets[0] * -1 - scrollerWidth + centeredSlideOffset) > 0)) {
				
											var highSlideNumber = 0;
											var highSlideOffset = helpers.getSliderOffset($(slideNodes[0]), 'x');
											$(slideNodes).each(function(i) {
												
												if(helpers.getSliderOffset(this, 'x') > highSlideOffset) {
													highSlideOffset = helpers.getSliderOffset(this, 'x');
													highSlideNumber = i;
												}
												
											});
				
											var newOffset = sliderMin[sliderNumber] - $(slideNodes[highSlideNumber]).outerWidth(true);
											helpers.setSliderOffset($(slideNodes)[highSlideNumber], newOffset);
											
											childrenOffsets.splice(0, 0, newOffset * -1 + centeredSlideOffset);
											childrenOffsets.splice(childrenOffsets.length-1, 1);
				
											sliderMin[sliderNumber] = childrenOffsets[0] * -1 + centeredSlideOffset;
											sliderMax[sliderNumber] = sliderMin[sliderNumber] + scrollerWidth - stageWidth;
				
											infiniteSliderOffset[sliderNumber]--;
											activeChildOffsets[sliderNumber]++;
											
										}

									} else {

										var highSlideNumber = 0;
										var highSlideOffset = helpers.getSliderOffset($(slideNodes[0]), 'x');
										$(slideNodes).each(function(i) {
											
											if(helpers.getSliderOffset(this, 'x') > highSlideOffset) {
												highSlideOffset = helpers.getSliderOffset(this, 'x');
												highSlideNumber = i;
											}
											
										});
										
										var newOffset = sliderMin[sliderNumber] - $(slideNodes[highSlideNumber]).outerWidth(true);
										helpers.setSliderOffset($(slideNodes)[highSlideNumber], newOffset);									
										
										childrenOffsets.splice(0, 0, newOffset * -1 + centeredSlideOffset);
										childrenOffsets.splice(childrenOffsets.length-1, 1);

										sliderMin[sliderNumber] = childrenOffsets[0] * -1 + centeredSlideOffset;
										sliderMax[sliderNumber] = sliderMin[sliderNumber] + scrollerWidth - stageWidth;

										infiniteSliderOffset[sliderNumber]--;

									}
								
								}
								
							} else {
								
								var scrollerWidth = $(scrollerNode).width();
								
								if(scrollPosition > (sliderMin[sliderNumber] * -1 + centeredSlideOffset)) {

									edgeDegradation = (sliderMin[sliderNumber] + ((xScrollStartPosition - scrollbarSubtractor - eventX + centeredSlideOffset) * -1 * scrollbarMultiplier) - scrollbarSubtractor) * elasticPullResistance * -1 / scrollbarMultiplier;
									
								}
								
								if(scrollPosition < (sliderMax[sliderNumber] * -1)) {
									
									edgeDegradation = (sliderMax[sliderNumber] + ((xScrollStartPosition - scrollbarSubtractor - eventX) * -1 * scrollbarMultiplier) - scrollbarSubtractor) * elasticPullResistance * -1 / scrollbarMultiplier;
												
								}
							
							}

							helpers.setSliderOffset(scrollerNode, ((xScrollStartPosition - scrollbarSubtractor - eventX - edgeDegradation) * -1 * scrollbarMultiplier) - scrollbarSubtractor);

							if(settings.scrollbar) {
								
								helpers.showScrollbar(settings, scrollbarClass);

								scrollbarDistance = Math.floor((xScrollStartPosition - eventX - edgeDegradation - sliderMin[sliderNumber] + centeredSlideOffset) / (sliderMax[sliderNumber] - sliderMin[sliderNumber]) * (scrollbarStageWidth - scrollMargin - scrollbarWidth) * scrollbarMultiplier);
								
								var width = scrollbarWidth;
								
								if(scrollPosition >= (sliderMin[sliderNumber] * -1 + centeredSlideOffset + scrollerWidth)) {

									width = scrollbarWidth - scrollBorder - (scrollbarDistance * -1);
									
									helpers.setSliderOffset($('.' + scrollbarClass), 0);
									
									$('.' + scrollbarClass).css({
										width: width + 'px'
									});
									
								} else if(scrollPosition <= ((sliderMax[sliderNumber] * -1) + 1)) {
																		
									width = scrollbarStageWidth - scrollMargin - scrollBorder - scrollbarDistance;
									
									helpers.setSliderOffset($('.' + scrollbarClass), scrollbarDistance);
									
									$('.' + scrollbarClass).css({
										width: width + 'px'
									});
									
								} else {

									helpers.setSliderOffset($('.' + scrollbarClass), scrollbarDistance);
									
								}
								
							}
							
							if(isTouch) {
								lastTouch = e.touches[0].pageX;
							}

							var slideChanged = false;
							var newChildOffset = helpers.calcActiveOffset(settings, (xScrollStartPosition - eventX - edgeDegradation) * -1, childrenOffsets, stageWidth, infiniteSliderOffset[sliderNumber], numberOfSlides, undefined, sliderNumber);
							var tempOffset = (newChildOffset + infiniteSliderOffset[sliderNumber] + numberOfSlides)%numberOfSlides;

							if(settings.infiniteSlider) {
								
								if(tempOffset != activeChildInfOffsets[sliderNumber]) {
									slideChanged = true;
								}
									
							} else {
							
								if(newChildOffset != activeChildOffsets[sliderNumber]) {
									slideChanged = true;
								}
							
							}
							
							if(slideChanged) {
								
								activeChildOffsets[sliderNumber] = newChildOffset;
								activeChildInfOffsets[sliderNumber] = tempOffset;
								snapOverride = true;
								
								var args = new helpers.args(settings, scrollerNode, $(scrollerNode).children(':eq(' + tempOffset + ')'), tempOffset, tempOffset, true);
								$(stageNode).data('args', args);
								
								if(settings.onSlideChange != '') {
									settings.onSlideChange(args);
								}
								
							}
							
						}
						
					});
					
					$(touchSelection).bind('touchend.iosSliderEvent', function(e) {
						
						var e = e.originalEvent;
						
						if(touchLocks[sliderNumber] || shortContent) return true;
						
						if(isUnselectable) return true;
						
						if(e.touches.length != 0) {
							
							for(var j = 0; j < e.touches.length; j++) {
								
								if(e.touches[j].pageX == lastTouch) {
									helpers.slowScrollHorizontal(scrollerNode, slideNodes, scrollTimeouts, scrollbarClass, xScrollDistance, yScrollDistance, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, originalOffsets, childrenOffsets, sliderNumber, infiniteSliderWidth, numberOfSlides, currentEventNode, snapOverride, centeredSlideOffset, settings);
								}
								
							}
							
						} else {
							
							helpers.slowScrollHorizontal(scrollerNode, slideNodes, scrollTimeouts, scrollbarClass, xScrollDistance, yScrollDistance, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, originalOffsets, childrenOffsets, sliderNumber, infiniteSliderWidth, numberOfSlides, currentEventNode, snapOverride, centeredSlideOffset, settings);
							
						}
						
						preventXScroll = false;
						
					});
					
					if(!isTouch) {

						var eventObject = $(window);
	
						if(isIe8 || isIe7) {
							var eventObject = $(document); 
						}
						
						$(eventObject).bind('mouseup.iosSliderEvent' + sliderNumber, function(e) {
							
							if(xScrollStarted) {
								anchorEvents.unbind('click.disableClick').bind('click.disableClick', helpers.preventClick);
							} else {
								anchorEvents.unbind('click.disableClick').bind('click.disableClick', helpers.enableClick);
							}
							
							onclickEvents.each(function() {
								
								this.onclick = function(event) {
									if(xScrollStarted) { 
										return false;
									}
								
									$(this).data('onclick').call(this, event || window.event);
								}
								
							});
							
							if(parseFloat($().jquery) >= 1.8) {
								
								allScrollerNodeChildren.each(function() {
										
									var clickObject = $._data(this, 'events');
									
									if(clickObject != undefined) {
										if(clickObject.click != undefined) {

											if(clickObject.click[0].namespace != 'iosSliderEvent') {
												
												if(!xScrollStarted) { 
													return false;
												}
											
												$(this).one('click.disableClick', helpers.preventClick);
											    var handlers = $._data(this, 'events').click;
											    var handler = handlers.pop();
											    handlers.splice(0, 0, handler);
												
											}
											
										}
									}
									
								});
							
							} else if(parseFloat($().jquery) >= 1.6) {
							
								allScrollerNodeChildren.each(function() {
										
									var clickObject = $(this).data('events');
									
									if(clickObject != undefined) {
										if(clickObject.click != undefined) {

											if(clickObject.click[0].namespace != 'iosSliderEvent') {
												
												if(!xScrollStarted) { 
													return false;
												}
											
												$(this).one('click.disableClick', helpers.preventClick);
											    var handlers = $(this).data('events').click;
											    var handler = handlers.pop();
											    handlers.splice(0, 0, handler);
												
											}
											
										}
									}
									
								});
							
							} else {
							}
							
							if(!isEventCleared[sliderNumber]) {
							
								if(shortContent) return true;
								
								$(touchSelection).css({
									cursor: grabOutCursor
								});
								
								isMouseDown = false;
								
								if(currentSlider == undefined) {
									return false;
								}

								helpers.slowScrollHorizontal(currentSlider, slideNodes, scrollTimeouts, scrollbarClass, xScrollDistance, yScrollDistance, scrollbarWidth, stageWidth, scrollbarStageWidth, scrollMargin, scrollBorder, originalOffsets, childrenOffsets, sliderNumber, infiniteSliderWidth, numberOfSlides, currentEventNode, snapOverride, centeredSlideOffset, settings);
								
								currentSlider = undefined;
							
							}
							
							preventXScroll = false;
							
						});
						
					} 
				
				}
				
			});	
			
		},
		
		destroy: function(clearStyle, node) {
			
			if(node == undefined) {
				node = this;
			}
			
			return $(node).each(function() {
			
				var $this = $(this);
				var data = $this.data('iosslider');
				if(data == undefined) return false;
				
				if(clearStyle == undefined) {
		    		clearStyle = true;
		    	}
		    	
	    		helpers.autoSlidePause(data.sliderNumber);
		    	isEventCleared[data.sliderNumber] = true;
		    	$(window).unbind('.iosSliderEvent-' + data.sliderNumber);
		    	$(document).unbind('.iosSliderEvent-' + data.sliderNumber);
		    	$(this).unbind('.iosSliderEvent');
	    		$(this).children(':first-child').unbind('.iosSliderEvent');
	    		$(this).children(':first-child').children().unbind('.iosSliderEvent');
		    	
		    	if(clearStyle) {
	    			$(this).attr('style', '');
		    		$(this).children(':first-child').attr('style', '');
		    		$(this).children(':first-child').children().attr('style', '');
		    		
		    		$(data.settings.navSlideSelector).attr('style', '');
		    		$(data.settings.navPrevSelector).attr('style', '');
		    		$(data.settings.navNextSelector).attr('style', '');
		    		$(data.settings.autoSlideToggleSelector).attr('style', '');
		    		$(data.settings.unselectableSelector).attr('style', '');
	    		}
	    		
	    		if(data.settings.scrollbar) {
	    			$('.scrollbarBlock' + data.sliderNumber).remove();
	    		}
	    		
	    		var scrollTimeouts = slideTimeouts[data.sliderNumber];
	    		
	    		for(var i = 0; i < scrollTimeouts.length; i++) {
					clearTimeout(scrollTimeouts[i]);
				}
	    		
	    		$this.removeData('iosslider');
		    	
			});
		
		},
		
		update: function(node) {
			
			if(node == undefined) {
				node = this;
			}
			
			return $(node).each(function() {

				var $this = $(this);
				var data = $this.data('iosslider');
				if(data == undefined) return false;
				
				methods.destroy(false, this);
				data.settings.startAtSlide = $this.data('args').currentSlideNumber;
				
				if((data.numberOfSlides != 1) && data.settings.infiniteSlider) {
				 	data.settings.startAtSlide = (activeChildOffsets[data.sliderNumber] + 1 + infiniteSliderOffset[data.sliderNumber] + data.numberOfSlides)%data.numberOfSlides;
				}

				methods.init(data.settings, this);
				
				var args = new helpers.args(data.settings, data.scrollerNode, $(data.scrollerNode).children(':eq(' + (data.settings.startAtSlide - 1) + ')'), data.settings.startAtSlide - 1, data.settings.startAtSlide - 1, false);
				$(data.stageNode).data('args', args);
				
				if(data.settings.onSliderUpdate != '') {
			    	data.settings.onSliderUpdate(args);
			    }
		    	
			});
		
		},
		
		addSlide: function(slideNode, slidePosition) {

			return this.each(function() {
				
				var $this = $(this);
				var data = $this.data('iosslider');
				if(data == undefined) return false;
				
				if(!data.settings.infiniteSlider) {
				
					if(slidePosition <= data.numberOfSlides) {
						$(data.scrollerNode).children(':eq(' + (slidePosition - 1) + ')').before(slideNode);
					} else {
						$(data.scrollerNode).children(':eq(' + (slidePosition - 2) + ')').after(slideNode);
					}
					
					if($this.data('args').currentSlideNumber >= slidePosition) {
						$this.data('args').currentSlideNumber++;
					}
					
				} else {
					
					if(slidePosition == 1) {
						$(data.scrollerNode).children(':eq(0)').before(slideNode);
					} else {
						$(data.scrollerNode).children(':eq(' + (slidePosition - 2) + ')').after(slideNode);
					}
					
					if((infiniteSliderOffset[data.sliderNumber] < -1) && (true)) {
						activeChildOffsets[data.sliderNumber]--;
					}
					
					if($this.data('args').currentSlideNumber >= slidePosition) {
						activeChildOffsets[data.sliderNumber]++;
					}
					
				}
					
				$this.data('iosslider').numberOfSlides++;
				
				methods.update(this);
			
			});
		
		},
		
		removeSlide: function(slideNumber) {
		
			return this.each(function() {
			
				var $this = $(this);
				var data = $this.data('iosslider');
				if(data == undefined) return false;

				$(data.scrollerNode).children(':eq(' + (slideNumber - 1) + ')').remove();
				if(activeChildOffsets[data.sliderNumber] > (slideNumber - 1)) {
					activeChildOffsets[data.sliderNumber]--;
				}
				methods.update(this);
			
			});
		
		},
		
		goToSlide: function(slide, node) {
			
			if(node == undefined) {
				node = this;
			}
			
			return $(node).each(function() {
					
				var $this = $(this);
				var data = $this.data('iosslider');
				if(data == undefined) return false;
				
				slide = (slide > data.childrenOffsets.length) ? data.childrenOffsets.length - 1 : slide - 1;
				
				helpers.changeSlide(slide, $(data.scrollerNode), $(data.slideNodes), slideTimeouts[data.sliderNumber], data.scrollbarClass, data.scrollbarWidth, data.stageWidth, data.scrollbarStageWidth, data.scrollMargin, data.scrollBorder, data.originalOffsets, data.childrenOffsets, data.sliderNumber, data.infiniteSliderWidth, data.numberOfSlides, data.centeredSlideOffset, data.settings);
				
				activeChildOffsets[data.sliderNumber] = slide;

			});
			
		},
		
		lock: function() {
			
			return this.each(function() {
			
				var $this = $(this);
				var data = $this.data('iosslider');
				if(data == undefined) return false;

				touchLocks[data.sliderNumber] = true;
			
			});
			
		},
		
		unlock: function() {
		
			return this.each(function() {
			
				var $this = $(this);
				var data = $this.data('iosslider');
				if(data == undefined) return false;

				touchLocks[data.sliderNumber] = false;
			
			});
		
		},
		
		getData: function() {
		
			return this.each(function() {
			
				var $this = $(this);
				var data = $this.data('iosslider');
				if(data == undefined) return false;
				
				return data;
			
			});	
		
		}
		
		/*autoSlide: function(boolean) {
			
			helpers.autoSlidePause(data.sliderNumber);
		
		},
		
		autoSlidePlay: function() {
		
			helpers.autoSlide($(data.scrollerNode), $(data.slideNodes), slideTimeouts[data.sliderNumber], data.scrollbarClass, data.scrollbarWidth, data.stageWidth, data.scrollbarStageWidth, data.scrollMargin, data.scrollBorder, data.originalOffsets, data.childrenOffsets, data.sliderNumber, data.infiniteSliderWidth, data.numberOfSlides, data.centeredSlideOffset, data.settings);
			
		}*/
	
	}
	
	/* public functions */
	$.fn.iosSlider = function(method) {

		if(methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || !method) {
			return methods.init.apply(this, arguments);
		} else {
			$.error('invalid method call!');
		}
	
    };

}) (jQuery);/*
 * Initializes iosSlider.
 */
function Slider() {
	this.slider_div = $('.iosSlider');
	this.slider_div.iosSlider({
		// Size
		snapToChildren: true,
		// Remove drag (only move forward!)
		desktopClickDrag: false,
		// keyboardControls: false,
		navNextSelector: $('#right'),
		// RZ: disable left button.
		// navPrevSelector: $('#left'),
		onSlideStart: this.slideStart,
		onSlideComplete: this.slideComplete,
		onSlideChange: this.slideChange
	});
	this.expressions = [''];
	this.fileNames = [''];
	this.states = [''];
	this.bsts = [''];
}

/*
 * Gets the TeX expression for the current slide.
 */
Slider.prototype.getCurrentExpression = function() {
	var curSlide = this.slider_div.data('args').currentSlideNumber - 1;
	return this.expressions[curSlide];
}

Slider.prototype.getCurrentFileName = function() {
	var curSlide = this.slider_div.data('args').currentSlideNumber - 1;
	return this.fileNames[curSlide];
}

Slider.prototype.getCurrentState = function() {
	var curSlide = this.slider_div.data('args').currentSlideNumber - 1;
	return this.states[curSlide];
}

Slider.prototype.getCurrentBst = function() {
	var curSlide = this.slider_div.data('args').currentSlideNumber - 1;
	return this.bsts[curSlide];
}



// Restore state on arriving at the next slide.
Slider.prototype.slideComplete = function(args) {
		var current = args.currentSlideNumber - 1;
		Editor.restore_state( Editor.slider.states[current] );
		Editor.stroke_string = Editor.getStrokeString();
}

// On starting to move to the next slide, save the current state, and
// empty the canvas.
Slider.prototype.slideStart = function(args) {
	var current = args.currentSlideNumber - 1;
	// DEBUG: this save_state needs to be passed false,
	// otherwise recognition results are wiped clean.
	Editor.slider.states[current] = 
		Editor.save_state(false);

	var current = args.currentSlideNumber - 1;
	file = Editor.slider.fileNames[current];
	expression = Editor.slider.expressions[current];
	
	// This filters empty entries.
	if (Editor.segments.length > 0 && expression != "")
	{
		if (! Editor.dataCollection) {
			inkML = Editor.getInkML();
			outString = inkML + "\n" + Editor.slider.bsts[current];

			$.post(Editor.gtannotate_server_url, {user_id: file, json_state: outString }, function() {console.log('Wrote ' + file+ ' over post server');});
		} else {
			state = Editor.save_state(true);
			$.post(Editor.gtdraw_server_url, {user_id: file, json_state: state }, function() {console.log('Wrote ' + file + ' over post server');});
		
		}

	}

	// Use formal actions to remove objects from the canvas.
	action = new DeleteSegments(Editor.segments);
	actionTwo = new DeleteSegments(Editor.selected_segments);
	action.Apply();
	actionTwo.Apply();
	Editor.selected_segments.length = 0;
	Editor.segments.length = 0;
	
	// Clear undo/redo. Prevents being able to 'write' earlier expressions
	// and other confusing behavior.
	Editor.undo_stack.length = 0;
	Editor.undo_stack = new Array();
	Editor.redo_stack.length = 0;
	Editor.redo_stack = new Array();
}

/*
 * Changes the selectors below the slider.  Called whenever a slide changes.
 */
Slider.prototype.slideChange = function(args) {
	$('.selectors .item').removeClass('selected');
	$('.selectors .item:eq(' + (args.currentSlideNumber - 1) + ')').addClass('selected');
}

/*
 * Adds a slide to the slider, updating the list of expressions and the position indicator.
 */
Slider.prototype.addSlide = function() {
	//console.log('addSlide()');
	this.expressions.push('');
	this.fileNames.push('');
	this.states.push("{\"segments\":[],\"recognition_results\":[]}");
	this.bsts.push('');

	var slidePosition = $(".slider")[0].childElementCount;
	var slideHTML = "<div class = 'item'></div>";
	$(".selectors").append("<div class = 'item'></div>"); // Appends a selector
	this.slider_div.iosSlider('addSlide', slideHTML, slidePosition+1); //Plus one because the Slider's  addSlide method in the javascript subtracts one from the position passed in.
	MathJax.Hub.Queue(["Typeset",MathJax.Hub]); // Calls MathJax to render the new slide
	this.mathJaxUpdate(); //Makes each slide fit in the slider's view screen

	this.slider_div.iosSlider('goToSlide', slidePosition + 1);
}

/*
 * Updates the TeX for the current slide and rerenders it.
 */
Slider.prototype.updateSlide = function(fileName, tex) {
	var curSlide = this.slider_div.data('args').currentSlideNumber - 1;
	$(this.slider_div.find('.slider>.item')[curSlide]).text('\\[' + tex + '\\]');
	this.expressions[curSlide] = tex;

	if (fileName != null)
		this.fileNames[curSlide] = fileName;
	MathJax.Hub.Queue(["Typeset",MathJax.Hub]); // Calls MathJax to render the new slide
	this.mathJaxUpdate();
}

Slider.prototype.updateBST = function(bsts) {
	var curSlide = this.slider_div.data('args').currentSlideNumber - 1;
	this.bsts[curSlide] = bsts;
}



/*
 * Adds a slide to the slider, updating the list of expressions and the position indicator.
 */
Slider.prototype.removeSlide = function() {
	var currentSlideNumber = this.slider_div.data('args').currentSlideNumber;
	var numberOfSlides =  this.slider_div.data('args').data.numberOfSlides;
	if (numberOfSlides == 1) {
		// If only one slide, just empty it.
		this.updateSlide('','');
		this.fileNames = [''];
		this.bsts = [''];
		this.states = [''];
	}
	else {
		this.expressions.splice(currentSlideNumber - 1, 1);
		this.fileNames.splice(currentSlideNumber - 1, 1);
		this.states.splice(currentSlideNumber - 1, 1);
		this.bsts.splice(currentSlideNumber - 1, 1);

		$(".selectors :last-child").remove();
		this.slider_div.iosSlider('removeSlide', currentSlideNumber);
		this.slideChange({currentSlideNumber: this.slider_div.data('args').currentSlideNumber});
	}
}

/**
 * Renders the current slide and then called resizeToFit when rendered.
 */
Slider.prototype.mathJaxUpdate = function() {
	var currentSlideNumber = this.slider_div.data('args').currentSlideNumber - 1;
	var NumberofSlides =  $('.iosSlider').data('args').data.numberOfSlides;
	var currentSlide  = $('.slider').children()[currentSlideNumber];
	MathJax.Hub.Queue(["Rerender",MathJax.Hub, currentSlide], [$.proxy(this.resizeToFit, this)]);
}

/**
 * Makes the current slide 5% smaller, rerenders, which then calls this function again.
 */
Slider.prototype.resizeToFit = function() {
	var currentSlideNumber = this.slider_div.data('args').currentSlideNumber - 1;
	var NumberofSlides =  $('.iosSlider').data('args').data.numberOfSlides;
	var currentSlide  = $('.slider').children()[currentSlideNumber];
	try{
		var slideWidth = currentSlide.getElementsByClassName('MathJax_Display')[0].scrollWidth;
	}catch(e){
		return;
	}
	var slideHeight = currentSlide.getElementsByClassName('MathJax_Display')[0].scrollHeight;
	var containerWidth =  $('.slider').width();
	var containerHeight =  $('.slider').height();
	var percent = currentSlide.style.fontSize ? parseFloat(currentSlide.style.fontSize) : 100.0;
	if (percent > 50 && (slideWidth > containerWidth || slideHeight > containerHeight)){ //font size and width
		var percent = percent - 5;
		currentSlide.style.fontSize =  percent + "%";
		MathJax.Hub.Queue(["Rerender",MathJax.Hub, currentSlide], [$.proxy(this.resizeToFit, this)]);
	}

}
