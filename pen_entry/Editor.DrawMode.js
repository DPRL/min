/*
This file contains event handlers for use in the drawing
mode of Min.
*/

function DrawMode(){}
// For now this hierarchy doesn't matter, as we don't make instances
// of the SelectionMode. This will change.
DrawMode.prototype = new EditorMode();


