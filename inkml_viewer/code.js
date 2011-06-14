inkml_list = new Array();
mathml_list = new Array();
attribute_table_list = new Array();
filename_list = new Array();
traceid_to_node_list = new Array();
svg_list = new Array();
current_index = 0;
total_inkmls = 0;
loaded_inkmls = 0;

// histograms
writer_histogram = {};
writer_histogram.writer_list = new Array();

expression_histogram = {};
expression_histogram.expression_list = new Array();
/** determine if a string contains only whitespace **/
is_white_space = function(in_string)
{
	for(var k = 0; k < in_string.length; k++)
	{
		var c = in_string.charAt(k);
		if(c == ' ' || c == '\n' || c == '\t' || c == '\r')
			continue;
		else
			return false;
	}
	return true;
}

// dictionaroy to convert latex weirdness to unicode

mathml_dictionary = new Array();

mathml_dictionary['\\alpha'] = '\u03B1';
mathml_dictionary['\\beta'] = '\u03B2';
mathml_dictionary['\\gamma'] = '\u03B3';
mathml_dictionary['phi'] = '\u03C6';
mathml_dictionary['\\phi'] = mathml_dictionary['phi'];
mathml_dictionary['\\pi'] = '\u03C0';
mathml_dictionary['\\theta'] = '\u03B8';
mathml_dictionary['\\infty'] = '\u221E';
mathml_dictionary['\\pm'] = '\u00b1';
mathml_dictionary['\\div'] = '\u00f7';
mathml_dictionary['\\times'] = '\u00d7';
mathml_dictionary['\\sum'] = '\u03A3';
mathml_dictionary['\\log'] = "log";
mathml_dictionary['\\sin'] = "sin";
mathml_dictionary['\\cos'] = "cos";
mathml_dictionary['\\tan'] = "tan";
mathml_dictionary['\\ldots'] = '\u2026';
mathml_dictionary['\\neq'] = '\u2260';
mathml_dictionary['\\leq'] = '\u2264';
mathml_dictionary['\\lt'] = '\u003c';
mathml_dictionary['\\geq'] = '\u2265';
mathml_dictionary['\\rightarrow'] = '\u2192';
mathml_dictionary['\\lim'] = "lim";
mathml_dictionary['\\int'] = '\u222b';
mathml_dictionary['\\sqrt'] = '\u221A';

/** 
	Performs a Deep Copy of the mathml, and rebuilds each element in the proper namespace 
	for use in an xhtml file for display
**/
convert_math_nodes = function(in_node)
{
	// expects in_node to be an element
	var result = document.createElementNS('http://www.w3.org/1998/Math/MathML', in_node.nodeName);
	// copy attributes
	var attributes = in_node.attributes;
	for(var k = 0; k < attributes.length; k++)
	{
		var pair = attributes.item(k);
		result.setAttribute(pair.nodeName, pair.nodeValue);
	}
	
	var child_list = in_node.childNodes;
	for(var k = 0; k < child_list.length; k++)
	{
		var child = child_list.item(k);
		switch(child.nodeType)
		{
			case 1: //ELEMENT_NODE:
				result.appendChild(convert_math_nodes(child));
				break;
			case 3: //TEXT_NODE
				if(is_white_space(child.data) == false)
				{
					var data = mathml_dictionary[child.data];
					var text;
					if(typeof data == "undefined")
						text = document.createTextNode(child.data)
					else
						text = document.createTextNode(data);
					result.appendChild(text);				
				}
				break;
		}
	}
	
	return result;
}

