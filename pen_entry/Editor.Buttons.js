function Buttons()
{

}

Buttons.COUNT = 0;

Buttons.Pen = 0;
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
Buttons.Text = 11;

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
/*
Editor.clear_button_overlays = function()
{
	for(var k = 0; k < Editor.toolbar_button_overlay.length; k++)
		Editor.toolbar_button_overlay.item(k).className = "toolbar_button_overlay toolbar_button_enabled";
}

Editor.set_button_class = function(button_id, button_class)
{
	var button = document.getElementById(button_id);
	var button_overlay = button.getElementsByClassName("toolbar_button_overlay").item(0);
	button_overlay.className = "toolbar_button_overlay " + button_class;
}

Editor.set_button_selected = function(button_id)
{
	var button = document.getElementById(button_id);
	var button_overlay = button.getElementsByClassName("toolbar_button_overlay").item(0);
	button_overlay.className = "toolbar_button_overlay toolbar_button_selected";
}

Editor.set_button_disabled = function(button_id)
{
	var button = document.getElementById(button_id);
	var button_overlay = button.getElementsByClassName("toolbar_button_overlay").item(0);
	button_overlay.className = "toolbar_button_overlay toolbar_button_disabled";
}

Editor.set_button_touched = function(button_id)
{
	var button = document.getElementById(button_id);
	var button_overlay = button.getElementsByClassName("toolbar_button_overlay").item(0);
	button_overlay.className = "toolbar_button_overlay toolbar_button_touched";
}

Editor.set_button_enabled = function(button_id)
{
	var button = document.getElementById(button_id);
	var button_overlay = button.getElementsByClassName("toolbar_button_overlay").item(0);
	button_overlay.className = "toolbar_button_overlay toolbar_button_enabled";
}

*/

Editor.build_buttons = function(in_div_name)
{
	Editor.toolbar_div = document.getElementById(String(in_div_name));
	Editor.toolbar_button_overlay = Editor.toolbar_div.getElementsByClassName('toolbar_button_overlay');
	
	Editor.button_states = new Array();
		Editor.button_states.push(new ButtonState("pen"));
		Editor.button_states.push(new ButtonState("stroke_select"));
		Editor.button_states.push(new ButtonState("rectangle_select"));
		Editor.button_states.push(new ButtonState("delete"));
		Editor.button_states.push(new ButtonState("align"));
		Editor.button_states.push(new ButtonState("undo"));
		Editor.button_states.push(new ButtonState("redo"));
		Editor.button_states.push(new ButtonState("group"));
		Editor.button_states.push(new ButtonState("relabel"));
		Editor.button_states.push(new ButtonState("clear"));
		Editor.button_states.push(new ButtonState("getInkML"));
		Editor.button_states.push(new ButtonState("text"));
	
	Editor.clearButtonOverlays();
	//alert(Editor.toolbar_button_overlay.length);

	return;
	// add button names
	Editor.button_labels.push("Pen");
	//if(window.FileReader) Editor.button_labels.push("Image");
	if(navigator.userAgent.match(/iPad/i) == null) Editor.button_labels.push("Text");
	Editor.button_labels.push("Stroke Select");
	Editor.button_labels.push("Rectangle Select");
	Editor.button_labels.push("Group");
	Editor.button_labels.push("Delete");
	Editor.button_labels.push("Align");
	Editor.button_labels.push("Undo");
	Editor.button_labels.push("Redo");
	Editor.button_labels.push("Relabel");
	
	//Editor.button_labels.push("Current State");
	//Editor.button_labels.push("Print Undo Stack");
	
	
	// convert button name to class
	Editor.button_classes = new Array();
	for(var k = 0; k < Editor.button_labels.length; k++)
	{
		var sb = new StringBuilder();
		for(var j = 0; j < Editor.button_labels[k].length; j++)
		{
			if(Editor.button_labels[k][j] >= 'A' && Editor.button_labels[k][j] <= 'Z')
				sb.append(Editor.button_labels[k][j].toLowerCase());
			else if(Editor.button_labels[k][j] == ' ')
				sb.append('_');
			else
				sb.append(Editor.button_labels[k][j]);
		}
		Editor.button_classes.push(sb.toString());
	}
	
	Editor.toolbar_div = document.getElementById(String(in_div_name));
	Editor.toolbar_div.className="toolbar";
	
	var toolbar_ul = document.createElement("ul");
	toolbar_ul.className = "button_list";
	Editor.toolbar_div.appendChild(toolbar_ul);
	
	for(var k = 0; k < Editor.button_labels.length; k++)
	{
		var button_li = document.createElement("li");
		button_li.setAttribute("onselectstart","return false;")
	
		button_li.innerHTML = Editor.button_labels[k];
		button_li.className="toolbar_button";
		button_li.id = Editor.button_classes[k];
	
		toolbar_ul.appendChild(button_li);
	
		Editor.toolbar_buttons.push(button_li);
	}

	/*
	// if we support the file reader, add in the file input tag for image uploading
	if(window.FileReader)
	{
		var form = document.createElement("form");
			form.setAttribute("id", "image_form");
		Editor.toolbar_buttons[1].appendChild(form);
		var file_input = document.createElement("input");
			file_input.type = "file";
			file_input.id = "image";
			file_input.style.width = "100%";
			file_input.style.height = "100%";
			file_input.style.opacity = 0.5;
			file_input.style.position = "absolute";
			file_input.style.top = "0px";
			file_input.style.left = "0px";
			file_input.style.opacity = 0.0;
			file_input.style.fontSize = "10em";
			file_input.style.zIndex = 0;
		form.appendChild(file_input);
	}
	*/
}
