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
 	Contains the Vector2 object which is used to create vectors of length 2 and methods for
    doing math on them. Vector2s are typically used in Min to represent (x,y) coordinates.

    Methods includes but not limited to:
		Pointwise
		SquareDistance
		Distance
		Subtract
		Multiply
		transform: Translates and scales a Vector2
*/
function Tuple(a,b,c,d,e,f,g,h)
{
    this.item1 = a;
    this.item2 = b;
    this.item3 = c;
    this.item4 = d;
    this.item5 = e;
    this.item6 = f;
    this.item7 = g;
    this.item8 = h;
}


/// RGB

function RGB(in_red, in_green, in_blue)
{
    this.red = in_red;
    this.green = in_green;
    this.blue = in_blue;
}

// expects string in the format: #XXXXXX for hex color
RGB.parseRGB = function(in_hex_string)
{
    if(in_hex_string.length != 7)
    {
        return new RGB(255,0,255);
    }
    else
    {
        var red = parseInt(in_hex_string.substring(1, 3), 16);
        var green = parseInt(in_hex_string.substring(3, 5), 16);
        var blue = parseInt(in_hex_string.substring(5, 7), 16);
        
        if(isNaN(red) || isNaN(green) || isNaN(blue))
            return new RGB(255, 0, 255);
        return new RGB(red, green, blue);
    }
}

/// Vector2

// simple vector 2 objecct

function Vector2(in_x, in_y)
{
    this.x = in_x;
    this.y = in_y;
}

parseVector2 = function(in_string)
{
    var strings = in_string.split(',');
    var x = parseFloat(strings[0]);
    var y = parseFloat(strings[1]);
    return new Vector2(x,y);
}

Vector2.prototype.Set = function(in_vector)
{
    this.x = in_vector.x;
    this.y = in_vector.y;
}

Vector2.prototype.magnitude = function()
{
    return Math.sqrt(this.x * this.x + this.y*this.y);
}

Vector2.prototype.normalize = function()
{
    var mag = this.magnitude();
    this.x /= mag;
    this.y /= mag;
    return this;
}

Vector2.prototype.toString = function()
{
    
    return  this.x + "," + this.y;
}

Vector2.Dot = function(a, b)
{
    return a.x * b .x + a.y * b.y;
}

Vector2.Pointwise = function(a, b)
{
    return new Vector2(a.x * b.x, a.y * b.y);
}

Vector2.SquareDistance = function(a,b)
{
    var diff_x = a.x - b.x;
    var diff_y = a.y - b.y;
    return diff_x * diff_x + diff_y * diff_y;
}

Vector2.Distance = function(a,b)
{
    
    return Math.sqrt(Vector2.SquareDistance(a,b));
}

Vector2.Subtract = function(a, b)
{
    return new Vector2(a.x - b.x, a.y - b.y);
}

Vector2.Add = function(a, b)
{
    return new Vector2(a.x + b.x, a.y + b.y);
}

Vector2.prototype.Add = function(a)
{
    this.x += a.x;
    this.y += a.y;
}

Vector2.prototype.Subtract = function(a)
{
    this.x -= a.x;
    this.y -= a.y;
}

Vector2.Multiply = function(f, v)
{
    return new Vector2(v.x * f, v.y * f);
}

Vector2.prototype.equals = function(a)
{
    return this.x == a.x && this.y == a.y;
}

Vector2.Equals = function(a,b)
{
    return a.x == b.x && a.y == b.y;
}

Vector2.prototype.transform = function(in_scale, in_translation)
{
    return new Vector2(this.x * in_scale.x + in_translation.x, this.y * in_scale.y + in_translation.y);
}

Vector2.prototype.clone  = function()
{
    return new Vector2(this.x, this.y);
}

/// StringBuilder

// Initializes a new instance of the StringBuilder class

// and appends the given value if supplied

function StringBuilder(value)
{
    this.strings = new Array("");
    this.append(value);
}

