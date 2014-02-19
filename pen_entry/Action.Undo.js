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
	These objects represent undo actions, but are never, and should never actually
    be used.
*/
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
