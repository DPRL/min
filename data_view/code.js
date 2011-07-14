
RowType = {"Category" : 1, "Feature" : 2};

// colors for point series
colors = null;

// all our data
table = new Array();
current_data_series = null;


// array of strings of the features
features = new Array();

// data for the x axis
x_axis = null;
// data for the y axis
y_axis = null;

// name of each category we can filter by
categories = new Array();
// name of the class heading
class_name = null;
// heading names
heading_names = new Array();
heading_types = new Array();
// class names
classes = new Array();
// will contain a set of arrays to filter by
filters = {};
// a set of all values for each category
master_list = {};

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

clamp = function(val, min, max)
{
	if(val < min) return min;
	if(val > max) return max;
	return val;
}

generate_colors = function (color_count)
{
	// maximize mean distance between points
	/*
	colors = new Array();
	
	var r = 1;
	var g = 2;
	var b = 3;
	
	var reds = new Array();
	var greens = new Array();
	var blues = new Array();
	
	var delta_red = new Array();
	var delta_green = new Array();
	var delta_blue = new Array();
	
	// generate initial colors
	for(var k = 0; k < color_count; k++)
	{
		r = ((16807 * r) % 0xFFFFFFFF);
		g = ((16807 * g) % 0xFFFFFFFF);
		b = ((16807 * b) % 0xFFFFFFFF);
		
		reds.push(r % 255);
		blues.push(b % 255);
		greens.push(g % 255);
	}
	
	// background color
	reds.push(96);
	blues.push(96);
	greens.push(96);
	
	var step_size = 10.0;
	// maximize average 
	for(var k = 0; k < 150; k++)
	{
		// calculate distance and derivatives
		var square_distance = 0.0;
		for(var i = 0; i < color_count; i++)
		{
			delta_red[i] = delta_green[i] = delta_blue[i] = 0.0;
			for(var j = i+1; j < color_count + 1; j++)
			{
				var rmean = (reds[i] + reds[j]) / 2.0;
				var delta_r = reds[i] - reds[j];
				var delta_g = greens[i] - greens[j];
				var delta_b = blues[i] - blues[j];
				var delta_rm = (2 + rmean/256.0);
				var delta_gm = 4;
				var delta_bm = (2 + (255 - rmean)/256);
				// this metric from http://www.compuphase.com/cmetric.htm
				square_distance +=  distance_ij;
				var distance_ij = (delta_rm*delta_r*delta_r) + (delta_gm* delta_g* delta_g) +  (delta_bm*delta_b*delta_b);
				
				delta_red[i] += 2 * delta_rm * delta_r * 1.0 / distance_ij;
				delta_green[i] += 2 * delta_gm * delta_g * 1.0 / distance_ij;
				delta_blue[i] += 2 * delta_bm * delta_b * 1.0 / distance_ij;
			}
		}
		
		var factor = 0.0;
		for(var i = 0; i < color_count; i++)
			factor += delta_red[i] * delta_red[i] + delta_green[i] * delta_green[i] + delta_blue[i] * delta_blue[i];
		factor = Math.sqrt(factor);
		
			
		for(var i = 0; i < color_count; i++)
		{
			console.log(reds[i] + "," + greens[i] + "," + blues[i]);
			reds[i] = clamp(reds[i] + step_size * delta_red[i] / factor, 0, 255);
			greens[i] = clamp(greens[i] + step_size * delta_green[i] / factor, 0, 255);
			blues[i] = clamp(blues[i] + step_size * delta_blue[i] / factor, 0, 255);
		}
		console.log("...");
	}
	
	for(var i = 0; i < color_count; i++)
	{
		colors.push("rgba(" + Math.floor(reds[i]) + "," + Math.floor(greens[i]) + "," + Math.floor(blues[i]) + ",0.15)");
		console.log(colors[i]);
	}
	*/
	
	// this uses an inverse gravity approach
	colors = new Array();
	
	var r = 1;
	var g = 2;
	var b = 3;
	
	var reds = new Array();
	var greens = new Array();
	var blues = new Array();
	
	var red_speed = new Array();
	var green_speed = new Array();
	var blue_speed = new Array();
	
	
	var red_accel = new Array();
	var green_accel = new Array();
	var blue_accel = new Array();
	
	// generate initial colors
	for(var k = 0; k < color_count; k++)
	{
		r = ((16807 * r) % 0xFFFFFFFF);
		g = ((16807 * g) % 0xFFFFFFFF);
		b = ((16807 * b) % 0xFFFFFFFF);
		
		reds.push(r % 255);
		blues.push(b % 255);
		greens.push(g % 255);
		
		red_speed[k] = green_speed[k] = blue_speed[k] = 0;
	}
	
	// background color
	reds.push(96);
	blues.push(96);
	greens.push(96);
	
	var dt = 5;
	
	var mean_speed = 0;
	
	//for(var k = 0; k < 1000; k++)
	for(var k = 0; k < 1000; k++)
	{
		mean_speed = 0;
		for(var i = 0; i < color_count; i++)
			red_accel[i] = green_accel[i] = blue_accel[i] = 0;
		for(var i = 0; i < color_count; i++)
		{
			// calculate accelerations
			for(var j = i + 1; j <= color_count; j++)
			{
				var rmean = (reds[i] + reds[j]) / 2.0;
				var delta_r = reds[i] - reds[j];
				var delta_g = greens[i] - greens[j];
				var delta_b = blues[i] - blues[j];
				var delta_rm = (2 + rmean/256.0);
				var delta_gm = 4;
				var delta_bm = (2 + (255 - rmean)/256);
				
				var square_distance_ij = (delta_rm*delta_r*delta_r) + (delta_gm* delta_g* delta_g) +  (delta_bm*delta_b*delta_b);
				
				
				// vector from j to i
				var red_ji = Math.sqrt(delta_rm) * delta_r;
				var green_ji = Math.sqrt(delta_gm) * delta_g;
				var blue_ji = Math.sqrt(delta_bm) * delta_b;
				// normalize j to i
				var norm = Math.sqrt(square_distance_ij);
				

				
				
				red_ji /= norm;
				green_ji /= norm;
				blue_ji /= norm;
				var force = 1.0 / square_distance_ij;
				/*
				if(i == 0 && (j == 5 || j == 7))
				{
					console.log(i);
					console.log(j);
					console.log(" norm: " + norm);
					console.log(" rmean: " + rmean);
					console.log(" delta r: " + delta_r);
					console.log(" delta g: " + delta_g);
					console.log(" delta b: " + delta_b);
					console.log(" force: " + force);
				}
				*/
				// push in opposite direction for j
				// ignore background color
				if(j != color_count)
				{
					red_accel[j] -= force * red_ji;
					green_accel[j] -= force * green_ji;
					blue_accel[j] -= force * blue_ji;
				}
				else	// really keep points away from background color
				{
					force *= 8;
				}
				
				red_accel[i] += force * red_ji;
				green_accel[i] += force * green_ji;
				blue_accel[i] += force * blue_ji;
				

			}
		}
		
		
		
		// update speeds and positions
		for(var i = 0; i < color_count; i++)
		{
			//console.log(red_accel[i] + " " + red_speed[i] + " " + reds[i]);
		
			red_speed[i] = red_speed[i]  + red_accel[i] * dt;
			green_speed[i] = green_speed[i]  + green_accel[i] * dt;
			blue_speed[i] =  blue_speed[i]  + blue_accel[i] * dt;
			
			reds[i] += red_speed[i] * dt;
			greens[i] += green_speed[i] * dt;
			blues[i] += blue_speed[i] * dt;
			
			// now clamp (and update speeds)
			if(reds[i] < 0 || reds[i] > 255)
			{
				reds[i] = clamp(reds[i], 0, 255);
				red_speed[i] = 0;
			}
			if(greens[i] < 0 || greens[i] > 255)
			{
				greens[i] = clamp(greens[i], 0, 255);
				green_speed[i] = 0;
			}
			if(blues[i] < 0 || blues[i] > 255)
			{
				blues[i] = clamp(blues[i], 0, 255);
				blue_speed[i] = 0;
			}
			mean_speed += Math.sqrt(red_speed[i]*red_speed[i] + green_speed[i]*green_speed[i] + blue_speed[i]*blue_speed[i]);
		}
		mean_speed /= color_count;
		console.log("mean speed: " + mean_speed);
	}
	
	for(var i = 0; i < color_count; i++)
	{
		colors.push("rgba(" + Math.floor(reds[i]) + "," + Math.floor(greens[i]) + "," + Math.floor(blues[i]) + ",0.15)");
		console.log(colors[i]);
	}
}

