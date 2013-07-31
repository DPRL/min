function Classifier()
{
    
}

/*
  This function takes a list of segments to be classified and organizes them into groups
  based on which classification server that they use so that the requests can all be sent at once.
*/
Classifier.prototype.group_by_server = function(in_segments){
    var classification_groups = {};
    for(var k = 0; k < in_segments.length; k++){
        var classification_server = in_segments[k].classification_server;
        
        // If this is a server we haven't encountered yet, add it
        if(!classification_groups[classification_server])
            classification_groups[classification_server] = new Array();

        // Add this segment to the list of segments associated with the current classification_server
        classification_groups[classification_server].push(in_segments[k]);
    }

    return classification_groups;
}

Classifier.prototype.request_classification = function(server_url, in_segments, should_segment){
    // change this to an asynchronous thing later

    // This assumes that each type of object uses the same type of list for segments
    var sb = new StringBuilder();
    sb.append("?segmentList=<SegmentList>");
    for(var k = 0; k < in_segments.length; k++)
        sb.append(in_segments[k].toXML());
    sb.append("</SegmentList>");
    if(should_segment == true)
        sb.append("&segment=true");
    else
        sb.append("&segment=false");
    
    $.get
    (
        server_url + sb.toString(), 
        function(data, textStatus, xmlhttp)
        {

            // build each recognition result from the xml
            var xmldoc = data;

            var result_list = xmldoc.getElementsByTagName("RecognitionResults");

            // If there are ConnectedComponents coming back, then create ImageBlobs on the canvas
            // assuming that there is just one image blob for classification
            if(xmldoc.getElementsByTagName("ConnectedComponents").length != 0){
                in_segments = ImageBlob.populateCanvasFromCCs(xmldoc, new Vector2(in_segments[0].image.width,
                                                                                  in_segments[0].image.height)); 
            }


            f = function(){
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
                    RenderManager.render();
                }
            }
            
            setTimeout(f, 300); // Give enough time for images to load, there's probably a better way to do this
      
        }
    );
}

Classifier.prototype.classify = function(in_segments, should_segment)
{
    var classification_groups = this.group_by_server(in_segments);
    var keys = Object.keys(classification_groups);
    for(var n = 0; n < keys.length; n++){
        this.request_classification(ClassificationServers[keys[n]], classification_groups[keys], should_segment);
    }
}
