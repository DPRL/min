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

GroupSegments = function(in_segments, in_label, boolCreateGrid, boolAlignGroup, bst)
{
	// Identify that this is a grouping action.
	this.isGrouping = true;

	// Create a new integer identifier for this group.
	this.set_id = Segment.next_set_id();
	
	this.segments = new Array();
	this.previous_set = new Array();
    this.previous_classes = new Array();
	this.previous_labels = new Array();
	this.label = null;
	if (in_label != null)
		this.label = in_label.trim();
	
	this.isGrid = false;
	if (boolCreateGrid != null)
		this.isGrid = boolCreateGrid;
	
	this.isAlign = false;
	if (boolAlignGroup != null)
		this.isAlign = boolAlignGroup;
	console.log("BAG: " + this.isAlign);
	this.bst = bst;
	
	// Record contained symbols (by default, this is empty).
	this.parentSymbolMap = new Array();
	this.symbolParentMap = new Array();

	// Store information needed for Undo.
	//
	// NOTE: segment is a misnomer - the segment array contains
	// primitives (e.g. strokes), not primitives grouped into
	// segments. set_id values are used to identify groupings
	// in the code.
	console.log("Grouping ------------------------");
	for(var k = 0; k < in_segments.length; k++)
    {
        var segment = in_segments[k];
		console.log("IN SET_ID: " + segment.set_id);
		this.segments.push(segment);
        this.previous_classes.push(segment.type_id);
        this.previous_set.push(segment.set_id);
		this.previous_labels.push(segment.text);
	}

	// Create a grid if this has been requested.
	if ( this.isGrid ) {
		var setIdList = new Array();
		this.label = "";

		// Obtain list of (seg_id, minCoordinate, maxCoordinate) triples.
		segBBs = Editor.get_segment_BBoxes(in_segments);
		segBBs.sort(Editor.orderBBLeftRight);
		
		// Construct grid representation, as list (rows) of lists (cells)
		// of segments represented by set_id and bounding box triples.
		rows = new Array();
		rows.push(new Vector2(segBBs[0], new Array()));
		maxLengthRow = 1;
		for (var i=1; i < segBBs.length; i++) {
				currentTop = segBBs[i].item2.y;
				currentBottom = segBBs[i].item3.y;
				currentHeight = currentBottom - currentTop;

				// Add to an existing row if overlapping.
				var overlapsRow = false;
				for (j=0; j < rows.length; j++)
				{
					rowTop = rows[j].x.item2.y;
					rowBottom = rows[j].x.item3.y;
					rowHeight  = rowBottom - rowTop;

					// To be more intuitive, using vertical overlap
					// percentage rather than center points to detect overlap
					// within rows.
					var lowestTop = Math.max(currentTop, rowTop);
					var highestBottom = Math.min(currentBottom, rowBottom);
					var overlap = highestBottom - lowestTop;
					var currentOverlapPercentage = overlap / currentHeight;
					var rowOverlapPercentage = overlap / rowHeight;
					
					var threshold = 0.25;
					
					if (currentOverlapPercentage > threshold || rowOverlapPercentage > threshold)
					{
						rows[j].y.push(segBBs[i]);

						// Keep track of table 'width' (max. number of cells in a row,
						// normally the number of columns in the grid).
						if ( maxLengthRow < rows[j].y.length + 1 )
							maxLengthRow = rows[j].y.length + 1
						overlapsRow = true;
					}
				}

				// Create a new row - note that we are not reprsenting columns,
				// so rows that start at the right of the leftmost column will not
				// be distinguished in the data structure.
				if (! overlapsRow ) 
					rows.push( new Vector2(segBBs[i], new Array()) );
		}

		// Sort the rows data structure top-down by leftmost cell
		// (BBs were previously sorted left-right).
		rows.sort(Editor.orderRowsTopDown);

		// Generate LaTeX string. Simple for now - no newlines.
		this.label = "\\begin{array}{";
		for (var i=0; i < maxLengthRow; i++)
			this.label += " c";
		this.label += " }\n";
		
		for (var i=0; i < rows.length; i++)
		{
			this.label += RecognitionManager.getRecognition( rows[i].x.item1 ).symbols[0];
			for (var j=0; j < rows[i].y.length; j++)
				// DEBUG: cannot use bare & in HTML strings. 
				this.label += " \&amp; "  
					+ RecognitionManager.getRecognition( rows[i].y[j].item1 ).symbols[0];
			
			if (i < rows.length - 1)
				this.label += " \\\\\n"; // end the row - requires escape characters.
			else
				this.label += "\n";
		}
		this.label += "\\end{array}";
	
		// Remove ampersand escape sequences, and update the slider.
		// // Remove ampersand escape sequences, and update the slider.
		var slider_math = this.label;
		slider_math = slider_math.replace(/&amp;/g, "&");
		Editor.slider.updateSlide(null, slider_math);
		
		//console.log("Generated TeX:");
		//console.log(this.label);

		// Generate BST string. For explicit structure, produce an
		// explicit HTML-style row-based table.
		this.bst = "<mtable>\n";
		for (var i = 0; i < rows.length; i++)
		{
			nextRowId = i + 1;
			this.bst += "<mtr>\n"; // " + nextRowId + ">\n";
			this.bst += "<mtd>\n";
			// For leftmost cell
			if (RecognitionManager.getRecognition( rows[i].x.item1 ).bst == null)
				this.bst += constructBSTforSymbol( rows[i].x.item1 );
			else
					this.bst += RecognitionManager.getRecognition( rows[i].x.item1 ).bst;
			
			this.bst += "</mtd>\n\n";

			// Remaining cells in the row.
			for (var j=0; j < rows[i].y.length; j++) {
				nextCellId = j+1;
				this.bst += "<mtd>\n";// " + nextCellId + ">\n"; 
				if (RecognitionManager.getRecognition( rows[i].y[j].item1 ).bst == null)
					this.bst += constructBSTforSymbol( rows[i].y[j].item1 );
				else
					this.bst += RecognitionManager.getRecognition( rows[i].y[j].item1 ).bst;
				this.bst += "\n";
				this.bst += "</mtd>\n";
			}
			this.bst += "</mtr>\n";
		}
		this.bst += "</mtable>\n";
		
		//console.log("Generated BST Grid -----------------------");
		//console.log(this.bst);
	}
	this.Apply();
	
}

