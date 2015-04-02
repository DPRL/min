/* 
* This file is part of min.
* 
* min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright 2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	Defines and object to group segments together into a single set. For example,
    selecting multiple strokes with stroke select, then clicking/touching and holding
    them creates and applies a GroupSegments object.
*/
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
