/*  
	This file is responsible for transferring the MathJax rendered SVG in the 
	div with id Hidden_Tex to the canvas. It is a sub class of the PenStroke file.
	Note: The polyline gotten from the path element has to be converted to an image in order
		  to allow for reclassification. Don't really think editing is gonna happen.
*/
TeX_Input.type_id = 5;    // unique per class
function TeX_Input(MathJax_symbol, in_x, in_y, in_line_width, index){

	// create a subclass of PenStroke
	PenStroke.call(this, in_x, in_y, 6);
	this.MathJax_element =  MathJax_symbol; 	// use_tag_array
	this.screen_position = new Vector2(in_x, in_y);
	this.translation = new Vector2(in_x, in_y);
	this.instance_id = Segment.count++;
	this.index = index; // used to index the RenderManager's segment_set_div
	this.type_id = TeX_Input.type_id;
	this.set_id = Segment.set_count++;
	this.expression_id = Editor.current_expression_id;
	this.chalk_layer = false;
}

// Inserts the MathJax SVG element inside a canvas SVG
TeX_Input.prototype.initialize = function(svg_root, i, type){
	
	// add root_svg and apply appropriate transform here
    this.root_svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.root_svg.setAttribute("class", "Tex_Input");
    this.root_svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    this.root_svg.setAttribute("style", "position: absolute; left: 0px; top: 0px;");
    this.root_svg.setAttribute("width", "100%");
    this.root_svg.setAttribute("height", "100%");
    this.root_svg.setAttribute("opacity", "0.6");
    this.inner_svg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    var new_width = null;
    var new_height = null;
    if(type == "use"){
		this.unicode = this.MathJax_element.getAttribute("href").split("-")[1];
		this.text = String.fromCharCode(parseInt(this.unicode,16));
		this.path_tag = document.getElementById(this.MathJax_element.getAttribute("href").split("#")[1]).cloneNode(true);
		this.path_tag.setAttribute("id","query_symbol_" + (i+1));
		this.inner_svg.appendChild(this.path_tag);
		
    	this.root_svg.appendChild(this.inner_svg);
    	Editor.canvas_div.appendChild(this.root_svg);
    	
    	new_width = parseInt(this.path_tag.getBoundingClientRect().width);
    	new_height = parseInt(this.path_tag.getBoundingClientRect().height);
    	this.element_type = "path";
    	
	}else{ // divisor symbol -> svg rect element
		this.rect_tag = this.MathJax_element.cloneNode();
		this.rect_tag.removeAttribute("x");
		this.rect_tag.removeAttribute("y");
		this.text = "-";
		this.inner_svg.appendChild(this.rect_tag); // Append the rect element
    	this.root_svg.appendChild(this.inner_svg);
   		Editor.canvas_div.appendChild(this.root_svg);
   		
   		// Append polyline points(two points) to polyline
		this.polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
		this.polyline.setAttribute("points", "150,100 300,100");
   		
   		new_width = parseInt(this.rect_tag.getBoundingClientRect().width);
    	new_height = parseInt(this.rect_tag.getBoundingClientRect().height);
    	this.element_type = "rect";
	}
	// Set the size, width and height of the path
    this.size = new Vector2(new_width, new_height);
    
	// Calculate scale from original MathJax rendering which has already been scaled to fit canvas    
    var original_width = parseInt(this.MathJax_element.getBoundingClientRect().width);
    var original_height = parseInt(this.MathJax_element.getBoundingClientRect().height);
    
	var scale = parseFloat((Math.min(original_width / new_width, original_height / new_height)).toFixed(2));
	this.scale = new Vector2(scale,scale);
	
	// Build transform from new scale
	var sb = new StringBuilder();
    sb.append("translate(").append(this.temp_translation.x).append(',').append(this.temp_translation.y).append(") ");
    sb.append("scale(").append(this.temp_scale.x).append(',').append(this.temp_scale.y).append(") ");
    sb.append("translate(").append(this.translation.x).append(',').append(this.translation.y).append(") ");
    sb.append("scale(").append(this.scale.x).append(',').append(this.scale.y).append(')');
    this.inner_svg.setAttribute("transform", sb.toString() + " matrix(1 0 0 -1 0 0)");
    this.element = this.root_svg;
	RenderManager.clear_canvas();
	
	if(type == "use"){
		/* 	Handles all SVG Path computations. It includes: Converting the Path data
			commands to absolute positions, applying path transformation to path data
			commands, parsing the new path data to retrieve the command points so that
			polyline points can be gotten, etc
		*/
		this.get_polyline_points();
	}
}