// Create placeholders for individual symbols in grids.
constructBSTforSymbol = function(set_id)
{
	firstBSTHeader = "************************************************************\n** DRACULAE version 0.2\n** Baseline Structure Trees\n**     Origin: Top Left\n************************************************************\n\n*************************************\nI. Baseline Structure Tree\n*************************************\n"
	secondBSTHeader = "*************************************\nII. Token Lexed BST\n*************************************\n"
	thirdBSTHeader = "*************************************\nIII. Relation Lexed BST\n*************************************\n"
	
	symbolString = RecognitionManager.getRecognition( set_id ).symbols[0]  + " ( (1, 1), (1, 1) ) (1, 1) FFES_id : " + set_id + "\n\n";
	
	return firstBSTHeader + symbolString+ secondBSTHeader+ symbolString + thirdBSTHeader + symbolString;
}

GroupSegments.prototype.ForgetSymbolGrouping = function()
{
	if (this.isAlign || this.isGrid ) {
		// Restore the segment set and type for member segments.
    	for(var k = 0; k < this.segments.length; k++)
    	{
       		this.segments[k].set_id = this.previous_set[k];
       	 	this.segments[k].type_id = this.previous_classes[k];
    		this.segments[k].text = this.previous_labels[k];
		}
	}
	// Don't render - only for generating symbol data.
}

GroupSegments.prototype.RestoreSymbolGrouping = function()
{
	if (this.isAlign || this.isGrid) {
    	for(var k = 0; k < this.segments.length; k++)
		{
        	this.segments[k].set_id = this.set_id;
		}
	}
	// No need to re-label (stored in RecognitionManager)

	// Don't render - only for generating symbol data.
}



GroupSegments.prototype.Undo = function()
{
	// Restore the segment set and type for the symbol.
    for(var k = 0; k < this.segments.length; k++)
    {
        this.segments[k].set_id = this.previous_set[k];
        this.segments[k].type_id = this.previous_classes[k];
		this.segments[k].text = this.previous_labels[k];
    
		console.log("Restoring segment: " + this.previous_set[k]);
	}

    RenderManager.render()
}

GroupSegments.prototype.Apply = function()
{
	// Re-assign set id for each child segment (e.g. symbol)
    for(var k = 0; k < this.segments.length; k++)
        this.segments[k].set_id = this.set_id;

	// Only classify/apply a label if this has not been done already.
	if ( RecognitionManager.getRecognition(this.set_id) == null ) 
	{
		if (this.label == null && ! this.isGrid )
			RecognitionManager.classify(this.set_id);
		else 
		{
			// Create a "recognition result" object to store
			// the passed label in the RecognitionManager.
			var sym = this.label;
			var cer = 1;
			var new_recognition = new RecognitionResult();
			new_recognition.symbols.splice( 0, 1 );
			new_recognition.certainties.splice( 0, 1 );
			new_recognition.symbols.unshift( sym );
			new_recognition.certainties.unshift( cer );
		
			console.log("SYMBOL: " + sym);
			console.log("NEW SET ID: " + this.set_id);
			new_recognition.set_id = this.set_id;
			new_recognition.bst = this.bst;

			RecognitionManager.result_table.push( new_recognition );
		}
	}

	// DEBUG: Somehow calling the renderer was causing problems when
	// multi-stroke symbols are found by DRACULAE in the first align
	// request. 
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
