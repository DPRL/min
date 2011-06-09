function Redo()
{

}

Redo.prototype.Undo = function()
{
	alert("Redo action should never be on the undo stack");
}

Redo.prototype.shouldKeep = function()
{
	return true;
}

Redo.prototype.Apply = function()
{
	alert("Redo action should never be on the redo stack");
}

Redo.prototype.toXML = function()
{
	return "<Action type=\"redo\"/>";
}

Redo.prototype.toString = function()
{
	return "Redo";	
}