build_trace_to_mathml_node_map = function(in_mathml, in_tracegroups)
{
	// build map of xml:id attributes to mathml nodes
	var xmlid_to_mathnode = {};
	
	var node_stack = new Array();
	node_stack.push(in_mathml);
	
	while(node_stack.length > 0)
	{
		var math_node = node_stack.pop();
		var attributes = math_node.attributes;
		for(var k = 0; k < attributes.length; k++)
		{
			var pair = attributes.item(k);
			//pair.nodeName, pair.nodeValue
			if(pair.nodeName == "xml:id")
			{
				xmlid_to_mathnode[pair.nodeValue] = math_node;
				break;
			}
		}
	
		var child_list = math_node.childNodes;
		for(var k = 0; k < child_list.length; k++)
		{
			var child = child_list.item(k);
			if(child.nodeType == 1)	// ELEMENT_NODE
			{
				node_stack.push(child);
			}
		}
	}
	
	// now build map from trace id to mathml node
	
	var trace_id_to_mathmlnode = {};
	for(var k = 0; k < in_tracegroups.length; k++)
	{
		var tracegroup = in_tracegroups.item(k);
		if(tracegroup.parentNode.nodeName == "traceGroup")
		{
			var traceViews = tracegroup.getElementsByTagName("traceView");
			var annotationxml = tracegroup.getElementsByTagName("annotationXML").item(0);
			var href = annotationxml.getAttribute("href");
			for(var j = 0; j < traceViews.length; j++)
			{
				var trace_data_ref = traceViews.item(j).getAttribute("traceDataRef");
				trace_id_to_mathmlnode[trace_data_ref] = xmlid_to_mathnode[href];
				console.log(trace_data_ref + " " + href);
			}
		}
	}
	
	return trace_id_to_mathmlnode;
}


