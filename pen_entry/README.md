#m<sub>in</sub>  
	
##System Description
The name of the interface is called m<sub>in</sub> short for Math Input. m<sub>in</sub> is 
designed to make it easier to include mathematical expressions in your search
queries. Math expressions are drawn on the canvas, with keywords entered in a
standard text box. Recognized expressions are converted to text and combined
with the keywords. Queries in m<sub>in</sub> can be searched for using the included search
engine options in the interface. 
Search engine options include but not limited to: Wolfram Alpha, Google, or Wikipedia.

m<sub>in</sub>'s major component is the drawing canvas. The canvas is where images can be added,
strokes drawn, and where OCR overlays(bounding boxes) appear over symbols on the canvas. 
The toolbar at the top allows the user to switch between different modes such as
draw mode, and rectangle selection mode. 
The folder-like button allows users to upload images, though this currently only works
on browsers that include the window.FileReader object.

The far right bar includes features for math display and search. Pressing the  X<sup>2</sup> button
will align the symbols and display the LaTeX using the slider widget. 
The drop-down menu can be used to select a search engine. Pressing enter in the search
box or clicking microscope starts the search process in a new window. 

Currently supported engines are: Tangent, NIST DLMF, Wolfram Alpha, Google, Wikipedia, and LaTeX Search.

##Documentation
This file should serve as a starting point for developers who are interested in
understanding the underlying operations that occur within m<sub>in</sub>. Each file associated with 
m<sub>in</sub> has a brief and concise overview of major operations of the file and how it is used 
within the system. In addition to the file descriptions, there is a readme in the pen_entry
folder that summarizes how m<sub>in</sub> works.

Also, visit m<sub>in</sub>'s [tutorial page](http://saskatoon.cs.rit.edu/min_instructions/) to watch
video instructions on how to use m<sub>in</sub>.

##Installation / Download
m<sub>in</sub>'s front end is web application hence it doesn't require any installation. However, 
the back end runs runs a series of web services that the front end needs to function like the two 
classifiers and draculae. Commands required to start them up are:

* Draculae: To be filled in.
* Lei Classifier: To be filled in.
* Image Recognition: To be filled in.

All files and services relating to m<sub>in</sub> can be downloaded from the 
[software tab of the lab](http://www.cs.rit.edu/~dprl/Software.html) or via this GitHub account. 


##Supported Input Media
m<sub>in</sub> supports three different input media and they are: drawing, images, and typing
on the canvas. Any of these input media can be combined during a single session, thereby 
making m<sub>in</sub> a multimodal system. These input media are discussed documentation readme file.

##Browser Compatibility
m<sub>in</sub> has been works on all dominant webkit and gecko based browsers, and has bee tested on Chrome, 
Firefox, and Safari.

##m<sub>in</sub>'s Ports
m<sub>in</sub> makes use of two ports when online:

* Pen Recognition: Port 1504 is used for stroke classification and recognition.
* Image Recognition: Port 7006 is used for image classification and recognition.
* Dracular: Port 1000 is used for aligning the expressions on the canvas.

To change any of these ports, the port numbers and remote address can be changed in the 
Editor.Constants.js file in the pen_entry folder. Currently, m<sub>in</sub>'s remote address is: 
<http://129.21.34.109:> with the port number appended to the remote address based on the classification type.

##How to use m<sub>in</sub>
There are two ways to run m<sub>in</sub>:

* Downloading the project and opening the index.xhtml in any browser, and gosting the server services on a server.
Requires minimal website hosting knowledge.
	   
When the page is loaded, you can draw, type or input images into m<sub>in</sub>. When drawing, the 
recognition is inserted onto the canvas. For typed expressions, the expressions 
are inserted when the user is done typing and can be signified by clicking on the canvas again
or hitting the return key. For images, the image upload button can be clicked on to pop up
an upload window.

m<sub>in</sub> also allows segment(s) on the canvas to be deleted, resized, and translated to a 
different location. When the desired expression is formulated on the canvas, the expression
can be aligned by pressing the X<sup>2</sup> button on the toolbar which aligns the expression by scaling and 
positioning each segment. To search using the expression, select a search engine on the drop
down menu on the toolbar's far right, type keyword(s) to go with the expression in the 
keywords box, and finally hit the giant glass button. When the search button is clicked, 
m<sub>in</sub> opens a new tab and sends the expression on the canvas as LaTeX to the chosen search
engine.

##Dependencies
m<sub>in</sub>'s front end depends on the following libraries and will be included project upon download: 

* The library that is responsible for both making the symbols on the canvas look pretty is the MathJax library and
it can be found at: <http://www.mathjax.org/>
* Pinch transformations of interface objects were implemented using the Hammer.js library which can be found at 
<http://eightmedia.github.com/hammer.js/> as of July 2012.
* The slider widget used on the interface is called iosSlider, and the slider
  widget can found at: <https://iosscripts.com/iosslider/>
* The library used for successfully converting path elements to polyline points 
  gotten from MathJax was the Raphael library and it can be found at: <http://raphaeljs.com/>
* The event system makes use of jQuery events and jQuery can be found at: <http://jquery.com/>

In addition, the back end depends on the following programming languages:

* MatLab
* Python
* C Sharp

*Visit the [DPRL page](http://www.cs.rit.edu/~dprl/index.html) for more information about the lab and projects.*

*Contributors: Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker, Christopher Sasarak, Robert LiVolsi,
Awelemdy Orakwue, and Richard Zanibbi [Document and Pattern Recognition Lab, RIT](http://www.cs.rit.edu/~dprl/Software.html)*

*This material is based upon work supported by the National Science Foundation under Grant No. IIS-1016815.
 Any opinions, findings and conclusions or recommendations expressed in this material are those of the author(s) 
 and do not necessarily reflect the views of the National Science Foundation.*