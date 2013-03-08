/*
This object is the parent of all modes for the editor.
It defines the interface that an editor mode should have.
*/

function EditorMode(){
    if(Modernizr.touch)
        this.onDown = EditorMode.onTouchStart;
    else
        this.onDown = EditorMode.onMouseDown;
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
    Editor.lastEvent = e;
}

// Code to run for all modes with a mouse 
EditorMode.onMouseDown = function(e){
    this.allEvents(e);

    // Possibly find some way to further separate touch/click logic
    if(e.button == 0){
        Editor.mouse_position_prev = Editor.mouse_position;
        Editor.mouse_position = new Vector2(e.pageX - Editor.div_position[0], e.pageY - Editor.div_position[1]);
    }
}

// Code to run for all modes with a touch pad
EditorMode.onTouchStart = function(e){
    this.allEvents(e);
    var first = event.changedTouches[0];
    Editor.mouse_position_prev = Editor.mouse_position;
    Editor.mouse_position = new Vector2(first.pageX - Editor.div_position[0], first.pageY - Editor.div_position[1]);
}

EditorMode.prototype.onMove = function(e){
    this.allEvents(e);
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

/*
    This function take an event handler and returns a new one which
    will ignore multiple touches.
*/
EditorMode.mkIgnoreMultipleTouches = function(wrap_fn){
    return function(e){
        // originalEvent is because JQuery only copies some event properties
        if(e.originalEvent.touches.length > 1)
            return;

        wrap_fn(e);
    };
}