// timeout variable to handle animations
animation_timeout = null;
/** Convert a list of trace nodes to an SVG file **/
trace_nodes_to_svg = function(trace_nodes, global_index)
{
	// build our root svg
	result_svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		result_svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

	// rectangle to listen for clicks
	rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		rect.setAttribute("id", "rectangle");
		rect.setAttribute("width", "100%");
		rect.setAttribute("height", "100%");
		rect.setAttribute("fill", "white");
		
		rect.addEventListener("click",
		function()
		{
			// cancel previous animation
			clearTimeout(animation_timeout);
			// setup animations
			var paths = this.parentNode.getElementsByTagName("path");
			var first_trace_total_length;
			// 'clear' the pen strokes
			for(var k = 0; k < paths.length; k+=2)
			{
				var p = paths.item(k);
				p.setAttribute("stroke-width", 1);
				p.setAttribute("stroke-dashoffset", p.total_length);
				
				if(k == 0)
				{
					animating_trace = p;
					first_trace_total_length = p.total_length;
				}
			}
			
			// recursive animation call
			/**
				total_traces - Total number of traces in this svg
				trace_id - The id of the currently drawn trace
				utc_ms - Previous time in milliseconds
				trace_speed - The speed to move the 'pen'
				previous_offset - The previous position in the dash pattern of the pen
			**/
			animate_traces = function(total_traces, trace_id, utc_ms, trace_speed, previous_offset)
			{
				var current_time = (new Date()).getTime();
				var delta_t = (current_time - utc_ms) / 1000.0;	// delta t in seconds
				
				var new_offset = previous_offset - delta_t * trace_speed;
				
				if(new_offset <= 0.0)
				{
					animating_trace.setAttribute("stroke-dashoffset", 0);
					trace_id++;
					// end condition
					if(trace_id == total_traces / 2)
					{
						var paths = animating_trace.parentNode.parentNode.getElementsByTagName("path");
						for(var k = 0; k < paths.length;k+=2)
						{
							paths.item(k).setAttribute("stroke-width", 4);
						}
						return;
					}
					// set us up with next trace
					else
					{
						var trace_list = animating_trace.parentNode.parentNode.getElementsByTagName("path");
						animating_trace = trace_list.item(2 * trace_id);
						new_offset = animating_trace.total_length + new_offset;
						animating_trace.setAttribute("stroke-dashoffset", new_offset);
					}
				}
				else
				{
					animating_trace.setAttribute("stroke-dashoffset", new_offset);
				}
				
				
				var sb = new StringBuilder();
				sb.append("animate_traces(").append(total_traces).append(',').append(trace_id).append(',').append(current_time).append(',').append(trace_speed).append(',').append(new_offset).append(");");
				animation_timeout = setTimeout(sb.toString());				
			}
			
			// first call
			animate_traces(paths.length, 0, (new Date()).getTime(), this.trace_speed, first_trace_total_length);
		},
		false
		);	
		
	result_svg.appendChild(rect);
		
	// create group for the traces
	trace_group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		trace_group.setAttribute("id", "traces");
	result_svg.appendChild(trace_group);
	
	// now parse the trace data
	var traces = new Array();
	// length of each trace
	var trace_lengths = new Array();
	// trace id (from xml) for each trace
	var trace_ids = new Array();
	
	// extents of this stroke
	var min_x = Number.POSITIVE_INFINITY;
	var min_y = Number.POSITIVE_INFINITY;
	var max_x = Number.NEGATIVE_INFINITY;
	var max_y = Number.NEGATIVE_INFINITY;
	
	// smallest distance between points
	var min_distance = Number.POSITIVE_INFINITY;
	
	var mean_distance = 0.0;
	var total_points = 0;
	
	// parsing the inkml trace nodes
	for(var k = 0; k < trace_nodes.length; k++)
	{
		trace_ids.push(trace_nodes.item(k).getAttribute("id"));
		// parse points using regular expressions
		var raw_point_text = trace_nodes.item(k).textContent; 
		// remove any newlines
		var pattern = /\n+/g;
		pattern.compile(pattern);
		var point_text = raw_point_text.replace(pattern, "");

		// split on comma, white space
		pattern = /,*\s+/g;
		pattern.compile(pattern);
		var point_strings = point_text.split(pattern);
	
		//  build the path
		var sb = new StringBuilder();	
		
		var point_list = new Array();
		var trace_length = 0.0;
		for(var j = 0; j < point_strings.length; j+=2)
		{
			var x = parseFloat(point_strings[j]);
			var y = parseFloat(point_strings[j+1]);
		
			if(j != 0)
			{
				// data from ICDAR has redundant first nodes, so check for duplicate sequential nodes here
				if(point_list[j-2] == x && point_list[j-1] == y)
					continue;
					
				var delta_x = x - point_list[point_list.length - 2];
				var delta_y = y - point_list[point_list.length - 1];
				
				// update sample metrics
				var distance = Math.sqrt(delta_x * delta_x + delta_y * delta_y);
				mean_distance += distance;
				trace_length += distance;
				total_points++;
			}
		
			point_list.push(x);
			point_list.push(y);
		
			// update extents
		
			min_x = Math.min(min_x, x);
			min_y = Math.min(min_y, y);
			max_x = Math.max(max_x, x);
			max_y = Math.max(max_y, y);
		}
		
		traces.push(point_list);
		trace_lengths.push(trace_length);
	}
	
	// get size of the math expression
	var size_x = max_x - min_x;
	var size_y = max_y - min_y;
	
	// calculate average trace length (in icdar distance)
	var mean_trace_length = mean_distance / traces.length;
	
	// calculate scale factor to use
	mean_distance /= total_points;
	var scale = 6.0 / mean_distance;
	
	// translation of points
	var trans_x = -min_x; 
	var trans_y = -min_y;
	
	// upate svg size to fit the data
	result_svg.setAttribute("width", size_x * scale + 20);
	result_svg.setAttribute("height", size_y * scale + 20);

	rect.trace_speed = mean_trace_length * scale / 0.5;	// speed to draw a trace (ie, how fast the pen moves)
	
	// build svg elements
	for(var k = 0; k < traces.length; k++)
	{
		// contains list of circles and the polyline
		var stroke_group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	
		// contains the list of circles
		var circle_group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		// string builder used to build the point list
		var sb = new StringBuilder();
		
		for(var j = 0; j < traces[k].length; j+=2)
		{
			var x = traces[k][j];
			var y = traces[k][j+1]
		
			// map to new svg space
			x = (x + trans_x) * scale + 10;
			y = (y + trans_y) * scale + 10;
		
			// build path data
			traces[k][j] = x;
			traces[k][j+1] = y;
			if(j == 0)
				sb.append('M');
			else if(j == 2)
				sb.append(' L');
			else
				sb.append(' ');
				
			sb.append(x).append(' ').append(y);
			
			// draw individual sample points
			var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
			
			if(j == 0)
			{
				circle.setAttribute("class", "first_point");
				circle.setAttribute("r", 4);
			}
			else if(j == (traces[k].length - 2))
			{
				circle.setAttribute("class", "end_point");
				circle.setAttribute("r", 4);
			}
			else
			{
				circle.setAttribute("class", "mid_point");
				circle.setAttribute("r", 3);
			}

			circle.setAttribute("cx", x);
			circle.setAttribute("cy", y);
			
		
			circle_group.appendChild(circle);
			
		}
		
		//  build the path
		var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		
		path.setAttribute("fill", "none");
		//path.setAttribute("stroke", "none");
		path.setAttribute("d", sb.toString());
		path.total_length = path.getTotalLength();
		path.trace_id = k;
		
		path.setAttribute("class", "trace");
		path.setAttribute("stroke-dashoffset", 0);
		path.setAttribute("stroke-dasharray", path.total_length + " " + path.total_length);
		path.setAttribute("stroke-width", 4);
		
		path.setAttribute("id", "path_" + k);
		
		// build events to show/hide circles
		circle_group.style.visibility = "hidden";
		
		var mouse_path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		mouse_path.setAttribute("fill", "none");
		mouse_path.setAttribute("class", "invisible");
		mouse_path.setAttribute("d", sb.toString());
		
		mouse_path.inkml_index = global_index;
		mouse_path.trace_id = trace_ids[k];
		path.inkml_index = global_index;
		path.trace_id = trace_ids[k];
		mouse_path.addEventListener("mouseover",
		function()
		{
			this.parentNode.getElementsByTagName("g").item(0).style.visibility = "visible";
			var node = traceid_to_node_list[this.inkml_index][this.trace_id];
			node.setAttribute("style", "outline:#000 dotted thin;background:orange;");
			
			/*
			var table = attribute_table_list[current_index];
			while(table.math_jax.hasChildNodes())
				table.math_jax.removeChild(table.math_jax.lastChild);
			table.math_jax.appendChild(mathml_list[current_index]);
			MathJax.Hub.Queue(["Typeset",MathJax.Hub,table.math_jax]);			
			*/
		},
		false
		);
		mouse_path.addEventListener("mouseout",
		function()
		{
			this.parentNode.getElementsByTagName("g").item(0).style.visibility = "hidden";
			var node = traceid_to_node_list[this.inkml_index][this.trace_id];
			node.setAttribute("style", "");
			
			/*
			var table = attribute_table_list[current_index];
			while(table.math_jax.hasChildNodes())
				table.math_jax.removeChild(table.math_jax.lastChild);
			table.math_jax.appendChild(mathml_list[current_index]);
			MathJax.Hub.Queue(["Typeset",MathJax.Hub,table.math_jax]);		
			*/
		},
		false
		);
		
		// add circles and path to stroke group
		stroke_group.appendChild(path);
		stroke_group.appendChild(circle_group);
		stroke_group.appendChild(mouse_path);
		
		
		// add the stroke data to the trace group
		trace_group.appendChild(stroke_group);
	}
	
	return result_svg;
}

