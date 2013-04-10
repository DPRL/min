/*
This file contains events handlers that are used in Selection modes (Box/Stroke) 
of Min
*/

SelectionMode.prototype = new EditorMode();

function SelectionMode(){
    
    this.onDownSegmentsSelected =
        $.proxy(SelectionMode.onDownSegmentsSelectedBase, this);
    this.beginMovingSegmentsFromMove =
        $.proxy(SelectionMode.beginMovingSegmentsFromMove, this);
    this.moveSegmentsFromMove =
        $.proxy(SelectionMode.moveSegmentsFromMoveBase, this);
    this.onUpAfterMove = $.proxy(SelectionMode.onUpAfterMoveBase, this);
    this.touchAndHold = $.proxy(SelectionMode.touchAndHold, this);
    this.resizeSegmentsOnMove = $.proxy(SelectionMode.resizeSegmentsOnMoveBase,
        this);

    if(Modernizr.touch){
        $("#bounding_box").hammer({
            transform: true,
            scale_threshold: .1,
            drag_min_distance: 0,
            // These events need to be suppressed because sometimes they would fire during
            // a transform and prevent ontransformend from being run, leaving the editor in a bad state.
            drag: false,
            swipe: false
            });

        this.onPinchStart = $.proxy(SelectionMode.onPinchStart, this);
        this.onPinch = $.proxy(SelectionMode.onPinch, this);
        this.onPinchEnd = $.proxy(SelectionMode.onPinchEnd, this);
        this.onDownSegmentsSelected =
            EditorMode.mkIgnoreMultipleTouches(this.onDownSegmentsSelected);
        this.moveSegmentsFromMove =
            EditorMode.mkIgnoreMultipleTouches(this.moveSegmentsFromMove);
        this.resizeSegmentsOnMove =
            EditorMode.mkIgnoreMultipleTouches(this.resizeSegmentsOnMove);
    }
}


SelectionMode.prototype.init_mode = function(){
    console.log("SelectionMode init_mode");
    RenderManager.regColorOCRbbs();

    // These gesture* events are iOS specific
    $("#bounding_box").hammer().on("ontransformstart gesturestart",
    this.onPinchStart).on("ontransform gesturechange",
    this.onPinch).on("ontransformend gestureend", this.onPinchEnd);
    $(document).on("keypress", SelectionMode.onKeyPress);
}

SelectionMode.prototype.close_mode = function(){
    $("#bounding_box").hammer().off("ontransformstart gesturestart",
    this.onPinchStart).off("ontransform gesturechange",
    this.onPinch).off("ontransformend gestureend", this.onPinchEnd);

    $("#equation_canvas").off(this.event_strings.onDown,
    this.onDownSegmentsSelected);
    $(document).off("keypress", SelectionMode.onKeyPress);
}

/*
    If touch and hold is happening, unbind the events.
*/
SelectionMode.touchAndHold = function(e){
    var eq_canv = $("#equation_canvas").off(this.event_strings.onUp,
    this.onUpAfterMove).off(this.event_strings.onMove,
    this.beginMovingSegmentsFromMove).off(this.event_strings.onDown,
    this.onDownSegmentsSelected);

    SelectionMode.onDoubleClick(e);
}

//-----------------
// Hammer Events
// ----------------
//   - onPinchStart 
//   - onPinch
//   - onPinchEnd
SelectionMode.onPinchStart = function(e){ // e is a Hammer.js event
    // TODO: Bind/unbind the touchstart function to prevent that behavior from
    // happening here. Rebind in onPinchEnd.
    $("#equation_canvas").off("touchstart", this.onDownSegmentsSelected);

    // Need to clear the moveQueue so that there is no velocity at the end of the touch
    Editor.add_action(new TransformSegments(Editor.selected_segments));
    Editor.state = EditorState.PinchResizing;
    
    Editor.original_bb = Editor.selected_bb.clone();
    var bb = Editor.original_bb;

    // Store the center of the bounding box as the anchor point for the resize
    var bb_size = Vector2.Subtract(bb.maxs, bb.mins);

    this.anchor = new Vector2(bb.mins.x  + bb_size.x / 2, bb.mins.y + bb_size.y / 2);
    
}

