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

DrawMode.onMouseDown = function(e){
    // build a new stroke object and save reference so we can add new points
    Editor.current_stroke = new PenStroke(Editor.mouse_position.x,Editor.mouse_position.y, 6);
    Editor.add_action(new AddSegments(new Array(Editor.current_stroke)));
    Editor.add_segment(Editor.current_stroke);            
        
    Editor.state = EditorState.MiddleOfStroke;
    // }

        RenderManager.render();

}

DrawMode.onMouseUp = function(e){
    var set_id_changes = [];
    Editor.state = EditorState.ReadyToStroke;
    if(Editor.current_stroke.finish_stroke()) {
        set_id_changes = Editor.current_stroke.test_collisions();
        RecognitionManager.enqueueSegment(Editor.current_stroke);
    } else {
        Editor.segments.pop();
    }

    Editor.current_stroke = null;
    Editor.current_action.set_id_changes = set_id_changes;
    Editor.current_action.buildSegmentXML();
}

DrawMode.onMouseMove = function(e){
    // add a new point to this pen stroke
    // pen automatically draws stroke when point added
    Editor.current_stroke.add_point(Editor.mouse_position);
}

DrawMode.onDoubleClick = function(e){
    // DEBUG: we have to re-detect the selection for double click vs. touch-and-hold.
    if (Editor.touchAndHoldFlag == TouchAndHoldState.NoTouchAndHold) {
        var click_result = CollisionManager.get_point_collides_bb(Editor.mouse_position);
        if(click_result.length == 0)
            return;

        var segment = click_result.pop();
        for(var k = 0; k < Editor.segments.length; k++)
            if(Editor.segments[k].set_id == segment.set_id)
                Editor.add_selected_segment(Editor.segments[k]);
    }

    RenderManager.colorOCRbbs(false);
    RenderManager.bounding_box.style.visibility = "visible";
    Editor.state = EditorState.SegmentsSelected;
        Editor.relabel(EditorState.ReadyToStroke);

}

DrawMode.onKeyPress = function(e){
    // TODO: See if there's a better way to do this that would eliminate 
    // reliance on an Editor state. Local flag?
    
    if(Editor.state == EditorState.MiddleOfText){
        textBox = document.getElementById("tex_result");
        if (document.querySelector(":focus") != textBox &&
                Editor.current_text != null) {
            Editor.current_text.addCharacter(String.fromCharCode(e.which));
        }
        return;
    }

    textBox = document.getElementById("tex_result");
    if (document.querySelector(":focus") == textBox) {
        return;
    }

    Editor.typeTool();
    var clicked_points = CollisionManager.get_point_collides(Editor.mouse_position);

    var s = new SymbolSegment(Editor.mouse_position);
    Editor.current_text = s;
    Editor.current_text.addCharacter(String.fromCharCode(e.which));

    Editor.state = EditorState.MiddleOfText;

}
