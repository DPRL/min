/* 
This file contains events that are permanent and remain unchanged
throughout throughout a run of Min. e.g. buttons
*/

function PermEvents(){}

PermEvents.setup_toolbar = function(){
    $("#pen").click(EditorMode.mkModeSwitchFn(Editor.modes.DrawMode));

    $("#change_recognition").click(Editor.open_correction_menu);
    
    $("#rectangle_select").click(EditorMode.mkModeSwitchFn(Editor.modes.RectSelectMode));

    document.getElementById("undo").addEventListener("click", Editor.undo, true);
    document.getElementById("redo").addEventListener("click", Editor.redo, true);
    document.getElementById("align").addEventListener("click",Editor.align, true);
    document.getElementById("search").addEventListener("click", Editor.search, true);
    document.getElementById("add").addEventListener("click", function() { Editor.slider.addSlide(); }, true);
    document.getElementById("remove").addEventListener("click", function() { Editor.slider.removeSlide(); }, true);
	
    document.getElementById("pen").addEventListener("mouseover",Editor.showToolTip("pen", "Draw"), true);
    document.getElementById("change_recognition").addEventListener("mouseover",Editor.showToolTip("change_recognition","Opens correction menu"), true);
    document.getElementById("rectangle_select").addEventListener("mouseover",Editor.showToolTip("rectangle_select","Select symbols"), true);
    document.getElementById("upload_image").addEventListener("mouseover",Editor.showToolTip("upload_image","Upload image"), true);
    document.getElementById("undo").addEventListener("mouseover",Editor.showToolTip("undo","Undo"), true);
    document.getElementById("redo").addEventListener("mouseover",Editor.showToolTip("redo","Redo"), true);
    document.getElementById("align").addEventListener("mouseover",Editor.showToolTip("align","Recognize expression"), true);
    document.getElementById("search").addEventListener("mouseover",Editor.showToolTip("search","Search"), true);
    document.getElementById("add").addEventListener("mouseover",Editor.showToolTip("add","New expression"), true);
    document.getElementById("remove").addEventListener("mouseover",Editor.showToolTip("remove","Delete expression"), true);
    
    //Keyboard shortcuts. This makes adding keyboard shortcuts easy. You can just type the keyboard
    // symbol and method to call on keypress like below.
    $.ctrl('Z', Editor.undo);
    $.ctrl('Y', Editor.redo);

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
    // HTML5's drag and drop implemented below
    if(Modernizr.draganddrop && window.FileReader){ // check if browser supports drag and drop
    	var dropzone = $('#equation_canvas');
    	var text =  document.getElementsByClassName("Drop_text")[0];
        dropzone.on('dragover', function(e) {
        	text.style.display = "block";
        	dropzone.addClass('hover');
        	e.stopPropagation();
			e.preventDefault();
			return false;
		});
		dropzone.on('dragleave', function(e) {
			text.style.display = "none";
			dropzone.removeClass('hover');
			e.stopPropagation();
			e.preventDefault();
			return false;
		});
		dropzone.on('drop', function(e) {
			//prevent browser from opening the file after drop off
			text.style.display = "none";
			e.stopPropagation();
			e.preventDefault();
			dropzone.removeClass('hover');
			var file = e.originalEvent.dataTransfer.files;
			// Check if the type is a text file, if so parse it and get tex
			if(file[0].type == "text/plain")
				PermEvents.parse_text_file(file[0]);
			else
				Editor.ParseImage(file[0]);
			return false;
		});
    }
}

PermEvents.setup_window = function(){
    window.addEventListener("resize", Editor.fit_to_screen, true);
    window.addEventListener("orientationchange", Editor.fit_to_screen, false);

    // Prevent problem behavior from the iPad canvas.
    Editor.canvas_div.setAttribute("ontouchmove", "event.preventDefault();");
}

PermEvents.setup_document = function(){
    $(document).keypress(Editor.onKeyPress);
    $(document).keydown(Editor.mapCanvasBackspace);
}

// Parses a text file for Tex
PermEvents.parse_text_file = function(file){
	default_position_specified = false;
	var reader = new FileReader();
	reader.onload = function(e){
		tex = e.target.result;
		PermEvents.Start_TeX_Input(tex);
	};
	reader.readAsText(file);
}

					/** Tex Input starts here **/