SelectionMode.onPinch = function(e){ 
    // For some reason the scale
    // returns 0 sometimes, this is why the object would suddenly get
    // tiny

    // originalEvent in this case is the Hammer event
    var scale = e.originalEvent.scale;
    // TODO: See if this can be removed when the other events won't conflict
    // with it.
    if(scale == 0)
        return;
    for(var n = 0; n < Editor.selected_segments.length; n++){
        Editor.selected_segments[n].resize(this.anchor, new
        Vector2(scale, scale));
    }

    Editor.update_selected_bb();
    RenderManager.render();
}

SelectionMode.onPinchEnd = function(e){
    // End the transform
    for(var n = 0; n < Editor.selected_segments.length; n++){
        Editor.selected_segments[n].freeze_transform();
    }
    Editor.current_action.add_new_transforms(Editor.selected_segments);
    Editor.update_selected_bb();
    RenderManager.render();

    Editor.moveQueue = null;

    $("#equation_canvas").on(this.event_strings.onDown,
        this.onDownSegmentsSelected);
}

SelectionMode.resizeSegmentsOnMoveBase = function(e){
    SelectionMode.prototype.onMove.call(this, e);
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
            anchor = bb.maxs;
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
}

SelectionMode.onDownSegmentsSelectedBase = function(e){    
    SelectionMode.prototype.onDown.call(this, e);
    var click_edge = Editor.selected_bb.edge_clicked(Editor.mouse_position);
    $("#equation_canvas").one(this.event_strings.onUp, this.onUpAfterMove);
    // check for resizing
    // CMS: TODO?: make this an event on just the bb handles. 
    if(click_edge != -1)
    {
        Editor.add_action(new TransformSegments(Editor.selected_segments));
        Editor.state = EditorState.Resizing;
        Editor.grabbed_edge = click_edge;
        Editor.resize_offset = new Vector2(0,0);
        Editor.original_bb = Editor.selected_bb.clone();
        $("#equation_canvas").on(this.event_strings.onMove,
        this.resizeSegmentsOnMove);
    }
    else
    {
        // check translate
        if(Editor.selected_bb.point_collides(Editor.mouse_position))
        {
            Editor.add_action(new TransformSegments(Editor.selected_segments));
            Editor.moveQueue = new BoundedQueue(Editor.moveQueueLength);
            Editor.moveQueue.enqueue(new Vector2(e, Editor.mouse_position.clone()));
            
            this.timeoutID = window.setTimeout(this.touchAndHold,
            Editor.touchAndHoldTimeout, e);

            $("#equation_canvas").one(this.event_strings.onMove,
            this.beginMovingSegmentsFromMove);
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
               
                this.timeoutID = window.setTimeout(this.touchAndHoldTimeout,
                Editor.touchAndHoldTimeout, e);
                console.log("Setting timeout: " + this.timeoutID);
            }
            // selecting none
            else
            {
                $("#equation_canvas").off(this.event_strings.onDown,
                this.onDownSegmentsSelected);
                $("#equation_canvas").off(this.event_strings.onUp,
                this.onUpAfterMove);

                // TODO: This if can probably go after finishing stroke select
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

                // Go back to whatever selection type we were using
                $("#equation_canvas").on(this.event_strings.onDown,
                        Editor.current_mode.onDownNoSelectedSegments);

                if(Modernizr.touch){
                    Editor.current_mode.onDownNoSelectedSegments(e);
                }
                else{
                    $("#equation_canvas").trigger(this.event_strings.onDown, e);
                }
            }
        }
        RenderManager.render();
    }
}

/**
   Move all selected segments between two positions. 
   This is a utility method, not an event.

   @param previous A Vector2 of the previous mouse position
   @param current A Vector2 of the current mouse position
**/
SelectionMode.moveSegments = function(previous, current){
    var translation = Vector2.Subtract(current, previous);
    for(var k = 0; k < Editor.selected_segments.length; k++)
    {
        seg = Editor.selected_segments[k];
        if(seg.clear != undefined) {
            seg.clear(Editor.contexts[0]);
        }                    
        seg.translate(translation);
    }
    Editor.selected_bb.translate(translation);
}

