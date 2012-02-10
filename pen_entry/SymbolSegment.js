SymbolSegment.count = 0;
SymbolSegment.type_id = 3;

 function SymbolSegment(in_position)
 {
	this.instance_id = Segment.count++;
	this.type_id = SymbolSegment.type_id;
	this.set_id = Segment.set_count++;
	
//	this.position = new Vector2(in_position.x,in_position.y);
	
	//this.size = new Vector2(50,50);
	
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
		class: 'textDiv'
	});

	this.textDiv.appendTo(Editor.canvas_div);
	this.render();
 }
 
 SymbolSegment.prototype.addCharacter = function(in_char)
 {
	this.is_empty = false;
	this.text += in_char;
	var context = Editor.contexts[0];
	this.clear(context)
	
	context.fillStyle = "#111111";
	context.font = "bold 32px sans-serif";
	this.text_width = context.measureText(this.text).width;	

	this.size = new Vector2(this.text_width, this.text_height);
	
	this.update_extents();
	this.render(context);
 }
 
 SymbolSegment.prototype.popCharacter = function()
 {
	if(this.text.length > 0)
	{
		this.text = this.text.substring(0, this.text.length - 1);
		var context = Editor.contexts[0];
		this.clear(context)
		context.fillStyle = "#111111";
		context.font = "bold 32px sans-serif";
		this.text_width = context.measureText(this.text).width;	

		this.size = new Vector2(this.text_width, this.text_height);
		
		this.update_extents();
		this.render(context);
	}
 }

