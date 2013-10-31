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
strokes drawn, and where OCR overlays(bounding boxes) appear over symbols on the canvas. 
The toolbar at the top allows the user to switch between different modes such as
draw mode, and rectangle selection mode. 
The folder-like button allows users to upload images, though this currently only works
on browsers that includes the window.FileReader object.

The far right bar includes features for math display and search. Pressing the "X^2" button
will align the symbols and display the LaTeX using the slider widget. 
The drop-down menu can be used to select a search engine. Pressing enter in the search
box or clicking microscope starts the search process in a new window. Currently supported
engines are: Tangent, NIST DLMF, Wolfram Alpha, Google, Wikipedia, and LaTeX Search.

									Documentation
									-------------
This file should serve as a starting point for developers who are interested in
understanding the underlying operations that occur within Min. Each file associated with 
Min has a brief and concise overview of major operations of the file and how it is used 
within the system. In addition to the file descriptions, there is a readme in the pen_entry
folder that summarizes in great detail how Min works.
Also, visit: http://saskatoon.cs.rit.edu/min_instructions/ for tutorial videos on how to 
use Min.

									Installation / Download
									-----------------------
Min is web application therefore it doesn't require any installation. It runs mainly on 
the web and can be utilized by touch based devices like the iPad or any android device.
The latest version of Min can be downloaded from the software menu of the DPRL @ RIT's 
homepage or via the public GitHub account for the project.


									Supported Input Mediums
									-----------------------
Min supports three different input mediums and there are: drawing, images, and typing
on the canvas. Any of these input mediums can be combined during a single session, thereby 
making Min a MultiModal system. These input mediums are discussed in detail in the sections
below.

									Browser Compatibility
									---------------------
Min works on all dominant web browsers like FireFox, Chrome, and Safari. Min has mainly been
tested on these browsers.

									Min's Ports
									-----------
Min makes use of two ports when online:
	Port 1: 1504 used for stroke classification and recognition.
	Port 2: 7006 used for image classification and recognition.
To change any of the ports, the port number and remote address can be changed in the 
Editor.Constants.js file. Currently, min's remote address is: "http://129.21.34.109:" with
the port number appended to the remote address based on the classification type.

									How to use Min
									--------------
There are two ways to run min:
	1) Downloading the project and opening the index.xhtml in any browser.
	2) Hosting the project on a server. This methods requires the user to open a port and
	   requires website hosting knowledge.
	   
When the page is loaded, you can draw, type or input images into Min. When drawing, the 
recognition inserted immediately to the canvas. For typed expressions, the expressions are
inserted when the user is done typing and can be signified by clicking on the canvas again
or hitting the return key. For images, the image upload button can be clicked on to pop up
an upload window.

Min also allows segment(s) on the canvas can be deleted, resized, and translated to a 
different location. When the desired expression is formulated on the canvas, the expression
can be aligned by pressing the "X^2" button. Alignment properly scales and positions each 
individual segment. To search using the expression, select a search engine on the drop
down menu on the toolbar's far right, type keyword(s) to go with the expression in the 
keywords box, and finally hit the giant glass button. When the search button is clicked, 
Min opens a new tab and sends the expression on the canvas as LaTeX to the chosen search
engine.
									Library Dependencies
									--------------------
Min depends on the following libraries: 
-	The library that is responsible for both making the symbols on the canvas look 
	pretty is the MathJax library and it can be found at: http://www.mathjax.org/
	
-	Pinch transformations of interface objects were implemented using the Hammer.js 
    library which can be found at http://eightmedia.github.com/hammer.js/ as of July 2012.
  	
-  	The slider widget used on the interface is called iosSlider, and the slider
	widget can found at: https://iosscripts.com/iosslider/

-	The library used for successfully converting path elements to polyline points 
	gotten from MathJax was the Raphael library and it can be found at: http://raphaeljs.com/
	
- 	The event system makes use of jQuery events and jQuery can be found at: http://jquery.com/




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

In the DrawMode, the available operations are: drawing on the canvas, double clicking on
the drawn symbol to change recognition, and typing on the canvas using the keyboard. 
When the user clicks on the canvas, Min determines if the user is typing by listening for
keyboard strokes and if the user is drawing by listening to mouse move events. Events are
listened to using jQuery. The event system will be described in the next section.

In the RectSelectMode, the available operations are: selecting a segment or group of segments
(by clicking on the segment or holding down the mouse and moving the mouse), resizing the
selected segment(s), changing the recognition of the selected segment(s) by double clicking or 
clicking on the open correction menu button that is the third button from the left on the
toolbar or by clicking and holding. When the correction menu appears, the user can change
the recognition by clicking on the correct symbol. See below on how the correction menu works.

