// This is the interface for all elements in the expression (image, stroke, text, etc)

Segment.count = 0;
Segment.set_count = 0;

function Segment()
{
	// identifiers to build unique id
	this.type_id;	// unique per class
	this.instance_id; // unique per object
	this.set_id;	// unique per 'set' of segments
	
	
	// position information
	// top left hand corner of segment
	this.position;
	// width and height
	this.size;
	// the layer we are in, 0 is bottom N is top
	this.layer;
	// our axis aligned bounding box
	this.aabb;
}

// just draw to canvas using the given context
Segment.prototype.render = function(in_context)
{
	
}

// clears this segment
Segment.prototype.clear = function(in_context)
{

}

// draw method for when the segment is selected
Segment.prototype.render_selected = function(in_context)
{

}

// determine if the passed in point (screen space) collides with our geometery
Segment.prototype.point_collides = function(in_position)
{
	return false;
}

Segment.prototype.line_collides = function(point_a, point_b)
{
	return false;
}

// translate by this amount (Vector2)
Segment.prototype.translate = function(in_offset)
{

}

// resize a segment 
// origin - stationary point of parent group or set
// offset - distance mouse moved
Segment.prototype.resize = function(in_origin, in_scale)
{

}

Segment.prototype.freeze_transform = function()
{

}

Segment.unique_id = function(in_Segment)
{
	// type id will fill the top 8 bits, instance id will fill bottom 24
	if(in_Segment == null)
		return -1;
	return ((in_Segment.type_id << 24) + in_Segment.instance_id);
}

Segment.toXML = function()
{
	return "<Segment type=\"default\"/>";
}

Segment.parseXML = function(in_xml)
{
	
}