// Checks Min's URL for any TeX parameter. If there is, create a new TeX_Input and
// move the rendered TeX(using MathJax) to the canvas
PermEvents.check_url = function(){
	// get the encoded query string.
    var query = window.location.search.slice(9);
    if(query){
    	tex = decodeURIComponent(query); // decode it to get its latex
		default_position_specified = false;
    	PermEvents.Start_TeX_Input(tex);
    }
}

// Inputs TeX from any source(Text files, URL parameter) into Min using MathJax
PermEvents.Start_TeX_Input = function(tex){
	var elem = document.createElement("div");
	elem.setAttribute("id","Hidden_Tex");
	elem.style.visibility = "hidden";
	elem.style.position = "absolute";
	elem.style.fontSize = "800%";
	elem.innerHTML = '\\[' + tex + '\\]'; 	// So MathJax can render it
	document.body.appendChild(elem); 
	
	// Change renderer to svg and make sure it has been processed before calling
	// PermEvents.callBack
	MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "SVG"]);
    MathJax.Hub.Queue(["Rerender", MathJax.Hub,elem], [function(){ 
    		MathJax.Hub.Queue(["Typeset",MathJax.Hub,elem], [PermEvents.stub,elem]);
    }]);
}

// Scales the Tex to fit canvas width and height before insertion
PermEvents.scale_tex = function(elem){
	var equation_canvas_width = $("#equation_canvas")[0].offsetWidth;
	var equation_canvas_height = $("#equation_canvas")[0].offsetHeight;
	var MathJax_div = document.getElementsByClassName("MathJax_SVG")[0].firstChild.getBoundingClientRect();
	var math_width = Math.round(MathJax_div.width);
	var math_height = Math.round(MathJax_div.height);
	if(math_width > equation_canvas_width || math_height > equation_canvas_height){ 
		elem.style.fontSize =  (parseInt(elem.style.fontSize.split("%")[0]) - 10) + "%";
		MathJax.Hub.Queue(["Rerender",MathJax.Hub,elem], [$.proxy(PermEvents.scale_tex(elem), this)]);
	}else{
		return;
	}
}
// Method that just helps with the recursion in scale_tex
PermEvents.stub = function(elem){
	PermEvents.scale_tex(elem); // scale tex
	PermEvents.MoveSVGSegmentsToCanvas(elem);
	document.body.removeChild(elem); // Remove elem from document body (Import done)
}

// Copies the rendered SVG in elem to the canvas
PermEvents.MoveSVGSegmentsToCanvas = function(elem){
	var svg_root = document.getElementById("Hidden_Tex").getElementsByClassName("MathJax_SVG")[0].firstChild;
	var use_tag_array = svg_root.getElementsByTagName("use");
	if(default_position_specified)
		default_position = drop_position; // Slider to canvas drop
	else{
		if(svg_root.getBoundingClientRect().width > 800){ // long expressions
			default_position = new Vector2(0,150); // arbitrary position on the screen
		}else{
			default_position = new Vector2(400,150); // arbitrary position on the screen
		}
	}
	var rect_tag_array = svg_root.getElementsByTagName("rect");
	use_tag_array = Array.prototype.slice.call(use_tag_array);
	rect_tag_array = Array.prototype.slice.call(rect_tag_array);
	var elements_array = use_tag_array.concat(rect_tag_array);
	var initial_offset; // Used to keep segments at user's click position
	for(var i = 0; i < elements_array.length; i++){
		var offset = $(elements_array[i]).offset();
		if(i == 0)
			initial_offset = offset;
		// Set up prototype inheritance chain and call query reformation 
		TeX_Input.prototype.__proto__ = subclassOf(PenStroke);
		var in_x = Math.round(default_position.x + offset.left-initial_offset.left);
		var in_y = Math.round(default_position.y + offset.top-initial_offset.top);
		var pen_stroke = new TeX_Input(elements_array[i], in_x, in_y, 6, null);
		pen_stroke.initialize(svg_root, i, elements_array[i].tagName.toString());
		
		// Add the pen_stroke object to the Editor
		Editor.add_action(new AddSegments(new Array(pen_stroke)));
		Editor.add_segment(pen_stroke);
		RenderManager.render();
		pen_stroke.index = RenderManager.segment_set_divs.length-1;
		pen_stroke.correct_flip();
		Editor.state = EditorState.ReadyToStroke;
		RecognitionManager.addRecognitionForText(pen_stroke);
	}
	MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "HTML-CSS"]);
    MathJax.Hub.Queue(["Rerender", MathJax.Hub],[function(){
    	Editor.slider.updateSlide(tex); 		// Update the current slide
    }]);
}

