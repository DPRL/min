/*
This object is the parent of all modes for the editor.
It defines the interface that an editor mode should have.
*/

function EditorMode(){}

EditorMode.prototype.init_mode = function(){
    alert("init_mode not implemented!");
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

EditorMode.prototype.close_mode = function(){
    alert("close_mode not implemented!");
}

