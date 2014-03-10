/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	This file contains objects which represent segments added to the canvas via keyboard.

    Methods:
		addCharacter: Add another character to this SymbolSegment.
		popCharacter: Remove a character from this SymbolSegment.
		finishEntry: This function takes the string in this SymbolSegment and uses the 
					TeX_Input class to render the typed in expression.

*/

SymbolSegment.count = 0;
SymbolSegment.type_id = 3;
SymbolSegment.chalk_layer = false;

function SymbolSegment(in_position) {
    this.instance_id = Segment.count++;
    this.type_id = SymbolSegment.type_id;
    this.set_id = Segment.set_count++;
    this.expression_id = Editor.current_expression_id;
    
    this.chalk_layer = SymbolSegment.chalk_layer;
    
    this.layer = 2;
    
    this.text = "";
    this.text_width = 0;
    this.text_height = 32;
    
    this.scale = new Vector2(1.0, 1.0);
    this.translation = in_position.clone();
    
    this.temp_scale = new Vector2(1.0, 1.0);
    this.temp_translation = new Vector2(0.0, 0.0);
    
    this.size = new Vector2(0, 0);
    
    this.world_mins = in_position.clone();
    this.world_maxs = in_position.clone();
    
    this.is_empty = true;
    
    this.textDiv = $('<div/>', {
        'class': 'textDiv'
    });

    this.textDiv.appendTo(Editor.canvas_div);
    this.element = this.textDiv[0];
    this.render();
}
// adds a character to the div
SymbolSegment.prototype.addCharacter = function(in_char) {
    this.is_empty = false;
    this.text += in_char;
    this.update_extents();

    // Render is required.
    this.render();
};

// adds a space to the div
SymbolSegment.prototype.addSpace = function() {
    this.is_empty = false;
    this.text += '-';
    this.update_extents();

    // Render is required.
    this.render();
    this.textDiv.text(' ');
};
// removes the last character added
SymbolSegment.prototype.popCharacter = function() {
    if(this.text.length > 0) {
        this.text = this.text.substring(0, this.text.length - 1);
        this.update_extents();
        this.render();
    }
};

// This method converts the individual characters in the current
// object to a list of individual characters on the canvas,
// when the user clicks elsewhere (focus is lost).
SymbolSegment.prototype.finishEntry = function() {
    //letters = this.text.split("");

    // Don't record the temporary text object.
    var action = new DeleteSegments(new Array(this));
    action.Apply();
    
    var elem = document.createElement("div");
	elem.setAttribute("id","SymbolSegment_Tex");
	elem.style.visibility = "hidden"; 		// Hide the element
	elem.style.position = "absolute";
	elem.style.fontSize = "800%";
	elem.innerHTML = '\\[' + this.text + '\\]'; 	// So MathJax can render it
	document.body.appendChild(elem); 		// don't forget to remove it later
	
	// Change renderer to svg and make sure it has been processed before calling
	// SymbolSegment's callBack
	var translation = this.translation.clone();
	MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "SVG"],["Typeset",MathJax.Hub,elem], 
			[SymbolSegment.stub,elem,translation]);

};

// Scales the Tex to fit canvas width and height before insertion
// Moved here because many classes will make use of it
SymbolSegment.scale_tex = function(elem,translation){
	var equation_canvas_width = $("#equation_canvas")[0].offsetWidth;
	var equation_canvas_height = $("#equation_canvas")[0].offsetHeight;
	var MathJax_div = document.getElementsByClassName("MathJax_SVG")[0].firstChild.getBoundingClientRect();
	var math_width = Math.round(MathJax_div.width) + translation.x;
	var math_height = Math.round(MathJax_div.height) + translation.y;
	if(math_width > (equation_canvas_width-20) || math_height > (equation_canvas_height-20)){ 
		elem.style.fontSize = (parseInt(elem.style.fontSize.split("%")[0]) - 10) + "%";
		MathJax.Hub.Queue(["Rerender",MathJax.Hub,elem], [$.proxy(SymbolSegment.scale_tex(elem, translation), this)]);
	}else{
		return;
	}
}

