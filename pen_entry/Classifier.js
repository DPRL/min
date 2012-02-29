 function Classifier()
 {
 
 }
 
 Classifier.prototype.classify = function(in_segments, should_segment)
 {
	var sb = new StringBuilder();
	sb.append("?segmentList=<SegmentList>");
	for(var k = 0; k < in_segments.length; k++)
		sb.append(in_segments[k].toXML());
	sb.append("</SegmentList>");
	if(should_segment == true)
		sb.append("&segment=true");
	else
		sb.append("&segment=false");
	
 
	// BUG: classification of objects with multiple types currently
	// not handled.
	$.get
	(
		Editor.classifier_server_url + sb.toString(), 
		function(data, textStatus, xmlhttp)
		{
			
			console.log("received xml: ");
			console.log(data);
			
			// build each recognition result from the xml
			var xmldoc = data;
			var result_list = xmldoc.getElementsByTagName("RecognitionResults");
			for(var k = 0; k < result_list.length; k++)
			{
				var recognition = new RecognitionResult();
				recognition.fromXML(result_list[k]);
				// identify which passed in segments belong to which set (based on classifier segmentation)
				for(var i = 0; i < in_segments.length; i++)
				{
					for(var j = 0; j < recognition.instance_ids.length; j++)
					{
						if(in_segments[i].instance_id == recognition.instance_ids[j])
						{
							in_segments[i].set_id = recognition.set_id;
							break;
						}
					}
				}
				RecognitionManager.result_table.push(recognition);	
			
			}
			
			
			
			RenderManager.render();
			
			
		}
	);
	// change this to an asynchronous thing later
 }
