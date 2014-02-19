/* 
* This file is part of Min.
* 
* Min is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* Min is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with Min.  If not, see <http://www.gnu.org/licenses/>.
* 
* Copyright 2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
* Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
* (Document and Pattern Recognition Lab, RIT) 
*/
/*
	As the name suggests, this file holds the correction menu's symbol tree.
   	It's essentially responsible for created a tree node which is used by pop up
 	correction menu when the user wants to correct a mis-recognized symbol.
*/
NodeType = {Symbol:0, Category:1}

function Node()
{
    this.parent = null;
    this.xml_node = null;
}

SymbolNode.prototype = new Node;
SymbolNode.prototype.constructor = SymbolNode;
function SymbolNode()
{
    this.name = null;
    this.symbol = null;
}

CategoryNode.prototype = new Node;
CategoryNode.prototype.constructor = CategoryNode;
function CategoryNode()
{
    this.children = new Array();
    this.category = null;
    this.children_type;
}

CategoryNode.prototype.getPath = function()
{
    var node_list = new Array();
    var n = this;
    while(n != null)
    {
        node_list.push(n.category);
        n = n.parent;
    }
    
    var sb = new StringBuilder();
    while(node_list.length > 0)
    {
        sb.append(node_list.pop()).append(" / ");
    }
    
    return sb.toString();
}

function SymbolTree()
{
    this.root = null;    
    this.current = null;
}

SymbolTree.prototype.toString = function()
{
    var sb = new StringBuilder();
    
    var stack = new Array();
    stack.push(this.root);
    stack.push(0);
    while(stack.length > 0)
    {
        var spaces = stack.pop();
        var node = stack.pop();
        for(var k = 0; k < spaces; k++)
            sb.append(' ');
        if(node instanceof SymbolNode)
            sb.append(node.symbol);
        else if(node instanceof CategoryNode)
        {
            sb.append(node.category);
            spaces++;
            for(var k = node.children.length - 1; k>= 0; k--)
            {
                stack.push(node.children[k]);
                stack.push(spaces);
            }
        }
        sb.appendLine();
    }
    
    return sb.toString();
    
}

/** Example xml schema:
    <SymbolTree>
    <Category name="Root">
    <Category name="Digits">
    <Symbol>0</Symbol>
    <Symbol>1</Symbol>
    <Symbol>2</Symbol>
    <Symbol>3</Symbol>
    <Symbol>4</Symbol>
    <Symbol>5</Symbol>
    <Symbol>6</Symbol>
    <Symbol>7</Symbol>
    <Symbol>8</Symbol>
    <Symbol>9</Symbol>
    </Category>
    <Category name="Operators">
    <Symbol>+</Symbol>
    <Symbol>-</Symbol>
    <Symbol>*</Symbol>
    <Symbol>/</Symbol>
    <Symbol>%</Symbol>
    </Category>
    <Category name="Punctuation">
    <Symbol>.</Symbol>
    <Symbol>,</Symbol>
    <Symbol>!</Symbol>
    <Symbol>?</Symbol>
    </Category>
    </Category>
    </SymbolTree>    
**/

SymbolTree.parseXml = function(in_xml)
{
    //var xmldoc = new DOMParser().parseFromString(in_xml, "text/xml");
    var xmldoc = in_xml;
    var node_list = xmldoc.getElementsByTagName("SymbolTree")
    if(node_list == null || node_list.length != 1)
    {
        console.log("Could not find root 'SymbolTree' node in:");
        console.log(new XMLSerializer().serializeToString(in_xml));
        return null;
    }
    
    var root_node = node_list[0];
    var child_nodes = root_node.childNodes;
    var child_elements = new Array();
    for(var k = 0; k < child_nodes.length; k++)
        if(child_nodes[k].nodeType == 1)    // element node http://www.w3schools.com/Dom/dom_nodetype.asp
            child_elements.push(child_nodes[k]);

    if(child_elements.length == 1)
    {
        if(child_elements[0].nodeName == "Category")
        {
            // parse
            var stack = new Array();
            var result = new SymbolTree();
            result.root = new CategoryNode();
            result.root.category = child_elements[0].getAttribute("name");
            stack.push(new Tuple(child_elements[0], result.root));
            while(stack.length > 0)
            {
                var pair = stack.pop();
                var xml_node = pair.item1;
                var tree_node = pair.item2;
                
                child_elements.length = 0;
                for(var k = 0; k < xml_node.childNodes.length; k++)
                    if(xml_node.childNodes[k].nodeType == 1)
                        child_elements.push(xml_node.childNodes[k]);
                
                if(xml_node.nodeName == "Category")
                {
                    var category_nodes = false;
                    var symbol_nodes = false;
                    
                    for(var k = 0; k < child_elements.length; k++)
                    {
                        if(child_elements[k].nodeName == "Category")
                        {
                            category_nodes = true;
                            
                            var cat = new CategoryNode();
                            cat.category = child_elements[k].getAttribute("name");
                            cat.parent = tree_node;
                            cat.parent.children.push(cat);
                            stack.push(new Tuple(child_elements[k], cat));
                        }
                        else if(child_elements[k].nodeName == "Symbol")
                        {
                            symbol_nodes = true;
                            if(child_elements[k].childNodes.length == 0)
                            {
                                var sym = new SymbolNode();
                                sym.parent = tree_node;
                                sym.symbol = child_elements[k].getAttribute("unicode");
                                sym.parent.children.push(sym);
                            }
                            else
                            {
                                console.log("Error: Problem parsing Symbol node: " + new XMLSerializer().serializeToString(child_elements[k]));
                                return null;
                            }
                        }
                        
                        if(symbol_nodes == true && category_nodes == true)
                        {
                            console.log("Error: This Category node contains both child Symbol and Category Nodes:\n");
                            console.log(new XMLSerializer().serializeToString(xml_node));
                            return null;
                        }
                        else if(symbol_nodes)
                        {
                            tree_node.children_type =  NodeType.Symbol;
                        }
                        else if(category_nodes)
                        {
                            tree_node.children_type = NodeType.Category;
                        }
                    }
                    
                }
                else
                {
                    console.log("Error: Unknown node type: " + xml_node.nodeName);
                    return null;
                }
                
            }
            result.current = result.root;
            return result;
        }
        else
        {
            console.log("Wrong root node name: " + child_elements[0].nodeName);
            return null;
        }
    }
    else
    {
        console.log("Error, there can be only 1 root Category node in SymbolTree");
        return null;
    }

    
    //var result 
}