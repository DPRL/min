/*
 * Initializes iosSlider.
 */
function Slider() {
	this.slider_div = $('.iosSlider');
	this.slider_div.iosSlider({
		snapToChildren: true,
		desktopClickDrag: true,
		keyboardControls: true,
		navNextSelector: $('#right'),
		navPrevSelector: $('#left'),
		onSlideChange: this.slideChange
	});
	this.expressions = [''];
}

/*
 * Gets the TeX expression for the current slide.
 */
Slider.prototype.getCurrentExpression = function() {
	var curSlide = this.slider_div.data('args').currentSlideNumber - 1;
	return this.expressions[curSlide];
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
	this.expressions.push('');
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
Slider.prototype.updateSlide = function(tex) {
	var curSlide = this.slider_div.data('args').currentSlideNumber - 1;
	$(this.slider_div.find('.slider>.item')[curSlide]).text('\\[' + tex + '\\]');
	this.expressions[curSlide] = tex;
	MathJax.Hub.Queue(["Typeset",MathJax.Hub]); // Calls MathJax to render the new slide
	this.mathJaxUpdate();
}

/*
 * Adds a slide to the slider, updating the list of expressions and the position indicator.
 */
Slider.prototype.removeSlide = function() {
	var currentSlideNumber = this.slider_div.data('args').currentSlideNumber;
	var numberOfSlides =  this.slider_div.data('args').data.numberOfSlides;
	if (numberOfSlides == 1) {
		// If only one slide, just empty it.
		this.updateSlide('');
	}
	else {
		this.expressions.splice(currentSlideNumber - 1, 1);
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
	var slideWidth = currentSlide.getElementsByClassName('MathJax_Display')[0].scrollWidth;
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
