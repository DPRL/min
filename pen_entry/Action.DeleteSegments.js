/* 
* This file is part of Min.
* 
* Min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* Min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with Min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright 2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	Defines a command object which deletes segments from the canvas when applied.
*/
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