var EditorState = 
    {
        // select tool states
        "ReadyToStrokeSelect" : 0,
        "StrokeSelecting" : 1,
        "ReadyToRectangleSelect" : 2,
        "RectangleSelecting" : 3,
        
        // pen states
        "ReadyToStroke" : 4, 
        "MiddleOfStroke" : 5,

        // text tool states
        "ReadyForText" : 6,
        "MiddleOfText" : 7,

        // Segment (and primitive) selection, labeling
        "SegmentsSelected" : 8,
        "MovingSegments" : 9,
        "Resizing" : 10,
        "Relabeling" : 11,
        "PinchResizing": 12,

        // Editing text box.
        "InTextBox" : 13,

        // New: moving a symbol in edit mode; touch and hold state.
        "PenMovingSegments" : 14
    };

var TouchAndHoldState = {
    "NoTouchAndHold": 0,
    "MouseDownAndStationary": 1,
    "FingerDownAndStationary": 2 // same as the above state, but happening on a touchscreen
};

Editor.lastEvent = null;
Editor.touchAndHoldFlag = TouchAndHoldState.NoTouchAndHold;
Editor.touchAndHoldTimeout = 800;

Editor.setup_events = function()
{
    var button_index = 0; // Sets default initial state (pen/touch entry)
    Editor.timeStamp = null;
    Editor.prevTimeStamp = null;

    window.addEventListener("resize", Editor.fit_to_screen, true);
    window.addEventListener("orientationchange", Editor.fit_to_screen, false);
    window.addEventListener("mousemove", Editor.onMouseMove, true);
    window.addEventListener("touchmove", Editor.onMouseMove, true);

    $(document).keypress(Editor.onKeyPress);
    $(document).keydown(Editor.mapCanvasBackspace);
    Editor.toolbar_div.addEventListener("mouseup", Editor.onMouseUp, true);

    // Canvas bindings.
    Editor.canvas_div.addEventListener("mousedown", Editor.onMouseDown, true);
    Editor.canvas_div.addEventListener("mouseup", Editor.onMouseUp, true);
    Editor.canvas_div.addEventListener("dblclick", Editor.onDoubleClick, true);

    // Touch events for tablet interfaces
    Editor.canvas_div.addEventListener("touchstart", Editor.onMouseDown, true);
    Editor.canvas_div.addEventListener("touchend", Editor.onMouseUp, true);
    
    // Prevent problem behavior from the iPad canvas.
    Editor.canvas_div.setAttribute("ontouchmove", "event.preventDefault();");
    //Editor.canvas_div.setAttribute("ontouchstart", "event.preventDefault();");    

    //document.getElementById("text").addEventListener("click", Editor.typeTool, true);
    // Listeners for buttons.
    document.getElementById("pen").addEventListener("click", RenderManager.editColorOCRbbs, true);
    document.getElementById("pen").addEventListener("click", Editor.selectPenTool, true);
    document.getElementById("pen").addEventListener("click", Editor.setCursor, true);

    document.getElementById("stroke_select").addEventListener("click", RenderManager.regColorOCRbbs, true);
    document.getElementById("stroke_select").addEventListener("click", Editor.strokeSelectionTool, true);
    document.getElementById("stroke_select").addEventListener("click", Editor.setCursor, true);

    document.getElementById("rectangle_select").addEventListener("click", RenderManager.regColorOCRbbs, true);
    document.getElementById("rectangle_select").addEventListener("click", Editor.rectangleSelectionTool, true);
    document.getElementById("rectangle_select").addEventListener("click", Editor.setCursor, true);

    document.getElementById("undo").addEventListener("click", Editor.undo, true);
    document.getElementById("redo").addEventListener("click", Editor.redo, true);
    document.getElementById("dprl").addEventListener("click", Editor.goDPRL, true);
    document.getElementById("align").addEventListener("click",Editor.align, true);

    // add an equation image to the canvas if this is supported
    if(window.FileReader){
        var file_input = document.createElement("input");
        var button_div = document.getElementById("upload_image");
        
        file_input.type = "file";
        file_input.id = "upload_image_input";
        file_input.style.display = "none";
        file_input.addEventListener("change", Editor.onImageLoad, true);

        button_div.appendChild(file_input);
        
        // Pass a click on the button div to the invisible file input
        button_div.addEventListener("mousedown", function(e){
            var file_input = document.getElementById("upload_image_input");        
            file_input.click();
        }, true);

    }
    
    // TYPING/TEXT ENTRY: line below will disable text entry for the iPad.
    //if(navigator.userAgent.match(/iPad/i) == null) document.getElementById("text").addEventListener("click", Editor.typeTool, true);

    // Adds highlighting on pressing buttons and pinch-resize functionality
    if(Editor.using_ipad)
    {
        // Image upload
        document.getElementById("upload_image").addEventListener("touchstart", 
        function(event)
        {
            Editor.button_states[Buttons.UploadImage].setTouched(true);
        }, true);
        document.getElementById("upload_image").addEventListener("touchend", 
        function(event)
        {
            Editor.button_states[Buttons.UploadImage].setTouched(false);
        }, true);
        
        // undo
        document.getElementById("undo").addEventListener("touchstart", 
        function(event)
        {
            Editor.button_states[Buttons.Undo].setTouched(true);
        }, true);
        document.getElementById("undo").addEventListener("touchend", 
        function(event)
        {
            Editor.button_states[Buttons.Undo].setTouched(false);
        }, true);
        
        // redo
        document.getElementById("redo").addEventListener("touchstart",
        function(event)
        {
            Editor.button_states[Buttons.Redo].setTouched(true);
        }, true);
        document.getElementById("redo").addEventListener("touchend",
        function(event)
        {
            Editor.button_states[Buttons.Redo].setTouched(false);
        }, true);    

        // align/append
        document.getElementById("align").addEventListener("touchstart",
        function(event)
        {
            Editor.button_states[Buttons.Align].setTouched(true);
        }, true);
        document.getElementById("align").addEventListener("touchend",
        function(event)
        {
            Editor.button_states[Buttons.Align].setTouched(false);
        }, true);    

        // Pinch to resize events
        var bb = document.getElementById("bounding_box");
        console.log("applying hammer events");
        bb.hammer = new Hammer(bb, {
            transform: true,
            scale_threshold: .1,
            drag_min_distance: 0,
            // These events need to be suppressed because sometimes they would fire during
            // a transform and prevent ontransformend from being run, leaving the editor in a bad state.
            drag: false,
            swipe: false
        });

        bb.hammer.ontransformstart = Editor.onPinchStart;
        bb.hammer.ontransform = Editor.onPinch;
        bb.hammer.ontransformend = Editor.onPinchEnd;
    }
    
    // Select the pen tool
    Editor.button_states[Buttons.Pen].enabled = true;

}

Editor.setCursor = function ()
{
    var canvas = document.getElementById("equation_canvas");

    switch (Editor.state) 
    {
        case EditorState.StrokeSelecting:
        case EditorState.ReadyToStrokeSelect:
            canvas.style.cursor = "crosshair";
            break;
        default:
            canvas.style.cursor = "default";
            break;
    }
}


