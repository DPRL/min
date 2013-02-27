/*
This file contains event handlers for use in the drawing
mode of Min.
*/

function DrawMode(){}
// For now this hierarchy doesn't matter, as we don't make instances
// of the SelectionMode. This will change.
DrawMode.prototype = new EditorMode();

DrawMode.stopTextInput = function(e){
    Editor.current_text.finishEntry();
    if(Editor.current_action.toString() == "EditText")
        Editor.current_action.set_current_text(Editor.current_text.text);
    else if(Editor.current_action.toString() == "AddSegments")
        Editor.current_action.buildSegmentXML();                

    // Modification: reset to drawing.
    // But only switch to draw mode if we click on the canvas.
    var canvasDims = document.getElementById('equation_canvas').getBoundingClientRect();
    var toolbarDims = document.getElementById('toolbar').getBoundingClientRect();

    if (! (e.pageY > toolbarDims.bottom && e.pageY < canvasDims.bottom) &&
        (e.pageX > 0 && e.pageX < canvasDims.right )) {
        return;
    } else {
        // build a new stroke object and save reference so we can add new points
        Editor.current_stroke = new PenStroke(Editor.mouse_position.x,Editor.mouse_position.y, 6);
        Editor.add_action(new AddSegments(new Array(Editor.current_stroke)));
        Editor.add_segment(Editor.current_stroke);            
        
        Editor.state = EditorState.MiddleOfStroke;
    }
    RenderManager.render();

}
