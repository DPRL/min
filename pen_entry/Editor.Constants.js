/** Clasifier **/

Editor.classifier = new Classifier();

/** Server configuration **/

Editor.editor_root = "http://people.rit.edu/rap3064/math/";
//Editor.editor_root = "./";
Editor.connected_components_server_url = "http://129.21.34.104:2000/";
// dummy classifier (niagra)
//Editor.classifier_server_url = "http://129.21.34.104:1500/";
// lei classifier (saskatoon)
//Editor.classifier_server_url = "http://129.21.34.109:1500/";
// lei classifier (ottawa)
Editor.classifier_server_url = "http://129.21.34.109:1500/";
// draculae (saskatoon)
Editor.align_server_url = "http://129.21.34.109:1000/";
// data server (saskatoon)
Editor.data_server_url = "http://129.21.34.109:500/"
//Editor.data_server_url = "http://129.21.34.107:1500";

Editor.symbol_tree = "example_tree.xml";

/** Asthetics **/

// colors assumed to be 3 byte hex (ie no rgba() bs)
Editor.segment_color = "#111111"; 
//Editor.selected_segment_color = "#4FBFDB";
Editor.selected_segment_color = "#FF0000";
Editor.selection_box_color = "#303030";
Editor.segment_set_box_color = "#FF8020";
Editor.control_point_fill_color = "#FFAA00";
Editor.control_point_line_color = "#111111";
Editor.control_point_radius = 16;
Editor.control_point_line_width = 1;
Editor.recognition_result_color = "#111111";
Editor.stroke_width = 3;
Editor.selected_stroke_width = 4;
Editor.stroke_select_color = "#44F"
Editor.stroke_select_width = 1.5;