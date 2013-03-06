/*
This object is the parent of all modes for the editor.
It defines the interface that an editor mode should have.
*/

function EditorMode(){}

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

EditorMode.prototype.onDown = function(e){
    alert("onDown not implemented!");
}

EditorMode.prototype.onMove = function(e){
    alert("onMove not implemented!");
}

EditorMode.prototype.onUp = function(e){
    alert("onUp not implemented!");
}

EditorMode.prototype.onDoubleClick = function(e){
    alert("onDoubleClick not implemented!");
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