// Used to implement inheritance
function subclassOf(base){
	_subclassOf.prototype= base.prototype;
    return new _subclassOf();
}
function _subclassOf() {};

/*
	I had to separate the drag and drop because methods that works for the desktops
	won't work for touch devices. All have the same basic structure though
*/

// Not really necessary but served a purpose during implementation
PermEvents.slider_dragging = function(e){
	if(Modernizr.touch){
		var first = e.originalEvent.changedTouches[0];
		if(parseInt(first.pageY) > 85 && (!PermEvents.first_drag_over)){
			$(e.currentTarget).on(Editor.current_mode.event_strings.onUp, PermEvents.slider_touch_done);
			PermEvents.drag_started = PermEvents.first_drag_over = true;
		}
	}
}

// Sets up the events that should happen upon clicking the slider
PermEvents.slider_touch_mouse_down = function(e){
	e.preventDefault();
	$(e.currentTarget).on(Editor.current_mode.event_strings.onMove, PermEvents.slider_dragging);
}

// Gets called on mouse up and calls function that inserts tex into min and canvas
PermEvents.slider_touch_done = function(e){
	if(PermEvents.drag_started){
		e.stopPropagation();
		e.preventDefault();
		PermEvents.drag_started = PermEvents.first_drag_over = false;
		default_position_specified = true;
		tex = Editor.slider.getCurrentExpression();
		var first = e.originalEvent.changedTouches[0];
		drop_position = new Vector2(first.pageX - Editor.div_position[0], first.pageY - Editor.div_position[1]);
		$(e.currentTarget).off(Editor.current_mode.event_strings.onMove, PermEvents.slider_dragging);
		Editor.canvas_div.style.cursor = "default";
		PermEvents.Start_TeX_Input(tex);
	}
}

/** Desktop Drop and Drag **/
// Sets up the events that should happen upon clicking the slider
PermEvents.slider_desktop_mouse_down = function(e){
	PermEvents.drag_started = true;
	Editor.current_mode.close_mode();
	$("#equation_canvas").on(Editor.current_mode.event_strings.onMove, PermEvents.slider_dragging);
	$("#equation_canvas").on(Editor.current_mode.event_strings.onUp, PermEvents.desktop_drag_done);
	if(navigator.userAgent.search("Firefox") != -1)
		Editor.canvas_div.style.cursor = "-moz-grabbing";
	else
		Editor.canvas_div.style.cursor = "-webkit-grabbing";
	e.preventDefault();
}

// Gets called on mouse up and calls function that inserts tex into min and canvas
PermEvents.desktop_drag_done = function(e){
	if(PermEvents.drag_started){
		e.stopPropagation();
		e.preventDefault();
		PermEvents.drag_started = false;
		default_position_specified = true;
		tex = Editor.slider.getCurrentExpression();
		drop_position = new Vector2(e.pageX - Editor.div_position[0], e.pageY - Editor.div_position[1]);
		$(".slider").trigger("mouseup");
		$("#equation_canvas").off("mousemove", PermEvents.slider_dragging);
		Editor.canvas_div.style.cursor = "default";
		PermEvents.Start_TeX_Input(tex);
		Editor.current_mode.init_mode();
	}
}

// Initializes Editor.current_mode
PermEvents.slider_desktop_end = function(e){
	Editor.current_mode.close_mode();
	$(".slider").trigger("mouseup");
	$("#equation_canvas").off("mousemove", PermEvents.slider_dragging);
	$("#equation_canvas").off("mouseup", PermEvents.desktop_drag_done);
	Editor.canvas_div.style.cursor = "default";
	Editor.current_mode.init_mode();
	e.stopPropagation();
	e.preventDefault();
}