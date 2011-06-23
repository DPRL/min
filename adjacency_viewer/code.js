
// colors for point series
colors = ["rgba(0,0,0,0.5)","rgba(255,0,0,0.5)","rgba(255,128,0,0.5)","rgba(0,0,255,0.5)","rgba(255,0,255,0.5)", "rgba(0,255,0,0.5)"];

function DataRow()
{
	this.child_truth = "";
	this.relationship = "";
	this.parent_truth = "";
	this.child = "";
	this.parent = "";
	this.top = 0.0;
	this.bottom = 0.0;
}

table = new Array();
current_data_series = null;

child_truth_filter = new Array();
relationship_filter = new Array();
parent_truth_filter = new Array();
child_filter = new Array();
parent_filter = new Array();

// master list
child_truth_values = new Array();
relationship_values = new Array();
parent_truth_values = new Array();
child_values = new Array();
parent_values = new Array();


// absolute mins and maxes
max_x = null;
max_y = null;
min_x = null;
min_y = null;

// mins and maxes to use for window
disp_max_x = null;
disp_max_y = null;
disp_min_x = null;
disp_min_y = null;


filter_data = function(event)
{
	var category = this.getAttribute("id");

	var array = null;
	switch(category)
	{
		case "child_truth":
			array = child_truth_filter;
			break;
		case "relationship":
			array = relationship_filter;
			break;
		case "parent_truth":
			array = parent_truth_filter;
			break;
		case "child":
			array = child_filter;
			break;
		case "parent":
			array = parent_filter;
			break;
		default:
			return;
	}
	
	array.length = 0;
	
	for(var k = 0; k < this.children.length; k++)
	{
		if(this.children[k].selected == true)
			array.push(this.children[k].getAttribute("value"));
	}
	build_data_series();
	draw_plots();
}

build_data_series = function()
{
/*
	current_data_series.length = 0;
	
	
	for(var k = 0; k < table.length; k++)
	{
		dr = table[k];
		if
		(
		jQuery.inArray(dr.child_truth, child_truth_filter) > -1 &&
		jQuery.inArray(dr.relationship, relationship_filter) > -1 &&
		jQuery.inArray(dr.parent_truth, parent_truth_filter) > -1 &&
		jQuery.inArray(dr.child, child_filter) > -1 &&
		jQuery.inArray(dr.parent, parent_filter) > -1
		)
			current_data_series.push([dr.top, dr.bottom]);
	}
*/
	current_data_series = {};
	for(var k = 0; k < relationship_values.length; k++)
		current_data_series[relationship_values[k]] = new Array();
	
	

	// figure out min and max of our data
	max_x = max_y = Number.NEGATIVE_INFINITY;
	min_x = min_y = Number.POSITIVE_INFINITY;

	
	for(var k = 0; k < table.length; k++)
	{
		dr = table[k];
		if
		(
		jQuery.inArray(dr.child_truth, child_truth_filter) > -1 &&
		jQuery.inArray(dr.relationship, relationship_filter) > -1 &&
		jQuery.inArray(dr.parent_truth, parent_truth_filter) > -1 &&
		jQuery.inArray(dr.child, child_filter) > -1 &&
		jQuery.inArray(dr.parent, parent_filter) > -1
		)
		{	
			max_x = Math.max(max_x, dr.top);
			max_y = Math.max(max_y, dr.bottom);
			
			min_x = Math.min(min_x, dr.top);
			min_y = Math.min(min_y, dr.bottom);
			current_data_series[dr.relationship].push([dr.top, dr.bottom]);
		}
	}
	
	current_data_series.length = 0;
	for(var k = 0; k < relationship_values.length; k++)
		current_data_series.length += current_data_series[relationship_values[k]].length;
		
	console.log(current_data_series.length);
}