Editor.setStrokeView = function()
{
    var show = document.forms[0].strokes.checked;
    for (var i=0; i < Editor.segments.length; i++) {
        var nextSegment = Editor.segments[i];
        if (nextSegment.type_id == PenStroke.type_id) {
            if (!show)
                nextSegment.group.setAttribute("style", "fill:none;stroke-linecap:round;visibility:hidden;");
            else
                nextSegment.group.setAttribute("style", "fill:none;stroke-linecap:round;visibility:visible;");
        }
    }
}


Editor.fit_to_screen = function(event)
{
    var root_div = document.getElementById("equation_editor_root");
    root_div.style.width = window.innerWidth + "px";
    root_div.style.height = window.innerHeight + "px";
    
    Editor.canvas_width = Editor.canvas_div.offsetWidth;
    Editor.canvas_height = Editor.canvas_div.offsetHeight;
    
    Editor.div_position = findPosition(Editor.canvas_div);
    
    window.scroll(0,0);
}


Editor.onResize = function(e)
{
    // just update the position of our main div to properly handle mouse events
    Editor.div_position = findPosition(Editor.canvas_div);
}

//--------------------------------------------------
// 
// User Input Events
//   - touchAndHold (called using timeout)
//   - onDoubleClick (called on touchAndHold as well)
//
//   - onMouseDown
//   - onMouseMove
//   - onMouseUp
//   - onKeyPress

//   Hammer events
//   - onPinchStart 
//   - onPinch
//   - onPinchEnd
//-------------------------------------------------- 
Editor.touchAndHold = function(e)
{
    // Only execute if we haven't moved, and haven't raised our finger/mouse.
    if (Editor.lastEvent == e && Editor.lastEvent != null) {
        Editor.touchAndHoldFlag = TouchAndHoldState.MouseDownAndStationary;
        console.log("Touch and hold");
        Editor.onDoubleClick(e);
    }
}


Editor.onDoubleClick = function(e)
{
    switch (Editor.state)
    {
        case EditorState.PenMovingSegments:
        case EditorState.ReadyToStroke:
            // DEBUG: we have to re-detect the selection for double click vs. touch-and-hold.
            if (Editor.touchAndHoldFlag == TouchAndHoldState.NoTouchAndHold) {
                var click_result = CollisionManager.get_point_collides_bb(Editor.mouse_position);
                if(click_result.length == 0)
                    break;

                var segment = click_result.pop();
                for(var k = 0; k < Editor.segments.length; k++)
                    if(Editor.segments[k].set_id == segment.set_id)
                        Editor.add_selected_segment(Editor.segments[k]);
            }

            RenderManager.colorOCRbbs(false);
            RenderManager.bounding_box.style.visibility = "visible";
            Editor.state = EditorState.SegmentsSelected;
            Editor.relabel(EditorState.ReadyToStroke);
            break;

        case EditorState.MovingSegments:
        case EditorState.SegmentsSelected:
            // RLAZ: allow relabeling and resegmenting using double tap.
            // Check for identical segment identifiers (relabel in that case)
            var singleObject = 0;
            if (Editor.selected_segments.length > 0) {
                var allSame = 1;
                var segmentId = Editor.selected_segments[0].set_id;

                // All selected objects belong to the same segment (id)
                for(var i = 1; i < Editor.selected_segments.length; i++) {
                    if (Editor.selected_segments[i].set_id != segmentId ) {
                        allSame = 0;
                    }
                }
                // All objects in the segmented have been selected.
                if (allSame > 0) {
                    var totalInSegment = 0;
                    for(var i = 0; i < Editor.segments.length; i++)
                    {
                        if (Editor.segments[i].set_id == segmentId) {
                            totalInSegment++;
                        }
                    }
                    if(totalInSegment == Editor.selected_segments.length) {
                        singleObject = 1;
                    }
                }
            }

            // Depending on selection, relabel or re-segment.
        var prev_state;
        if(Editor.selection_method == "Stroke")
            prev_state = EditorState.StrokeSelecting;
        else
            prev_state = EditorState.RectangleSelecting;
        
            Editor.state = EditorState.SegmentsSelected;
            if (singleObject > 0) {
                Editor.relabel(prev_state);
            } else {
                Editor.groupTool();
            }
            break;
    }
}