// Positions the SVG element inside the Bounding Box. Needed it because after the 
// horizontal flip, the SVG element needs to be translated back into the BBox.
TeX_Input.prototype.correct_flip = function(){

	var overlay_height = $(RenderManager.segment_set_divs[this.index]).offset().top;
	var overlay_width = $(RenderManager.segment_set_divs[this.index]).offset().left;
	var element_height = null;
	var element_width = null;
	if(this.element_type == "path"){
		element_height = $(this.path_tag).offset().top;
		element_width = $(this.path_tag).offset().left;
	}else{
		element_height = $(this.rect_tag).offset().top;
		element_width = $(this.rect_tag).offset().left;
	}
	if(parseFloat(overlay_height - element_height) != 0){
		this.flip_offset = parseFloat(overlay_height - element_height);
	}
	if(parseFloat(overlay_width - element_width) != 0){
		this.x_offset = parseFloat(overlay_width - element_width);
	}
	var sb = new StringBuilder();
    sb.append("translate(").append(this.temp_translation.x).append(',').append(this.temp_translation.y).append(") ");
    sb.append("scale(").append(this.temp_scale.x).append(',').append(this.temp_scale.y).append(") ");
    sb.append("translate(").append(this.translation.x + this.x_offset).append(',').append(this.translation.y + this.flip_offset).append(") ");
    sb.append("scale(").append(this.scale.x).append(',').append(this.scale.y).append(')');
    this.inner_svg.setAttribute("transform", sb.toString() + " matrix(1 0 0 -1 0 0)");
}

// Over writing pen_strokes render functions 
TeX_Input.prototype.private_render = function(in_color, in_width)
{
    $(this.element).toggle(this.expression_id == Editor.current_expression_id);
    if (this.dirty_flag == false && this.color == in_color && this.stroke_width == in_width) {
        return;
    }
    this.dirty_flag = false;
    this.color = in_color;
    this.stroke_width = in_width;
    
    // Build transform from new scale and add height offset to y attribute of translation
	// to compensate for the horizontal flip
	if(this.change_offset){
		this.flip_offset = 0;
		this.x_offset = 0;
	}
    var sb = new StringBuilder();
    sb.append("translate(").append(this.temp_translation.x).append(',').append(this.temp_translation.y).append(") ");
    sb.append("scale(").append(this.temp_scale.x).append(',').append(this.temp_scale.y).append(") ");
    sb.append("translate(").append(this.translation.x + this.x_offset).append(',').append(this.translation.y + this.flip_offset).append(") ");
    sb.append("scale(").append(this.scale.x).append(',').append(this.scale.y).append(')');
    this.inner_svg.setAttribute("transform", sb.toString() + " matrix(1 0 0 -1 0 0)");
    
    // Redundant? - yes but needed to make it fit in the box after resizing the element
    if(this.change_offset){
    	this.correct_flip();
    	this.change_offset = false;
    }
}

TeX_Input.prototype.update_extents = function()
{
    return;
}

// just draw using the given context
TeX_Input.prototype.render = function()
{
    this.private_render(Editor.segment_color, Editor.stroke_width);
}

TeX_Input.prototype.worldMinPosition = function()
{
    var min = new Vector2(0,0).transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
    var max = this.size.transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
    
    return new Vector2(Math.min(min.x,max.x), Math.min(min.y, max.y));
}