/** Pull out attributes and build the attribute table **/

build_attribute_table = function(annotation_nodes, filename, mathml)
{
	var result_table = document.createElement("table");
		result_table.setAttribute("id", "attribute_table");
	
	// header
	var top_row = document.createElement("tr");
		var th_attributes = document.createElement("th");
			th_attributes.setAttribute("colspan", 2);
			th_attributes.innerHTML = "Attributes";
		top_row.appendChild(th_attributes);
		var th_mathml = document.createElement("th");
			th_mathml.innerHTML = "MathML";
		top_row.appendChild(th_mathml);
	result_table.appendChild(top_row);
	
	// second row
	var second_row = document.createElement("tr");
		var td_attr_name = document.createElement("td");
			td_attr_name.setAttribute("class", "attribute_name");
			td_attr_name.innerHTML = "filename:";
		second_row.appendChild(td_attr_name);
		var td_attr_value = document.createElement("td");
			td_attr_value.setAttribute("class", "attribute_value");
			td_attr_value.innerHTML = filename;
		second_row.appendChild(td_attr_value);
		var td_mathml = document.createElement("td");
			td_mathml.setAttribute("rowspan", annotation_nodes.length);
			var div_math_div = document.createElement("div");
				div_math_div.setAttribute("id", "math_div");
				div_math_div.appendChild(mathml);
			td_mathml.appendChild(div_math_div);
			//result_table.math_jax = div_math_div;	
		second_row.appendChild(td_mathml);
	result_table.appendChild(second_row);
	
	var writer, age, gender, hand;
	var expression;
	
	
	for(var k = 0; k < annotation_nodes.length; k++)
	{
		var annotation = annotation_nodes.item(k);
		
		if(annotation.parentNode.nodeName == "traceGroup")
			continue;
		
		var type = annotation.getAttribute("type");
		var value = annotation.textContent;

		switch(type)
		{
			case "writer":
				writer = value;
				break;
			case "age":
				age = value;
				break;
			case "gender":
				gender = value;
				break;
			case "hand":
				hand = value;
				break;
			case "truth":
				expression = value;
				break;
		}
		
		
		var row_n = document.createElement("tr");
			var td_attr = document.createElement("td");
				td_attr.setAttribute("class", "attribute_name");
				td_attr.innerHTML = type + ":";
			row_n.appendChild(td_attr);
			var td_value = document.createElement("td");
				td_value.setAttribute("class", "attribute_value");
				td_value.innerHTML = value;
			row_n.appendChild(td_value);
		result_table.appendChild(row_n);
		
	}
	
	var writer_name = writer;// + "|" + age + "|" + gender + "|" + hand;
	
	var count = writer_histogram[writer_name];
	if(typeof count == "undefined")
	{
		writer_histogram[writer_name] = 1;
		writer_histogram.writer_list.push(writer_name);
	}
	else
		writer_histogram[writer_name]++;

	count = expression_histogram[expression];
	if(typeof count == "undefined")
	{
		expression_histogram[expression] = 1;
		expression_histogram.expression_list.push(expression);
	}
	else
		expression_histogram[expression]++;
		
	return result_table;
}

