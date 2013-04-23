GroupSegments = function(in_segments, in_new_set_id)
{
    this.segments = new Array();
    this.previous_set = new Array();
    this.previous_classes = new Array();
    // TODO: THIS IS A HACK PLEASE FIX THIS HACK BECAUSE IT IS A HACK
    // Increment the set id of the merged strokes because that's what the
    // classifier is going to do.
    this.new_set_id = in_new_set_id + 1;
    
    for(var k = 0; k < in_segments.length; k++)
    {
        var segment = in_segments[k];
        this.segments.push(segment);
        this.previous_classes.push(segment.type_id);
        this.previous_set.push(segment.set_id);
    }
}

GroupSegments.prototype.Undo = function()
{
    for(var k = 0; k < this.segments.length; k++)
    {
        this.segments[k].set_id = this.previous_set[k];
        this.segments[k].type_id = this.previous_classes[k];
    }
    RenderManager.render()
}

GroupSegments.prototype.Apply = function()
{
    for(var k = 0; k < this.segments.length; k++)
    {
        this.segments[k].set_id = this.new_set_id;
    }
    RenderManager.render()
}

GroupSegments.prototype.toXML = function()
{
    var sb = new StringBuilder();
    sb.append("<Action type=\"group_segments\" ");
    sb.append("newSetID=\"");
    sb.append(String(this.new_set_id));
    sb.append("\" instanceIDs=\"");
    sb.append(String(this.segments[0].instance_id));
    for(var k = 1; k < this.segments.length; k++)
    {
        sb.append(',');
        sb.append(String(this.segments[k].instance_id));
    }
    sb.append("\"/>");
    return sb.toString();
}


GroupSegments.prototype.shouldKeep = function()
{
    return true;
}

GroupSegments.prototype.toString = function()
{
    return "GroupSegments";
}
