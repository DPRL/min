/// BoundinggBox

//input: two opposing corners (a.x != b.x and a.y != b.y)

function BoundingBox(corner_a, corner_b, render_corner_a, render_corner_b)
{
	// set up logical mins for resizing
	this.mins = new Vector2(0,0);
	this.maxs = new Vector2(0,0);
	if(corner_a.x < corner_b.x)
	{
		this.mins.x = corner_a.x;
		this.maxs.x = corner_b.x;
	}
	else
	{
		this.mins.x = corner_b.x;
		this.maxs.x = corner_a.x;
	}
	
	if(corner_a.y < corner_b.y)
	{
		this.mins.y = corner_a.y;
		this.maxs.y = corner_b.y;
	}
	else
	{
		this.mins.y = corner_b.y;
		this.maxs.y = corner_a.y;
	}
	
	// set up rendering mins
	
	this.render_mins = new Vector2(0,0);
	this.render_maxs = new Vector2(0,0);
	
	if(render_corner_a.x < render_corner_b.x)
	{
		this.render_mins.x = render_corner_a.x;
		this.render_maxs.x = render_corner_b.x;
	}
	else
	{
		this.render_mins.x = render_corner_b.x;
		this.render_maxs.x = render_corner_a.x;
	}
	
	if(render_corner_a.y < render_corner_b.y)
	{
		this.render_mins.y = render_corner_a.y;
		this.render_maxs.y = render_corner_b.y;
	}
	else
	{
		this.render_mins.y = render_corner_b.y;
		this.render_maxs.y = render_corner_a.y;
	}
}

BoundingBox.prototype.clone = function()
{
	return new BoundingBox(this.mins, this.maxs, this.render_mins, this.render_maxs);
}

BoundingBox.prototype.point_collides = function(in_point)
{
	if(in_point.x < this.render_mins.x)
		return false;
	if(in_point.x > this.render_maxs.x)
		return false;
	if(in_point.y < this.render_mins.y)
		return false;
	if(in_point.y > this.render_maxs.y)
		return false;
	return true;
}

BoundingBox.prototype.translate = function(in_offset)
{
	this.mins.Add(in_offset);
	this.maxs.Add(in_offset);
	
	this.render_mins.Add(in_offset);
	this.render_maxs.Add(in_offset);
}

BoundingBox.prototype.edge_clicked = function(in_point)
{
	var distance = Editor.control_point_radius + Editor.control_point_line_width/2.0;
	var distance2 = distance*distance;

	// top edge
	if(Vector2.SquareDistance(in_point, new Vector2( (this.render_mins.x + this.render_maxs.x)/2.0, this.render_mins.y)) <= distance2)
		return 0;
	// top right corner
	if(Vector2.SquareDistance(in_point, new Vector2(this.render_maxs.x, this.render_mins.y)) <= distance2)
		return 1;
	// right edge
	if(Vector2.SquareDistance(in_point, new Vector2(this.render_maxs.x, (this.render_mins.y + this.render_maxs.y)/2.0)) <= distance2)
		return 2;
	// botom right corner
	if(Vector2.SquareDistance(in_point, this.render_maxs) <= distance2)
		return 3;
	// bottom edge
	if(Vector2.SquareDistance(in_point, new Vector2( (this.render_mins.x + this.render_maxs.x)/2.0, this.render_maxs.y)) <= distance2)
		return 4;
	// bottom left corner
	if(Vector2.SquareDistance(in_point, new Vector2(this.render_mins.x, this.render_maxs.y)) <= distance2)
		return 5;
	//  left edge
	if(Vector2.SquareDistance(in_point, new Vector2(this.render_mins.x, (this.render_mins.y + this.render_maxs.y)/2.0)) <= distance2)
		return 6;
	// top left corner
	if(Vector2.SquareDistance(in_point, this.render_mins) <= distance2)
		return 7;
	
	return -1;
}

/*
BoundingBox.prototype.edge_clicked = function(in_point)
{
	var A = this.render_mins;
	var B = new Vector2(this.render_maxs.x, this.render_mins.y);
	var C = this.render_maxs;
	var D = new Vector2(this.render_mins.x, this.render_maxs.y);
	
	var result = 0;
	
	var margin = 10;
	
	if(point_line_segment_distance(A, B, in_point) < margin)	// collides with top line
		result = result | 1;
	if(point_line_segment_distance(B, C, in_point) < margin)	// collides with right line
		result = result | 2;
	if(point_line_segment_distance(C, D, in_point) < margin)	// collides with bottom line
		result = result | 4;
	if(point_line_segment_distance(D, A, in_point) < margin)	// collides with left line
		result = result | 8;
	
	// now we look at the bitmask to determine the state
	switch(result)
	{
		case 1:
			return 0;
		case 3:
			return 1;
		case 2:
			return 2;
		case 6:
			return 3;
		case 4:
			return 4;
		case 12:
			return 5;
		case 8:
			return 6;
		case 9:
			return 7;
	}
	return -1;
}
*/

point_line_segment_distance = function(A, B, C)
{
	var AB = Vector2.Subtract(B, A);
	var t = Vector2.Dot(Vector2.Subtract(C, A), AB) / Vector2.Dot(AB, AB);

	if(t > 1)
		t = 1;
	if(t < 0)
		t = 0;
	
	var D = Vector2.Add(A, Vector2.Multiply(t, AB));
	
	var result = Vector2.Distance(D, C);
	
	return result;
}