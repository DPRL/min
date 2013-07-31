/*
  This is the menu that appears to allow the user to manually enter the symbol that they want.
*/
// CMS: TODO: Consider making the correct menu an editor state in and of itself
function CorrectionMenu()
{
    
}

// sets up the correction menu
CorrectionMenu.initialize = function()
{
    CorrectionMenu.close_button = document.getElementById("rr_close_button");
    CorrectionMenu.close_button.addEventListener("click", CorrectionMenu.hide, true);

    CorrectionMenu.touch_start_position = null;
    CorrectionMenu.current_Y = 0;
    CorrectionMenu.div_moving = false;
    CorrectionMenu.div_speed = 0;
    CorrectionMenu.touchend_time;
    CorrectionMenu.touch_moving = false;
    
    CorrectionMenu.menu = document.getElementById("relabel_menu");
    CorrectionMenu.offset = 0;
    CorrectionMenu.label = document.getElementById("rr_node_label");
    CorrectionMenu.current_list = document.getElementById("rr_category_list");
    CorrectionMenu.current_grid = document.getElementById("rr_symbol_grid");
    
    // lists and grids get added to center panel
    CorrectionMenu.center_panel = document.getElementById("rr_center");
    if(Modernizr.touch)
    {
        CorrectionMenu.current_list.addEventListener("touchstart", CorrectionMenu.touchstart, true);
        CorrectionMenu.current_list.addEventListener("touchmove", CorrectionMenu.touchmove, true);
        CorrectionMenu.current_list.addEventListener("touchend", CorrectionMenu.touchend, true);
        
        CorrectionMenu.current_grid.addEventListener("touchstart", CorrectionMenu.touchstart, true);
        CorrectionMenu.current_grid.addEventListener("touchmove", CorrectionMenu.touchmove, true);
        CorrectionMenu.current_grid.addEventListener("touchend", CorrectionMenu.touchend, true);
    }
    
    
    CorrectionMenu.center_panel.removeChild(CorrectionMenu.current_list);
    CorrectionMenu.center_panel.removeChild(CorrectionMenu.current_grid);
    
    
    /** Get the SymbolTree we are going to use **/
    var url = Editor.editor_root + Editor.symbol_tree;
    //console.log(url);
    
    $.get
    (
        Editor.symbol_tree,
        function(data, textStatus, xmlhttp)
        {
            //console.log("url: " + url);
            //console.log("data: " + data);
            //console.log("textStatus: " + textStatus);
            //console.log("xmlhttp: " + xmlhttp.toString());
            // parse received XML and build symbol tree
            CorrectionMenu.symbol_tree = SymbolTree.parseXml(data);
            //console.log(CorrectionMenu.symbol_tree.toString());
            // add in category for recognition results
            CorrectionMenu.recognition_node = new CategoryNode();
            CorrectionMenu.recognition_node.category = "OCR";
            CorrectionMenu.recognition_node.children_type = NodeType.Symbol;
            CorrectionMenu.recognition_node.parent = CorrectionMenu.symbol_tree.root;
            CorrectionMenu.symbol_tree.root.children.splice(0,0,CorrectionMenu.recognition_node);
            
            // populate root panel node
            //CorrectionMenu.populateCategoryList(CorrectionMenu.current_list);
            
        },
        "xml"
    );
}

CorrectionMenu.build_title_html = function()
{
    
    var node = CorrectionMenu.symbol_tree.current;
    var node_names = new Array();
    
    do
    {
        node_names.unshift(node.category);
        node = node.parent;
    }
    while(node != null);
    
    var sb = new StringBuilder();
    for(var k = 0; k < node_names.length; k++)
    {
        sb.append("<span class=\"rr_node button\" onclick=\"CorrectionMenu_up(").append(node_names.length - 1 - k).append(");\">").append(node_names[k]).append("</span>");
        if(k != node_names.length - 1)
            //sb.append("  ·  ");
            //sb.append("  \u2023  ");    // arrow bullet
            sb.append("<span class=\"rr_node_delimiter\">  \u25b7  </span>");

    }
    
    //console.log(sb.toString());
    return sb.toString();
}