on_xml_load = function(event)
{
	var file_list = event.target.files;
	total_inkmls = file_list.length;
	for(var k = 0; k < file_list.length; k++)
	{
		var file = file_list[k];
		var r = new FileReader();
		r.onload = function(e)
		{
			inkml_list.push(e.target.result);
			
			var parser = new DOMParser();
			var xmlDOC = parser.parseFromString(e.target.result, "text/xml");
			
			// get our math node
			var math_nodes = xmlDOC.getElementsByTagName("math");
			if(math_nodes.length == 0)
			{
				alert(filename_list[e.currentTarget.index] + "does not contain any math nodes");
				return;
			}
			var mathml = convert_math_nodes(math_nodes.item(0));
			mathml_list[e.currentTarget.index] = mathml;

			// build annotations
			annotation_nodes = xmlDOC.getElementsByTagName("annotation");
			if(annotation_nodes.length == 0)
			{
				alert(filename_list[e.currentTarget.index] + "does not contain any annotation nodes");
				return;				
			}
			var table = build_attribute_table(annotation_nodes, filename_list[e.currentTarget.index], mathml);
			attribute_table_list[e.currentTarget.index] = table;
			
			//  build our mapping from trace ids to xml:ids in mathml
			trace_group_nodes = xmlDOC.getElementsByTagName("traceGroup");
			traceid_to_node_list[e.currentTarget.index] = build_trace_to_mathml_node_map(mathml, trace_group_nodes);
			
			// get our trace nodes			
			trace_nodes = xmlDOC.getElementsByTagName("trace");
			var svg = null;
			if(trace_nodes.length > 0)
				svg = trace_nodes_to_svg(trace_nodes, e.currentTarget.index);
			
			svg_list[e.currentTarget.index] = svg;			
			
			if(e.currentTarget.index == 0)
			{
				current_index = 0;
				update_view();
			}
			
			
			loaded_inkmls++;
			// build our histogram
			/*
			
			if(loaded_inkmls == total_inkmls)
			{
			
			
				var sb = new StringBuilder();
				console.log("Writer Histogram");
				for(var k = 0; k < writer_histogram.writer_list.length; k++)
				{
					var writer = writer_histogram.writer_list[k];
					var count = writer_histogram[writer];
					sb.append(writer + ":   " + writer_histogram[writer]).appendLine();
				}
				console.log(sb.toString());
				
				sb = new StringBuilder();
				console.log("Expression Histogram");
				for(var k = 0; k < expression_histogram.expression_list.length; k++)
				{
					var expression = expression_histogram.expression_list[k];
					var count = expression_histogram[expression];
					sb.append(expression + ":   " + expression_histogram[expression]).appendLine();
				}
				console.log(sb.toString());
			}
			*/
		}
		r.index = k;
		filename_list[k] = file.fileName;
		r.readAsText(file);
	}
}

