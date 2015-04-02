/*
 * Initializes iosSlider.
 */
function Slider() {
	this.slider_div = $('.iosSlider');
	this.slider_div.iosSlider({
		// Size
		snapToChildren: true,
		// Remove drag (only move forward!)
		desktopClickDrag: false,
		// keyboardControls: false,
		navNextSelector: $('#right'),
		// RZ: disable left button.
		// navPrevSelector: $('#left'),
		onSlideStart: this.slideStart,
		onSlideComplete: this.slideComplete,
		onSlideChange: this.slideChange
	});
	this.expressions = [''];
	this.fileNames = [''];
	this.states = [''];
	this.bsts = [''];
}

/*
 * Gets the TeX expression for the current slide.
 */
Slider.prototype.getCurrentExpression = function() {
	var curSlide = this.slider_div.data('args').currentSlideNumber - 1;
	return this.expressions[curSlide];
}

Slider.prototype.getCurrentFileName = function() {
	var curSlide = this.slider_div.data('args').currentSlideNumber - 1;
	return this.fileNames[curSlide];
}

Slider.prototype.getCurrentState = function() {
	var curSlide = this.slider_div.data('args').currentSlideNumber - 1;
	return this.states[curSlide];
}

Slider.prototype.getCurrentBst = function() {
	var curSlide = this.slider_div.data('args').currentSlideNumber - 1;
	return this.bsts[curSlide];
}



// Restore state on arriving at the next slide.
Slider.prototype.slideComplete = function(args) {
		var current = args.currentSlideNumber - 1;
		Editor.restore_state( Editor.slider.states[current] );
		Editor.stroke_string = Editor.getStrokeString();
}

// On starting to move to the next slide, save the current state, and
// empty the canvas.
Slider.prototype.slideStart = function(args) {
	var current = args.currentSlideNumber - 1;
	// DEBUG: this save_state needs to be passed false,
	// otherwise recognition results are wiped clean.
	Editor.slider.states[current] = 
		Editor.save_state(false);

	var current = args.currentSlideNumber - 1;
	file = Editor.slider.fileNames[current];
	expression = Editor.slider.expressions[current];
	
	// This filters empty entries.
	if (Editor.segments.length > 0 && expression != "")
	{
		if (! Editor.dataCollection) {
			inkML = Editor.getInkML();
			outString = inkML + "\n" + Editor.slider.bsts[current];

			$.post(Editor.gtannotate_server_url, {user_id: file, json_state: outString }, function() {console.log('Wrote ' + file+ ' over post server');});
		} else {
			state = Editor.save_state(true);
			$.post(Editor.gtdraw_server_url, {user_id: file, json_state: state }, function() {console.log('Wrote ' + file + ' over post server');});
		
		}

	}

	// Use formal actions to remove objects from the canvas.
	action = new DeleteSegments(Editor.segments);
	actionTwo = new DeleteSegments(Editor.selected_segments);
	action.Apply();
	actionTwo.Apply();
	Editor.selected_segments.length = 0;
	Editor.segments.length = 0;
	
	// Clear undo/redo. Prevents being able to 'write' earlier expressions
	// and other confusing behavior.
	Editor.undo_stack.length = 0;
	Editor.undo_stack = new Array();
	Editor.redo_stack.length = 0;
	Editor.redo_stack = new Array();
}

/*
 * Changes the selectors below the slider.  Called whenever a slide changes.
 */
Slider.prototype.slideChange = function(args) {
	$('.selectors .item').removeClass('selected');
	$('.selectors .item:eq(' + (args.currentSlideNumber - 1) + ')').addClass('selected');
}

/*
 * Adds a slide to the slider, updating the list of expressions and the position indicator.
 */