// Method that just helps with the recursion in scale_tex
SymbolSegment.stub = function(elem,translation){
	SymbolSegment.scale_tex(elem, translation); // scale tex
	SymbolSegment.switch_to_svg(elem,translation);
	document.body.removeChild(elem); // Remove elem from document body (Import done)
}

// Copies the rendered SVG in elem to the canvas
SymbolSegment.switch_to_svg = function(elem,translation){
	var svg_root = document.getElementsByClassName("MathJax_SVG")[0].firstChild;
	var use_tag_array = svg_root.getElementsByTagName("use");
	var rect_tag_array = svg_root.getElementsByTagName("rect");
	var default_position = translation; // Mouse down point
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
		var in_x = parseInt((default_position.x + offset.left-initial_offset.left).toFixed(2));
		var in_y = parseInt((default_position.y + offset.top-initial_offset.top).toFixed(2));
		var pen_stroke = new TeX_Input(elements_array[i], in_x, in_y, 6, null);
		pen_stroke.initialize(svg_root, i, elements_array[i].tagName.toString());
		
		// Add the pen_stroke object to the Editor
		Editor.add_action(new AddSegments(new Array(pen_stroke)));
		Editor.add_segment(pen_stroke);
		RenderManager.render();
		pen_stroke.correct_flip();
		Editor.state = EditorState.ReadyToStroke;
		RecognitionManager.addRecognitionForText(pen_stroke);
	}
	MathJax.Hub.Queue(["setRenderer", MathJax.Hub, "HTML-CSS"]);
}

// Used to implement inheritance
function subclassOf(base){
	_subclassOf.prototype= base.prototype;
    return new _subclassOf();
}
function _subclassOf() {};

SymbolSegment.prototype.render = function() {        

    transform = 'translate(' + this.temp_translation.x + 'px,' + this.temp_translation.y + 'px) ';
    transform += 'scale(' + this.temp_scale.x + ',' + this.temp_scale.y + ') ';
    transform += 'translate(' + this.translation.x + 'px,' + this.translation.y + 'px) ';
    transform += 'scale(' + this.scale.x + ',' + this.scale.y + ') ';
    
    this.textDiv.css('-webkit-transform', transform);
    this.textDiv.css('-moz-transform', transform);
    
    
    this.textDiv.text(this.text);
    
    this.size = new Vector2($(this.textDiv).outerWidth(), $(this.textDiv).outerHeight());
};

SymbolSegment.prototype.render_selected = function() {
    this.render();
};

SymbolSegment.prototype.point_collides = function(in_position) {
    var mins = this.worldMinPosition();
    var maxs = this.worldMaxPosition();

    if(in_position.x < mins.x || in_position.x > maxs.x || in_position.y < mins.y || in_position.y > maxs.y) {
        return false;
    }
    return true;    
};

SymbolSegment.prototype.rectangle_collides = function(in_corner_a, in_corner_b) {
    var mins = new Vector2();
    var maxs = new Vector2();
    if(in_corner_a.x < in_corner_b.x) {
        mins.x = in_corner_a.x;
        maxs.x = in_corner_b.x;
    }
    else {
        mins.x = in_corner_b.x;
        maxs.x = in_corner_a.x;
    }
    
    if(in_corner_a.y < in_corner_b.y) {
        mins.y = in_corner_a.y;
        maxs.y = in_corner_b.y;
    }
    else {
        mins.y = in_corner_b.y;
        maxs.y = in_corner_a.y;
    }

    var my_mins = this.worldMinPosition();
    var my_maxs = this.worldMaxPosition();
    
    if(maxs.x < my_mins.x || mins.x > my_maxs.x) return false;
    if(maxs.y < my_mins.y || mins.y > my_maxs.y) return false;
    
    return true;
};

