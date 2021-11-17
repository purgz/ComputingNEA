 var socket = io("/livegame");

//caching the html elements for each chess piece.
//pieces -------------------------------------------------------------------------------------------------------
const wRook = '<img id = "white rook" draggable = "true" class = "piece white" src = "/pieces/wR.png"></img>';
const wBishop = '<img id = "white bishop" draggable = "true" class = "piece white" src = "/pieces/wB.png"></img>';
const wKnight = '<img id = "white knight" draggable = "true" class = "piece white" src = "/pieces/wN.png"></img>';
const wQueen = '<img id = "white queen" draggable = "true" class = "piece white" src = "/pieces/wQ.png"></img>';
const wKing = '<img id = "white king" draggable = "true" class = "piece white" src = "/pieces/wK.png"></img>';
const wPawn = '<img id = "white pawn" draggable = "true" class = "piece white" src = "/pieces/wP.png"></img>';

const bRook = '<img id = "black rook" draggable = "true" class = "piece black" src = "/pieces/bR.png"></img>';
const bBishop = '<img id = "black bishop" draggable = "true" class = "piece black" src = "/pieces/bB.png"></img>';
const bKnight = '<img id = "black knight" draggable = "true" class = "piece black" src = "/pieces/bN.png"></img>';
const bQueen = '<img id = "black queen" draggable = "true" class = "piece black" src = "/pieces/bQ.png"></img>';
const bKing = '<img id = "black king" draggable = "true" class = "piece black" src = "/pieces/bK.png"></img>';
const bPawn = '<img id = "black pawn" draggable = "true" class = "piece black" src = "/pieces/bP.png"></img>';
//-------------------------------------------------------------------------------------------------------------

var cells = document.getElementsByClassName("square");

var newSquare;
var currentCell;


document.addEventListener("dragstart",dragStart);
document.addEventListener("dragover",dragOver);
document.addEventListener("dragend",dragEnd);

//find the square id of the piece selected
function dragStart(event){
    
    currentCell = event.target.parentNode.id;
    console.log(currentCell)
}

function dragOver(event){
    //checks if the square is empty - if not empty the square is found as the parent of the piece currently there
    if (document.getElementById(event.target.id).className.split(" ")[0] == "piece"){
        newSquare = event.target.parentNode.id;
    } else {
        newSquare = event.target.id;
    }
    console.log(newSquare)
}
//sends the move info to the server to be checked and calculated
function dragEnd(event){
    
    socket.emit("move-request",currentCell,newSquare);
}



//function for rendering the gamestate send from the server
function RenderBoard(gamestate){
    var pieces = [];
     
    for(let i = 0; i < gamestate.length; i++){
        //gets the string value of each cells piece, ie wB for white bishop
        var tempPiece = gamestate[i];
        //checks each string value and pushes the image for each piece in the correct index
        switch(tempPiece){
            case tempPiece = "bR":
                pieces.push(bRook);
                break;
            case tempPiece = "bN":
                pieces.push(bKnight);
                break;
            case tempPiece = "bB":
                pieces.push(bBishop);
                break;
            case tempPiece = "bQ":
                pieces.push(bQueen);
                break;
            case tempPiece = "bK":
                pieces.push(bKing);
                break;
            case tempPiece = "bP":
                pieces.push(bPawn);
                break;
            case tempPiece = "wR":
                pieces.push(wRook);
                break;
            case tempPiece = "wN":
                pieces.push(wKnight);
                break;
            case tempPiece = "wB":
                pieces.push(wBishop);
                break;
            case tempPiece = "wQ":
                pieces.push(wQueen);
                break;
            case tempPiece = "wK":
                pieces.push(wKing);
                break;
            case tempPiece = "wP":
                pieces.push(wPawn);
                break;
            default:
                pieces.push("");
                break;
        }
    }
    //fills in each cell with the correct image at the correct index.
    for (let i = 0; i < pieces.length; i++){
        cells[i].innerHTML = pieces[i];
    }
}

