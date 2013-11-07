#Front End Description

m<sub>in</sub> can be broken down into these major parts:

* <b>Editor Modes:</b> m<sub>in</sub>'s mode switching mechanism.
* <b>Event System:</b> m<sub>in</sub>'s response to user actions.
* <b>Segments Types:</b> Currently allows segment types.
* <b>Classification and Recognition:</b> Classification of segment types.
* <b>Canvas object layout:</b> Rendering of bounding boxes on segments.
* <b>Correction menu:</b>Allows user to correct or change recognition.
* <b>Utilities:</b> Includes data structures like Tuples used in m<sub>in</sub>.
* <b>Actions:</b> Defines all possible actions users can perform in m<sub>in</sub>.

Each one of these categories are discussed below.
							
 
##EDITOR MODES

m<sub>in</sub> currently supports two main modes; `DrawMode` and `RectSelectMode`. m<sub>in</sub> switches to the 
`DrawMode` by default when it start up, switches to a different mode when the user clicks 
on the button representing that mode.

In the `DrawMode`, the available operations are: drawing on the canvas, double clicking on
the drawn symbol to change recognition, and typing on the canvas using the keyboard. 
When the user clicks on the canvas, m<sub>in</sub> determines if the user is typing by listening for
keyboard strokes and if the user is drawing by listening to mouse move events. Events are
listened to using jQuery. The event system is described in the next section.

In the `RectSelectMode`, the available operations are: selecting a segment or group of segments
(by clicking on the segment or holding down the mouse and moving the mouse), resizing the
selected segment(s), changing the recognition of the selected segment(s) by double clicking or 
clicking on the open correction menu button that is the third button from the left on the
toolbar or by clicking and holding. When the correction menu appears, the user can change
the recognition by clicking on the correct symbol. See below on how the correction menu works.


Files responsible for implementing the description above are: 

* `Editor.js`
* `Editor.EditorMode.js`
* `Editor.DrawMode.js`
* `Editor.RectSelectMode.js`
* `Editor.SelectionMode.js`

##Event System
									
As m<sub>in</sub> initializes upon window load, it defaults its mode to `DrawMode` which binds
events like mouse down, touchstart, mouse up and touchend events to the canvas. 
To differentiate between touch and desktop devices, we use a third party software called
Modernizr which detects touch devices like the iPad. Upon detection, m<sub>in</sub> figures
out which events to bind automatically by using the `Editor.current_mode.event_strings`
data structure defined in the `EditorMode.js` file. This data structure allows m<sub>in</sub> to keep
track of the events that should be active based on the type of device.

The event system is designed under the idea that the functionality of m<sub>in</sub> can be separated
into two discrete modes: draw mode, and rectangle selection mode. By keeping track of
the modes, we know which functionality should be active and which should not be. Thus when
the user switches from one mode to another, we know exactly which mouse events are bound
and which ones are not. To incorporate additional dependent functionality, one event can
unbind and bind other events. For example, in the rectangle selection mode, the code for 
moving segments should only be active when there are segments already selected. 
In this case, the mouseDown event binds the mouseMove event after it has determined that 
the user has just clicked a segment.

Important files in the new setup are:

* `Editor.PermEvents.js`: This file contains events which are bound when
        m<sub>in</sub> starts and then left alone. This is where the events attached to the
        buttons on the top-bar are located. It also includes code for all drag and drop 
        functionality in m<sub>in</sub>.
* `Editor.EditorMode.js`: This file contains code that will be used by
        all EditorModes. All *Mode style objects have an instance of this object
        at the top of their prototype chain.
* `Editor.DrawMode.js`: This file contains the objects that are used for
        behavior that is active in DrawMode, such as the typing tool and the
        drawing tool.
* `Editor.SelectionMode.js`: This file contains methods that are used when the user is 
      resizing or moving any segment. This is part of the prototype
        chain for selection modes.
* `Editor.RectangleSelectionMode.js`: This contains code specific to
        rectangle selection. When a segment is selected, SelectionMode takes
        over.
    
The event system accepts three types of input: keyboard inputs, pen stroke clicks, and
image files. Each type of input will fire a different function. Keyboard inputs will be
recorded by `Editor.DrawMode.onKeyPress` which sends each character to the SymbolSegment object created
upon keyboard stroke detection and when typing has stopped, the object's `finishEntry` method is 
called. Pen strokes are handled in  `Editor.DrawMode.js` which records the position of the strokes 
when the user moves cursor or hand on the canvas. Image file upload will trigger 
`Editor.Events.onImageLoad` when the image upload button is clicked on the interface toolbar.

##Segments Types
m<sub>in</sub> currently supports three kinds of input objects. There are PenStroke, Images, TeX\_Input. 
TeX\_Input is the class that supports the typing input medium, and these objects are 
discussed in detail below:
 
###PEN STROKES

It is possible to draw directly on a canvas. Strokes drawn in pen mode are displayed as
SVG element elements with a nested polyline (a list of points) displayed on the canvas element.
A stroke is drawn across calls to three event handlers located in `Editor.Events.js`: onMouseDown,
onMouseMove, and onMouseUp. onMouseDown creates the PenStroke object and as the mouse moves,
different points are added to the polyline object inside the SVG stroke element. 
When onMouseUp fires, the SVG element is sent to the Classifier which returns with a
recognition and that recognition is displayed and inserted into the RecognitionManager's
result table. To retrieve a recognition, we use the notion of `set_id` id which basically
allows the system to identify a PenStroke object's recognition. 

Each type of segment on the canvas is unique thus we have two ways of identifying each 
segment and there are: `instance_id` and `set_id`. Each segment has a `instance_id` which is just 
an integer number that identifies the segment. For joined segments or segments that collide 
with each other on the canvas, the colliding segments share a `set_id`. This way, we can easily 
identify and perform operations on the segments as a group. 


