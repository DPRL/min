/* 
This file contains events that are permanent and remain unchanged
throughout throughout a run of Min. e.g. buttons
*/

function PermEvents(){}

PermEvents.setup_buttons = function(){
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

    // add an equation image to the canvas if this is supported
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
 
}

PermEvents.setup_touch_events = function(){
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
