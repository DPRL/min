/*
This file contains events and information specific to rectangle selection.
*/

function RectSelectMode(){}
// For now this hierarchy doesn't matter, as we don't make instances
// of the SelectionMode. This will change.
RectSelectMode.prototype = new SelectionMode();
