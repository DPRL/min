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

EditorMode.prototype.onMouseDown = function(e){
    alert("onMouseDown not implemented!");
}

EditorMode.prototype.onMouseMove = function(e){
    alert("onMouseMove not implemented!");
}

EditorMode.prototype.onMouseUp = function(e){
    alert("onMouseUp not implemented!");
}

EditorMode.prototype.onDoubleClick = function(e){
    alert("onDoubleClick not implemented!");
}