// Appends the given value to the end of this instance.

StringBuilder.prototype.append = function (value)
{
    this.strings.push(value);
    return this;
}

StringBuilder.prototype.appendLine = function()
{
    this.strings.push("\n");
    return this;
}

// Clears the string buffer

StringBuilder.prototype.clear = function ()
{
    this.strings.length = 1;
}

// Converts this instance to a String.

StringBuilder.prototype.toString = function ()
{
    return this.strings.join("");
}

/// Array

Array.prototype.contains = function(value)
{
    for(var k = 0; k < this.length; k++)
        if(value == this[k])
            return true;
    return false;
}

Array.prototype.clone = function()
{
    var result = new Array();
    for(var k = 0; k < this.length; k++)
    {
        result.push(this[k]);
    }
    return result;
}

/// Canvas

// stolen from: http://davidowens.wordpress.com/2010/09/07/html-5-canvas-and-dashed-lines/
// pattern in an array of lengths (alternate for dash and space between dash)
// ie:
// var pattern = new Array(1, 2)
// renders as:
// -  -  -  -  -  -  -  -  -
// var pattern = new Array(3, 2)
// renders as:
// ---  ---  ---  ---  ---  
CanvasRenderingContext2D.prototype.dashedLineTo = function (fromX, fromY, toX, toY, pattern) 
{

    // Our growth rate for our line can be one of the following:
    //   (+,+), (+,-), (-,+), (-,-)
    // Because of this, our algorithm needs to understand if the x-coord and
    // y-coord should be getting smaller or larger and properly cap the values
    // based on (x,y).
    var lt = function (a, b) { return a <= b; };
    var gt = function (a, b) { return a >= b; };
    var capmin = function (a, b) { return Math.min(a, b); };
    var capmax = function (a, b) { return Math.max(a, b); };

    var checkX = { thereYet: gt, cap: capmin };
    var checkY = { thereYet: gt, cap: capmin };

    if (fromY - toY > 0) {
        checkY.thereYet = lt;
        checkY.cap = capmax;
    }
    if (fromX - toX > 0) {
        checkX.thereYet = lt;
        checkX.cap = capmax;
    }

    this.moveTo(fromX, fromY);
    var offsetX = fromX;
    var offsetY = fromY;
    var idx = 0, dash = true;
    while (!(checkX.thereYet(offsetX, toX) && checkY.thereYet(offsetY, toY))) 
    {
        var ang = Math.atan2(toY - fromY, toX - fromX);
        var len = pattern[idx];

        offsetX = checkX.cap(toX, offsetX + (Math.cos(ang) * len));
        offsetY = checkY.cap(toY, offsetY + (Math.sin(ang) * len));

        if (dash) this.lineTo(offsetX, offsetY);
        else this.moveTo(offsetX, offsetY);

        idx = (idx + 1) % pattern.length;
        dash = !dash;
    }
    
};

/// Math class extentions

Math.sign = function(f)
{
    if(f > 0)
        return 1;
    if(f < 0)
        return -1;
    return 0;
}

/** Helper method to find aboslute location of our parent div **/
function findPosition(in_obj)
{
    var left = 0;
    var top = 0;
    if(in_obj.offsetParent)
    {
        do
        {
            left += in_obj.offsetLeft;
            top += in_obj.offsetTop;
        }
        while(in_obj = in_obj.offsetParent);
    }
    
    return [left, top];
}

/* A bounded queue defines a queue which is bounded to some
   maximum value. Adding an item which would go over the boundary
   results in the oldest item being removed and the new item being added to the list.
*/
BoundedQueue.prototype = new Array();
function BoundedQueue(upperBound){
    console.log(upperBound);
    this.upperBound = upperBound;
}

BoundedQueue.prototype.enqueue = function(item){
    if(this.length == this.upperBound){
        this.shift();
    }
    
    this.push(item);
}

BoundedQueue.prototype.clear = function(){
    this.splice(0, this.upperBound);
}