// This method has to be called once to start the mouse movement.
// It then binds the method to use from then on
SelectionMode.beginMovingSegmentsFromMove = function(e){
    // Clear the timeout so the menu doesn't appear
    window.clearTimeout(this.timeoutID);
    SelectionMode.prototype.onMove.call(this, e);
    Editor.state = EditorState.MovingSegments;
    Editor.moveQueue = new BoundedQueue(Editor.moveQueueLength);
    Editor.moveQueue.enqueue(new Vector2(e, Editor.mouse_position.clone()));
    $("#equation_canvas").on(this.event_strings.onMove, this.moveSegmentsFromMove);
    $("#equation_canvas").one(this.event_strings.onUp, this.onUpAfterMove);
}

// Awkward name, try to change this later
SelectionMode.moveSegmentsFromMoveBase = function(e){
    SelectionMode.prototype.onMove.call(this, e);
    if(e.timeStamp - Editor.moveQueue[Editor.moveQueue.length - 1].x.timeStamp > 40){
                    Editor.moveQueue.enqueue(new Vector2(e, Editor.mouse_position.clone()));
    }
    SelectionMode.moveSegments(Editor.mouse_position_prev, Editor.mouse_position);
    // redraw scene
    RenderManager.render();
}

SelectionMode.onDoubleClick = function(e){
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
        // var prev_state;
        // if(Editor.selection_method == "Stroke")
        //     prev_state = EditorState.StrokeSelecting;
        // else
        //     prev_state = EditorState.RectangleSelecting;
        // 
        // Editor.state = EditorState.SegmentsSelected;
        if (singleObject > 0) {
            Editor.relabel(Editor.current_mode.displaySelectionTool);
        } else {
            Editor.groupTool();
        }
    
}