// updates the screen to reflect the current inkml file
update_view = function()
{
	console.log(current_index);
	// insert table
	var table = attribute_table_list[current_index];
	var table_div = document.getElementById("table_div");
	while(table_div.hasChildNodes())
		table_div.removeChild(table_div.lastChild);
	table_div.appendChild(table);
	
	/*
	while(table.math_jax.hasChildNodes())
		table.math_jax.removeChild(table.math_jax.lastChild);
	table.math_jax.appendChild(mathml_list[current_index]);
	//MathJax.Hub.Queue(["Typeset",MathJax.Hub,table.math_jax]);
	*/
	// insert the svg
	var svg = svg_list[current_index];
	var ink_div = document.getElementById("ink_div");
	while(ink_div.hasChildNodes())
		ink_div.removeChild(ink_div.lastChild);
	if(svg != null)
		ink_div.appendChild(svg);
	
	// cancel animation and reset strokes
	clearTimeout(animation_timeout);
	if(svg != null)
	{
		var paths = svg.getElementsByTagName("path");
		for(var k = 0; k < paths.length; k+=2)
		{
			var p = paths.item(k);
			p.setAttribute("stroke-width", 4);
			p.setAttribute("stroke-dashoffset", 0);
		}
	}
	document.getElementById("current_index").innerHTML = (current_index + 1) + " / " + total_inkmls;
	
	
}

// move through the list
next = function()
{
	current_index = (current_index + 1 + inkml_list.length) % inkml_list.length;
	update_view();
}

previous = function()
{
	current_index = (current_index - 1 + inkml_list.length) % inkml_list.length;
	update_view();
}

if(window.FileReader)
{
	document.getElementById("inkml_input").addEventListener("change", on_xml_load, true);
}
else
{
	alert("This webpage requires a modern browser which supports the FileReader JavaScript Object");
}

// listen for left/right keystrokes
navigation = function(event)
{
	if(event.which == 39)	// right arrow
	{
		event.preventDefault();
		next();
	}
	else if(event.which == 37)	// left arrow
	{
		event.preventDefault();
		previous();
	}
}

// set upu events
document.getElementById("prev_button").addEventListener("click", previous, true);
document.getElementById("next_button").addEventListener("click", next, true);
document.addEventListener("keydown", navigation, true);

