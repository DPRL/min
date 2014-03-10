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
	Defines a command object to undo/redo text additions to the canvas via keyboard.
*/
EditText = function(in_text_segment)
{
    this.text_segment = in_text_segment;
    this.previous_text = String(in_text_segment.text);
    this.current_text = "";
}

EditText.prototype.Undo = function()
{
    this.text_segment.text = this.previous_text;
    var context = Editor.contexts[2];
    this.text_segment.text_width = context.measureText(this.text_segment.text).width;    
    this.text_segment.size.x = this.text_segment.text_width;
    this.text_segment.update_extents();
}

EditText.prototype.set_current_text = function(in_text)
{
    this.current_text = new String(in_text);
}

EditText.prototype.shouldKeep = function()
{
    if(this.text_segment.text == this.previous_text)
        return false;
    return true;
}

EditText.prototype.Apply = function()
{
    this.text_segment.text = this.current_text;
    var context = Editor.contexts[2];
    this.text_segment.text_width = context.measureText(this.text_segment.text).width;    
    this.text_segment.size.x = this.text_segment.text_width;
    this.text_segment.update_extents();
}

EditText.prototype.toXML = function()
{
    var sb = new StringBuilder();
    sb.append("<Action type=\"edit_text\" instanceID=\"");
    sb.append(String(this.text_segment.instance_id));
    sb.append("\" newText=\"");
    sb.append(this.current_text);
    sb.append("\" oldText=\"");
    sb.append(this.previous_text);
    sb.append("\"/>");
    return sb.toString();
    //    return "<Action type=\"edit_text\" " + \>";
}

EditText.prototype.toString = function()
{
    return "EditText";
}