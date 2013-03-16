/*
This file contains event handlers for use in the drawing
mode of Min.
*/

// For now this hierarchy doesn't matter, as we don't make instances
// of the SelectionMode. This will change.
DrawMode.prototype = new EditorMode();

function DrawMode(){
    // Call the super constructor
    EditorMode.call(this);
   
    // Make 'this' refer to this DrawMode object in 
    // the event handler.
    var onDown = $.proxy(DrawMode.onDownBase, this);

    // Check for touch capability, if it exists, block multiple touches
    // TODO: Find out if we need to check for both mouse and touches
    if(Modernizr.touch)
        this.onDown = EditorMode.mkIgnoreMultipleTouches(onDown);
    else
        this.onDown = onDown;

    this.onUp = $.proxy(DrawMode.onUpBase, this);
    this.onMove = $.proxy(DrawMode.onMoveBase, this);
    this.onKeyPress = $.proxy(DrawMode.onKeyPress, this);
    this.onDoubleClick = $.proxy(DrawMode.onDoubleClick, this);
    
    // An example of how to call a super method
    // DrawMode.prototype.onDown.call(this, e);
}

DrawMode.prototype.init_mode = function(){  
    RenderManager.editColorOCRbbs();
    Editor.selectPenTool();
    $("#equation_canvas").css("cursor", "default");

    /* The 'this' variable in an event handler points to the element
       that the event fired on, not the DrawMode object. Have
       JQuery pass a reference to this object to event handlers.

       Should I have just used something like EditorMode.onDown
       instead of attaching the function to the prototype?
     */
    $(Editor.canvas_div).on('mousedown touchstart',  this.onDown);
    $(Editor.canvas_div).on('mouseup touchend',  this.onUp);
    $(Editor.canvas_div).on('dblclick', this.onDoubleClick);
    $(document).on('keypress', this.onKeyPress);

}

DrawMode.prototype.close_mode = function(){
   $(Editor.canvas_div).off('mousedown touchstart', this.onDown); 
   $(Editor.canvas_div).off('mouseup touchend', this.onUp); 
   $(Editor.canvas_div).off('doubleclick', this.onDoubleClick);
   $(document).off('keypress', this.onKeyPress);
}

//var saveMouseState = function(){
//}
//
//DrawMode.prototype.getPosAndState = 

DrawMode.prototype.stopTextInput = function(e){
    Editor.current_text.finishEntry();
    if(Editor.current_action.toString() == "EditText")
        Editor.current_action.set_current_text(Editor.current_text.text);
    else if(Editor.current_action.toString() == "AddSegments")
        Editor.current_action.buildSegmentXML();                


    // build a new stroke object and save reference so we can add new points
    // Editor.current_stroke = new PenStroke(Editor.mouse_position.x,Editor.mouse_position.y, 6);
    // Editor.add_action(new AddSegments(new Array(Editor.current_stroke)));
    // Editor.add_segment(Editor.current_stroke);            
        
    Editor.state = EditorState.MiddleOfStroke;

    RenderManager.render();

}

DrawMode.onDownBase = function(e){
    DrawMode.prototype.onDown.call(this, e);
    // build a new stroke object and save reference so we can add new points
    Editor.current_stroke = new PenStroke(Editor.mouse_position.x,Editor.mouse_position.y, 6);
    Editor.add_action(new AddSegments(new Array(Editor.current_stroke)));
    Editor.add_segment(Editor.current_stroke);            
        
    Editor.state = EditorState.MiddleOfStroke;

    RenderManager.render();
    // Bind this as long as the mouse is down
    $(Editor.canvas_div).on('mousemove touchmove', this.onMove);
}

DrawMode.onUpBase = function(e){
    DrawMode.prototype.onUp.call(this, e);
    var set_id_changes = [];
    Editor.state = EditorState.ReadyToStroke;
    if(Editor.current_stroke.finish_stroke()) {
        set_id_changes = Editor.current_stroke.test_collisions();
        RecognitionManager.enqueueSegment(Editor.current_stroke);
    } else {
        // This make sure that we remove the exact element of the array
        Editor.segments.splice(Editor.segments.indexOf(Editor.current_stroke), 1);
    }

    Editor.current_stroke = null;
    Editor.current_action.set_id_changes = set_id_changes;
    Editor.current_action.buildSegmentXML();

    // Unbind the move action
    $(Editor.canvas_div).off('mousemove touchmove', this.onMove);
}

DrawMode.onMoveBase = function(e){
    DrawMode.prototype.onMove.call(this, e);
    // add a new point to this pen stroke
    // pen automatically draws stroke when point added
    Editor.current_stroke.add_point(Editor.mouse_position);
    console.log("Mouse moving!");
}

DrawMode.onDoubleClick = function(e){
    // TODO: we have to re-detect the selection for double click vs. touch-and-hold.
    // TODO: I think there should be a better way to do this than having to check points manually 
    //       such as using the div of the bounding box
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

    // Set up this event to fire and stop text input if the mouse goes down
    $(Editor.canvas_div).one('mousedown touchstart', this.stopTextInput);

}