CorrectionMenu.populateCategoryList = function(list_div, node, start_index)
{
    var child_nodes = node.children;
    var node_index = start_index;
    if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Category)
    {
        var child_divs = list_div.childNodes;
        while(child_divs.length > 0)
            list_div.removeChild(child_divs.item(0));
        
        // add each category node
        for(var k = 0; k < child_nodes.length; k++)
        {
            var div = document.createElement("div");
            div.className = "category_row button";
            div.innerHTML = child_nodes[k].category;
            div.addEventListener("click", CorrectionMenu.select_category, true);
            div.style.lineHeight = CorrectionMenu.center_panel.clientHeight / 5 + "px";
            CorrectionMenu.current_list.appendChild(div);
        }
        
        //CorrectionMenu.label.innerHTML = CorrectionMenu.symbol_tree.current.category;
        
        CorrectionMenu.label.innerHTML = CorrectionMenu.build_title_html();
        if(CorrectionMenu.symbol_tree.current != CorrectionMenu.symbol_tree.root)
            CorrectionMenu.up.innerHTML = "Up (" + CorrectionMenu.symbol_tree.current.parent.category + ")";        
        else
            CorrectionMenu.up.innerHTML = "";

        if(Modernizr.touch)
        {
            CorrectionMenu.current_list.style.setProperty('-webkit-transform', 'translate3d(0px,0px,0px)', null);
            CorrectionMenu.current_Y = 0;
        }
    }
}

CorrectionMenu.populateSymbolGrid = function(grid_div, node, start_index)
{
    var child_nodes = node.children;
    var node_index = start_index;
    if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Symbol)
    {
        var child_divs = grid_div.childNodes;
        while(child_divs.length > 0)
            grid_div.removeChild(child_divs.item(0));

        // add each cell node
        for(var k = 0; k < child_nodes.length; k++)
        {
            var div = document.createElement("div");
            div.className = "symbol_cell button";
            
            //console.log(child_nodes[k].symbol);
            
            div.innerHTML = child_nodes[k].symbol;
            
            //console.log(child_nodes[k].symbol);
            div.addEventListener("click", CorrectionMenu.select_symbol, true);
            div.style.lineHeight = CorrectionMenu.center_panel.clientHeight / 3 + "px";
            CorrectionMenu.current_grid.appendChild(div);
        }
        
        CorrectionMenu.label.innerHTML = CorrectionMenu.build_title_html();
        if(CorrectionMenu.symbol_tree.current != CorrectionMenu.symbol_tree.root)
            CorrectionMenu.up.innerHTML = "Up (" + CorrectionMenu.symbol_tree.current.parent.category + ")";
        if(Modernizr.touch)
        {
            CorrectionMenu.current_grid.style.setProperty('-webkit-transform', 'translate3d(0px,0px,0px)', null);
            CorrectionMenu.current_Y = 0;
        }
    }
}

CorrectionMenu.updateOCRList = function()
{
    // Produce OCR result correction menu data, if selected objects are a single segment.
    var segment_set = Editor.selected_segments[0].set_id;
    var all_same = true;
    for(var k = 1; k < Editor.selected_segments.length; k++)
    {
        if(segment_set != Editor.selected_segments[k].set_id)
        {
            all_same = false;
            break;
        }
    }
    // BUG (?) : if we have mutliple segments, we shouldn't provide OCR results.
    if(all_same)
    {
        var rec_result = RecognitionManager.getRecognition(segment_set);
        CorrectionMenu.recognition_node.children.length = 0;
        for(var k = 0; k < rec_result.results; k++)
        {
            var symbol_node = new SymbolNode();
            symbol_node.name = rec_result.symbols[k];
            //console.log("name: " + symbol_node.name);
            symbol_node.symbol = RecognitionManager.symbol_name_to_unicode[symbol_node.name];
            if(typeof(symbol_node.symbol) == "undefined")
                symbol_node.symbol = symbol_node.name;
            //console.log("symbol: " + symbol_node.symbol);
            CorrectionMenu.recognition_node.children.push(symbol_node);
        }
    }
}


