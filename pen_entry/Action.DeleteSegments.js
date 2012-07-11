DeleteSegments = function(in_segments)
{
    this.segments = in_segments.clone();
}

DeleteSegments.prototype.Undo = function()
{
    for(var k = 0; k < this.segments.length; k++)
    {
        var segment = this.segments[k];
        segment.element.style.visibility = "visible";
        Editor.add_segment(segment);
    }
    RenderManager.render();
}

DeleteSegments.prototype.shouldKeep = function()
{
    if(this.segments.length == 0)
        return false;
    return true;
}

DeleteSegments.prototype.Apply = function()
{
    for(var k = 0; k < this.segments.length; k++)
    {
        if(this.segments[k].clear != undefined)
            this.segments[k].clear()
        else
            this.segments[k].element.style.visibility = "hidden";

        Editor.remove_segment(this.segments[k]);
    }
}

DeleteSegments.prototype.toXML = function()
{
    var sb = new StringBuilder();
    sb.append("<Action type=\"delete_segments\" instanceIDs=\"");
    sb.append(String(this.segments[0].instance_id));
    for(var k = 1; k < this.segments.length; k++)
        sb.append(",").append(this.segments[k].instance_id);
    sb.append("\"/>");

    return sb.toString();
}

DeleteSegments.prototype.toString = function()
{
    return "DeleteSegments";    
}