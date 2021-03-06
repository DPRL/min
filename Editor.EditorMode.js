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