TeX_Input.prototype.worldMinDrawPosition = function()
{
    var result = this.worldMinPosition();
    result.x += this.line_width ;
    result.y += this.line_width ;
    return result;
}

TeX_Input.prototype.worldMaxPosition = function()
{
    var min = new Vector2(0,0).transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
    var max = this.size.transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
    
    return new Vector2(Math.max(min.x,max.x), Math.max(min.y, max.y));
}

TeX_Input.prototype.worldMaxDrawPosition = function()
{
    var result = this.worldMaxPosition();
    result.x += this.line_width ;
    result.y += this.line_width ;
    return result;
}

// translate by this amount
TeX_Input.prototype.translate = function(in_offset)
{
    this.translation.Add(in_offset);
    
    this.update_extents();
    this.dirty_flag = true;
}

TeX_Input.prototype.resize = function(in_origin, in_scale)
{
    this.temp_scale = new Vector2(in_scale.x, in_scale.y);
    this.temp_translation = Vector2.Subtract(in_origin, Vector2.Pointwise(in_origin, in_scale));
    
    this.update_extents();
    this.dirty_flag = true;
}

TeX_Input.prototype.freeze_transform = function()
{
    // here we move the temp transform info to the final transform
    this.change_offset = true;
    this.translation = Vector2.Add(this.temp_translation, Vector2.Pointwise(this.temp_scale, this.translation));
    this.scale = Vector2.Pointwise(this.scale, this.temp_scale);
	
    this.temp_scale = new Vector2(1,1);
    this.temp_translation = new Vector2(0,0);
    this.dirty_flag = true;
    this.update_extents();
}

// determine if the passed in point (screen space) collides with our geometery
TeX_Input.prototype.point_collides = function(in_position)
{
    var mins = this.worldMinPosition();
    var maxs = this.worldMaxPosition();

    if(in_position.x < mins.x || in_position.x > maxs.x || in_position.y < mins.y || in_position.y > maxs.y)
        return false;
    return true;    
}

TeX_Input.prototype.line_collides = function(point_a, point_b)
{
    if(this.point_collides(point_a) || this.point_collides(point_b))
        return true;
    return false;
}

/* SVG PATH TRANSFORMATIONS AND PATH DATA CONVERSION HAPPENS BELOW */

