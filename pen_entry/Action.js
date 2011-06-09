 /** Actions are things the user can undo (adding segments, deleting segments, moving segments, and resizing segments) **/
 
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