/*
    hide_callback used by the hide() function to go back to the mode we were
    in previously.
*/
CorrectionMenu.show = function(callback)
{
    // Change state, make menu visible.
    Editor.state = EditorState.Relabeling;
    CorrectionMenu.menu.style.visibility = "visible";
    if(callback)
        CorrectionMenu.hide_callback = callback;
    else
        CorrectionMenu.hide_callback = null;

    // DEBUG: uncomment and fix the following code if we want to try and
    // restore the current menu state (e.g. to go back to the menu where a correction was
    // made.
    // Removes list of symbols from the current menu, if we selected a symbol last time.
    //if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Symbol)
    //{
    // Comment out: maintains current menu state.
    //    CorrectionMenu.center_panel.removeChild(CorrectionMenu.current_grid);
    //    CorrectionMenu.center_panel.appendChild(CorrectionMenu.current_list);
    //} else {
    // Produce top-level list.
    CorrectionMenu.symbol_tree.current = CorrectionMenu.symbol_tree.root;
    CorrectionMenu.populateCategoryList(CorrectionMenu.current_list, CorrectionMenu.symbol_tree.current, 0);

    // Produce OCR results, place in the panel.
    CorrectionMenu.updateOCRList();
    CorrectionMenu.symbol_tree.current = CorrectionMenu.recognition_node;
    CorrectionMenu.populateSymbolGrid(CorrectionMenu.current_grid, CorrectionMenu.recognition_node, 0);
    CorrectionMenu.center_panel.appendChild(CorrectionMenu.current_grid);
    //}
}

CorrectionMenu.select_category = function(e)
{
    //console.log("selecting category");
    if(CorrectionMenu.touch_moving == true)
        return;

    var category = e.currentTarget.innerHTML;
    //console.log(category);
    // figure out new current
    for(var k = 0; k < CorrectionMenu.symbol_tree.current.children.length; k++)
    {
        if(CorrectionMenu.symbol_tree.current.children[k].category == category)
        {
            CorrectionMenu.symbol_tree.current = CorrectionMenu.symbol_tree.current.children[k]
            break;
        }
    }
    if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Category)
        CorrectionMenu.populateCategoryList(CorrectionMenu.current_list, CorrectionMenu.symbol_tree.current, 0);
    else if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Symbol)
    {
        CorrectionMenu.populateSymbolGrid(CorrectionMenu.current_grid, CorrectionMenu.symbol_tree.current, 0);
        CorrectionMenu.center_panel.removeChild(CorrectionMenu.current_list);
        CorrectionMenu.center_panel.appendChild(CorrectionMenu.current_grid);
    }
}