// Returns the polyline points associated with a path
TeX_Input.prototype.get_points = function(path){
	var points = "";
	var temp = {'x':0, 'y':0}; 			// current point variable
	var cubic_ctrl_1 = {'x':0, 'y':0};	// used as first control point for cubic bezier curve
	var cubic_ctrl_2 = {'x':0, 'y':0};	// used as second control point for cubic bezier curve
	
	var quad_ctrl_1 = {'x':0, 'y':0};	// used as first control point for quadratic bezier curve
	
	var end_point = {'x':0, 'y':0}; 	// used as end point for each bezier curve
	var bezier_points = null;			// holds the points returned from each bezier curve
	var point_array = new Array(); 		// An array to hold the start point, control point(s) and end point
	var last_command = null; 			// Used by shorthand bezier curves (S and T) to determine first ctrl point
	
	for(var i = 0; i < path.pathSegList.numberOfItems; i++){
		var item = path.pathSegList.getItem(i);
		var command = item.pathSegTypeAsLetter;
		if(command == "M"){
			temp.x = parseInt(item.x);
			temp.y = parseInt(item.y);
			points += item.x +","+item.y + " ";
		}else if(command == "L"){ // Line to
			temp.x = parseInt(item.x);
			temp.y = parseInt(item.y);
			points += item.x +","+item.y + " ";
		}else if(command == "H"){ // Horizontal line
			temp.x = parseInt(item.x);
			points += item.x +"," + temp.y + " ";
		}else if(command == "V"){ // Vertical line
			temp.y = parseInt(item.y);
			points += temp.x +","+item.y + " ";
		}else if(command == "C"){ // curve to - order: 3
			cubic_ctrl_1.x = parseInt(item.x1);
			cubic_ctrl_1.y = parseInt(item.y1);
			cubic_ctrl_2.x = parseInt(item.x2);
			cubic_ctrl_2.y = parseInt(item.y2);
			end_point.x = item.x;
			end_point.y = item.y;
			// get bezier curve points and reset current point. item.x and y is end point
			point_array = []; // clear the array
			point_array.push(temp); // starting point for the curve
			point_array.push(cubic_ctrl_1);
			point_array.push(cubic_ctrl_2);
			point_array.push(end_point);
			points += this.get_bezier_points(point_array, 3);
			temp.x = parseInt(item.x);
			temp.y = parseInt(item.y);
		}else if(command == "S"){ // smooth curve to - order: 3
			// The first control point is assumed to be the reflection of the second control
			// point on the previous command relative to the current point
			if(last_command == "C" || last_command == "S"){
				cubic_ctrl_1.x = 2*temp.x - cubic_ctrl_2.x;
				cubic_ctrl_1.y = 2*temp.y - cubic_ctrl_2.y;
			}else{
				// if not C or S, assume coincident with current point
				cubic_ctrl_1.x = temp.x;
				cubic_ctrl_1.y = temp.y;
			}
			ctrl_2.x = parseInt(item.x2);
			ctrl_2.y = parseInt(item.y2);
			// get bezier curve points and reset current point. item.x and y is end point
			point_array = []; // clear the array
			point_array.push(temp); // starting point for the curve
			point_array.push(cubic_ctrl_1);
			point_array.push(cubic_ctrl_2);
			point_array.push(end_point);
			points += this.get_bezier_points(point_array, 3);
			temp.x = parseInt(item.x);
			temp.y = parseInt(item.y);
		}else if(command == "Q"){ // Quadratic Bezier Curve (x1,y1 x,y) - order: 4
			quad_ctrl_1.x = parseInt(item.x1);
			quad_ctrl_1.y = parseInt(item.y1);
			end_point.x = item.x;
			end_point.y = item.y;
			// get bezier curve points and reset current point. item.x and y is end point
			point_array = []; // clear the array
			point_array.push(temp); // starting point for the curve
			point_array.push(quad_ctrl_1);
			point_array.push(end_point);
			points += this.get_bezier_points(point_array, 4);
			temp.x = parseInt(item.x);
			temp.y = parseInt(item.y);
		}else if(command == "T"){ // smooth quadratic Bézier curve to - order: 4
			if(last_command == "Q" || last_command == "T"){
				quad_ctrl_1.x = 2*temp.x - quad_ctrl_1.x;
				quad_ctrl_1.y = 2*temp.y - quad_ctrl_1.y;
			}else{
				// if not Q or T, assume coincident with current point
				quad_ctrl_1.x = temp.x;
				quad_ctrl_1.y = temp.y;
			}
			end_point.x = item.x;
			end_point.y = item.y;
			// get bezier curve points and reset current point. item.x and y is end point
			point_array = []; // clear the array
			point_array.push(temp); // starting point for the curve
			point_array.push(quad_ctrl_1);
			point_array.push(end_point);
			points += this.get_bezier_points(point_array, 4);
			temp.x = parseInt(item.x);
			temp.y = parseInt(item.y);
		}else if(command == "A"){ // elliptical Arc
			points += this.convert_arc_to_bezier(temp,item,false); // Arc to Cubic bezier
			temp.x = parseInt(item.x);
			temp.y = parseInt(item.y);
		}
		last_command = command;
	}
	return points;
}