Slider.prototype.addSlide = function() {
	//console.log('addSlide()');
	this.expressions.push('');
	this.fileNames.push('');
	this.states.push("{\"segments\":[],\"recognition_results\":[]}");
	this.bsts.push('');

	var slidePosition = $(".slider")[0].childElementCount;
	var slideHTML = "<div class = 'item'></div>";
	$(".selectors").append("<div class = 'item'></div>"); // Appends a selector
	this.slider_div.iosSlider('addSlide', slideHTML, slidePosition+1); //Plus one because the Slider's  addSlide method in the javascript subtracts one from the position passed in.
	MathJax.Hub.Queue(["Typeset",MathJax.Hub]); // Calls MathJax to render the new slide
	this.mathJaxUpdate(); //Makes each slide fit in the slider's view screen

	this.slider_div.iosSlider('goToSlide', slidePosition + 1);
}

/*
 * Updates the TeX for the current slide and rerenders it.
 */
Slider.prototype.updateSlide = function(fileName, tex) {
	var curSlide = this.slider_div.data('args').currentSlideNumber - 1;
	$(this.slider_div.find('.slider>.item')[curSlide]).text('\\[' + tex + '\\]');
	this.expressions[curSlide] = tex;

	if (fileName != null)
		this.fileNames[curSlide] = fileName;
	MathJax.Hub.Queue(["Typeset",MathJax.Hub]); // Calls MathJax to render the new slide
	this.mathJaxUpdate();
}

Slider.prototype.updateBST = function(bsts) {
	var curSlide = this.slider_div.data('args').currentSlideNumber - 1;
	this.bsts[curSlide] = bsts;
}



/*
 * Adds a slide to the slider, updating the list of expressions and the position indicator.
 */
Slider.prototype.removeSlide = function() {
	var currentSlideNumber = this.slider_div.data('args').currentSlideNumber;
	var numberOfSlides =  this.slider_div.data('args').data.numberOfSlides;
	if (numberOfSlides == 1) {
		// If only one slide, just empty it.
		this.updateSlide('','');
		this.fileNames = [''];
		this.bsts = [''];
		this.states = [''];
	}
	else {
		this.expressions.splice(currentSlideNumber - 1, 1);
		this.fileNames.splice(currentSlideNumber - 1, 1);
		this.states.splice(currentSlideNumber - 1, 1);
		this.bsts.splice(currentSlideNumber - 1, 1);

		$(".selectors :last-child").remove();
		this.slider_div.iosSlider('removeSlide', currentSlideNumber);
		this.slideChange({currentSlideNumber: this.slider_div.data('args').currentSlideNumber});
	}
}

/**
 * Renders the current slide and then called resizeToFit when rendered.
 */
Slider.prototype.mathJaxUpdate = function() {
	var currentSlideNumber = this.slider_div.data('args').currentSlideNumber - 1;
	var NumberofSlides =  $('.iosSlider').data('args').data.numberOfSlides;
	var currentSlide  = $('.slider').children()[currentSlideNumber];
	MathJax.Hub.Queue(["Rerender",MathJax.Hub, currentSlide], [$.proxy(this.resizeToFit, this)]);
}

/**
 * Makes the current slide 5% smaller, rerenders, which then calls this function again.
 */
Slider.prototype.resizeToFit = function() {
	var currentSlideNumber = this.slider_div.data('args').currentSlideNumber - 1;
	var NumberofSlides =  $('.iosSlider').data('args').data.numberOfSlides;
	var currentSlide  = $('.slider').children()[currentSlideNumber];
	try{
		var slideWidth = currentSlide.getElementsByClassName('MathJax_Display')[0].scrollWidth;
	}catch(e){
		return;
	}
	var slideHeight = currentSlide.getElementsByClassName('MathJax_Display')[0].scrollHeight;
	var containerWidth =  $('.slider').width();
	var containerHeight =  $('.slider').height();
	var percent = currentSlide.style.fontSize ? parseFloat(currentSlide.style.fontSize) : 100.0;
	if (percent > 50 && (slideWidth > containerWidth || slideHeight > containerHeight)){ //font size and width
		var percent = percent - 5;
		currentSlide.style.fontSize =  percent + "%";
		MathJax.Hub.Queue(["Rerender",MathJax.Hub, currentSlide], [$.proxy(this.resizeToFit, this)]);
	}

}