filter_data = function(event)
{
	var category = this.getAttribute("id");

	var array = filters[category];
	
	array.length = 0;
	
	for(var k = 0; k < this.children.length; k++)
	{
		if(this.children[k].selected == true)
			array.push(this.children[k].getAttribute("value"));
	}
	
	build_data_series();
	draw_plots();
}

set_axis = function(event)
{
	var axis = this.getAttribute("id");
	
	for(var k = 0; k < this.children.length; k++)
	{
		if(this.children[k].selected == true)
		{
			if(axis == "x_feature")
				x_axis = this.children[k].getAttribute("value");
			else 
				y_axis = this.children[k].getAttribute("value");
		}
	}
	
	build_data_series();
	draw_plots();
}

// performs filtering on the data
build_data_series = function()
{
	current_data_series = {};
	for(var k = 0; k < master_list[class_name].length; k++)
		current_data_series[master_list[class_name][k]] = new Array();

	// figure out min and max of our data
	max_x = max_y = Number.NEGATIVE_INFINITY;
	min_x = min_y = Number.POSITIVE_INFINITY;

	
	for(var k = 0; k < table.length; k++)
	{
		dr = table[k];
		var include_row = true;
		for(var j = 0; j < heading_names.length; j++)
		{
			if(heading_types[j] == RowType.Feature) continue;
			if(jQuery.inArray(dr[heading_names[j]], filters[heading_names[j]]) > -1) continue;
			include_row = false;
			break;
		}
		
		if(include_row)
		{
			var x_val = dr[x_axis];
			var y_val = dr[y_axis];
		
			max_x = Math.max(max_x, x_val);
			max_y = Math.max(max_y, y_val);
			min_x = Math.min(min_x, x_val);
			min_y = Math.min(min_x, y_val);
			current_data_series[dr[class_name]].push([x_val, y_val]);
		}
		
		/*
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
		*/
	}
	
	current_data_series.length = 0;
	for(var k = 0; k < classes.length; k++)
		current_data_series.length += current_data_series[classes[k]].length;
}

