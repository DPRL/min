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
   Composite Actions are comprised of several other actions.
*/
CompositeAction.prototype = new Action();

function CompositeAction(){
    this.action_list = new Array();
}

CompositeAction.prototype.shouldKeep = function(){
    return true;
}
CompositeAction.prototype.toString = function(){
    // cms: possibly extend to list constituents
    return "CompositeAction";
}

/**
   This function will add an action to the list of actions.
**/
CompositeAction.prototype.add_action = function(action){
    console.log("adding action");
    this.action_list.unshift(action);
}

/*
  Running the Apply() method will execute the Apply methods of
  the constituents in the order that they were added
*/
CompositeAction.prototype.Apply = function(){
    for(var i = 0; i < this.action_list.length; i++){
        this.action_list[i].Apply();
    }
}

/*
  Undo will undo the actions of the constituents in the reverse
  order that they were added
*/
CompositeAction.prototype.Undo = function(){
    console.log("Undo the actions!");
    console.log("action list: " + this.action_list);
    for(var i = this.action_list.length - 1; i >= 0; i--){
        this.action_list[i].Undo();
        console.log("action: " + this.action_list[i].toString());
    }
}