Editor.onMouseDown = function(e)
{
    console.log(e.type);
    Editor.lastEvent = e;
    if (Editor.touchAndHoldFlag == TouchAndHoldState.MouseDownAndStationary && Editor.using_ipad) {
        Editor.touchAndHoldFlag = TouchAndHoldState.FingerDownAndStationary;
        return;
    }
    else {
        Editor.touchAndHoldFlag = TouchAndHoldState.NoTouchAndHold; 
    }

    // support for both computer mouse and tablet devices
    // gets the mouse position and states
    if(e.type == "mousedown" && ! Editor.using_ipad)
    {
        // we only care about left click
        if(e.button == 0)
        {
            Editor.mouse_position_prev = Editor.mouse_position;
            Editor.mouse_position = new Vector2(e.pageX - Editor.div_position[0], e.pageY - Editor.div_position[1]);
        }
        else return;
    }    
    else if(e.type == "touchstart")
    {
        var first = event.changedTouches[0];
        Editor.mouse_position_prev = Editor.mouse_position;
        Editor.mouse_position = new Vector2(first.pageX - Editor.div_position[0], first.pageY - Editor.div_position[1]);
    }
    else 
        return;

    Editor.mouse1_down = true;

    switch(Editor.state)
    {
        case EditorState.ReadyToStrokeSelect:
            // get the segments that are under the mouse click
            var click_result = CollisionManager.get_point_collides(Editor.mouse_position);
            if(click_result.length > 0)
            {
                // nothing selected at the moment, add all below mouse click to selected
                // add the last guy in the list (probably most recently added) to selected set
                var segment = click_result.pop();
                for(var k = 0; k < Editor.segments.length; k++)
                    if(Editor.segments[k].set_id == segment.set_id)
                        Editor.add_selected_segment(Editor.segments[k]);
        
                        
                Editor.add_action(new TransformSegments(Editor.selected_segments));
                Editor.state = EditorState.SegmentsSelected;

                //setTimeout(function() { Editor.touchAndHold(e); }, Editor.touchAndHoldTimeout);
            } else
            {
                Editor.state = EditorState.StrokeSelecting;
                
            }
            Editor.previous_stroke_position = Editor.mouse_position.clone();
            RenderManager.render();
            break;        
        case EditorState.ReadyToRectangleSelect:
            // get the segments that are under the mouse click
            var click_result = CollisionManager.get_point_collides_bb(Editor.mouse_position);

            if(click_result.length > 0)
            {
                // nothing selected at the moment, add all below mouse click to selected
                // add the last guy in the list (probably most recently added) to selected set
                var segment = click_result.pop();
                for(var k = 0; k < Editor.segments.length; k++)
                    if(Editor.segments[k].set_id == segment.set_id)
                        Editor.add_selected_segment(Editor.segments[k]);
        
                Editor.add_action(new TransformSegments(Editor.selected_segments));
                Editor.state = EditorState.SegmentsSelected;

                setTimeout(function() { Editor.touchAndHold(e); }, Editor.touchAndHoldTimeout);
            }
            else
            {
                Editor.start_rect_selection = Editor.mouse_position.clone();
                Editor.end_rect_selection  = Editor.mouse_position.clone();
                Editor.state = EditorState.RectangleSelecting;
            }
            RenderManager.render();
            break;

        case EditorState.SegmentsSelected:
            var click_edge = Editor.selected_bb.edge_clicked(Editor.mouse_position);
            // check for resizing
            if(click_edge != -1)
            {
                Editor.add_action(new TransformSegments(Editor.selected_segments));
                Editor.state = EditorState.Resizing;
                Editor.grabbed_edge = click_edge;
                Editor.resize_offset = new Vector2(0,0);
                Editor.original_bb = Editor.selected_bb.clone();
            }
            else
            {
                // check translate
                if(Editor.selected_bb.point_collides(Editor.mouse_position))
                {
                    Editor.add_action(new TransformSegments(Editor.selected_segments));
                    Editor.state = EditorState.MovingSegments;

                    setTimeout(function() { Editor.touchAndHold(e); }, Editor.touchAndHoldTimeout);
                }
                // reselect
                else
                {
                    Editor.clear_selected_segments();
                    var clicked_points = CollisionManager.get_point_collides(Editor.mouse_position);
                    // clicking on a new segment
                    if(clicked_points.length > 0)
                    {
                        for(var k = 0; k <clicked_points.length; k++)
                        {
                            var segment = clicked_points[k];
                            Editor.add_selected_segment(segment);
                        }
                        Editor.state = EditorState.SegmentsSelected;


                        setTimeout(function() { Editor.touchAndHold(e); }, Editor.touchAndHoldTimeout);
                    }
                    // selecting none
                    else
                    {
                        if(Editor.selection_method == "Stroke")
                        {
                            Editor.previous_stroke_position = Editor.mouse_position.clone();
                            Editor.state = EditorState.StrokeSelecting;
                        }
                        else
                        {
                            Editor.start_rect_selection = Editor.mouse_position.clone();
                            Editor.end_rect_selection  = Editor.mouse_position.clone();
                            Editor.state = EditorState.RectangleSelecting;    
                        }
                    }
                    RenderManager.render();
                }
            }
            
            break;

        case EditorState.MiddleOfText:
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
                break; 
            } else {
                // If we're on the canvas, switch to pen mode.
                //Editor.selectPenTool();
                // build a new stroke object and save reference so we can add new points
                Editor.current_stroke = new PenStroke(Editor.mouse_position.x,Editor.mouse_position.y, 6);
                Editor.add_action(new AddSegments(new Array(Editor.current_stroke)));
                Editor.add_segment(Editor.current_stroke);            
            
                Editor.state = EditorState.MiddleOfStroke;
            }
            break;

        case EditorState.ReadyForText:
            Editor.current_text = null;
            var clicked_points = CollisionManager.get_point_collides(Editor.mouse_position);
            for(var k = 0; k < clicked_points.length; k++)
            {
                if(clicked_points[k].type_id == SymbolSegment.type_id)
                {
                    Editor.current_text = clicked_points[k];
                    break;
                }
            }
            
            if(Editor.current_text == null)
            {
                var s = new SymbolSegment(Editor.mouse_position);
                Editor.current_text = s;
            } else {
                Editor.add_action(new EditText(Editor.current_text));
            }
            Editor.state = EditorState.MiddleOfText;
            break;


        case EditorState.ReadyToStroke:
            // RLAZ: allow symbols to be moved (but not multiply selected or resized)
            // in drawing mode.
            var click_result = CollisionManager.get_point_collides_bb(Editor.mouse_position);
            if(click_result.length > 0)
            {
                var segment = click_result.pop();
                for(var k = 0; k < Editor.segments.length; k++)
                    if(Editor.segments[k].set_id == segment.set_id)
                        Editor.add_selected_segment(Editor.segments[k]);
        
                Editor.add_action(new TransformSegments(Editor.selected_segments));
                Editor.state = EditorState.PenMovingSegments; 

                // DEBUG: callback function needs to be defined in an abstract function;
                // apparently the first argument is evaluated.
                setTimeout(function() { Editor.touchAndHold(e); }, Editor.touchAndHoldTimeout);
            } else
            {
                // build a new stroke object and save reference so we can add new points
                Editor.current_stroke = new PenStroke(Editor.mouse_position.x,Editor.mouse_position.y, 6);
                Editor.add_action(new AddSegments(new Array(Editor.current_stroke)));
                Editor.add_segment(Editor.current_stroke);            
                
                Editor.state = EditorState.MiddleOfStroke;
            }

            RenderManager.render();
            break;

    }
}

