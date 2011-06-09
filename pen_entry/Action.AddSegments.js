 
 
 AddSegments = function(in_segments)
 {
	this.segments = in_segments;
	this.segment_xmls = new Array();

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
 
 