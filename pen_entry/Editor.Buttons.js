function Buttons()
{

}

Buttons.COUNT = 0;

/*Buttons.Pen = 0;
  Buttons.Stroke = 1;
  Buttons.Box = 2;
  Buttons.Delete = 3;
  Buttons.Align = 4;
  Buttons.Undo = 5;
  Buttons.Redo = 6;
  Buttons.Group = 7;
  Buttons.Label = 8;
  Buttons.Clear = 9;
  Buttons.GetInkML = 10;
  Buttons.Text = 11;*/

// RLAZ: Button modification.
Buttons.Pen = 0;
//Buttons.Text = 1;
Buttons.Rectangle = 1;
Buttons.Stroke = 2;
Buttons.UploadImage = 3;
Buttons.Undo = 4;
Buttons.Redo = 5;
Buttons.DPRL = 6;
Buttons.Align = 7;

function ButtonState(button_id)
{
    this.overlay_div = document.getElementById(button_id).getElementsByClassName("toolbar_button_overlay").item(0);
    
    console.log(button_id + " " + this.overlay_div.className);
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
    Editor.button_states.push(new ButtonState("stroke_select"));
    Editor.button_states.push(new ButtonState("upload_image"));
    Editor.button_states.push(new ButtonState("undo"));
    Editor.button_states.push(new ButtonState("redo"));
    Editor.button_states.push(new ButtonState("dprl"));
    Editor.button_states.push(new ButtonState("align"));
    
    Editor.clearButtonOverlays();

}