Editor.onMouseMove = function(e)
{    
    Editor.lastEvent = e;

    if (Editor.touchAndHoldFlag == TouchAndHoldState.MouseDownAndStationary)
        return;

    // support for both IPad and Mouse
    if(e.type == "mousemove")
    {
        Editor.mouse_position_prev = Editor.mouse_position;
        Editor.mouse_position = new Vector2(e.pageX - Editor.div_position[0], e.pageY - Editor.div_position[1]);
    }    
    else if(e.type == "touchmove")
    {
        var first = event.changedTouches[0];
        Editor.mouse_position_prev = Editor.mouse_position;
        Editor.mouse_position = new Vector2(first.pageX - Editor.div_position[0], first.pageY - Editor.div_position[1]);
    }
    else 
        return;
    
    var mouse_delta = Vector2.Subtract(Editor.mouse_position, Editor.mouse_position_prev);
    
    if(Editor.mouse1_down == true)
    {
        switch(Editor.state)
        {
            case EditorState.ReadyToStrokeSelect:
                // we don't care here
                break;
            case EditorState.StrokeSelecting:
                // see what we stroked through between move events
                var stroke_result = CollisionManager.get_line_collides(Editor.mouse_position_prev, Editor.mouse_position);
                // for each segment in result add to selected segments set (if they aren't there already)
                if(stroke_result.length > 0)
                {
                    var initial_length = Editor.selected_segments.length;
                    while(stroke_result.length > 0)
                    {
                        var segment = stroke_result.pop();
                        Editor.add_selected_segment(segment);
                    }
                }
                Editor.previous_stroke_position = Editor.mouse_position_prev.clone();
                RenderManager.render();
                break;
            case EditorState.RectangleSelecting:
                Editor.end_rect_selection.Add(mouse_delta);
                // get list of segments colliding with selection rectangle
                var rect_selected = CollisionManager.get_rectangle_collides(Editor.start_rect_selection, Editor.end_rect_selection);
                Editor.clear_selected_segments();
                // add segment set to seleced list
                for(var k = 0; k < rect_selected.length; k++)
                {
                    var segment_set = Editor.get_segment_by_id(rect_selected[k].set_id);
                    for(var j = 0; j < segment_set.length; j++)
                        Editor.add_selected_segment(segment_set[j]);
                }
                
                RenderManager.render();
                break;
            case EditorState.SegmentsSelected:
                Editor.state = EditorState.MovingSegments;
            case EditorState.PenMovingSegments:
            case EditorState.MovingSegments:
                var translation = Vector2.Subtract(Editor.mouse_position, Editor.mouse_position_prev);
                for(var k = 0; k < Editor.selected_segments.length; k++)
                {
                    seg = Editor.selected_segments[k];
                    if(seg.clear != undefined) {
                        seg.clear(Editor.contexts[0]);
                    }                    
                    seg.translate(translation);
                }
                Editor.selected_bb.translate(translation);

                // redraw scene
                RenderManager.render();
                break;            
            case EditorState.MiddleOfStroke:
                // add a new point to this pen stroke
                // pen automatically draws stroke when point added
                Editor.current_stroke.add_point(Editor.mouse_position);
                break;
            case EditorState.Resizing:
                var offset = Vector2.Subtract(Editor.mouse_position, Editor.mouse_position_prev);
                var bb = Editor.original_bb;
                var anchor;
            
                switch(Editor.grabbed_edge)
                {
                    // top edge
                    case 0:
                        offset.x = 0.0;
                        offset.y *= -1.0;
                        anchor = new Vector2(bb.mins.x, bb.maxs.y);
                        break;
                    // top right corner
                    case 1:
                        offset.y *= -1.0;
                        anchor = new Vector2(bb.mins.x, bb.maxs.y);
                        break;
                    // right edge
                    case 2:
                        offset.y = 0.0;
                        anchor = bb.mins;
                        break;
                    // bottom right corner
                    case 3:
                        anchor = bb.mins;
                        break;
                    // bottom edge
                    case 4:
                        anchor = new Vector2(bb.maxs.x, bb.mins.y);
                        offset.x = 0.0;
                        break;
                    // bottom left corner
                    case 5:
                        anchor = new Vector2(bb.maxs.x, bb.mins.y);
                        offset.x *= -1.0;
                        break;
                    // left edge
                    case 6:
                        anchor = bb.maxs
                        offset.x *= -1.0;
                        offset.y = 0.0;
                        break;
                    // top left corner
                    case 7:
                        offset.x *= -1.0;
                        offset.y *= -1.0;
                        anchor = bb.maxs
                        break; 
                }
                Editor.resize_offset.Add(offset);
                var bb_size = Vector2.Subtract(bb.maxs, bb.mins);
            
                var scale = new Vector2((Editor.resize_offset.x / bb_size.x) + 1.0, (Editor.resize_offset.y / bb_size.y) + 1.0);
                
                if((isNaN(scale.x) || isNaN(scale.y)) == false && (scale.x == 0.0 || scale.y == 0) == false)
                {
                    for(var k = 0; k < Editor.selected_segments.length; k++)
                        Editor.selected_segments[k].resize(anchor, scale);
                    Editor.update_selected_bb();
                    RenderManager.render();
                }
                break;
            
        }
    }
}

Editor.onMouseUp = function(e)
{
    Editor.lastEvent = e;

    if(e.button == 0 && !Editor.using_ipad || e.type == "touchend")
    {
        Editor.mouse1_down = false;

        // For touch-and-hold: reset state and return.
        console.log("MOUSE UP - FLAG:");
        console.log(e.type);
        console.log(Editor.touchAndHoldFlag);
        if (Editor.touchAndHoldFlag == TouchAndHoldState.MouseDownAndStationary) {
            return;
        }
        
        switch(Editor.state)
        {
            case EditorState.StrokeSelecting:
                if(Editor.selected_segments.length > 0)
                    Editor.state = EditorState.SegmentsSelected;
                else
                    Editor.state = EditorState.ReadyToStrokeSelect;
                RenderManager.clear_canvas();
                break;
            case EditorState.RectangleSelecting:
                if(Editor.selected_segments.length > 0)
                    Editor.state = EditorState.SegmentsSelected;
                else
                    Editor.state = EditorState.ReadyToRectangleSelect;
                Editor.start_rect_selection = Editor.end_rect_selection = null;
                RenderManager.render();
                break;
            case EditorState.PenMovingSegments:
            case EditorState.MovingSegments:
                // RLAZ: delete strokes if cursor moves out of the window.
                var canvasDims = document.getElementById('equation_canvas').getBoundingClientRect();
                var toolbarDims = document.getElementById('toolbar').getBoundingClientRect();

                var theEvent = e;
                var offSet = 10;
                if(e.type == "touchend") {
                    theEvent = event.changedTouches[0];
                }

                // iPad: touchend occurs when finger physically leaves the screen.
                if (theEvent.pageX < offSet || theEvent.pageX > canvasDims.right - offSet ||
                        theEvent.pageY  < toolbarDims.bottom || 
                        theEvent.pageY > canvasDims.height - 2 * offSet ) {
                    console.log("HERE");
                    Editor.deleteTool();
                    Editor.selectPenTool();  // DEBUG.
                } else {
                    if (Editor.state == EditorState.MovingSegments) {
                        Editor.state = EditorState.SegmentsSelected;
                        Editor.current_action.add_new_transforms(Editor.selected_segments);
                    } else {
                        Editor.selectPenTool();
                    }
                }
                break;
            case EditorState.MiddleOfStroke:
                Editor.state = EditorState.ReadyToStroke;
                if(Editor.current_stroke.finish_stroke()) {
                    Editor.current_stroke.test_collisions();
                    RecognitionManager.enqueueSegment(Editor.current_stroke);
                } else {
                    Editor.segments.pop();
                }
                
                Editor.current_stroke = null;
                Editor.current_action.buildSegmentXML();
                break;
            case  EditorState.Resizing:
                Editor.state = EditorState.SegmentsSelected;
                for(var k = 0; k < Editor.selected_segments.length; k++)
                    Editor.selected_segments[k].freeze_transform();
                Editor.current_action.add_new_transforms(Editor.selected_segments);
                RenderManager.render();
                Editor.resize_offset = new Vector2(0,0);
                break;
        }
    }
}

Editor.mapCanvasBackspace = function(e)
{
    if(e.keyCode == 8)
    {
        // Check whether the text box has focus.
        textBox = document.getElementById("tex_result");
        if (document.querySelector(":focus") == textBox) {
            // Act as normal.
        } else {
            // If we're not in the text box, need to avoid going 'back'
            // when we press backspace in Safari and some other browsers.
            switch (Editor.state)
            {
                case EditorState.MiddleOfText:
                    e.preventDefault();
                    Editor.current_text.popCharacter();
                    break;
                default:
                    // Otherwise, delete any selections.
                    e.preventDefault();
                    Editor.deleteTool();
                    break;
            }
        }
    }

    if(e.keyCode == 46) {
        Editor.deleteTool();
    }
        
}