Files such as: Editor.js, Editor.EditorMode.js, Editor.DrawMode.js, 
				Editor.RectSelectMode.js, and Editor.SelectionMode.js are responsible for 
				simulating the description above.

									Event System
									------------
									
As Min initializes upon window load, it defaults its mode to the DrawMode which binds
events like mouse down, touchstart, mouse up and touchend events to the canvas. 
To differentiate between touch and desktop devices, we use a third party software called
Modernizr which detects the various device types. Upon device type detection, Min figures
out which events to bind automatically by checking the "Editor.current_mode.event_strings"
data structure defined in the EditorMode.js file. This data structure allows Min to keep
track of the events that should be active based on the type of device.

The event system is designed under the idea that the functionality of Min can be separated
into several discrete modes: Draw Mode, and Rectangle Selection Mode. By keeping track of
the modes, we know which functionality should be active and which should not be. Thus when
the user switches from one mode to another, we know exactly which mouse events are bound
and which ones are not. To incorporate additional dependent functionality one event can
unbind and bind other events. For example, in either of the selection modes, the code for 
moving segments should only be bound/active when there are segments already selected. 
In this case, the mouseDown event binds the mouseMove event after it has determined that 
the user has just clicked a segment. Note that the selection modes share functionality and
that all events have EditorMode at the top of their prototype chain.

Important files in the new setup are:
    Editor.PermEvents.js: This file contains events which are bound when
        Min starts and then left alone. This is where the events attached to the
        buttons on the top-bar are located. It also includes code for all drag and drop 
        functionality in Min.
    Editor.EditorMode.js: This file contains code that will be used by
        all EditorModes. All *Mode style objects have an instance of this object
        at the top of their prototype chain.
    Editor.DrawMode.js: This file contains the objects that are used for
        behavior that is active in DrawMode, such as the typing tool and the
        drawing tool.
    Editor.SelectionMode.js: This file contains methods that are used when the user is 
    	resizing or moving any segment. This is part of the prototype
        chain for selection modes.
    Editor.RectangleSelectionMode.js: This contains code specific to
        rectangle selection. When a segment is selected, SelectionMode takes
        over.
The event system accepts three types of input: keyboard inputs, pen strokes, and
image files. Each type of input will fire a different function. Keyboard input will be
recorded by Editor.DrawMode which sends each character to the SymbolSegment object created
upon keyboard stroke detection. When the user is done typing, the SymbolSegment's object's 
finishEntry is called. Pen strokes will activate Editor.DrawMode which records
the position of the strokes when the user moves cursor or hand on the canvas.
Image file upload will trigger Editor.Events.onImageLoad when the image upload button is 
clicked on the interface toolbar.

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

									Min's Ports
									-----------
Min makes use of two ports when online:
	Port 1: 1504 used for stroke classification and recognition.
	Port 2: 7006 used for image classification and recognition.
To change any of the ports, the port number and remote address can be changed in the 
Editor.Constants.js file. Currently, min's remote address is: "http://129.21.34.109:" with
the port number appended to the remote address based on the classification type.


									Alignment Operation
									-------------------
The alignment operation starts when the align button is clicked on by the user which fires
the Editor.align method. The method collects all properties of the segments like translation,
scale, world_mins and world_maxs and sends it to Draculae which returns a TeX representation
of the input. "world_mins" and "world_maxs" are the lowest coordinate and highest coordinate 
respectively. With the response from Draculae, the front end appends the TeX into a div and 
uses MathJax to render the TeX into an SVG format. To align the segment(s) on the canvas, 
the div with the SVG is position in the center of the canvas and each Min segment that matches
the SVG segment is scaled and moved to the location of the SVG segment. 


									CANVAS OBJECT LAYOUT
									--------------------

When an ImageBlob or PenStroke is drawn on the canvas, there are actually two separate
elements shown visually. The first is the blob or stroke which are both SVG objects. 
Adjacent to them in the document and displayed on top of them on the canvas is the OCR 
overlay. The OCR overlay is a div with a translucent background color(depending on the 
editor state) which is displayed over the blob or penstroke. Its innerHTML is the 
classification for that symbol. The overlay is added by the RenderManager in the 
render_set_field() function of RenderManager.js.

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

The XML tree is loaded with Min and is started via an AJAX request. This can request either a
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
