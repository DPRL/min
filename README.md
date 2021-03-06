# min
Author: Awelemdy Orakwue, February 21, 2014

*Contributors: Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker, Christopher Sasarak, Robert LiVolsi,
Awelemdy Orakwue, and Richard Zanibbi Document and Pattern Recognition Lab, RIT*
* * *

The name of the interface is called min short for Math Input. min is 
designed to make it easier to include mathematical expressions in your search
queries. Math expressions are drawn on the canvas, with keywords entered in a
standard text box. Recognized expressions are converted to text and combined
with the keywords. Queries in min can be searched for using the included search
engine options in the interface. 
Search engine options include but not limited to: Tangent, Wolfram Alpha, Google, or Wikipedia.

min's major component is the drawing canvas. The canvas is where images can be added,
strokes drawn, and where OCR overlays(bounding boxes) appear over symbols on the canvas. 
The toolbar at the top allows the user to switch between different modes such as
draw mode, and rectangle selection mode. 
The folder-like button allows users to upload images, though this currently works
on browsers that include the `window.FileReader` object.

The far right bar includes features for math display and search. Pressing the X2 button
will align the symbols and display the LaTeX using the slider widget. 
The drop-down menu can be used to select a search engine. Pressing enter in the search
box or clicking microscope starts the search process in a new window.

Currently supported engines are: Tangent, NIST DLMF, Wolfram Alpha, Google, Wikipedia, and LaTeX Search.

## Documentation
* * *
This file should serve as a starting point for developers who are interested in
understanding the underlying operations that occur within min. Each file associated with 
min has a brief and concise overview of major operations of the file and how it is used 
within the system. In addition to the file descriptions, there is `Documentation.md` included with the system files that summarizes how min works.

Also, visit min's tutorial page at http://saskatoon.cs.rit.edu/min_instructions to watch video instructions on how to use min.

## Installation / Download
* * *
min's front end is web application hence it doesn't require any installation. However, the back end runs runs a series of web services that the front end needs to function like the two classifiers and draculae. Each back end service has a start script, `start.sh` that starts the classifier on a specific port supplied in the arguments Below are the run commands:

* Draculae:
        
        nohup draculae_server.exe > server.out 2> server.err &
* Lei Classifier: 
        
        CLASSIFIER_PORT = 1504
        CLASSIFIER_ROOT ="classifier6_linux_serial"
        MATLAB_BINARY ="matlab"
        MATLAB_ARGS ="-nosplash -nodisplay -r \"[Symbol_Prior_Probability, Hmm_Parameter] = load_prior_and_hmmparameter;\""
        
        nohup mono lei_classifier.exe CLASSIFIER_PORT CLASSIFIER_ROOT $MATLAB_BINARY "$MATLAB_ARGS" > classify.out 2> classify.err &
* Image Recognition:
        
        nohup python ImageRecognitionServer.py 7006 > server.out 2> server.err &

Where `server.out and classify.out` are output files and `server.err and classify.err` are error log files.

All files and services relating to min can be downloaded from the software tab of the lab website or via GitHub. Once the files have been downloaded, they can be 
uploaded to a web server or hosted. This installation technique requires that `index.xhtml` be pointed to for the website source. The other installation technique
is simple and it can done by going to the downloaded files and opening the `index.xhtml` in web browser for instance Firefox or Chrome.

The web services required by the front end accepts only XML formatted inputs and the formats are described in the `Documentation.md` under Classification and Recognition section.

## Supported Input Media
* * *
min supports three different input media and they are: drawing, images, and typing
on the canvas. Any of these input media can be combined during a single session, thereby 
making min a multimodal system. These input media are discussed in the documentation readme file.

## Browser Compatibility
* * *
min works on all dominant webkit and gecko based browsers, and has been tested on Chrome, 
Firefox, and Safari.

## min's Ports
* * *
min by default makes use of three ports when online:

* Pen Recognition: Port 1504 is used for stroke classification and recognition.
* Image Recognition: Port 7006 is used for image classification and recognition.
* Draculae: Port 1000 is used for aligning the expressions on the canvas.

To change any of these ports, the port numbers and remote address can be changed in the 
`Editor.Constants.js` file in the pen_entry folder. Currently, min's remote address is: 
http://129.21.34.109: with the port number appended to the remote address based on the classification type of the segment.

## Usage
* * *
Video tutorials on how to use min can be found at http://saskatoon.cs.rit.edu/min_instructions. There are two ways to run min which requires backend services like pen classifier, image classifier and draculae to be running. The first method is by downloading the project opening the index.xhtml in any browser, and the second method is by hosting the min on a server which requires minimal website hosting knowledge.

When the page is loaded, you can draw, type or input images into min. When drawing, the 
recognition is inserted onto the canvas. For typed expressions, the expressions 
are inserted when the user is done typing and can be signified by clicking on the canvas again
or hitting the return key. For images, the image upload button can be clicked on to pop up
an upload window.

min also allows segment(s) on the canvas to be deleted, resized, and translated to a 
different location. When the desired expression is formulated on the canvas, the expression
can be aligned by pressing the X2 button on the toolbar which aligns the expression by scaling and 
positioning each segment. To search using the expression, select a search engine on the drop
down menu on the toolbar's far right, type keyword(s) to go with the expression in the 
keywords box, and finally hit the giant glass button. When the search button is clicked, 
min opens a new tab and sends the expression on the canvas as LaTeX to the chosen search
engine.

## Dependencies
* * *
min's front end depends on the following libraries and will be included project upon download:

* The library that is responsible for both making the symbols on the canvas look pretty is the MathJax library and it can be found at: http://www.mathjax.org/
* Pinch transformations of interface objects were implemented using the Hammer.js library which can be found at http://eightmedia.github.com/hammer.js/ as of July 2012.
* The slider widget used on the interface is called iosSlider, and the slider widget can found at: https://iosscripts.com/iosslider/
* The library used for successfully converting path elements to polyline points gotten from MathJax was the Raphael library and it can be found at: http://raphaeljs.com/
* The event system makes use of jQuery events and jQuery can be found at: http://jquery.com/

In addition, the services implemented in the back end depend on the following programming languages:

* MatLab
* Python
* C Sharp

* * *

*Visit the DPRL page for more information about the lab and projects.*

*This material is based upon work supported by the National Science Foundation under Grant No. IIS-1016815.
Any opinions, findings and conclusions or recommendations expressed in this material are those of the author(s) 
and do not necessarily reflect the views of the National Science Foundation.*