Editor.onKeyPress = function(e)
{
    // For touch-and-hold
    Editor.lastEvent = e;

    if (Editor.touchAndHoldFlag == TouchAndHoldState.MouseDownAndStationary)
        return;

    // RLAZ: map enter to issuing the search.
    if(e.keyCode == 13) {
        Editor.search();
        return;
    } 

    // RLAZ: skip deletes (46) and backspaces (8), handled in mapCanvasBackspace()
    if(e.keyCode == 8 || e.keyCode == 46)
        return;

    switch(Editor.state)
    {
        case EditorState.MiddleOfText:
            textBox = document.getElementById("tex_result");
            if (document.querySelector(":focus") != textBox &&
                    Editor.current_text != null) {
                Editor.current_text.addCharacter(String.fromCharCode(e.which));
            }
            break;
        
        case EditorState.ReadyToRectangleSelect:
        case EditorState.ReadyToStrokeSelect:
        case EditorState.ReadyToStroke:
            textBox = document.getElementById("tex_result");
            if (document.querySelector(":focus") == textBox) {
                break
            }

            Editor.typeTool();
            var clicked_points = CollisionManager.get_point_collides(Editor.mouse_position);
            
            var s = new SymbolSegment(Editor.mouse_position);
            Editor.current_text = s;
            Editor.current_text.addCharacter(String.fromCharCode(e.which));

            Editor.state = EditorState.MiddleOfText;
            break;

        case EditorState.SegmentsSelected:
            if ( Editor.segments.length > 0
                && ( e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39 || e.keyCode == 40 ) ) {
                
                if ( Editor.selected_segments.length == 0 ) {
                    var seg_to_add = Editor.segments[ Editor.segments.length - 1 ];
                    var seg_set_id = seg_to_add.set_id;
                    for ( var i = 0; i < Editor.segments.length; i++ ) {
                        if ( Editor.segments[ i ].set_id == seg_set_id ) Editor.add_selected_segment( Editor.segments[ i ] );
                    }
                    Editor.state = EditorState.SegmentsSelected;
                    RenderManager.render();                    
                } else {

                    var cur_seg = Editor.selected_segments[ 0 ]; // use first for location
                    var cur_seg_loc = new Vector2( ( cur_seg.translation.x + ( cur_seg.translation.x + cur_seg.size.x ) ) / 2, ( cur_seg.translation.y + ( cur_seg.translation.y + cur_seg.size.y ) ) / 2 );
                    var filter;
                    
                    switch ( e.keyCode ) {
                        case 37: // left
                            filter = function( s ) { return s.translation.x <= cur_seg.translation.x; };
                            break;
                            
                        case 38: // up
                            filter = function( s ) { return s.translation.y <= cur_seg.translation.y; };
                            break;
                            
                        case 39: // right
                            filter = function( s ) { return s.translation.x >= cur_seg.translation.x; };
                            break;
                            
                        case 40: // down
                            filter = function( s ) { return s.translation.y >= cur_seg.translation.y; };
                            break;
                            
                        default:
                            break;
                    }
                    
                    var min_dist = -1;
                    var min_dist_index = -1;
                    
                    for ( var n = 0; n < Editor.segments.length; n++ ) {
                        var seg = Editor.segments[ n ];
                        if ( seg.set_id == cur_seg.set_id || !filter( seg ) ) continue;
                        
                        var seg_loc = new Vector2(( seg.translation.x + seg.translation.x + seg.size.x ) / 2, ( seg.translation.y + seg.translation.y + seg.size.y ) / 2);
                        
                        var dist = Vector2.Distance( seg_loc, cur_seg_loc );
                        if ( min_dist == -1 || dist < min_dist ) {
                            min_dist = dist;
                            min_dist_index = n;
                        }
                    }
                
                    if ( min_dist_index == -1 ) break; // min_dist_index = Editor.segments.length - 1;
                    
                    Editor.clear_selected_segments();
                    
                    var seg_to_add = Editor.segments[ min_dist_index ];
                    var seg_set_id = seg_to_add.set_id;
                    for ( var i = 0; i < Editor.segments.length; i++ ) {
                        if ( Editor.segments[ i ].set_id == seg_set_id ) Editor.add_selected_segment( Editor.segments[ i ] );
                    }
                    
                    RenderManager.render();
                }
            } else {
                switch ( e.keyCode ) {
                    case 71: // 'g'
                        Editor.groupTool();
                        break;
                    case 76: // 'l'
                        Editor.relabel(Editor.state);
                        break;
                    case 80: // 'p'
                        Editor.selectPenTool;
                        break;
                    default:
                        //console.log( e.keyCode );
                }
            }
            break;
            
    }
}

//-----------------
// Hammer Events
// ----------------
Editor.onPinchStart = function(e){ // e is a Hammer.js event
    console.log("transform start");
    Editor.add_action(new TransformSegments(Editor.selected_segments));
    this.prev_state = Editor.state;
    Editor.state = EditorState.PinchResizing;
    
    Editor.original_bb = Editor.selected_bb.clone();
    var bb = Editor.original_bb;

    // Store the center of the bounding box as the anchor point for the resize
    var bb_size = Vector2.Subtract(bb.maxs, bb.mins);
    this.anchor = new Vector2(bb.mins.x  + bb_size.x / 2, bb.mins.y + bb_size.y / 2);
}

Editor.onPinch = function(e){ 

    for(var n = 0; n < Editor.selected_segments.length; n++){
        Editor.selected_segments[n].resize(this.anchor, new Vector2(e.scale, e.scale));
    }

    Editor.update_selected_bb();
    RenderManager.render();
}

Editor.onPinchEnd = function(e){
    // End the transform 
    for(var n = 0; n < Editor.selected_segments.length; n++){
        Editor.selected_segments[n].freeze_transform();
    }
    Editor.current_action.add_new_transforms(Editor.selected_segments);
    Editor.update_selected_bb();
    RenderManager.render();

    // Restore the previous state
    Editor.changeState(this.prev_state);
}

//--------------------------------------------------
// 
// Editing modes/states
// 
//-------------------------------------------------- 
Editor.selectPenTool = function(draw_now)
{
    Editor.clearButtonOverlays();
    
    Editor.button_states[Buttons.Pen].setSelected(true);
    Editor.clear_selected_segments();
    Editor.current_stroke = null;
    
    switch(Editor.state)
    {
        case EditorState.MiddleOfText:
            Editor.current_text.finishEntry();
            if(Editor.current_action.toString() == "EditText")
                Editor.current_action.set_current_text(Editor.current_text.text);
            else if(Editor.current_action.toString() == "AddSegments")
                Editor.current_action.buildSegmentXML();
            Editor.current_text = null;
            break;
    }

    Editor.state = EditorState.ReadyToStroke;
    RenderManager.editColorOCRbbs();
    RenderManager.render();
}

Editor.strokeSelectionTool = function()
{
    if(Editor.button_states[Buttons.Stroke].enabled == false)
        return;
    Editor.clearButtonOverlays();
    Editor.button_states[Buttons.Stroke].setSelected(true);
    
    switch(Editor.state)
    {
        case EditorState.MiddleOfText:
            Editor.current_text.finishEntry();
            if(Editor.current_action.toString() == "EditText")
                Editor.current_action.set_current_text(Editor.current_text.text);
            else if(Editor.current_action.toString() == "AddSegments")
                Editor.current_action.buildSegmentXML();                
            Editor.current_text = null;
    }
    
    if(Editor.selected_segments.length == 0)
        Editor.state = EditorState.ReadyToStrokeSelect;
    else
        Editor.state = EditorState.SegmentsSelected;

    RenderManager.regColorOCRbbs();
    RenderManager.render();
    Editor.selection_method = "Stroke";
}

