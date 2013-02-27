/*
This file contains events and information specific to stroke selection.
*/

function StrokeSelectMode(){}
// For now this hierarchy doesn't matter, as we don't make instances
// of the SelectionMode. This will change.
StrokeSelectMode.prototype = new SelectionMode();
