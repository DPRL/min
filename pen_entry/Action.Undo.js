function Undo()
{

}

Undo.prototype.Undo = function()
{
	alert("Undo action should never be on the undo stack");
}

Undo.prototype.shouldKeep = function()
{
	return true;
}

Undo.prototype.Apply = function()
{
	alert("Undo action should never be on the redo stack");
}

Undo.prototype.toXML = function()
{
	return "<Action type=\"undo\"/>";
}

Undo.prototype.toString = function()
{
	return "Undo";	
}