Editor.rectangleSelectionTool = function()
{
    // DEBUG: was Buttons.Box -> Buttons.Rectangle
    if(Editor.button_states[Buttons.Rectangle].enabled == false)
        return;

    Editor.clearButtonOverlays();
    Editor.button_states[Buttons.Rectangle].setSelected(true);

    switch(Editor.state)
    {
        case EditorState.MiddleOfText:
            Editor.current_text.finishEntry();
            if(Editor.current_action.toString() == "EditText")
                Editor.current_action.set_current_text(Editor.current_text.text);
            else if(Editor.current_action.toString() == "AddSegments")
                Editor.current_action.buildSegmentXML();                
            Editor.current_text = null;
    }
    
    if(Editor.selected_segments.length == 0)
        Editor.state = EditorState.ReadyToRectangleSelect;
    else
        Editor.state = EditorState.SegmentsSelected;

    RenderManager.regColorOCRbbs();
    RenderManager.render();    
    Editor.selection_method = "Rectangle";
}

Editor.align = function()
{
    switch(Editor.state)
    {
        case EditorState.MiddleOfText:
            Editor.current_text.finishEntry();
            if(Editor.current_action.toString() == "EditText")
                Editor.current_action.set_current_text(Editor.current_text.text);
            else if(Editor.current_action.toString() == "AddSegments")
                Editor.current_action.buildSegmentXML();                
            Editor.current_text = null;
    }
    RenderManager.clear_canvas();


    // an array of tuples
    // recognition result, min bb, max bb, set id
    var data = new Array();

    //iterate throuogh all of the segment sets and identify each bounding box (and symbol)
    var set_segments = new Array();
    // segments are in order by set id
    Editor.segments.push(null);    // add null pointer so we can easily render last set in list
    var set_index = 0;
    for(var k = 0; k < Editor.segments.length; k++)
    {
        var seg = Editor.segments[k];
        if(set_segments.length == 0)
            set_segments.push(seg);
        else if(seg == null || seg.set_id != set_segments[0].set_id)
        {
            var mins = set_segments[0].worldMinPosition();
            var maxs = set_segments[0].worldMaxPosition();
            
            for(var j = 1; j < set_segments.length ; j++)
            {
                var seg_min = set_segments[j].worldMinPosition();
                var seg_max = set_segments[j].worldMaxPosition();
            
                if(seg_min.x < mins.x)
                    mins.x = seg_min.x;
                if(seg_min.y < mins.y)
                    mins.y = seg_min.y;
                    
                if(seg_max.x > maxs.x)
                    maxs.x = seg_max.x;
                if(seg_max.y > maxs.y)
                    maxs.y = seg_max.y;
            }
            
            var origMins = mins.clone();
            var origMaxs = maxs.clone();
            var recognition_result = RecognitionManager.getRecognition(set_segments[0].set_id);
            // If it's a text segment, account for the draculae making x's smaller than t's, etc
            
            if (set_segments[0].constructor == SymbolSegment) {
            size = Vector2.Subtract(maxs, mins);
                if (-1 != $.inArray(set_segments[0].text, Editor.x_height_chars)) {
                    mins.y += size.y / 2;
                }
                if (-1 != $.inArray(set_segments[0].text, Editor.descender_chars)) {
                    mins.y += size.y / 2;
                    maxs.y += size.y / 2;
                } 
            }
            var tuple = new Tuple(recognition_result, mins, maxs, origMins, origMaxs);
            data.push(tuple);
            
            set_segments.length = 0;
            set_segments.push(seg);
        }
        else
            set_segments.push(seg);
    }
    Editor.segments.pop();
    
    /* build XML request here:
    <SegmentList>
        <Segment symbol="S" min="0,0" max="10,10" id="24"/>
    </SegmentList>
    
    
    */
    
    var sb = new StringBuilder();
    sb.append("?segments=<SegmentList>");
    for(var k = 0; k < data.length; k++)
    {
        var t = data[k];
        sb.append("<Segment symbol=\"");
        if(t.item1.symbols.length == 0)
            sb.append("x\" min=\"");
        else
            sb.append(t.item1.symbols[0]).append("\" min=\"");
        sb.append(new Vector2(Math.floor(t.item2.x), Math.floor(t.item2.y)).toString()).append("\" max=\"");
        sb.append(new Vector2(Math.floor(t.item3.x), Math.floor(t.item3.y)).toString()).append("\" id=\"");
        sb.append(t.item1.set_id).append("\"/>");
    }
    sb.append("</SegmentList>");
    
    $.ajax
    (
        {
        url: Editor.align_server_url + sb.toString(),
        success: function(in_data, textStatus, xmlhttp)
        {
            // parse response here
            var new_dimensions = new Array();

            // parse response xml
            var xmldoc = in_data;
            var segment_nodes = xmldoc.getElementsByTagName("Segment");
            var tex_nodes = xmldoc.getElementsByTagName( "TexString" );
            
            if(segment_nodes.length == 0)
            {
                alert("DRACULAE Error: " + in_data);
                return;
            }
            
            // Append interpretation to the query box.
            if ( tex_nodes.length != 0 ) {
                var tex_string = tex_nodes[ 0 ].textContent;
                // get just the math, removing spaces
                var tex_math = tex_string.split( "$" )[ 1 ].replace( /\s*/g, "" );
                var current = document.getElementById( "tex_result" ).value;
                // Inserting an expression clears the textbox, adds 
                // expression to it.
                document.getElementById( "tex_result" ).value = tex_math;
            }
            
            for(var k = 0; k < segment_nodes.length; k++)
            {
                var attributes = segment_nodes[k].attributes;
                var t = new Tuple();
                t.item1 = parseInt(attributes.getNamedItem("id").value);
                t.item2 = parseVector2(attributes.getNamedItem("min").value);
                t.item3 = parseVector2(attributes.getNamedItem("max").value)
                new_dimensions.push(t);

            }
            
            // foreach segment set
            
            var transform_action = new TransformSegments(Editor.segments);
            
            for(var k = 0; k < new_dimensions.length; k++)
            {
                var t = null;
                // find tuple containing original size of segment
                for(var j = 0; j < data.length; j++)
                {
                    if(data[j].item1.set_id == new_dimensions[k].item1)
                    {
                        t = data[j];
                        break;
                    }
                }

                if(t == null)
                    continue;
                
                var set_id = new_dimensions[k].item1;
                var segments = Editor.get_segment_by_id(set_id);
                
                var min_0 = t.item4;
                var max_0 = t.item5;
                
                var min_f = new_dimensions[k].item2;
                var max_f = new_dimensions[k].item3;
                
                var size0 = Vector2.Subtract(max_0, min_0);
                var sizef = Vector2.Subtract(max_f, min_f);
                
                // If it's a text segment, account for the draculae making x's smaller than t's, etc
                if (segments.length == 1 && segments[0].constructor == SymbolSegment) {
                    if (-1 != $.inArray(segments[0].text, Editor.x_height_chars)) {
                        min_f.y -= sizef.y;
                        sizef.y *= 2;
                    }
                    if (-1 != $.inArray(segments[0].text, Editor.descender_chars)) {
                        min_f.y -= sizef.y / 2;
                    }
                }
                
                var scale = new Vector2(sizef.x / size0.x, sizef.y / size0.y);
                
                var translation = new Vector2();
                    translation.x = scale.x * min_f.x - min_0.x;
                    translation.y = scale.y * min_f.y - min_0.y;
                
                
                for(var i = 0; i < segments.length; i++)
                {
                    segments[i].resize(min_0, scale);
                    segments[i].freeze_transform();
                    segments[i].translate(Vector2.Subtract(min_f, min_0));
                    segments[i].freeze_transform();
                }
                
            }
            
            transform_action.add_new_transforms(Editor.segments);
            transform_action.Apply();
            Editor.add_action(transform_action);
            //RenderManager.render();
        },
        error: function(jqXHR, textStatus, errorThrown)
        {
            console.log(jqXHR);
            console.log(textStatus);
            console.log(errorThrown);
        }
        }
    );
}

