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