CorrectionMenu.select_symbol = function(e)
{
    if(CorrectionMenu.touch_moving == true)
        return;
    
    if (Editor.touchAndHoldFlag != 0) {
        return;
    }
    
    var symbol = RecognitionManager.unicode_to_symbol_name[e.currentTarget.innerHTML];
    if(symbol != "")
    {    
        var new_recognition = null;
        
        //console.log("Selected: " + symbol);
        var set_id = Segment.set_count++;
        for(var k = 0; k < Editor.selected_segments.length; k++)
        {
            if ( new_recognition == null ) new_recognition = RecognitionManager.getRecognition( Editor.selected_segments[ k ].set_id );
            
            //console.log("Removing: " + Editor.selected_segments[k].set_id);
            RecognitionManager.removeRecognition(Editor.selected_segments[k].set_id);
            
            Editor.selected_segments[k].set_id = set_id;
            
        }

        var set_from_symbols_list = false;
        for ( var i = 0; i < new_recognition.symbols.length; i++ ) {
            if ( new_recognition.symbols[ i ] == symbol ) {
                var sym = symbol;
                var cer = new_recognition.certainties[ i ];
                new_recognition.symbols.splice( i, 1 );
                new_recognition.certainties.splice( i, 1 );
                new_recognition.symbols.unshift( sym );
                new_recognition.certainties.unshift( cer );
                new_recognition.set_id = set_id;
                RecognitionManager.result_table.push( new_recognition );
                set_from_symbols_list = true;
                break;
            }
        }
        // If no recognition was found in the result list, force the new symbol
        if(!set_from_symbols_list){
            var sym = symbol;
            var cer = 1;
            new_recognition.symbols.splice( 0, 1 );
            new_recognition.certainties.splice( 0, 1 );
            new_recognition.symbols.unshift( sym );
            new_recognition.certainties.unshift( cer );
            new_recognition.set_id = set_id;
            RecognitionManager.result_table.push( new_recognition );
        }
        
        RenderManager.render();
        CorrectionMenu.hide();
    }
}

CorrectionMenu_up = function(node_count)
{
    if(node_count == 0)
        return;

    if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Symbol)
    {
        CorrectionMenu.center_panel.removeChild(CorrectionMenu.current_grid);
        CorrectionMenu.center_panel.appendChild(CorrectionMenu.current_list);
    }
    
    for(var k = 0; k < node_count; k++)
    {
        CorrectionMenu.symbol_tree.current = CorrectionMenu.symbol_tree.current.parent;
    }
    CorrectionMenu.populateCategoryList(CorrectionMenu.current_list, CorrectionMenu.symbol_tree.current, 0);
}

CorrectionMenu.up = function(node_count)
{
    if(CorrectionMenu.symbol_tree.current.parent != null)
    {
        if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Symbol)
        {
            CorrectionMenu.center_panel.removeChild(CorrectionMenu.current_grid);
            CorrectionMenu.center_panel.appendChild(CorrectionMenu.current_list);
        }
        CorrectionMenu.symbol_tree.current = CorrectionMenu.symbol_tree.current.parent;
        CorrectionMenu.populateCategoryList(CorrectionMenu.current_list, CorrectionMenu.symbol_tree.current, 0);
    }
    
    return;
}

CorrectionMenu.hide = function(){
    Editor.clearButtonOverlays();

    CorrectionMenu.menu.style.visibility = "hidden";
    
    if(CorrectionMenu.hide_callback)
        CorrectionMenu.hide_callback();
    // Keep the current mode's button selected
    Editor.current_mode.init_mode();
    Editor.clear_selected_segments();
    RenderManager.render();
}

CorrectionMenu.touchstart = function(e)
{
    CorrectionMenu.touch_start_position = new Vector2(e.touches[0].clientX, e.touches[0].clientY);
    CorrectionMenu.div_moving = true;
    CorrectionMenu.div_speed = 0;
    CorrectionMenu.touch_moving = false;
}