SymbolSegment.prototype.line_collides = function(point_a, point_b) {
    if(this.point_collides(point_a) || this.point_collides(point_b))
        return true;
    return false;
};

SymbolSegment.prototype.translate = function(in_offset) {
    this.translation.Add(in_offset);
    
    this.update_extents();
};

SymbolSegment.prototype.update_extents  = function() {
    // because scale can be negative, this gives us opposing corners, not mins and maxs
    var corner_a = new Vector2(0,0).transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
    var corner_b = Vector2.Add(corner_a, Vector2.Pointwise(Vector2.Pointwise(this.size, this.scale), this.temp_scale));
    
    // figure out the actual mins and maxs based on absolute position
    if(corner_a.x < corner_b.x) {
        this.world_mins.x = corner_a.x;
        this.world_maxs.x = corner_b.x;
    }
    else {
        this.world_mins.x = corner_b.x;
        this.world_maxs.x = corner_a.x;
    }
    
    if(corner_a.y < corner_b.y) {
        this.world_mins.y = corner_a.y;
        this.world_maxs.y = corner_b.y;
    }
    else {
        this.world_mins.y = corner_b.y;
        this.world_maxs.y = corner_a.y;
    }
};

SymbolSegment.prototype.worldMinPosition = function() {
    return this.world_mins.clone();
};

SymbolSegment.prototype.worldMaxPosition = function() {
    return this.world_maxs.clone();    
};

SymbolSegment.prototype.worldMinDrawPosition = function() {
    return this.world_mins.clone();
};

SymbolSegment.prototype.worldMaxDrawPosition = function() {
    return this.world_maxs.clone();    
};

SymbolSegment.prototype.resize = function(in_origin, in_scale) {
    this.temp_scale = new Vector2(in_scale.x, in_scale.y);
    this.temp_translation = Vector2.Subtract(in_origin, Vector2.Pointwise(in_origin, in_scale));
    
    this.update_extents();
};

SymbolSegment.prototype.freeze_transform = function() {
    // here we move the temp transform info to the final transform
    this.translation = Vector2.Add(this.temp_translation, Vector2.Pointwise(this.temp_scale, this.translation));
    this.scale = Vector2.Pointwise(this.scale, this.temp_scale);

    this.temp_scale = new Vector2(1,1);
    this.temp_translation = new Vector2(0,0);
    
    this.update_extents();
};

SymbolSegment.prototype.isEmpty = function() {
    return this.is_empty;
};

SymbolSegment.prototype.save_state = function() {
    var state = {
        instance_id: this.instance_id,
        type_id: this.type_id,
        set_id: this.set_id,
        text: this.text,
        scale: this.scale,
        translation: this.translation,
        temp_scale: this.temp_scale,
        temp_translation: this.temp_translation
    };
    return state;
}

SymbolSegment.restore_state = function(state) {
    seg = new SymbolSegment(0,0);
    seg.instance_id = state.instance_id;
    seg.set_id = state.set_id;
    seg.text = state.text;
    seg.scale = new Vector2(state.scale.x, state.scale.y);
    seg.translation = new Vector2(state.translation.x, state.translation.y);
    seg.temp_scale = new Vector2(state.temp_scale.x, state.temp_scale.y);
    seg.temp_translation = new Vector2(state.temp_translation.x, state.temp_translation.y);
    seg.render();
    seg.update_extents();
    return seg;
}

SymbolSegment.prototype.toXML = function() {
    var sb = new StringBuilder();
    sb.append("<Segment type=\"symbol\" instanceID=\"");
    sb.append(String(this.instance_id));
    sb.append("\" scale=\"").append(this.scale.toString());
    sb.append("\" translation=\"").append(this.translation.toString());
    sb.append("\" text=\"").append(this.text).append("\"/>");
    //sb.append("\" text=\"").append(this.text).append("\" scale=\"");
    //sb.append(this.scale.toString()).append("\" translation=\"").append(this.translation.toString()).append("\"/>");
    return sb.toString();
};