SymbolSegment.prototype.clear = function(context) {
	context.clearRect(this.world_mins.x, this.world_mins.y, this.world_maxs.x, this.world_maxs.y);
}
 
 SymbolSegment.prototype.render_with_color = function(in_context, in_color)
 {	
	
	RecognitionManager.addRecognitionForText(this);
	
	transform = 'translate(' + this.temp_translation.x + 'px,' + this.temp_translation.y + 'px) ';
	transform += 'scale(' + this.temp_scale.x + ',' + this.temp_scale.y + ') ';
	transform = 'translate(' + this.translation.x + 'px,' + this.translation.y + 'px) ';
	transform += 'scale(' + this.scale.x + ',' + this.scale.y + ') ';
	
	this.textDiv.css('-webkit-transform', transform);
	this.textDiv.text(this.text);
 
	// if(this.text != "")
	// {
	// 	in_context.save();
	// 	in_context.fillStyle = in_color;
	// 	in_context.font = "bold 32px sans-serif";
	// 	this.text_width = in_context.measureText(this.text).width;	
	// 
	// 	in_context.translate(total_translation.x, total_translation.y);
	// 	in_context.scale(total_scale.x, total_scale.y);
	// 	
	// 	in_context.textAlign = "left";
	// 	in_context.textBaseline = "top";
	// 	//in_context.fillText(this.text, this.position.x, this.position.y);
	// 	in_context.fillText(this.text, 0, 0);
	// 	in_context.restore();
	// }
	// // render vertical bar after
	// 
	// if(Editor.current_text == this)
	// {
	// 	in_context.lineWidth = 2;
	// 	in_context.beginPath();
	// 
	// 	in_context.moveTo(total_translation.x + this.text_width * total_scale.x + 5, total_translation.y);
	// 	in_context.lineTo(total_translation.x + this.text_width * total_scale.x + 5, total_translation.y + this.text_height * total_scale.y);
	// 	
	// 	in_context.stroke();
	// }
 }
 
 SymbolSegment.prototype.render = function(in_context)
 {
	if(in_context == null) {
		in_context = Editor.contexts[0];
	}
	this.render_with_color(in_context, Editor.segment_color);
 }
 
 SymbolSegment.prototype.render_selected = function(in_context)
 {
	if(in_context == null) {
		in_context = Editor.contexts[0];
	}
	this.render_with_color(in_context, Editor.selected_segment_color);
 }
 
 SymbolSegment.prototype.point_collides = function(in_position)
 {
	var mins = this.worldMinPosition();
	var maxs = this.worldMaxPosition();

	if(in_position.x < mins.x || in_position.x > maxs.x || in_position.y < mins.y || in_position.y > maxs.y)
		return false;
	return true;	
 }
 
 SymbolSegment.prototype.rectangle_collides = function(in_corner_a, in_corner_b)
 {
	var mins = new Vector2();
	var maxs = new Vector2();
	if(in_corner_a.x < in_corner_b.x)
	{
		mins.x = in_corner_a.x;
		maxs.x = in_corner_b.x;
	}
	else
	{
		mins.x = in_corner_b.x;
		maxs.x = in_corner_a.x;
	}
	
	if(in_corner_a.y < in_corner_b.y)
	{
		mins.y = in_corner_a.y;
		maxs.y = in_corner_b.y;
	}
	else
	{
		mins.y = in_corner_b.y;
		maxs.y = in_corner_a.y;
	}
 
	var my_mins = this.worldMinPosition();
	var my_maxs = this.worldMaxPosition();
	
	if(maxs.x < my_mins.x || mins.x > my_maxs.x) return false;
	if(maxs.y < my_mins.y || mins.y > my_maxs.y) return false;
	
	return true;
 }
 
 SymbolSegment.prototype.line_collides = function(point_a, point_b)
 {
	if(this.point_collides(point_a) || this.point_collides(point_b))
		return true;
	return false;
 }
 
 SymbolSegment.prototype.translate = function(in_offset)
 {
 	this.translation.Add(in_offset);
	
	this.update_extents();
 }
 
 SymbolSegment.prototype.update_extents  = function()
 {
	// because scale can be negative, this gives us opposing corners, not mins and maxs
	var corner_a = new Vector2(0,0).transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
	var corner_b = Vector2.Add(corner_a, Vector2.Pointwise(Vector2.Pointwise(this.size, this.scale), this.temp_scale));
	
	// figure out the actual mins and maxs based on absolute position
	if(corner_a.x < corner_b.x)
	{
		this.world_mins.x = corner_a.x;
		this.world_maxs.x = corner_b.x;
	}
	else
	{
		this.world_mins.x = corner_b.x;
		this.world_maxs.x = corner_a.x;
	}
	
	if(corner_a.y < corner_b.y)
	{
		this.world_mins.y = corner_a.y;
		this.world_maxs.y = corner_b.y;
	}
	else
	{
		this.world_mins.y = corner_b.y;
		this.world_maxs.y = corner_a.y;
	}
 }
 
 SymbolSegment.prototype.worldMinPosition = function()
 {
	return this.world_mins.clone();
 }
 
 SymbolSegment.prototype.worldMaxPosition = function()
 {
	return this.world_maxs.clone();	
 }
 
 SymbolSegment.prototype.worldMinDrawPosition = function()
 {
	return this.world_mins.clone();
 }
 
 SymbolSegment.prototype.worldMaxDrawPosition = function()
 {
	return this.world_maxs.clone();	
 }
 
 SymbolSegment.prototype.resize = function(in_origin, in_scale)
 {
 	this.temp_scale = new Vector2(in_scale.x, in_scale.y);
	this.temp_translation = Vector2.Subtract(in_origin, Vector2.Pointwise(in_origin, in_scale));
	
	this.update_extents();
 }
 
SymbolSegment.prototype.freeze_transform = function()
{
	// here we move the temp transform info to the final transform
	this.translation = Vector2.Add(this.temp_translation, Vector2.Pointwise(this.temp_scale, this.translation));
	this.scale = Vector2.Pointwise(this.scale, this.temp_scale);

	this.temp_scale = new Vector2(1,1);
	this.temp_translation = new Vector2(0,0);
	
	this.update_extents();
}

SymbolSegment.prototype.isEmpty = function()
{
	return this.is_empty;
}

SymbolSegment.prototype.toXML = function()
{
	var sb = new StringBuilder();
	sb.append("<Segment type=\"symbol\" instanceID=\"");
	sb.append(String(this.instance_id))
	sb.append("\" scale=\"").append(this.scale.toString());
	sb.append("\" translation=\"").append(this.translation.toString());
	sb.append("\" text=\"").append(this.text).append("\"/>");
	//sb.append("\" text=\"").append(this.text).append("\" scale=\"");
	//sb.append(this.scale.toString()).append("\" translation=\"").append(this.translation.toString()).append("\"/>");
	return sb.toString();
}