// Converts an arc command to cubic bezier curve using Raphael Library's path2curve method
// Raphael is small javascript library that has svg functions needed by programmers daily
TeX_Input.prototype.convert_arc_to_bezier = function(temp,arc,recursive){
	// Create a new path command so Raphael can convert it to cubic bezier curve
	var path = "M " + temp.x + "," + temp.y + " A " + arc.r1 + "," + arc.r2 + " " + arc.angle;
	if(arc.largeArcFlag){
		path += " 1";
	}else{
		path += " 0";
	}
	if(arc.sweepFlag){
		path += ",1 ";
	}else{
		path += ",0 ";
	}
	path += arc.x + "," + arc.y;
	var c_bezier = Raphael.path2curve(path);
	var points = "";
	var cubic_ctrl_1 = {'x':0, 'y':0};	// used as first control point for cubic bezier curve
	var cubic_ctrl_2 = {'x':0, 'y':0};	// used as second control point for cubic bezier curve
	var end_point = {'x':0, 'y':0}; 	// used as end point for each bezier curve
	for(var i = 1; i < c_bezier.length; i++){ //skip move to command
		cubic_ctrl_1.x = parseInt(c_bezier[i][1]);
		cubic_ctrl_1.y = parseInt(c_bezier[i][2]);
		cubic_ctrl_2.x = parseInt(c_bezier[i][3]);
		cubic_ctrl_2.y = parseInt(c_bezier[i][4]);
		end_point.x = parseInt(c_bezier[i][5]);
		end_point.y = parseInt(c_bezier[i][6]);
		// get bezier curve points and reset current point. item.x and y is end point
		point_array = []; // clear the array
		point_array.push(temp); // starting point for the curve
		point_array.push(cubic_ctrl_1);
		point_array.push(cubic_ctrl_2);
		point_array.push(end_point);
		points += this.get_bezier_points(point_array, 3);
		temp.x = parseInt(end_point.x);
		temp.y = parseInt(end_point.y);
	}
	return points;
}

// Implements a simple linear interpolation between two points
TeX_Input.prototype.calc_point =  function(a,b,t){

	var dest = {'x':0, 'y':0};
	dest.x = a.x + (b.x - a.x) * t;
    dest.y = a.y + (b.y - a.y) * t;
    return dest;
}

// Gets a point on the bezier curve. t ranges from 0 to 1
// The smaller t is, more accurate the point is
TeX_Input.prototype.bezier = function(data, order, t){
	var point = null;
	if(order == 3){ // cubic bezier curve
		var ab = this.calc_point(data[0], data[1],t); // mid point btw a and b
		var bc = this.calc_point(data[1], data[2],t); // mid point btw b and c
		var cd = this.calc_point(data[2], data[3],t); // mid point btw c and d
		var abbc = this.calc_point(ab, bc,t);		  // mid point btw ab and bc
		var bccd = this.calc_point(bc, cd,t);		  // mid point btw bc and cd
		point = this.calc_point(abbc, bccd,t);	  // point on bezier curve
		
	}else{ 			// Quadratic bezier curve
		var ab = this.calc_point(data[0], data[1],t); // mid point btw a and b
		var bc = this.calc_point(data[1], data[2],t); // mid point btw b and c
		point = this.calc_point(ab, bc, t);		  // point on the bezier curve
	}
	return point;
}

// A function that returns the points along a bezier curve
// The smaller t is, more accurate the point is
TeX_Input.prototype.get_bezier_points = function(data, order){
	var points = "";
	for(var i = 0; i < 10; i++){
		var t = parseFloat(i/9.0);
		var point = this.bezier(data, order, t);
		if(i != 0){ // stop repetition of start point since already in points string above
			points += parseFloat(point.x.toFixed(2)) + "," + parseFloat(point.y.toFixed(2)) + " ";
		}
	}
	return points;
}

