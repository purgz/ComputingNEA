var socket = io();

//sends request to add game room to game list
function NewGame(){
    socket.emit("CreateGame");
}
//sends the roomname to the server so the user can be connected to the game room
function JoinRoom(name){
    console.log(name.id);
    socket.emit("JoinRoom",name.id)
    return true;
}
//new game is added to list - creates form element and adds attributes/actions.
socket.on("NewGame",(games)=>{
   
    var gamelist = document.getElementById("gamelist");     
    gamelist.innerHTML="";         //clear gamelist to display new list of rooms

    for (let i=0; i<games.length;i++){
        //for each room create list element, form and input inside of form
        let li = document.createElement("li");
        let myform = document.createElement("form")
        let butn = document.createElement("input")
        
        myform.setAttribute("id",games[i]);
        myform.action = "/newGame";          //this will redirect users to the gamePage.ejs when the button is pressed
        myform.setAttribute("onsubmit",`return JoinRoom(${games[i]})`); //joins the correct game room,onsubmit
        
        butn.setAttribute("type","submit");
        butn.setAttribute("value","Join "+games[i]+"'s Game");
        myform.appendChild(butn);
        
        li.appendChild(myform)
        gamelist.appendChild(li);   //add each element to the outputted list.
    }
})

