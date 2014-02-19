/* 
	This file contains methods for grouped segments
*/
SegmentGroup.count = 0;
SegmentGroup.type_id = 1;
function SegmentGroup()
{
    this.instance_id = SegmentGroup.count++;
    this.type_id = SegmentGroup.type_id;
    
    this.position = null;
    this.size = new Vector2(0, 0);

    this.aabb = null;
    
    this.layer = -1;

    this.segments = new Array();
}

SegmentGroup.prototype.contains_segment = function(in_segment)
{
    for(var k = 0; k < this.segments.length; k++)
    {
        if(this.segments[k] == in_segment)
            return true;
        if(this.segments[k].type_id == SegmentGroup.type_id)
            if(this.segments[k].contains_segment(in_segment))
                return true;
    }
    return false;
}

SegmentGroup.prototype.add_segment = function(in_segment)
{
    this.segments.push(in_segment);

    if(this.position == null || this.size == null)
    {
        this.position = new Vector2(in_segment.position.x, in_segment.position.y);
        this.size = new Vector2(in_segment.size.x, in_segment.size.y);
    }
    else
    {
        if(in_segment.position.x < this.position.x)
        {
            old_x = this.position.x;
            this.position.x = in_segment.position.x;
            this.size.x = old_x + this.size.x - this.position.x;
        }
        if(in_segment.position.x + in_segment.size.x > this.position.x + this.size.x)
            this.size.x = in_segment.position.x + in_segment.size.x - this.position.x;

        if(in_segment.position.y < this.position.y)
        {
            old_y = this.position.y;
            this.position.y = in_segment.position.y;
            this.size.y = old_y + this.size.y - this.position.y;
        }
            
        if(in_segment.position.y + in_segment.size.y > this.position.y + this.size.y)
            this.size.y = in_segment.position.y + in_segment.size.y - this.position.y;
    }
    
    this.aabb = new AxisAlignedBoundingBox(this.position, this.size);
    RenderManager.render();        
}

SegmentGroup.prototype.render = function(in_context)
{
    for(var k = 0; k < this.segments.length; k++)
    {
        in_context.save();
        this.segments[k].render(in_context);
        in_context.restore();
    }
}

SegmentGroup.prototype.render_selected = function(in_context)
{
    for(var k = 0; k < this.segments.length; k++)
    {
        in_context.save();
        this.segments[k].render_selected(in_context);
        in_context.restore();
    }
}

SegmentGroup.prototype.point_collides = function(in_position)
{
    if(this.aabb.point_collides(in_position) == false)
        return false;
        
    for(var k = 0; k < this.segments.length; k++)
        if(this.segments[k].point_collides(in_position))
            return true;
    
    return false;
}

SegmentGroup.prototype.line_collides = function(point_a, point_b)
{
    if(this.aabb.line_collides(point_a, point_b) == false)
        return false;
        
    for(var k = 0; k < this.segments.length; k++)
        if(this.segments[k].line_collides(point_a, point_b))
            return true;
    
    return false;
}

SegmentGroup.prototype.translate = function(in_offset)
{
    this.position.x += in_offset.x;
    this.position.y += in_offset.y;
    
    this.aabb.position.x += in_offset.x;
    this.aabb.position.y += in_offset.y;
    
    for(var k = 0; k < this.segments.length; k++)
        this.segments[k].translate(in_offset);
}