TeX_Input.prototype.get_polyline_points = function(){
	// Get the path tag, flip it horizontally because transformation is only applied to 
	// g element which the 'this.path_tag' is inside of, then convert all to their absolute coordinates
	// Created this root svg because firefox requires the path element to be in the document 
	// before the getCTM() method can be applied. 
	var root = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	root.setAttribute("style", "visibility:hidden");
	var path = this.path_tag.cloneNode(true);
	path.setAttribute("transform", "matrix(1 0 0 -1 0 0)");
	root.appendChild(path);
	document.body.appendChild(root);
	var CTM = path.getCTM();
	this.absolutizePath(path);
	
	// Transform each data point in the path by applying horizontal flip transformation
	var new_path = document.createElementNS("http://www.w3.org/2000/svg", "path");// Will be the path with new data
	var lastAbsolutePosition = this.root_svg.createSVGPoint();
	for(var i = 0; i < path.pathSegList.numberOfItems; i++){
        var seg = path.pathSegList.getItem(i);
        var command = seg.pathSegTypeAsLetter;
		if(command == "M"){
			var p1 = this.transformPoint(seg.x, seg.y,CTM);
			lastAbsolutePosition.x = seg.x;
			lastAbsolutePosition.y = seg.y;
			var newSeg = new_path.createSVGPathSegMovetoAbs(p1.x, p1.y);
			new_path.pathSegList.appendItem(newSeg);
		}else if(command == "L"){
			var p1 = this.transformPoint(seg.x, seg.y ,CTM);
			lastAbsolutePosition.x = seg.x;
			lastAbsolutePosition.y = seg.y;
			var newSeg = new_path.createSVGPathSegLinetoAbs(p1.x, p1.y);
			new_path.pathSegList.appendItem(newSeg);
		}else if(command == "H"){
			var p1 = this.transformPoint(seg.x, lastAbsolutePosition.y, CTM);
			lastAbsolutePosition.x = seg.x;
			var newSeg = new_path.createSVGPathSegLinetoAbs(p1.x, p1.y);
			new_path.pathSegList.appendItem(newSeg);
		}else if(command == "V"){
			var p1 = this.transformPoint(lastAbsolutePosition.x, seg.y, CTM);
			lastAbsolutePosition.y = seg.y;
			var newSeg = new_path.createSVGPathSegLinetoAbs(p1.x, p1.y);
			new_path.pathSegList.appendItem(newSeg);
		}else if(command == "C"){
			var p1 = this.transformPoint(seg.x, seg.y, CTM);
			var p2 = this.transformPoint(seg.x1, seg.y1, CTM);
			var p3 = this.transformPoint(seg.x2, seg.y2, CTM);
			var newSeg = new_path.createSVGPathSegCurvetoCubicAbs(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
			lastAbsolutePosition.x = seg.x;
			lastAbsolutePosition.y = seg.y;
			new_path.pathSegList.appendItem(newSeg);
		}else if(command == "S"){ 
			var p1 = this.transformPoint(seg.x, seg.y, CTM);
			var p3 = this.transformPoint(seg.x2, seg.y2, CTM);
			var newSeg = new_path.createSVGPathSegCurvetoCubicSmoothAbs(p1.x, p1.y, p3.x, p3.y);
			lastAbsolutePosition.x = seg.x;
			lastAbsolutePosition.y = seg.y;
			new_path.pathSegList.appendItem(newSeg);
		}else if(command == "Q"){ 
			var p1 = this.transformPoint(seg.x, seg.y, CTM);
			var p2 = this.transformPoint(seg.x1, seg.y1, CTM);
			var newSeg = new_path.createSVGPathSegCurvetoQuadraticAbs(p1.x, p1.y, p2.x, p2.y);
			lastAbsolutePosition.x = seg.x;
			lastAbsolutePosition.y = seg.y;
			new_path.pathSegList.appendItem(newSeg);
		}else if(command == "T"){ 
			var p1 = this.transformPoint(seg.x, seg.y, CTM);
			var newSeg = new_path.createSVGPathSegCurvetoQuadraticSmoothAbs(p1.x, p1.y);
			lastAbsolutePosition.x = seg.x;
			lastAbsolutePosition.y = seg.y;
			new_path.pathSegList.appendItem(newSeg);
		}else if(command == "A"){
			var p1 = this.transformPoint(seg.x, seg.y, CTM);
			var rot = Math.atan(t.c/t.d)*(180/Math.PI)
			var newSeg = new_path.createSVGPathSegArcAbs(p1.x, p1.y, seg.r1, seg.r2, seg.angle-rot, seg.largeArcFlag, seg.sweepFlag);
			lastAbsolutePosition.x = seg.x;
			lastAbsolutePosition.y = seg.y;
			new_path.pathSegList.appendItem(newSeg);
		}else{ // Z - close Path
			var newSeg = new_path.createSVGPathSegClosePath();
			new_path.pathSegList.appendItem(newSeg);
		}
    }
	path.removeAttribute("transform"); // remove transform
	document.body.removeChild(root); // remove root
	
	// Create polyline and append polyline points from path to polyline
	this.polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
	var polyline_points = this.get_points(new_path);
	this.polyline.setAttribute("points", polyline_points.toString());
}

// Transform each data point parsed in using the CTM
TeX_Input.prototype.transformPoint = function(x,y,CTM){
	point = this.root_svg.createSVGPoint();
	point.x = x;
	point.y = y;
	point = point.matrixTransform(CTM);
	return point;
} 

/* 	Converts all path data to its absolute coordinates, simplifies the parsing
	This is gotten from a Stack OverFlow Solution - refer to the website below
http://stackoverflow.com/questions/9677885/convert-svg-path-to-absolute-commands/9677915#9677915
 The method below works and I tested it several times before using it.
*/
TeX_Input.prototype.absolutizePath = function(path){
	var x0,y0,x1,y1,x2,y2,segs = path.pathSegList;
  	for(var x=0,y=0,i=0,len=segs.numberOfItems;i<len;++i){
		var seg = segs.getItem(i), c=seg.pathSegTypeAsLetter;
    	if (/[MLHVCSQTA]/.test(c)){
      		if ('x' in seg)
      			x=seg.x;
      		if ('y' in seg) 
      			y=seg.y;
    	}else{
			if ('x1' in seg)
				x1=x+seg.x1;
		  	if ('x2' in seg)
		  		x2=x+seg.x2;
		  	if ('y1' in seg) 
		  		y1=y+seg.y1;
		  	if ('y2' in seg)
		  		y2=y+seg.y2;
		  	if ('x'  in seg)
		  		x+=seg.x;
		  	if ('y'  in seg)
		  		y+=seg.y;
		  	switch(c){
				case 'm': 
					segs.replaceItem(path.createSVGPathSegMovetoAbs(x,y),i);
					break;
				case 'l':
					segs.replaceItem(path.createSVGPathSegLinetoAbs(x,y),i);                   
					break;
				case 'h':
					segs.replaceItem(path.createSVGPathSegLinetoHorizontalAbs(x),i);           
					break;
				case 'v':
					segs.replaceItem(path.createSVGPathSegLinetoVerticalAbs(y),i);             
					break;
				case 'c': 
					segs.replaceItem(path.createSVGPathSegCurvetoCubicAbs(x,y,x1,y1,x2,y2),i); 
					break;
				case 's':
					segs.replaceItem(path.createSVGPathSegCurvetoCubicSmoothAbs(x,y,x2,y2),i); 
					break;
				case 'q': 
					segs.replaceItem(path.createSVGPathSegCurvetoQuadraticAbs(x,y,x1,y1),i);   
					break;
				case 't': 
					segs.replaceItem(path.createSVGPathSegCurvetoQuadraticSmoothAbs(x,y),i);   
					break;
				case 'a': 
					segs.replaceItem(path.createSVGPathSegArcAbs(x,y,seg.r1,seg.r2,seg.angle,seg.largeArcFlag,seg.sweepFlag),i);   
					break;
				case 'z': case 'Z': x=x0; y=y0; break;
			}
		}
		// Record the start of a subpath
		if (c=='M' || c=='m'){
			x0=x;
			y0=y;
		}
	}
}