// adds currently selected segments to a single segment group object
// the individual segments in the group remain in their type's render layer, 
// so no need to remove or re-render
Editor.groupTool = function()
{
    if(Editor.selected_segments.length > 0 && Editor.state == EditorState.SegmentsSelected)
    {
        // get a new uid for this set
        var set_id = Segment.set_count++;
        Editor.add_action(new GroupSegments(Editor.selected_segments, set_id));
        
        var to_classify = new Array();
        for(var k = 0; k < Editor.selected_segments.length; k++)
        {
            var old_set_id = Editor.selected_segments[k].set_id;
            if(to_classify.contains(old_set_id) == false)
                to_classify.push(old_set_id);
            Editor.selected_segments[k].set_id = set_id;
        }

        // sort Editor segments by set_id
        // insertion sort works best for nearly sorted lists
        for(var i = 1; i < Editor.segments.length; i++)
        {
            var value = Editor.segments[i];
            for(var j = i - 1; j >= 0 && Editor.segments[j].set_id > value.set_id; j--)
                Editor.segments[j+1] = Editor.segments[j];
            Editor.segments[j+1] = value;
        }
        
        // RLAZ: restored this code, so that all modified objects are
        // reclassified.
        to_classify.push(set_id);
        for(var k = 0; k < to_classify.length; k++)
            RecognitionManager.classify(to_classify[k]);
        
        Editor.state = EditorState.SegmentsSelected;
    }
}

// will break apart selected segment group objects
Editor.ungroupTool = function()
{
    alert(Editor.state);
}

// deletes the currently selected segments
Editor.deleteTool = function()
{
    //if(Editor.button_states[Buttons.Delete].enabled == false)
    //    return;
    
    var action = new DeleteSegments(Editor.selected_segments)
    action.Apply();
    Editor.add_action(action);
    Editor.clear_selected_segments();    
    RenderManager.render();
    
    if(Editor.selection_method == "Stroke")
        Editor.state = EditorState.ReadyToStrokeSelect;
    else if(Editor.selection_method == "Rectangle")
        Editor.state = EditorState.ReadyToRectangleSelect;
}

Editor.typeTool = function()
{
    Editor.selected_segments.length = 0;
    Editor.current_stroke = null;
    Editor.clearButtonOverlays();

    Editor.button_states[Buttons.Pen].setSelected(true);
    Editor.button_states[Buttons.Rectangle].setSelected(false);
    Editor.button_states[Buttons.Stroke].setSelected(false);
    Editor.clear_selected_segments();
    
    switch(Editor.state)
    {
        case EditorState.SegmentsSelected:
            Editor.clear_selected_segments();
            break;
        case EditorState.MiddleOfText:
            if(Editor.current_action.toString() == "EditText")
                Editor.current_action.set_current_text(Editor.current_text.text);
            Editor.current_text = null;
            break;
    }
    Editor.state = EditorState.ReadyForText;
    RenderManager.render();
}

Editor.relabel = function(return_to)
{
        CorrectionMenu.show(return_to);
        Editor.clearButtonOverlays();
        for(var k = 0; k < Editor.button_states.length; k++)
            Editor.button_states[k].setEnabled(false);
}

// clears all the data and sends action list to server for storage
Editor.clear = function()
{
    // get rid of last one if it' a bugger
    if(Editor.action_list.length > 0)
    {
        var prev_action = Editor.action_list.pop();
        if(prev_action.shouldKeep() == true)
            Editor.action_list.push(prev_action);
    }
    
    // save data
    var sb = new StringBuilder();
    sb.append("?actionList=<ActionList>");
    for(var k = 0; k < Editor.action_list.length; k++)
    {
        sb.append(Editor.action_list[k].toXML());
    }
    sb.append("</ActionList>");
    $.get
    (
        Editor.data_server_url + sb.toString(),
        function(data, textStatus, xmlhttp)
        {
            window.location.reload( true ); // href = Editor.editor_root + "index.xhtml";
        }
    );
    
    // reset editor
    // ?????
}

Editor.getInkML = function() {
    var inkml = "<ink xmlns=\"http://www.w3.org/2003/InkML\">";
    var segments = new Array();
    var segarray = Editor.segments.slice( 0 );
    segarray.sort( function( o1, o2 ) { return o1.instance_id - o2.instance_id } );
    
    for ( var i = 0; i < segarray.length; i++ ) {
        var stroke = segarray[ i ];
        var strokeid = stroke.instance_id;
        var segid = stroke.set_id;
        
        // translation for absolute positioning
        var tx = stroke.translation.x;
        var ty = stroke.translation.y;
        var sx = stroke.scale.x;
        var sy = stroke.scale.y;
        // add to proper segment
        if ( segments[ segid ] == null ) segments[ segid ] = new Array();
        segments[ segid ].push( strokeid );
        
        // add stroke data to inkml
        inkml += "<trace id=\"" + strokeid + "\">";
        var strokedata = new Array();
        for ( var j = 0; j < stroke.points.length; j++ ) {
            strokedata.push( ( ( stroke.points[ j ].x * sx ) + tx ) + " " + ( ( stroke.points[ j ].y * sy ) + ty ) );
        }
        inkml += strokedata.join( ", " );
        inkml += "</trace>";        
    }
    
    for ( var i = 0; i < segments.length; i++ ) {
        if ( segments[ i ] == null ) continue;
        var strokeids = segments[ i ];
        
        inkml += "<traceGroup xml:id=\"TG" + i + "\">";
        
        // label
        inkml += "<annotation type=\"truth\">" + RecognitionManager.getRecognition( i ).symbols[ 0 ] + "</annotation>"
        
        for ( var j = 0; j < strokeids.length; j++ ) {
            inkml += "<traceView traceDataRef=\"" + strokeids[ j ] + "\" />";
        }
        
        inkml += "</traceGroup>";
    }
    inkml += "</ink>";
    
    if ( Editor.using_ipad ) {
        
        // ask for filename
        var fname = prompt( "Enter filename (leave blank for random)." );
        if ( fname == null ) return; // "cancel"
        
        // save to server
        $.ajax(
            {
                url: Editor.inkml_save_server_url + "?fname=" + fname + "&s=" + escape( inkml ),
                success: function( in_data, textStatus, xmlhttp ) {      
                    alert( "Saved: " + in_data.split( "!" )[ 1 ] );
                },
                error: function( jqXHR, textStatus, errorThrown ) {
                    console.log( jqXHR );
                    console.log( textStatus );
                    console.log( errorThrown );
                    if ( jqXHR.status == 0 ) {
                        alert( "Error: server offline." );
                    } else {
                        alert( "Error: " + textStatus + "/" + errorThrown );
                    }
                }
            }
        );
        
    } else {
    
        // save locally
        var datauri = "data:text/inkml," + escape( inkml ); // yes, this is an invalid mime type
        window.open( datauri );
        
    }
}

