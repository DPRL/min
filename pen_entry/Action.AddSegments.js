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
	This file is responsible for adding new segments into min. It's called whenever 
	a new segment is created either a PenStroke, TeX_Input or Image object.
*/

AddSegments = function(in_segments)
{
    this.segments = in_segments;
    this.segment_xmls = new Array();
    this.set_id_changes = new Array();

}

AddSegments.prototype.buildSegmentXML = function()
{    
    this.segment_xmls.length = 0;
    for(var k = 0; k < this.segments.length; k++)
    {
        this.segment_xmls.push(this.segments[k].toXML());
    }
}

AddSegments.prototype.Undo = function()
{
    for(var k = 0; k < this.segments.length; k++)
    {
        Editor.remove_selected_segment(this.segments[k]);
        Editor.remove_segment(this.segments[k]);
        this.segments[k].element.style.visibility = "hidden";
    }

    // Change all of the collided strokes back to their original sets.
    for (var k = 0; k < this.set_id_changes.length; k++) {
        var change = this.set_id_changes[k];
        for (var j = 0; j < Editor.segments.length; j++) {
            if (Editor.segments[j].instance_id == change.instance_id) {
                Editor.segments[j].set_id = change.old_set_id;
                break;
            }
        }
    }

    Editor.update_selected_bb();
}

AddSegments.prototype.shouldKeep = function()
{
    // discard empty text segment
    if(this.segments.length == 1)
    {
        if(this.segments[0].type_id == SymbolSegment.type_id)
            if(this.segments[0].text == "")
                return false;
    }
    // discard length 1 pen strokes (ie, dots)
    if(this.segments.length == 1)
    {
        if(this.segments[0].type_id == PenStroke.type_id)
            if(this.segments[0].points.length == 1)
                return false;
    }
    
    return true;
}

AddSegments.prototype.Apply = function()
{
    for(var k = 0; k < this.segments.length; k++)
    {
        Editor.add_segment(this.segments[k]);
        this.segments[k].element.style.visibility = "visible";
    }

    // Change all of the collided strokes to be in the same set.
    for (var k = 0; k < this.set_id_changes.length; k++) {
        var change = this.set_id_changes[k];
        for (var j = 0; j < Editor.segments.length; j++) {
            if (Editor.segments[j].instance_id == change.instance_id) {
                Editor.segments[j].set_id = this.segments[0].set_id;
                break;
            }
        }
    }
}

AddSegments.prototype.toXML = function()
{
    var sb = new StringBuilder();
    sb.append("<Action type=\"add_segments\">").appendLine();
    for(var k = 0; k < this.segments.length; k++)
    {
        //sb.append("\t").append(this.segments[k].toXML()).appendLine();
        sb.append("\t").append(this.segment_xmls[k]).appendLine();
    }
    sb.append("</Action>");
    return sb.toString();
}

AddSegments.prototype.toString = function()
{
    return "AddSegments";
}


