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
* Copyright (C) 2011-2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	This file contains event handlers and methods for changing the state of the buttons that
    appear along the top of min.

    ButtonState: An object which holds and manages the state of a button (enabled, touched).

    Methods:
        Editor.build_buttons - Add ButtonStates for each of the buttons at the top of min.
*/
function Buttons()
{

}

Buttons.COUNT = 0;

// RLAZ: Button modification.
Buttons.Pen = 0;
//Buttons.Text = 1;
Buttons.Rectangle = 1;
Buttons.Reselect = 2;
Buttons.UploadImage = 3;
Buttons.Undo = 4;
Buttons.Redo = 5;
Buttons.Align = 6;

Buttons.Grid = 7;

Buttons.Search = 8;
Buttons.AddSlide = 9;
Buttons.RemoveSlide = 10;

function ButtonState(button_id)
{
    this.overlay_div = document.getElementById(button_id).getElementsByClassName("toolbar_button_overlay").item(0);
    
    //console.log(button_id + " " + this.overlay_div.className);
    Buttons.COUNT++;
    this.enabled = false;
    this.touched = false;
}

ButtonState.prototype.setEnabled = function(enabled)
{
    this.enabled = enabled;
    if(this.enabled)
        this.overlay_div.className = "toolbar_button_overlay toolbar_button_enabled";
    else
        this.overlay_div.className = "toolbar_button_overlay toolbar_button_disabled";
}

ButtonState.prototype.setTouched = function(touched)
{
    this.touched = touched;
    if(this.enabled)
    {
        if(this.touched)
            this.overlay_div.className = "toolbar_button_overlay toolbar_button_touched";
        else
            this.overlay_div.className = "toolbar_button_overlay toolbar_button_enabled";
    }
}

ButtonState.prototype.setSelected = function(selected)
{
    this.selected = selected;
    if(this.enabled && this.selected)
        this.overlay_div.className = "toolbar_button_overlay toolbar_button_selected";
}

Editor.clearButtonOverlays = function()
{
    for(var k = 0; k < Editor.button_states.length; k++)
    {
        Editor.button_states[k].setTouched(false);
        Editor.button_states[k].setEnabled(true);
    }
}

Editor.build_buttons = function(in_div_name)
{
    Editor.toolbar_div = document.getElementById(String(in_div_name));
    Editor.toolbar_button_overlay = Editor.toolbar_div.getElementsByClassName('toolbar_button_overlay');

    /*
    These must be added in the same order as the numbers given at the
    top of this file.
    */ 
    Editor.button_states = new Array();
    Editor.button_states.push(new ButtonState("pen"));
    Editor.button_states.push(new ButtonState("rectangle_select"));
    Editor.button_states.push(new ButtonState("change_recognition"));
    Editor.button_states.push(new ButtonState("upload_image"));
    Editor.button_states.push(new ButtonState("undo"));
    Editor.button_states.push(new ButtonState("redo"));
    Editor.button_states.push(new ButtonState("align"));
    Editor.button_states.push(new ButtonState("create_grid")); 
    Editor.button_states.push(new ButtonState("search"));
    
    Editor.clearButtonOverlays();

}
