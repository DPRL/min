									SYSTEM DESCRIPTION
									------------------

The name of the interface is called Min short for Math Input. Min is 
designed to make it easier to include mathematical expressions in your search
queries. Math expressions are drawn on the canvas, with keywords entered in a
standard text box. Recognized expressions are converted to text and combined
with the keywords. Queries in min can be searched for using the included search
engine options in the interface. 
Search engine options include but not limited to: Wolfram Alpha, Google, or Wikipedia.

Min's major component is the drawing canvas. The canvas is where images can be added,
strokes drawn, and where OCR overlays appear over symbols on the canvas. 
The toolbar at the top allows the user to switch between different modes such as
draw mode, and rectangle selection mode. 
The folder-like button allows users to upload images, though this currently only works
on desktop machines and machines including the window.FileReader object.

The far right bar includes features for math display and search. Pressing the "X^2" button
will align the symbols and display the LaTeX using the slider widget. 
The drop-down menu can be used to select a search engine. Pressing enter in the search
box or clicking microscope starts the search process in a new window. Currently supported
engines are: Tangent, NIST DLMF, Wolfram Alpha, Google, Wikipedia, and LaTeX Search.

									Documentation
									-------------

This file should serve as a starting point for developers who are interested in
understanding the underlying operations that occur within Min. Each file 
associated with Min has a brief and concise overview of major operations of 
the file and how it is used within the system. In addition to the file descriptions,
there is a readme in the pen_entry folder that summarizes in great detail how Min works. '
Also, visit: http://saskatoon.cs.rit.edu/min_instructions/ for tutorial videos on how to 
use Min.

									Installation
									------------

Min is web application therefore it doesn't require any installation. 
It runs mainly on the web and can be utilized by touch based devices
like the iPad or any android device.


									Downloading
									-----------

The latest version of Min can be downloaded from the software menu of the 
DPRL @ RIT's homepage or via the public GitHub account for the project.


									Supported Systems
									-----------------

Because Min is a web application, it can function in any operating system 
provided the system has a web browser installed.

									Input Modes
									-----------
									
Min supports three different input mediums and there are: drawing, images, and typing
on the canvas. Any of these input mediums can be combined during a single session, thereby 
making Min a MultiModal system. These input mediums are discussed in detail in the sections
below.

							Discussion of Technical Details:
							--------------------------------
							
Technical details about how Min works starts here. To initialize Min, open the "index.xhtml"
file in web browser and Min should start up by calling Editor.initialize method inside the 
Editor.js file upon window load. The discussion of Min will start 
							
 
									EDITOR MODES
									------------

Min currently supports two main modes; DrawMode and RectSelectMode. Min switches to the 
DrawMode by default when it start up, switches to a different mode when the user clicks 
on the button representing that mode.

In the DrawMode, the available operations are drawing on the canvas, double clicking on
the drawn symbol to change recognition, and typing on the canvas using the keyboard. 
When the user clicks on the canvas, Min determines if the user is typing by listening to
keyboard strokes and if the user is drawing by listening to mouse move events. Events are
listened to using jQuery. 

In the RectSelectMode, the available operation are selecting a segment or group of segments
(by clicking on the segment or holding down the mouse and moving the mouse), resizing the
segment(s), changing the recognition of the selected segment(s) by double clicking or 
with the segment(s) selected, clicking on the open correction menu button that is the third
button from the left on the toolbar. When the correction menu appears, the user can change
the recognition by clicking on the correct symbol. See below on how the correction menu works.

Files such as: Editor.js, Editor.Events, Editor.EditorMode.js, Editor.DrawMode.js, 
				Editor.RectSelectMode.js, and Editor.SelectionMode.js are responsible for 
				simulating the description above.


									Segments / Objects
									------------------
Min currently supports three kinds of input objects. There are PenStroke, Images, TeX_Input. 
TeX_Input is the class that supports the typing input medium, and these objects are 
discussed in detail below:
 
PEN STROKES:

It is possible to draw directly on a canvas. Strokes drawn in pen mode are displayed as
SVG element elements with a nested polyline (a list of points) displayed on the canvas element.
A stroke is drawn across calls to three event handlers located in Editor.Events.js: onMouseDown,
onMouseMove, and onMouseUp. onMouseDown creates the PenStroke object and as the mouse moves,
different points are added to the polyline object inside the SVG stroke element. 
When onMouseUp fires, the SVG element is sent to the Classifier which returns with a
recognition and that recognition is displayed and inserted into the RecognitionManager's
result table. To retrieve a recognition, we use the notion of set_id id which basically
allows the system to identify a PenStroke object's recognition.

