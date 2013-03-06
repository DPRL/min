/* 
This file contains events that are permanent and remain unchanged
throughout throughout a run of Min. e.g. buttons
*/

function PermEvents(){}

PermEvents.setup_toolbar = function(){
    $("#pen").click(EditorMode.mkModeSwitchFn(Editor.modes.DrawMode));

    $("#stroke_select").click(EditorMode.mkModeSwitchFn(Editor.modes.StrokeSelectMode));
    
    $("#rectangle_select").click(EditorMode.mkModeSwitchFn(Editor.modes.RectSelectMode));

    document.getElementById("undo").addEventListener("click", Editor.undo, true);
    document.getElementById("redo").addEventListener("click", Editor.redo, true);
    document.getElementById("align").addEventListener("click",Editor.align, true);
    document.getElementById("search").addEventListener("click", Editor.search, true);
    document.getElementById("add").addEventListener("click", function() { Editor.slider.addSlide(); }, true);
    document.getElementById("remove").addEventListener("click", function() { Editor.slider.removeSlide(); }, true);
	
    document.getElementById("pen").addEventListener("mouseover",Editor.showToolTip("pen", "Draw"), true);
    document.getElementById("stroke_select").addEventListener("mouseover",Editor.showToolTip("stroke_select","Select primitives (e.g. strokes)"), true);
    document.getElementById("rectangle_select").addEventListener("mouseover",Editor.showToolTip("rectangle_select","Select symbols"), true);
    document.getElementById("upload_image").addEventListener("mouseover",Editor.showToolTip("upload_image","Upload image"), true);
    document.getElementById("undo").addEventListener("mouseover",Editor.showToolTip("undo","Undo"), true);
    document.getElementById("redo").addEventListener("mouseover",Editor.showToolTip("redo","Redo"), true);
    document.getElementById("align").addEventListener("mouseover",Editor.showToolTip("align","Recognize expression"), true);
    document.getElementById("search").addEventListener("mouseover",Editor.showToolTip("search","Search"), true);
    document.getElementById("add").addEventListener("mouseover",Editor.showToolTip("add","New expression"), true);
    document.getElementById("remove").addEventListener("mouseover",Editor.showToolTip("remove","Delete expression"), true);

    // add an upload image button to the canvas if this is supported
    if(window.FileReader){
        $("#upload_image").removeClass("hidden_toolbar_button");
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
 
    Editor.toolbar_div.addEventListener("mouseup", Editor.onMouseUp, true);
}

PermEvents.setup_touch_events = function(){
    // Touch events for tablet interfaces
    Editor.canvas_div.addEventListener("touchstart", Editor.onMouseDown, true);
    Editor.canvas_div.addEventListener("touchend", Editor.onMouseUp, true);

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
    
    // Prevent problem behavior from the iPad canvas.
    Editor.canvas_div.setAttribute("ontouchmove", "event.preventDefault();");

}

PermEvents.setup_window = function(){
    window.addEventListener("resize", Editor.fit_to_screen, true);
    window.addEventListener("orientationchange", Editor.fit_to_screen, false);
    window.addEventListener("mousemove", Editor.onMouseMove, true);
    window.addEventListener("touchmove", Editor.onMouseMove, true);

}

PermEvents.setup_document = function(){
    $(document).keypress(Editor.onKeyPress);
    $(document).keydown(Editor.mapCanvasBackspace);
}

PermEvents.setup_canvas = function(){
    // Canvas bindings.
    Editor.canvas_div.addEventListener("mousedown", Editor.onMouseDown, true);
    Editor.canvas_div.addEventListener("mouseup", Editor.onMouseUp, true);
    Editor.canvas_div.addEventListener("dblclick", Editor.onDoubleClick, true);
}
