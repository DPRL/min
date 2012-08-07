// NOTE: this is the class for characters.

SymbolSegment.count = 0;
SymbolSegment.type_id = 3;
SymbolSegment.chalk_layer = false;

function SymbolSegment(in_position) {
    this.instance_id = Segment.count++;
    this.type_id = SymbolSegment.type_id;
    this.set_id = Segment.set_count++;
    
    this.chalk_layer = SymbolSegment.chalk_layer;
    
    this.layer = 2;
    
    this.text = "";
    this.text_width = 0;
    this.text_height = 32;
    
    this.scale = new Vector2(1.0, 1.0);
    this.translation = new Vector2(in_position.x, in_position.y);
    
    this.temp_scale = new Vector2(1.0, 1.0);
    this.temp_translation = new Vector2(0.0, 0.0);
    
    this.size = new Vector2(0, 0);
    
    this.world_mins = new Vector2(in_position.x, in_position.y);
    this.world_maxs = new Vector2(in_position.x, in_position.y);
    
    this.is_empty = true;
    
    this.textDiv = $('<div/>', {
        'class': 'textDiv'
    });

    this.textDiv.appendTo(Editor.canvas_div);
    this.element = this.textDiv[0];
    this.render();
}

SymbolSegment.prototype.addCharacter = function(in_char) {
    this.is_empty = false;
    this.text += in_char;
    this.update_extents();

    // Render is required.
    this.render();
};


SymbolSegment.prototype.addSpace = function() {
    this.is_empty = false;
    this.text += '-';
    this.update_extents();

    // Render is required.
    this.render();
    this.textDiv.text(' ');
};

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
    letters = this.text.split("");

    // Don't record the temporary text object.
    var action = new DeleteSegments(new Array(this));
    action.Apply();

    console.log(letters);
    origin = this.worldMinPosition();
    for(var i = 0; i < letters.length; i++) {
        var s = new SymbolSegment(origin);

        if (letters[i] == " ") {
            s.addSpace();
        } else {
            s.addCharacter(letters[i]);
            Editor.add_action(new AddSegments(new Array(s)));
            Editor.add_segment(s);

            RecognitionManager.addRecognitionForText(s);
        }

        s.update_extents();
        origin.x = s.worldMaxPosition().x + 2;
    }

};

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