/*
 This method is complicated so let me explain what's going on:
 FileReader's readAsDataURL method and apparently Image's .src property are
 Asynchrynous, so we need to fire an event to do work instead of doing it sequentially.
 When the file is read as a data url, the first method is called which sets the data url
 as the Image's source.  That doesn't happen immediately, so another event is made
 for when the image's src is finished being set.  When this happens, then we forward
 the image to the render manager and the collision manager.
 */

Editor.onImageLoad = function(e)
{
    var file_list = e.target.files;
    var file = file_list[0];
    if(file)
    {
        var r = new FileReader();
        r.onload = function(e)
        {
            var loaded_image = new Image();
            
            // render image to canvas, get back the dataurl, send dataurl to server,
            // get back list of connected components in xml, add to managers
            var added_segments = new Array();
            loaded_image.onload = function(e)
            {
                var canvas = document.createElement("canvas");
                canvas.width = loaded_image.width;
                canvas.height = loaded_image.height;
                
                var context = canvas.getContext("2d");
                context.drawImage(loaded_image, 0, 0);

                
                // a string here
                // var dataUrl = canvas.toDataURL();
                inverseImage = ImageBlob.generateInverseImage(this);
                var blob = new ImageBlob(this, inverseImage);
                Editor.add_segment(blob);
                RecognitionManager.enqueueSegment(blob);
                
                return; // REMOVE THIS
                

                

                
                
                // now we build our request
                // we pass our image in as a parameter 
                var vals = dataUrl.split(",");
                var parameter = "?image=" + vals[0] + "," + encodeURIComponent(vals[1]);
                
                //var segment_group = new SegmentGroup();


                
                $.ajax({
                    type: "GET",
                    url: "http://saskatoon.cs.rit.edu:7006" + parameter,//Editor.connected_components_server_url + parameter,
                    dataType: "xml",
                    success: function(data, textStatus, xmlhttp)
                    {
                        Editor.clear_selected_segments();
                        var set_id = Segment.count++;
                        var xml_document = xmlhttp.responseXML;
                        var root_node = xml_document.firstChild;
                        /*
                          Expects a response in this format
                          <ConnectedComponents>
                          <Image position="10,20">
                          data:image/PNG;base64,ASOIUROIJDLAKJSDLFJOEURABRDLJFKLDSetc
                          </Image>
                          <Image...
                          </ConnectedComponents>
                        */
                        if(root_node.nodeName != "ConnectedComponents")
                        {
                            alert(xmlhttp.responseText);
                        }
                        else
                        {
                            //var image_node = root_node.firstChild;
                            var image_nodes = root_node.getElementsByTagName("Image");
                            
                            var image_list = new Array(image_nodes.length);
                            var position_list = new Array(image_nodes.length);
                            
                            // change our state
                            Editor.strokeSelectionTool();
                            
                            for(var k = 0; k < image_nodes.length; k++)
                            {
                                var position = image_nodes[k].getAttribute("position").split(',');
                                var img_data = image_nodes[k].textContent;
                                
                                image_list[k] = new Image();
                                image_list[k].name = String(k);

                                position_list[k] = [parseInt(position[0]), parseInt(position[1])];

                                image_list[k].src = img_data; // This triggers the following event
                                image_list[k].onload = function(e)
                                {
                                    var my_k = parseInt(this.name);
                                    // create inverse image

                                    var inverse_image = new Image();
                                    inverse_image.name = this.name;
                                    inverse_image.src = ImageBlob.generateInverseImage(this);
                                    
                                    // once it loads, add the image blob to they system
                                    inverse_image.onload = function()
                                    {
                                        
                                        
                                        var b = new ImageBlob(image_list[my_k], this, position_list[my_k][0], position_list[my_k][1]); 
                                        
                                        Editor.add_segment(b);
                                        Editor.add_selected_segment(b); 
                                        added_segments.push(b);
                                        if(added_segments.length == image_nodes.length)
                                            Editor.current_action.buildSegmentXML();
                                        RenderManager.render();
                                        Editor.canvas_div.appendChild(b.svg);
                                        // Now that the tools layer has been added, add the svg image to the canvas
                                        b.finishImageLoad(Editor.canvas_div);
                                    }
                                }
                            }
                        }
                    }
                });
                
            }
            
            Editor.add_action(new AddSegments(added_segments));
            
            // set the result of the image load to the image object
            loaded_image.src = e.target.result;
        }
        r.readAsDataURL(file);

    }
    else
    {
        // file not loaded
    }
}

Editor.prevent_default = function(event)
{
    event.preventDefault();
}


////////////////////////////////////////
// New methods
////////////////////////////////////////
Editor.search = function() 
{
    // NOTE: CURRENTLY EXPERIMENTING WITH ONLY ONE TEXT BOX.
    var searchString = "";
    var engineType = document.getElementById("engineSelector").value;
    var searchString = document.getElementById("tex_result").value 
    // REMOVED
    //+ " " + document.getElementById("infobar").value;



    /* INCOMPLETE */
    switch (engineType)
    {
    case 'LaTeX Search':
        url = 'http://latexsearch.com/latexFacets.do?searchInput=';
        searchString = searchString + '&stype=exact';
        break;
    case 'Wolfram Alpha':
        url='http://www.wolframalpha.com/input/?i=';
        break;
    case 'Google':
        url='http://www.google.com/search?q=';
        break;
    default:
        /* Currently NIST DLMF is the default (first list item) */
        url = 'http://dlmf.nist.gov/search/search?q=';
        break
    }
    window.open(url + searchString);
}

Editor.goDPRL = function ()
{
    window.location = "http://www.cs.rit.edu/~dprl"
}

/*
  This method takes a state and then performs the necessary operations to switch
  to that state
*/
Editor.changeState = function(state){
    switch(state){
    case EditorState.PenMovingSegments: 
    case EditorState.ReadyToStroke:
        Editor.selectPenTool();
        break;
    case EditorState.RectangleSelecting:
        Editor.rectangleSelectionTool();
        break;
    case EditorState.StrokeSelecting:
        Editor.strokeSelectionTool();
        break;
    default:
        Editor.state = state;
    }
}