Images:

Image objects have similar characteristics that PenStroke objects have but some differences
like the fact that ImageBlobs are generated for image inputs. ImageBlobs are classified
somewhat differently than pen strokes. They have to be broken up into
connected components and then classified. When an ImageBlob is sent to the classifier,
it is returned as multiple connected components and multiple recognitions which are then
added to the canvas.

TeX_Input:

TeX_Input objects require the assistance of a third party library called MathJax to function 
properly. We use MathJax to render the TeX we retrieved from the user and copying the SVG
displayed by MathJax into our own objects and then applying scaling and translation to the
SVG. Note that the SVG returned by MathJax is flipped horizontally so care should be taken
by the programmer.

									CLASSIFICATION / RECOGNITION
									----------------------------

After an object is added to the canvas, (except TeX_Input objects i.e typed symbols) it
is enqueued to be classified using the RecognitionManager.enqueueSegment() function which
calls the Classifier's classify method. The Classifier's classify() function runs by
sorting the enqueued segments based on which server they need to be sent to for recognition.
The server list is kept in Editor.Constants.js and each object type should store a reference
to the one that it needs. Example PenStroke uses 'PenStrokeClassifier'.

Classification requests are sent using AJAX. The requests are XML, each object is
responsible for generating an XML representation of itself by defining a toXML() function.
Responses from the classification servers come back as XML and are then used by Min to
match the SVG objects to their segment equivalents.

Each object has a unique object ID as well as a set ID that can be shared between
objects on screen. This is so that each stroke can be referenced individually, but also
grouped together as in the horizontal and vertical stroke in the + (plus) symbol.
Objects can manually be grouped together by selecting them and clicking/touching and holding.

ImageBlobs are classified somewhat differently than pen strokes. They have to be broken up into
connected components and then classified. When an ImageBlob is sent to the classifier, it is
returned as multiple connected components and multiple recognitions which are then added to the
canvas.

									CANVAS OBJECT LAYOUT
									--------------------

When an ImageBlob or PenStroke is drawn on the canvas, there are actually two separate elements
shown visually. The first is the blob or stroke which are both SVG objects. Adjacent to them in the
document and displayed on top of them on the canvas is the OCR overlay. The OCR overlay is a DIV
with a translucent background color(depending on the editor state) which is displayed over the
blob or penstroke. Its innerHTML is the classification for that symbol. The overlay is added by the
RenderManager in the render_set_field() function of RenderManager.js.

The background color layout is the same for TeX_Input objects as well.

									CORRECTION MENU
									---------------

The CorrectionMenu is displayed when the user clicks/touches on a symbol or symbol set and
holds. The menu allows the user to select a different recognition result for a recognized symbol.

The CorrectionMenu and its functions are defined in CorrectionMenu.js. The CorrectionMenu is
populated by a parser in CorrectionMenu.SymbolTree.js which reads an XML file defining the symbols
that appear in the menu as well as categories in the menu. the parseXML() function in
CorrectionMenu.SymbolTree.js parses an XML representation of the CorrectionMenu and returns an
object tree representing it.

The XML tree is loaded with Min and is first started via an AJAX request. This can request either a
file local to Min or on a remote server. As of this writing, example_tree.xml in the pen_entry
directory is used.

											UTILS
											-----

Many functions in Min make use of the Vector2 object, which is like a Python 2-tuple.
Most often they are used to represent x,y coordinates. This file also includes many
functions for doing math on Vector2s.

											ACTIONS
											-------

Many operations that users can perform using Min can be encapsulated in an action object.
Action is an interface defined in Action.js which includes the Undo() and Apply() methods.
Individual kinds of actions are defined in the Action.*.js files. Each of these individual
action types implement the Action.js interface, but take different parameters in their
constructors to make the action.


Acknowledgements:

-	The library that is responsible for both making the symbols on the canvas look 
	pretty is the MathJax library and it can be found at: http://www.mathjax.org/
	
-	Pinch transformations of interface objects were implemented using the Hammer.js 
    library which can be found at http://eightmedia.github.com/hammer.js/ as of July 2012.

- 	The upload icon used on the interface is from the Tango Icon Library which can be
	found at http://tango.freedesktop.org/Tango_Icon_Library
  	as of July 2012.
  	
-  	The slider widget used on the interface is from the famous iosSlider, and the slider
	widget can found at: https://iosscripts.com/iosslider/

-	The library used for successfully converting path elements gotten from MathJax was
	the Raphael library and it can be found at: http://raphaeljs.com/
	

  