on_csv_load = function(event)
{
	var file_list = event.target.files;
	var csv = file_list[0];
	var fr = new FileReader();
	fr.onload = function(e)
	{
		//console.log(e.target.result);
		//var row_strings = e.target.result.split('\n');
		//var row_strings = e.target.result.replace(",\n", "\n").split("\n");
		var row_strings = e.target.result.replace(/[ \t\r]/g, "").replace(/,\n/g, "\n").split("\n");
		// read header and define our filtering
		var column_defs = row_strings[0].split(",");
		var column_names = row_strings[1].split(",");
		
		if(column_defs.length != column_names.length)
		{
			alert("Inconsistent number of columns in data");
			return;
		}
		
		var columns = column_defs.length;
		for(var k = 0; k < columns; k++)
		{
			var pair = [column_defs[k], column_names[k]];
			switch(pair[0])
			{
			// class defines color of drawn point
			case "Class":
				class_name = pair[1];
			// these are used to filter
			case "Category":
				categories.push(pair[1]);
				heading_types.push(RowType.Category);
				master_list[pair[1]] = new Array();
				filters[pair[1]] = new Array();
				break;
			// features define points
			case "Feature":
				features.push(pair[1]);
				heading_types.push(RowType.Feature);
				break;
			}
			heading_names.push(pair[1]);
			
		}
		
		// parse each row
		for(var k = 2; k < row_strings.length; k++)
		{
			var cells = row_strings[k].split(',');
			if(cells.length == columns)
			{
				var data_row = {};
				var bad_feature = false;
				// parse each cell
				for(var j = 0; j < columns; j++)
				{
					if(heading_types[j] == RowType.Category)
					{
						data_row[heading_names[j]] = cells[j];
						// build filter bank
						if(jQuery.inArray(cells[j], master_list[heading_names[j]]) < 0)
							master_list[heading_names[j]].push(cells[j]);
					}
					else if(heading_types[j] == RowType.Feature)
					{
						var val = parseFloat(cells[j]);
						if(isNaN(val) || !isFinite(val))
						{
							bad_feature = true;
							break;
						}
						data_row[heading_names[j]] = val;
					}
				}
				if(bad_feature)
					continue;
				table.push(data_row);
			}
		}
		
		// get list of all classes
		for(var k = 0; k < master_list[class_name].length; k++)
			classes.push(master_list[class_name][k]);
		
		// build our list of colors
		generate_colors(classes.length);
		
		// foreach category, add in filterin widgets
		var headings = document.getElementById("headings");
		var filter_row = document.getElementById("filter_row");
		for(var j = 0; j < heading_names.length; j++)
		{
			if(heading_types[j] == RowType.Feature) continue;
		
			var th = document.createElement("th");
			th.innerHTML = heading_names[j];
			headings.appendChild(th);
			
			var td = document.createElement("td");
			td.setAttribute("rowspan", "4");
			td.setAttribute("class", "filter");
			filter_row.appendChild(td);
			
			var select = document.createElement("select");
			select.setAttribute("multiple", "true");
			select.setAttribute("id", heading_names[j]);
			select.setAttribute("size", "6");
			
			master_list[heading_names[j]].sort();
			
			for(var i = 0; i < master_list[heading_names[j]].length; i++)
			{
				// build options for selection
				var name = master_list[heading_names[j]][i];
				var selection = document.createElement("option");
				selection.selected = true;
				selection.setAttribute("value", name);
				selection.innerHTML = name;
				select.appendChild(selection);
				
				// fill in filter bansk while we're at it
				filters[heading_names[j]].push(name);
			}
			select.addEventListener("change", filter_data, true);
			td.appendChild(select);
		}
		
		// add features to both x and y axis list
		var x_select = document.getElementById("x_feature");
		var y_select = document.getElementById("y_feature");
		
		for(var k = 0; k < features.length; k++)
		{
			var option = document.createElement("option");
			if(k == 0)
				option.selected = true;
			option.setAttribute("value", features[k]);
			option.innerHTML = features[k];
			x_select.appendChild(option);
			
			option = document.createElement("option");
			if(k == 1)
				option.selected = true;
			option.setAttribute("value", features[k]);
			option.innerHTML = features[k];
			y_select.appendChild(option);			
		}
		
		x_select.addEventListener("change", set_axis, true);
		y_select.addEventListener("change", set_axis, true);
		
		x_axis = features[0];
		y_axis = features[1];		
		
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
			points: {show: true, fill: false, radius: 2, lineWidth: 4}, 
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
			backgroundColor: "rgb(96,96,96)"
		}
	}

	var data_list = new Array();

	for(var k = 0; k < master_list[class_name].length; k++)
	{
		var series = 
		{
			data: current_data_series[master_list[class_name][k]],
			color: colors[k]
		};
		data_list.push(series);
	}

	
	$.plot($("#plot"), data_list, options);
}

document.getElementById("csv_input").addEventListener("change", on_csv_load, true);