CorrectionMenu.touchmove = function(e)
{
    CorrectionMenu.touch_moving = true;
    var to_move = null;
    var to_move_height;
    var center_height = CorrectionMenu.center_panel.clientHeight;
    if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Category)
    {
        if(CorrectionMenu.current_list.childNodes.length <= 5)    
            return;
        to_move = CorrectionMenu.current_list;
        
        to_move_height = CorrectionMenu.current_list.childNodes.length * center_height / 5.0;
    }
    else if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Symbol)
    {
        if(CorrectionMenu.current_grid.childNodes.length <= 9)
            return;
        to_move = CorrectionMenu.current_grid;
        if(CorrectionMenu.current_grid.childNodes.length % 3 != 0)
            to_move_height = (Math.floor(CorrectionMenu.current_grid.childNodes.length / 3) + 1) * (center_height / 3.0);
        else
            to_move_height = Math.floor(CorrectionMenu.current_grid.childNodes.length / 3) * (center_height / 3.0);
    }var touch_current_position = new Vector2(e.touches[0].clientX, e.touches[0].clientY);
    var delta = Vector2.Subtract(touch_current_position, CorrectionMenu.touch_start_position);

    CorrectionMenu.div_speed = delta.y;
    
    var new_position = CorrectionMenu.current_Y + delta.y;
    if(new_position > 0)
        new_position = 0;
    if(new_position < (center_height - to_move_height))
        new_position = center_height - to_move_height;

    CorrectionMenu.current_Y = new_position;
    
    
    
    var sb = new StringBuilder();
    sb.append("translate3d(0px,").append(CorrectionMenu.current_Y).append("px,0px)");
    to_move.style.setProperty('-webkit-transform', sb.toString(), null);
    //to_move.style.top = delta.y + "px";
    CorrectionMenu.touch_start_position = touch_current_position;
}

CorrectionMenu.touchend = function(e)
{
    CorrectionMenu.div_moving = true;
    CorrectionMenu.touchend_time = (new Date()).getTime();
    setTimeout(CorrectionMenu.animate);
}

CorrectionMenu.decelleration = 100;
CorrectionMenu.animate = function()
{
    var to_move = null;    
    var to_move_height;
    var center_height = CorrectionMenu.center_panel.clientHeight;
    if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Category)
    {
        if(CorrectionMenu.current_list.childNodes.length <= 5)    
            return;
        to_move = CorrectionMenu.current_list;
        
        to_move_height = CorrectionMenu.current_list.childNodes.length * center_height / 5.0;
    }
    else if(CorrectionMenu.symbol_tree.current.children_type == NodeType.Symbol)
    {
        if(CorrectionMenu.current_grid.childNodes.length <= 9)
            return;
        to_move = CorrectionMenu.current_grid;
        if(CorrectionMenu.current_grid.childNodes.length % 3 != 0)
            to_move_height = (Math.floor(CorrectionMenu.current_grid.childNodes.length / 3) + 1) * (center_height / 3.0);
        else
            to_move_height = Math.floor(CorrectionMenu.current_grid.childNodes.length / 3) * (center_height / 3.0);
    }

    var current_time = (new Date()).getTime();
    if(CorrectionMenu.div_speed > 0)
    {
        CorrectionMenu.div_speed -= (current_time - CorrectionMenu.touchend_time)/1000.0 * CorrectionMenu.decelleration;
        if(CorrectionMenu.div_speed < 0)
            CorrectionMenu.div_speed = 0;
    }
    else if(CorrectionMenu.div_speed < 0)
    {
        CorrectionMenu.div_speed += (current_time - CorrectionMenu.touchend_time)/1000.0 * CorrectionMenu.decelleration;
        if(CorrectionMenu.div_speed > 0)
            CorrectionMenu.div_speed = 0;
    }
    CorrectionMenu.touchend_time = current_time

    if(CorrectionMenu.div_speed == 0.0)
    {
        CorrectionMenu.div_moving = false;
        return;
    }
    
    var new_position = CorrectionMenu.current_Y + CorrectionMenu.div_speed;
    if(new_position > 0)
    {
        new_position = 0;
        CorrectionMenu.div_moving = false;
    }
    if(new_position < (center_height - to_move_height))
    {
        new_position = center_height - to_move_height;
        CorrectionMenu.div_moving = false;
    }

    
    CorrectionMenu.current_Y = new_position;    
    var sb = new StringBuilder();
    sb.append("translate3d(0px,").append(CorrectionMenu.current_Y).append("px,0px)");
    to_move.style.setProperty('-webkit-transform', sb.toString(), null);
    
    if(CorrectionMenu.div_moving )
    {
        setTimeout(CorrectionMenu.animate);
    }
}