function Orientation(colour){
    if (colour == "black")
    {
        document.getElementsByClassName("board")[0].style.transform = "rotate(180deg)";
        document.getElementById("gameOver").style.transform = "rotate(180deg)";
        for (var i = 0; i < cells.length;i++)
        {
            cells[i].style.transform = "rotate(180deg)";
        }                        
    }
    
}

//recives the gamestate from server and renders for the players.
socket.on("Render",(gamestate)=>{
    RenderBoard(gamestate);
})

socket.on("Orientation",(colour)=>{
    Orientation(colour);
})

socket.on("playerNames",(name1,name2)=>{
    
    let player1 = document.getElementById("player1")
    let player2 = document.getElementById("player2")

    player1.innerHTML = name1;
    player2.innerHTML = name2;
})
socket.on("swapName",()=>{
    let player1 = document.getElementById("player1")
    let player2 = document.getElementById("player2")

    temp = player1.innerHTML;
    player1.innerHTML = player2.innerHTML;
    player2.innerHTML = temp;
})

socket.on("player-disconnect",()=>{
    alert("user disconnected");
    document.removeEventListener("dragstart",dragStart)
    document.removeEventListener("dragover",dragOver);
    document.removeEventListener ("dragend",dragEnd);
})

socket.on("game-over",(username,type)=>{
    //remove event listeners
    document.removeEventListener("dragstart",dragStart)
    document.removeEventListener("dragover",dragOver);
    document.removeEventListener ("dragend",dragEnd);

    //disable resign and draw btn
    document.getElementById("DrawBtn").disabled = true;
    document.getElementById("ResignBtn").disabled = true;

    let winnerInfo = document.getElementById("winnerInfo");
    if (type == "Checkmate"){
        //alert(username+" wins by "+type)
        winnerInfo.innerHTML = username + " wins by " + type;
    } else if (type =="Stalemate"){
        //alert(type)
        winnerInfo.innerHTML = type;
    } else if (type == "Resign"){
        winnerInfo.innerHTML = username+ " resigned";
    } else if (type == "Draw"){
        winnerInfo.innerHTML = "Draw by agreement";

    }
    document.getElementById("gameOver").style.display = "block";
    //show popup when game over

  
})

socket.on("OfferDraw",(username)=>{
    //console.log(username+" offers a draw")
    let btn1 = document.createElement("button");
    btn1.innerHTML = "accept draw";
    btn1.className = "button button2";
    let btn2 = document.createElement("button");
    btn2.className = "button button2";
    btn2.innerHTML = "decline draw";

    btn1.onclick = function (){
        socket.emit("AcceptDraw");
    }
    btn2.onclick = function (){
        let div1 = document.getElementById("DrawOffer");

        div1.parentNode.removeChild(div1);

    }

    let div = document.getElementById("DrawOffer");

    div.appendChild(btn1);
    div.appendChild(btn2);
})

socket.on("RemoveButtons",()=>{
    let div1 = document.getElementById("OfferDraw");
    let div2 = document.getElementById("DrawOffer");

    div1.parentNode.removeChild(div1);
    div2.parentNode.removeChild(div2);
})

function Resign(){
    socket.emit("Resign");
}

function OfferDraw(){
    socket.emit("OfferDraw");
}



//code for simple chat
var form = document.getElementById("form");
var input = document.getElementById("input");
form.addEventListener("submit",function(e){
    e.preventDefault(); //prevents form from submitting when clicked.
    if(input.value){
        msg = input.value;
        socket.emit("chat",msg)
        input.value = "";
    }
});



socket.on("chat",(msg,name)=>{
    var item = document.createElement("li");

    item.textContent = name +" says: " + msg;
    messages.appendChild(item);

    var chatbox = document.getElementById("chatlist");
    chatbox.scrollTop = chatbox.scrollHeight;
})