var socket = io("/livegame");

//users who join each other game get sent to the same room
socket.on("welcome",(msg)=>{
    console.log("roomname: "+msg);
})

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
var roomName;
var thisgamestate;

document.addEventListener("dragstart",dragStart);
document.addEventListener("dragover",dragOver);
document.addEventListener("dragend",dragEnd);

//find the square id of the piece selected
function dragStart(event){
    currentCell = event.target.parentNode.id;
}

function dragOver(event){
    //checks if the square is empty - if not empty the square is found as the parent of the piece currently there
    if (document.getElementById(event.target.id).className.split(" ")[0] == "piece"){
        newSquare = event.target.parentNode.id;
    } else {
        newSquare = event.target.id;
    }
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

socket.on("render",(gamestate)=>{
    RenderBoard(gamestate);
    thisgamestate = gamestate;
})