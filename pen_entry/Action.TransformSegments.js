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
	This file is responsible for handling all the animation that occurs when undo, redoing 
	, and resizing segments on the canvas.
	It does some of it job by storing the old translation, scale and any other objects that
	are needed and also applying the new values to the canvas segment(s).
*/
TransformSegments.animation_length = 0.25;

function TransformSegments(in_segments)
{
    this.segments = new Array();
    this.backup_scale = new Array();
    this.backup_translation = new Array();
    this.backup_world = new Array(); // Tuple representing world_mins, world_maxs
    
    this.new_scale = new Array();
    this.new_translation = new Array();
    this.new_world = new Array();
    
    for(var k = 0; k < in_segments.length; k++)
    {
        var segment = in_segments[k];
        this.segments.push(segment);
        this.backup_scale.push(segment.scale.clone());
        this.backup_translation.push(segment.translation.clone());
        this.backup_world.push(new Tuple(segment.world_mins.clone(), segment.world_maxs.clone()));
    }
    
    this.frames = 0.0;
    this.start_time = 0;
    this.undoing = true;
    
    this.should_keep = false;
}

// need to call this to get the new values for each transform
TransformSegments.prototype.add_new_transforms = function(in_segments)
{
    if(in_segments.length != this.segments.length)
        console.log("ERROR in TransformSegments.prototype.add_new_transforms");

    this.should_keep = true;
    
    for(var k = 0; k < in_segments.length; k++)
    {
        var segment = in_segments[k];
        
        this.new_scale.push(segment.scale.clone());
        this.new_translation.push(segment.translation.clone());
        this.new_world.push(new Tuple(segment.world_mins.clone(), segment.world_maxs.clone()));
    }
}

TransformSegments.current;

TransformSegments.prototype.rescale = function(elapsed, utc_ms)
{
    var current_time = (new Date()).getTime();
    var delta = (current_time- utc_ms) / 1000.0;    // time since last frame in seconds
    
    if(elapsed == 0.0)
        TransformSegments.current = this;
    var fraction = elapsed / TransformSegments.animation_length;
    if(fraction > 1.0)
        fraction = 1.0;
    
    if(this.undoing)
    {
        for(var j = 0; j < this.segments.length; j++)
        {
            var segment = this.segments[j]; 
            segment.align_size = false;
            segment.scale.Set(Vector2.Add(this.new_scale[j],Vector2.Multiply(fraction, Vector2.Subtract(this.backup_scale[j], this.new_scale[j]))));
            segment.translation.Set(Vector2.Add(this.new_translation[j],Vector2.Multiply(fraction, Vector2.Subtract(this.backup_translation[j], this.new_translation[j]))));
            segment.world_mins.Set(Vector2.Add(this.new_world[j].item1,Vector2.Multiply(fraction, Vector2.Subtract(this.backup_world[j].item1, this.new_world[j].item1))));
            segment.world_maxs.Set(Vector2.Add(this.new_world[j].item2,Vector2.Multiply(fraction, Vector2.Subtract(this.backup_world[j].item2, this.new_world[j].item2))));
            segment.update_extents();
        }
    }
    else
    {
        for(var j = 0; j < this.segments.length; j++)
        {
            var segment = this.segments[j];    
            segment.scale.Set(Vector2.Add(this.backup_scale[j],Vector2.Multiply(fraction, Vector2.Subtract(this.new_scale[j], this.backup_scale[j]))));
            segment.translation.Set(Vector2.Add(this.backup_translation[j],Vector2.Multiply(fraction, Vector2.Subtract(this.new_translation[j], this.backup_translation[j]))));
            segment.world_mins.Set(Vector2.Add(this.backup_world[j].item1,Vector2.Multiply(fraction, Vector2.Subtract(this.new_world[j].item1, this.backup_world[j].item1))));
            segment.world_maxs.Set(Vector2.Add(this.backup_world[j].item2,Vector2.Multiply(fraction, Vector2.Subtract(this.new_world[j].item2, this.backup_world[j].item2))));
            segment.update_extents();
        }    
    }
    
    // set dirty flag
    
    for(var j = 0; j < this.segments.length; j++)
    {
        this.segments[j].dirty_flag = true;
    }
    
    Editor.update_selected_bb();
    RenderManager.render();
    
    // Added because each TeX_Input element in the 'this.segments' array has to
    // compensate for horizontal flip
    for(var j = 0; j < this.segments.length; j++)
    {
    	if(this.segments[j].constructor == TeX_Input){
    		this.segments[j].dirty_flag = true;
        	this.segments[j].change_offset = true;
        	this.segments[j].render();
        }
    }
    
    this.frames++;
    
    if(fraction == 1.0)
    {
        // bail out
        TransformSegments.current = null;
        var total_time = ((current_time - this.start_time) / 1000.0);
        console.log("total time: " + total_time);
        console.log("mean framerate: " + (this.frames / total_time));
        return;
    }
    
    var total_delta = ((new Date()).getTime()- utc_ms) / 1000.0;
    
    
    var sb = new StringBuilder();
    sb.append("TransformSegments.current.rescale(").append(String(elapsed + total_delta)).append(',').append((new Date()).getTime()).append(");");
    setTimeout(sb.toString());
}

TransformSegments.prototype.Undo = function()
{
    this.framerate = 0.0;
    this.frames = 0.0;
    this.start_time = (new Date()).getTime();
    this.undoing = true;
    this.rescale(0.0, this.start_time);
}

TransformSegments.prototype.shouldKeep = function()
{
    return this.should_keep;
    // TODO: The block below isn't necessary. Comment left by ako9833
    for(var k = 0; k < this.segments.length; k++)
    {
        var segment = this.segments[k];
        if(segment.scale.equals(this.backup_scale[k]) == false)
            return true;
        if(segment.translation.equals(this.backup_translation[k]) == false)
            return true;
    }
    return false;
}


TransformSegments.prototype.Apply = function()
{
    this.framerate = 0.0;
    this.frames = 0.0;
    this.start_time = (new Date()).getTime();
    this.undoing = false;
    this.rescale(0.0, this.start_time);
}

TransformSegments.prototype.toXML = function()
{
    var sb = new StringBuilder();
    sb.append("<Action type=\"transform_segments\">").appendLine();
    for(var k = 0; k < this.segments.length; k++)
    {
        var segment = this.segments[k];
        sb.append("\t").append("<Transform instanceID=\"").append(String(segment.instance_id)).append("\" ");
        sb.append("scale=\"").append(this.new_scale[k].toString()).append("\" translation=\"").append(this.new_translation[k].toString()).append("\"/>");
        sb.append("world_mins=\"").append(this.new_world[k].item1.toString()).append("\" world_maxs=\"").append(this.new_world[k].item2.toString()).append("\"/>");
        sb.appendLine();
        
    }
    sb.append("</Action>");
    return sb.toString();
}


TransformSegments.prototype.toString = function()
{
    return "TransformSegments";
}