###Images

Image objects have similar characteristics that PenStroke objects have but some differences
like the fact that ImageBlobs are generated for image inputs. ImageBlobs are classified
somewhat differently than pen strokes. They have to be broken up into
connected components and then classified. When an ImageBlob is sent to the classifier,
it is returned as multiple connected components and multiple recognitions which are then
added to the canvas.

###TeX_Input

TeX_Input objects require the assistance of a third party library called MathJax to function 
properly. We use MathJax to render the TeX we retrieved from the user and copying the SVG
displayed by MathJax into our own objects and then applying scaling and translation to the
SVG. Note that the SVG returned by MathJax is flipped horizontally so care should be taken
by the programmer.


##Classification and Recognition

After an object is added to the canvas, (except TeX\_Input objects i.e typed symbols) it
is enqueued to be classified using the `RecognitionManager.enqueueSegment()` function which
calls the Classifier's classify method. The Classifier's `classify()` function runs by
sorting the enqueued segments based on which server they need to be sent to for recognition.
The server list is kept in `Editor.Constants.js` and each object type should store a reference
to the one that it needs. Example each PenStroke object has an instance variable called 
classification_server set to "PenStrokeClassifier".

Classification requests are sent using AJAX. The requests are XML, each object is
responsible for generating an XML representation of itself by defining a `toXML()` function.
Responses from the classification servers come back as XML and are used by m<sub>in</sub> to
match the SVG objects to their segment equivalents.

Each object has a unique object ID as well as a set ID that can be shared between
objects on screen. This is so that each stroke can be referenced individually, but also
grouped together as in the horizontal and vertical stroke in the + (plus) symbol.
Objects can manually be grouped together by selecting them and clicking/touching and holding.

Here is an example for each segment type's XML that is to be sent for classification:

* Pen strokes: The XML includes the scale and translation for the stroke. A list of the
				 X and Y coordinates for the points of the stroke is also created.
         
         `<Segment type="pen_stroke" instanceID="0" scale="1,1" translation="401,232"points="0,7|0,6|8,0|9,0|...|32,29|32,30"/>`
         
* Images:	 Just like pen strokes but with the image included in the XML.
				
        `<Segment type="image_blob" instanceID="16" image="dat:image/png..."/>`

Below is an example response from the pen stroke classifier when a two is drawn:
    
    <RecognitionResult instanceIDs="9">
            <Result symbol="2" certainty="0.999..."/>
		    <Result symbol="z_lower" certainty="1.09...E-07"/>
                        .....
		    <Result symbol="infty" certainty="0"/>
    <\RecognitionResult>`


###Alignment Operation
The alignment operation starts when the align button is clicked on by the user which fires
the `Editor.align()` method. The method collects all properties of the segments like translation,
scale, `world_mins` and `world_maxs` and sends it to Draculae which returns a TeX representation
of the input. `world_mins` and `world_maxs` are the lowest coordinate and highest coordinate 
respectively. With the response from Draculae, the front end appends the TeX into a div and 
uses MathJax to render the TeX into an SVG format. To align the segment(s) on the canvas, 
the div with the SVG is position in the center of the canvas and each m<sub>in</sub> segment that matches
the SVG segment is scaled and moved to the location of the SVG segment. 


##CANVAS OBJECT LAYOUT

When an ImageBlob or PenStroke is drawn on the canvas, there are actually two separate
elements shown visually. The first is the blob or stroke which are both SVG objects. 
Adjacent to them in the document and displayed on top of them on the canvas is the OCR 
overlay(bounding box). The OCR overlay is a div with a translucent background color(
depending on the editor state) which is displayed over the blob or penstroke. Its innerHTML 
is the classification for that symbol in some cases an SVG. In some cases means that the 
TeX\_Input segment type doesn't require an SVG to be inserted into its OCR overlay. For 
segments that require SVG in the OCR overlay like PenStroke and Image objects, the 
recognition result for the segment is retrieved and inserted into a div for MathJax to render.
When MathJax is done rendering, the SVG is retrieved and insert into the overlay div. 
This operation is done by the `RenderManager.render_set_field()` function in`RenderManager.js`.

The background color layout is the same for TeX\_Input objects as well.

##CORRECTION MENU

The CorrectionMenu is displayed when the user clicks/touches on a symbol or symbol set and
holds. The menu allows the user to select a different recognition result for a recognized symbol.

The CorrectionMenu and its functions are defined in CorrectionMenu.js. The CorrectionMenu is
populated by a parser in CorrectionMenu.SymbolTree.js which reads an XML file defining the symbols
that appear in the menu as well as categories in the menu. the parseXML() function in
`CorrectionMenu.SymbolTree.js` parses an XML representation of the CorrectionMenu and returns an
object tree representing it.

The XML tree is loaded with m<sub>in</sub> and is started via an AJAX request. This can request either a
file local to m<sub>in</sub> or on a remote server. As of this writing, `example_tree.xml` in the pen\_entry
directory is used.

##UTILITIES

Many functions in m<sub>in</sub> make use of the Vector2 object, which is like a Python 2-tuple but in our case 8-tuple. Most often they are used to represent x,y coordinates. This file also includes many functions for doing math on Vector2s and they are defined in the `Util.js`

##ACTIONS

Many operations that users can perform using m<sub>in</sub> can be encapsulated in an action object.
Action is an interface defined in Action.js which includes the `Undo()` and `Apply()` methods.
Individual kinds of actions are defined in the `Action.*.js` files. Each of these individual
action types implement the Action.js interface, but take different parameters in their
constructors to make the action.
