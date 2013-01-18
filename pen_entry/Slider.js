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

/**This function calls MathJax and has MathJax rerender the slides and make slides whose width is greater than the view screen smaller**/
Slider.prototype.mathJaxUpdate = function(div) {
	var divs = $('.slider .MathJax');
	var ParentDivWidth = document.getElementsByClassName('iosSlider')[0].offsetWidth;
	for (var i = 0; i < divs.length; i++){
		if(divs[i].offsetWidth > ParentDivWidth){
			var percent = Math.floor( (ParentDivWidth / divs[i].offsetWidth) * 90); // Set the scaling factor
			divs[i].style.fontSize = percent + "%"; //Changing the font-size of the math expression not the parent div
			MathJax.Hub.Queue(["Rerender",MathJax.Hub, divs[i]]);
		}
		
	}
}
