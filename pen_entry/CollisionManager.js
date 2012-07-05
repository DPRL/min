// collision manager stores all of our Segments and tests for point collisions from mouse

function CollisionManager()
{
    
}

CollisionManager.initialize = function()
{

}

// return array of segmenets whose bounding boxes we collide with
CollisionManager.get_point_collides_bb = function(click_point)
{
    var result = new Array();
    var already_examined = new Array();
    for(var k = 0; k < Editor.segments.length; k++)
    {
        var segment = Editor.segments[k]
        //console.log(segment.set_id);
        
        // do a check to make suer we don't do same check multiple times
        if(already_examined[segment.set_id] != true)
        {
            already_examined[segment.set_id] = true;
            // find extents of entire segment set
            var segment_set = Editor.get_segment_by_id(segment.set_id)
             var min = segment_set[0].worldMinPosition();
            var max = segment_set[0].worldMaxPosition();

            for(var j = 1; j < segment_set.length; j++)
            {
                var new_min = segment_set[j].worldMinPosition();
                var new_max = segment_set[j].worldMaxPosition();
                
                min.x = Math.min(new_min.x, min.x);
                min.y = Math.min(new_min.y, min.y);
                
                max.x = Math.max(new_max.x, max.x);
                max.y = Math.max(new_max.y, max.y);
            }
            
            // do collision check
            if(min.x <= click_point.x && max.x >= click_point.x &&
                min.y <= click_point.y && max.y >= click_point.y)
                {
                    result.push(Editor.segments[k]);
                }
        }
        
    }
    return result;
}

// returns array of objects which point collides with
CollisionManager.get_point_collides = function(click_point)
{
    var result = new Array();
    for(var k = 0; k < Editor.segments.length; k++)
    {
        var seg = Editor.segments[k];
        if(seg.point_collides(click_point))
            result.push(seg);
    }
    
    // sort by layer_index
    
    //return this.sort_by_layer(result);;
    return result;
}

CollisionManager.get_line_collides = function(point_a, point_b)
{
    var result = new Array();
    for(var k = 0; k < Editor.segments.length; k++)
    {
        var seg = Editor.segments[k];
        if(seg.line_collides(point_a,point_b))
            result.push(seg);
    }
    
    return result;
}

CollisionManager.get_rectangle_collides = function(corner_a, corner_b)
{
    var result = new Array();
    for(var k = 0; k < Editor.segments.length; k++)
    {
        var seg = Editor.segments[k];
        if(seg.rectangle_collides(corner_a, corner_b))
            result.push(seg);
    }
    
    
    return result;
}