SelectionMode.onUpAfterMoveBase = function(e){
    window.clearTimeout(this.timeoutID);

    // We're done moving for now, so make sure these events aren't bound
    $("#equation_canvas").off(this.event_strings.onMove,
    this.moveSegmentsFromMove).off(this.event_strings.onMove,
    this.beginMovingSegmentsFromMove).off(this.event_strings.onMove,
    this.resizeSegmentsOnMove);

    // RLAZ: delete strokes if cursor moves out of the window.
    var canvasDims = document.getElementById('equation_canvas').getBoundingClientRect();
    var toolbarDims = document.getElementById('toolbar').getBoundingClientRect();

    var theEvent = e;
    var offSet = 10;
    if(e.originalEvent.type == "touchend") {
        theEvent = e.originalEvent.changedTouches[0];
    }

    /*
      This momentum code is adapted from code at http://jsfiddle.net/529KH/

      The license information on jsfiddle is as follows:
      Created and maintained by Piotr and Oskar.

      Hosted by DigitalOcean.

      It wouldn't exist without MooTools community.

      License

      All code belongs to the poster and no license is enforced.

      We are not responsible or liable for any loss or damage of any kind during the usage of provided code.
     */
    
    // Continue moving if there is momentum
    var recent = Editor.moveQueue.slice(-1)[0];
    var oldest = Editor.moveQueue.slice(0, 1)[0]
    var recent_pos = recent.y;
    var oldest_pos = oldest.y; 
    var recent_ts = recent.x.timeStamp;
    var oldest_ts = oldest.x.timeStamp;
    var delta_T = recent_ts - oldest_ts;
    
    var deltas = Vector2.Subtract(recent_pos, oldest_pos);
    var distance = Vector2.Distance(recent_pos, oldest_pos);
    // velocity in each dimension
    var velocity = new Vector2(Math.max(Math.min(deltas.x/delta_T, 1), -1),
                               Math.max(Math.min(deltas.y/delta_T, 1), -1));
    var duration = Math.max(velocity.x, velocity.y) * 2000;
    velocity = Vector2.Multiply(10, velocity);

    console.log("velocity outside: " + velocity);
    var box_momentum = function(step, duration, velocity, position, lastStepTime){
        if(duration < 0 || step < 0)
            return;

        var now = new Date();
        var stepDuration = now.getTime() - lastStepTime.getTime();
        var new_velocity = Vector2.Multiply(step * 1/10, velocity);

        var new_pos = Vector2.Add(position, Vector2.Multiply(stepDuration/4, velocity));
        SelectionMode.moveSegments(position, new_pos);
        Editor.current_action.add_new_transforms(Editor.selected_segments);
        RenderManager.render();
        
        if(new_pos.x > Editor.canvas_width || new_pos.x < 0
           || new_pos.y > Editor.canvas_height || new_pos.y < 0){
            /*
              Users will expect that when they undo, the
              object will both be undeleted and move to the
              starting position. Use a composite action to
              achieve this.
            */
            console.log("Deleting.");
            // Need to bind the movement functions for no selection
            // Can't use 'this' because of setTimeout's behavior
            $("#equation_canvas").off(Editor.current_mode.event_strings.onDown,
            Editor.current_mode.onDownSegmentsSelected).on(Editor.current_mode.event_strings.onDown,
            Editor.current_mode.onDownNoSelectedSegments);

            var action = new CompositeAction();

            // Delete the segments that were thrown off the screen
            var del_action = new DeleteSegments(Editor.selected_segments);
            del_action.Apply();
            Editor.clearSelectedSegments();

            // Create a composite object and register it with the Editor
            action.add_action(Editor.current_action);
            Editor.add_action(action);
            action.add_action(del_action);

            return;
        }
        window.setTimeout(box_momentum, 15, step - 1, duration - stepDuration, new_velocity, new_pos, now);
        
    }
    if(distance > 100){
        console.log("Editor state: " + Editor.state);
        window.setTimeout(box_momentum, 15, 10, duration, velocity, recent_pos, new Date());
        return;
    }

    // ipad: touchend occurs when finger physically leaves the screen.
    if (theEvent.pageX < offSet || theEvent.pageX > canvasDims.right - offSet ||
        theEvent.pageY  < toolbarDims.bottom || 
        theEvent.pageY > canvasDims.height - 2 * offSet ) {
        Editor.deleteTool();
    } else {
        Editor.state = EditorState.SegmentsSelected;
        Editor.current_action.add_new_transforms(Editor.selected_segments);
    }
}

SelectionMode.onKeyPress = function(e){
    if ( Editor.segments.length > 0
            && ( e.keyCode == KeyCode.left_arrow || e.keyCode == KeyCode.up_arrow ||
                e.keyCode == KeyCode.right_arrow || e.keyCode == KeyCode.down_arrow ) ) {

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
                case KeyCode.left_arrow:
                    filter = function( s ) { return s.translation.x <= cur_seg.translation.x; };
                    break;

                case KeyCode.up_arrow: 
                    filter = function( s ) { return s.translation.y <= cur_seg.translation.y; };
                    break;

                case KeyCode.right_arrow:
                    filter = function( s ) { return s.translation.x >= cur_seg.translation.x; };
                    break;

                case KeyCode.down_arrow:
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

            if ( min_dist_index == -1 ) return; // min_dist_index = Editor.segments.length - 1;

            Editor.clear_selected_segments();

            var seg_to_add = Editor.segments[ min_dist_index ];
            var seg_set_id = seg_to_add.set_id;
            for ( var i = 0; i < Editor.segments.length; i++ ) {
                if ( Editor.segments[ i ].set_id == seg_set_id ) Editor.add_selected_segment( Editor.segments[ i ] );
            }

            RenderManager.render();
        }
    } else {
        // These keycodes seem not to work properly in both the old version 
        // and this one.
        switch ( String.toLowerCase(String.fromCharCode(e.which))) {
            case KeyCode.group:
                Editor.groupTool();
                break;
            case KeyCode.relabel:
                Editor.relabel();
                break;
            case KeyCode.pen:
                Editor.selectPenTool();
                break;
            default:
        }
    }
}
