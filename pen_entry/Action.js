This file is part of Min.

Min is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Min is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Min.  If not, see <http://www.gnu.org/licenses/>.

Copyright 2014 Richard Pospesel, Kevin Hart, Lei Hu, Siyu Zhu, David Stalnaker,
Christopher Sasarak, Robert LiVolsi, Awelemdy Orakwue, and Richard Zanibbi
(Document and Pattern Recognition Lab, RIT) 
/*
 	Defines the interface for command objects that can be undone/redone.
  	Actions are things the user can undo (adding segments, deleting segments,
  	moving segments, and resizing segments).
*/
 
 Action = function()
 {
 
 }
 
 
 Action.prototype.Undo = function()
 {
 
 }
 
 // called by Editor when new action is added to see if the previous action should be discarded
 Action.prototype.shouldKeep = function()
 {
    return false;
 }
 
 //this method will apply the given action
 Action.prototype.Apply = function()
 {
 
 }
 
 // this method will convert an action to appropriate XML
 // schema will be like this:
 /*
    <Action type="action_type" attribute="one"/>
 */
 Action.prototype.toXML = function()
 {
    return "<Action type=\"default\"/>";
 }
 
 // this static method parses an xml string and returns an appropriate action
 Action.parseAction = function(in_xml)
 {
    return new Action();
 }
 
 Action.prototype.toString = function()
 {
    return "Action";
 }