var socket = io("/livegame");

//users who join each other game get sent to the same room
socket.on("welcome",(msg)=>{
    console.log("roomname: "+msg);
    
})