on_csv_load = function(event)
{
	var file_list = event.target.files;
	var csv = file_list[0];
	var fr = new FileReader();
	fr.onload = function(e)
	{
		//console.log(e.target.result);
		var row_strings = e.target.result.split('\n');
		// ignore header
		current_data_series = new Array();
		for(var k = 1; k < row_strings.length; k++)
		{
			var cells = row_strings[k].split(',');
			if(cells.length == 7)
			{
				var dr  = new DataRow();
					dr.child_truth = cells[0];
					dr.relationship = cells[1];
					dr.parent_truth = cells[2];
					dr.child = cells[3];
					dr.parent = cells[4];
					dr.top = parseFloat(cells[5]);
					dr.bottom = parseFloat(cells[6]);
				
				
				if(isNaN(dr.top) || isNaN(dr.bottom) || !isFinite(dr.top) || !isFinite(dr.bottom))
					continue;
				
				// build our lists
				if(jQuery.inArray(dr.child_truth, child_truth_values) < 0)
					child_truth_values.push(dr.child_truth);
				if(jQuery.inArray(dr.relationship, relationship_values) < 0)
					relationship_values.push(dr.relationship);
				if(jQuery.inArray(dr.parent_truth, parent_truth_values) < 0)
					parent_truth_values.push(dr.parent_truth);
				if(jQuery.inArray(dr.child, child_values) < 0)
					child_values.push(dr.child);
				if(jQuery.inArray(dr.parent, parent_values) < 0)
					parent_values.push(dr.parent);
				
				var point = [dr.top, dr.bottom];
				current_data_series.push(point);
				
				table.push(dr);
			}
		}
		
		child_truth_values.sort();
		relationship_values.sort();
		parent_truth_values.sort();
		child_values.sort();
		parent_values.sort();
		
		for(var k = 0; k < child_truth_values.length; k++)
		{
			var selection = document.createElement("option");
			selection.selected = true;
			selection.setAttribute("value", child_truth_values[k]);
			selection.innerHTML = child_truth_values[k];
			document.getElementById("child_truth").appendChild(selection);
			child_truth_filter.push(child_truth_values[k]);
		}
		document.getElementById("child_truth").addEventListener("change", filter_data, true);
		for(var k = 0; k < relationship_values.length; k++)
		{
			var selection = document.createElement("option");
			selection.selected = true;
			selection.setAttribute("value", relationship_values[k]);
			selection.innerHTML = relationship_values[k];
			document.getElementById("relationship").appendChild(selection);
			relationship_filter.push(relationship_values[k]);
		}
		document.getElementById("relationship").addEventListener("change", filter_data, true);
		for(var k = 0; k < parent_truth_values.length; k++)
		{
			var selection = document.createElement("option");
			selection.selected = true;
			selection.setAttribute("value", parent_truth_values[k]);
			selection.innerHTML = parent_truth_values[k];
			document.getElementById("parent_truth").appendChild(selection);
			parent_truth_filter.push(parent_truth_values[k]);
		}
		document.getElementById("parent_truth").addEventListener("change", filter_data, true);
		for(var k = 0; k < child_values.length; k++)
		{
			var selection = document.createElement("option");
			selection.selected = true;
			selection.setAttribute("value", child_values[k]);
			selection.innerHTML = child_values[k];
			document.getElementById("child").appendChild(selection);
			child_filter.push(child_values[k]);
		}
		document.getElementById("child").addEventListener("change", filter_data, true);
		for(var k = 0; k < parent_values.length; k++)
		{
			var selection = document.createElement("option");
			selection.selected = true;
			selection.setAttribute("value", parent_values[k]);
			selection.innerHTML = parent_values[k];
			document.getElementById("parent").appendChild(selection);
			parent_filter.push(parent_values[k]);
		}
		document.getElementById("parent").addEventListener("change", filter_data, true);
		// add filters
		
		build_data_series();
		draw_plots();

	}
	fr.readAsText(csv);
}

draw_plots = function()
{
	// now read in text fields
	if(document.getElementById("lock_window").checked)
	{
		var text_max_x = parseFloat(document.getElementById("max_x").value);
		var text_max_y = parseFloat(document.getElementById("max_y").value);
		var text_min_x = parseFloat(document.getElementById("min_x").value);
		var text_min_y = parseFloat(document.getElementById("min_y").value);
		
		disp_max_x = isNaN(text_max_x) ? max_x : text_max_x;
		disp_max_y = isNaN(text_max_y) ? max_y : text_max_y;
		disp_min_x = isNaN(text_min_x) ? min_x : text_min_x;
		disp_min_y = isNaN(text_min_y) ? min_y : text_min_y;
		
		
	}
	else
	{
		disp_max_x = max_x;
		disp_max_y = max_y;
		disp_min_x = min_x;
		disp_min_y = min_y;
	}
	
	document.getElementById("max_x").value = disp_max_x;
	document.getElementById("max_y").value = disp_max_y;
	document.getElementById("min_x").value = disp_min_x;
	document.getElementById("min_y").value = disp_min_y;

	options = {
		series: 
		{ 
			//lines: {show: false},
			points: {show: true, fill: false, radius: 3, lineWidth: 6}, 
			color: "rgba(0,128,255,0.1)", 
			shadowSize: 0
		},
		xaxis:
		{
		 	max: disp_max_x,
			min: disp_min_x,
			tickColor: "#888"
		},
		yaxis:
		{
			max: disp_max_y,
			min: disp_min_y,
			tickColor: "#888"
		},
		grid:
		{
			backgroundColor: "rgb(196,196,196)"
		}
	}

	var data_list = new Array();
	for(var k = 0; k < relationship_filter.length; k++)
	{
		var series = 
		{
			data: current_data_series[relationship_filter[k]],
			color: colors[relationship_values.indexOf(relationship_filter[k])]
		};
		data_list.push(series);
		
	}
	
	$.plot($("#plot"), data_list, options);
}

document.getElementById("csv_input").addEventListener("change", on_csv_load, true);