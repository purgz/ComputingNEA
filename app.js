//libraries

const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const session = require("express-session");
const http = require("http");
const { Server } = require("socket.io");
const e = require("cors");

//creating server
const app = express();
const server = http.createServer(app); 
const io = new Server(server);

//caching connection to database -- free mysql hosting
const db = mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"Hen12345",
    database:"logininfo"
});

//connect to db and throw any errors
db.connect(function(error){
    if (error){
        throw error;
    }
    console.log("connected to database");
});

app.set("view-engine","ejs"); //using ejs templating engine to display dynamic pages 
//bodyparser middleware
app.use(bodyParser.urlencoded({extended:true})); 
//express session middleware
var sessionMiddleware = session({
    secret:"secret",
})
app.use(sessionMiddleware);

app.use(express.static("public"));

//remove cache so pages have to be reloaded when using the back button
app.use(function(req, res, next) {
    res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    next();
});

//get pages
//displaying the first page when a user goes to application link
app.get("/",function(req,res){
    req.session.loggedIn = false;
    res.render("loginPage.ejs");
})

app.get("/menuPage",(req,res)=>{

    if (req.session.loggedIn){              //can only go to menu page if user logged in
        res.render("menuPage.ejs");
    } else {
        res.send("login to view this page");           //if someone tries to redirect themselves they will get this message
    }
});

app.get("/createaccount",(req,res)=>{            //render users the create account page
    res.render("createAccount.ejs");
})

//page requests
//login requests
app.post("/login",(req,res)=>{
    
    var username = req.body.username;  //uses bodyparser to get element with name username
    var password = req.body.password;

    if (username && password){        //both username and password entered
        let sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
        let query = db.query(sql,[username,password],(error,results)=>{

            if (results.length>0){
                req.session.loggedIn = true;    
                req.session.username = username;  
                res.redirect("/menuPage");
            } else{
                res.send("incorrect login");
            }
        });
    } else{
        res.redirect("/")           //if 1 entry is left blank.
    }
});

app.post("/createaccount",(req,res)=>{              
    var username = req.body.username;              //get username and password from the form
    var password = req.body.password;

    if (username && password){                   
        let sql1 = 'SELECT id FROM users WHERE username =?';
        let query1 = db.query(sql1,[username],(error,results)=>{
            if (error) throw error;
            if (results.length > 0){
                console.log("username is already taken")
                res.redirect("/")
                
            } else {
                let sql2 = 'INSERT INTO users set ?';                //insert username and password to database
                let query2 = db.query(sql2,[{username:username,password:password}],(error,result)=>{
                    if (error) throw error;
                    res.redirect("/")                     //redirect back to the login page
                })
            }
        })
    } else {
        res.redirect("/")
    }
});


//-----------------------------------------------------------------------------------------------------
//socket.io / main game code
var gameRooms = [];  //holds the games to be displayed in menu
var Rooms = {};     //holds the live game objects for each game

const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));

io.on("connection", (socket) => {
    
    const session = socket.request.session;
    session.roomname = "";
    console.log(session.username)
    io.emit("NewGame",gameRooms);
    socket.on("CreateGame",()=>{
        console.log("Creating game")
        session.roomname = session.username.slice(); //creates copy instead of reference
        gameRooms.push(session.username.slice());
        io.emit("NewGame",gameRooms);
        session.save();
    })

    socket.on("JoinRoom",(roomName)=>{
        console.log("joining "+roomName)
        session.roomname = roomName
        session.save();  //means can use the session vars on multiple socket.io connections.
    });
});

app.get("/newGame",(req,res)=>{
    res.render("gamePage.ejs")
})
//main game requests
//keeeping the same session variables over the new page which will be the live game page.
const gameNamespace = io.of("/livegame");
//adding connection detection for the live game page using different namespace
gameNamespace.use(wrap(sessionMiddleware));
gameNamespace.on("connection",(socket)=>{
    const session = socket.request.session;   
    
    socket.join(session.roomname);

    //checks if room already exists - if not creates a new room
    if (!Rooms.hasOwnProperty(session.roomname)){
        Rooms[session.roomname] = new GameRoom();
    }
    //give users their random colours
    session.yourColour = Rooms[session.roomname].AddUsers(session.username);
    //console.log(Rooms);

    //initialisation emits
    gameNamespace.to(session.roomname).emit("Render",Rooms[session.roomname].gamestate); 
    gameNamespace.to(socket.id).emit("Orientation",session.yourColour)

    //handling player moves
    socket.on("move-request",(currentCell,newSquare)=>{
        //console.log(currentCell,newSquare);
        Rooms[session.roomname].UpdateBoard(currentCell,newSquare,session.yourColour);
        gameNamespace.to(session.roomname).emit("Render",Rooms[session.roomname].gamestate);
        session.save();
    });

    socket.on("disconnect", () => {
        
        if (session.yourColour == "spectator") { return; } //stops spectator ending game
        console.log(session.username+" leaving "+session.roomname);
        
        gameNamespace.to(session.roomname).emit("player-disconnect");
        delete Rooms[session.roomname];
        gameRooms.splice(gameRooms.indexOf(session.roomname),1);
        session.save();
    })
    
});


//start server on port 3000
server.listen(process.env.PORT || 3000,()=>{
    console.log("server is running on port 3000");
})


//generates the defualt board layout
//each index represents a piece, each piece is notated as first letter - colour - second letter - piece
function GenerateDefaultPosition() {
    return ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR",
        "bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP",
        "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "",
        "wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP",
        "wR", "wN", "wB", "wQ", "wK", "wB","wN", "wR"
    ];
}
//consts
const blackPieces = ["bP","bN","bR","bB","bQ","bK"];
const whitePieces = ["wP","wN","wR","wB","wQ","wK"];

const leftedges = [0, 8, 16, 24, 32, 40, 48, 56]
const rightedges = [7, 15, 23, 31, 39, 47, 55, 63]

const leftedges2 = [1, 9, 17, 25, 33, 41, 49, 57]
const rightedges2 = [6, 14, 22, 30, 38, 46, 54, 62]


class GameRoom {
    //instantiate room with main attributes.
    constructor(){
        this.gamestate = GenerateDefaultPosition();
        this.player1;
        this.player2;
        this.playerLegalMoves = [];
        this.turn = ""; //until 2 users no colour so no one can moves
        //users initalised with castling rights
        this.player1LongCastle = true;
        this.player2LongCastle = true;
        this.player1ShortCastle = true;
        this.player2ShortCastle = true;
    }

    //adds users to the game and gives them their session colour variables - spectators do not get colour
    AddUsers(uname){
        if (this.player1 && this.player2){
            return "spectator";
        }
        //randomly assinging player 1 and 2 colours white or black. spectator does not get a colour
        if (!(this.player1)){
            this.player1 = uname;
            if (Math.floor(Math.random() * 2) == 1){
                this.player1Colour = "white";
            } else {
                this.player1Colour = "black";
            }
            return this.player1Colour;
        } else {
            this.player2 = uname;
            if (this.player1Colour == "white"){
                this.player2Colour = "black";
            } else {
                this.player2Colour = "white";
            }
            this.turn = "white"; //initlialse the game turns.
            return this.player2Colour;
        }
    }

    //deals with move requests from the current game room
    UpdateBoard(currentCell,newSquare,playerColour){
        //adjusts cell and square to match array indexes
        currentCell -= 1;
        newSquare -= 1;
        var opponentColour;
        
        //calculate opponent colour
        if (playerColour == this.player1Colour){
            opponentColour = this.player2Colour;
        } else {
            opponentColour = this.player1Colour;
        }
        
        //spectator cant move and also cant move if not your turn
        if (playerColour !== this.turn){ console.log("not your turn");return; }
        if (playerColour[0] !== this.gamestate[currentCell][0]){ console.log("not your piece"); return;}

        //calculate your legal mvoes
        this.playerLegalMoves = this.LegalMoves(currentCell,playerColour,this.gamestate);
        
        //if the move is legal move piece and make old square = to ""
        if (this.playerLegalMoves.includes(newSquare) && !(CheckAfterMove(this.gamestate,playerColour,currentCell,newSquare,this.player1))){
            //checks for pawn promotion
            if (this.gamestate[currentCell][1] == "P"){
                this.Promotion(currentCell,newSquare);
            }

            this.gamestate[newSquare] = this.gamestate[currentCell];
            this.gamestate[currentCell] = "";

        //deals with castling - checks if check after move then if the moves inbetween are in check, then changes players castling status on and off
        } else if(this.gamestate[currentCell][1] == "K" && !(this.playerLegalMoves.includes(newSquare)) 
            && !(CheckAfterMove(this.gamestate,playerColour,currentCell,newSquare,this.player1))){

       
           // this.OpponentLegalMoves(this.gamestate,opponentColour);
            // works - checks king square and the intbetween squares for castling and if they are under attack then not allowed to castle.
            //fix to make sure it works for long and short castle.

            //short castle
            if (newSquare == currentCell + 2){
                //if the player has already short castle
                if (playerColour == this.player1Colour){
                    if (!(this.player1ShortCastle)){ return; }
                } else{
                    if (!(this.player2ShortCastle)){ return; }
                }
                //if castling squares are under attack
                if (this.opponentLegalMoves.includes(currentCell) || this.opponentLegalMoves.includes(currentCell+1)
                    || this.opponentLegalMoves.includes(currentCell+2)){ return; }
                    
            //long castle
            } else if( newSquare == currentCell - 2){
                //if the player has already long castle
                if (playerColour == this.player1Colour){
                    if(!(this.player1LongCastle)){ return; }
                } else{
                    if(!(this.player2LongCastle)){ return; }
                }
                if (this.opponentLegalMoves.includes(currentCell) || this.opponentLegalMoves.includes(currentCell-1)
                    || this.opponentLegalMoves.includes(currentCell-2)){ return; }
            }

            //if castle is not allowed then return, else pieces are moved and function continues
            if (!(this.Castle(currentCell,newSquare))){ return; }

        } else {
            console.log("illegal move");
            return;
        }
       
        //requires refactoring
        //alternate the turn when a move is finalised.
        if (playerColour == this.player1Colour){
            this.turn = this.player2Colour;
            //remove castling rights for long and short castle as needed
            let castlingRights = HasCastled(currentCell,newSquare,this.gamestate,this.player1ShortCastle,this.player1LongCastle,playerColour)
            this.player1ShortCastle = castlingRights[0];
            this.player1LongCastle = castlingRights[1];
        
        } else {
            this.turn = this.player1Colour;
            let castlingRights = HasCastled(currentCell,newSquare,this.gamestate,this.player2ShortCastle,this.player2LongCastle,playerColour);
            this.player2ShortCastle = castlingRights[0];
            this.player2LongCastle = castlingRights[1];
        }

        console.log("short castle "+this.player1ShortCastle,this.player2ShortCastle+" long castle "+this.player1LongCastle,this.player2LongCastle);
        //checks whether the game is over by checkmate or stalemate on each move.
        IsGameOver(this.gamestate,opponentColour,this.player1)
    }

    LegalMoves(currentCell,playerColour,gamestate){
        let tempMoves = [];   //array which will return all legal moves
        let piece = gamestate[currentCell][1];  //selected piece - second letter to tell what piece
        let yourPieces;  //array of the pieces which are yours and opponents
        let opPieces; //opponent pieces

        if (playerColour == "white"){
            yourPieces = whitePieces;
            opPieces = blackPieces;
        } else {
            yourPieces = blackPieces;
            opPieces = whitePieces;
        }
        //call functions for correct piece.
        switch (piece)
        {
            case piece = "R":
                tempMoves = RookMoves(currentCell,gamestate,yourPieces,opPieces);
                break;
            case piece = "B":
                tempMoves = BishopMoves(currentCell,gamestate,yourPieces,opPieces);
                break;
            case piece = "N":
                tempMoves = KnightMoves(currentCell,gamestate,opPieces);
                break;
            case piece = "Q":
                tempMoves = RookMoves(currentCell,gamestate,yourPieces,opPieces);
                tempMoves = tempMoves.concat(BishopMoves(currentCell,gamestate,yourPieces,opPieces));
                break;
            case piece = "K":
                tempMoves = KingMoves(currentCell,gamestate,opPieces);
                break;
            case piece = "P":
                tempMoves = PawnMoves(currentCell,gamestate,opPieces,playerColour)
                break;  
            default:
                break;
        }
        
        return tempMoves;
    }

    //added opponenet legal moves
    OpponentLegalMoves(gamestate,opponentColour){
        
        this.opponentLegalMoves = [];
        //calc opponent legal moves
        for (let i = 0; i < 64; i++) {
            if (gamestate[i][0] == opponentColour[0]) {
                this.opponentLegalMoves = this.opponentLegalMoves.concat(this.LegalMoves(i, opponentColour, gamestate));
            }
        }
        return this.opponentLegalMoves;
    }
  
    Promotion(currentCell,newSquare){
        if (newSquare < 8){
            this.gamestate[currentCell] = "wQ";
        } else if (newSquare > 55){
            this.gamestate[currentCell] = "bQ";
        }
    }

    //executes castling
    Castle(currentCell,newSquare){
        let newRookSquare;
        let oldRookSquare;
        
        //direction king is moving in
        if (newSquare == currentCell + 2){
            //check if squares are empty inbetween king and rook
            if (this.gamestate[currentCell+1] !== "" || this.gamestate[currentCell+2] !== ""){ return false; }
            //calculate new and old rook squares
            newRookSquare = newSquare - 1;
            oldRookSquare = currentCell + 3;
            //other direction
        } else if (newSquare == currentCell -2 ){
            if (this.gamestate[currentCell-1] !== "" || this.gamestate[currentCell-2] !== ""){ return false; }
            newRookSquare = newSquare + 1;
            oldRookSquare = currentCell - 4;
        } else {
            //not a legal castle move
            return false;
        }
        //update gamestate with king and rook move
        this.gamestate[newSquare] = this.gamestate[currentCell]
        this.gamestate[currentCell] = "";
        this.gamestate[newRookSquare] = this.gamestate[oldRookSquare] 
        this.gamestate[oldRookSquare] = "";
        //castle successfull
        return true;
    }
}


//piece functions
function RookMoves(currentCell,gamestate,yourPieces,opPieces){
    this.gamestate = gamestate;
    this.yourPieces = yourPieces;
    this.opPieces = opPieces;
    this.currentCell = currentCell;
    this.moves = [];

    //move options if piece is on edge of board
    if (rightedges.includes(currentCell)) {
        GenerateMoves(8);
        GenerateMoves(-8);
        GenerateMoves(-1);
    } else if (leftedges.includes(currentCell)) {
        GenerateMoves(8);
        GenerateMoves(-8);
        GenerateMoves(1);
    } else {
        GenerateMoves(8);
        GenerateMoves(-8);
        GenerateMoves(1);
        GenerateMoves(-1);
    }
    //console.log(this.moves);
    return this.moves;
}

function BishopMoves(currentCell,gamestate,yourPieces,opPieces){
    this.gamestate = gamestate;
    this.yourPieces = yourPieces;
    this.opPieces = opPieces;
    this.currentCell = currentCell;
    this.moves = [];

    //move options if piece is on edge of board
    if (rightedges.includes(currentCell)) {
        GenerateMoves(7);
        GenerateMoves(-9);
    } else if (leftedges.includes(currentCell)) {
        GenerateMoves(9);
        GenerateMoves(-7);
    } else {
        GenerateMoves(7);
        GenerateMoves(-7);
        GenerateMoves(9);
        GenerateMoves(-9);
    }
    //console.log(this.moves);
    return this.moves;
}
//calculates the rook / bishop / queen moves in a given direction
function GenerateMoves(dir){
    //iterate 7 times in all the directions
    for (let i = 1; i < 8; i++){
        //calculate next square
        var nextCell = this.currentCell + dir*i;
    
        //check if square is in board valid range
        if (nextCell < 64 && nextCell > -1){
            //get string id of next cell
            let piece = this.gamestate[nextCell];
    
            //stop moves when they hit edge of board
            if (!(rightedges.includes(this.currentCell) || leftedges.includes(this.currentCell))) {
                //if the piece is not on the edge of the board then break once edge of board is met to prevent moves overlapping rows.
                if (rightedges.includes(nextCell) || leftedges.includes(nextCell)) { i = 7; }; 
            } 

            if (piece == "") { this.moves.push(nextCell) } //if square empty allows move
            else if (this.opPieces.includes(piece)) { this.moves.push(nextCell); i = 8 } //if opponents piece allows take but no further
            else if (this.yourPieces.includes(piece)) { i = 8; }  //if yourcolour does not allow the move
        }
    }
}

//function for knight legal moves
function KnightMoves(currentCell,gamestate,opPieces){

    var knightMoves = [];  //legal squares to go to
    var possibleMoves = []; //legal square differences from current squares

    // knight legal moves will changed slightly if on outer two ranks; 
    if (leftedges.includes(currentCell)){
        possibleMoves = [-15,-6,10,17];
    } else if (leftedges2.includes(currentCell)){
        possibleMoves = [-6,-15,10,17,-17,15]
    } else if (rightedges.includes(currentCell)){
        possibleMoves = [-10,-17,6,15]
    } else if (rightedges2.includes(currentCell)){
        possibleMoves = [6,15,-10,-17,17,-15]
    } else {
        possibleMoves = [6,10,-6,-10,15,17,-15,-17]
    }
    //loops each knigtmove and if in board range adds to legal
    for (let i = 0; i<possibleMoves.length ; i++){
        var nextCell = currentCell + possibleMoves[i];
        
        if (nextCell < 64 && nextCell > -1){
            let temp = gamestate[nextCell];

            if (temp == "") { knightMoves.push(nextCell) }
            else if (opPieces.includes(temp)) { knightMoves.push(nextCell) }    
        }
    }
    return knightMoves;
}
//function for king legal moves
function KingMoves(currentCell, gamestate, opPieces){
    //array for the possible move differences and king legal moves
    var kingMoves = [];
    var possibleMoves = [];

    //calculate the possible moves if the king is on either side of the boad
    if (leftedges.includes(currentCell)){
        possibleMoves = [1,8,9,-8,-7]
    } else if (rightedges.includes(currentCell)){
        possibleMoves = [-1,-8,-9,8,7]
    } else {
        possibleMoves = [1,8,9,7,-1,-8,-9,-7]
    }
    //iterate through possible moves and add them all to the king moves array
    for (let i = 0; i<possibleMoves.length ; i++){
        var nextCell = currentCell + possibleMoves[i];
        
        if (nextCell < 64 && nextCell > -1){
            let temp = gamestate[nextCell];

            //if square is empty or enemy piece, then add to legal moves
            if (temp == "") { kingMoves.push(nextCell) }
            else if (opPieces.includes(temp)) { kingMoves.push(nextCell) }    
        }
    }
    return kingMoves;
}

function PawnMoves(currentCell,gamestate,opPieces,yourColour){ 
    //find direction which your pawn can move.
    var dir;
    if (yourColour == "white"){
        dir = -1;
    } else {
        dir = 1;
    }
    //initialise possible moves with the standard 1 square pawn move.
    var possibleMoves = [dir*8];
    var pawnMoves = [];

    //adds the double square move if pawn is on second rank
    if ((currentCell > 47 && currentCell < 56 && yourColour == "white") || (currentCell > 7 && currentCell < 16 && yourColour == "black")){
        possibleMoves.push(dir*16);
    }
    
    //iterate through possible moves and add them all to the king moves array
    for (let i = 0; i<possibleMoves.length ; i++){
        var nextCell = currentCell + possibleMoves[i];
        
        if (nextCell < 64 && nextCell > -1){
            let temp = gamestate[nextCell];

            //if square is empty or enemy piece, then add to legal moves
            if (temp == "") { pawnMoves.push(nextCell) }  
        }
    }
    pawnMoves = pawnMoves.concat((PawnTakeMoves(currentCell,gamestate,opPieces,dir)));
    return pawnMoves;
}
//returns the diagonal take squares for selected pawn
function PawnTakeMoves(currentCell,gamestate,opPieces,dir){
    var possibleMoves = [];
    var takeMoves = [];
    //remove the takes going off edges of the board
    if (rightedges.includes(currentCell)){
        if (dir > 0){
            possibleMoves.push(dir*7);
        } else {
            possibleMoves.push(dir*9)
        }
    } else if (leftedges.includes(currentCell)){
        if (dir > 0){
            possibleMoves.push(dir*9);
        } else {
            possibleMoves.push(dir*7)
        }
    } else{
        possibleMoves.push(dir*7);
        possibleMoves.push(dir*9);
    }
    //go through possible diagonal takes, if the pieces are opponents then the take is added to legal moves
    for (let i = 0; i<possibleMoves.length ; i++){
        var nextCell = currentCell + possibleMoves[i];
        
        if (nextCell < 64 && nextCell > -1){
            let temp = gamestate[nextCell];

            //if square is empty or enemy piece, then add to legal moves
            if (opPieces.includes(temp)) { takeMoves.push(nextCell) }  
        }
    }
    return takeMoves;
}


//stops moves when you are in check when given the opponent legal moves
function CheckAfterMove(gamestate,playerColour,currentCell,newSquare,roomname){
    //creates a clone of gamestate to test move
    tempGamestate = Array.from(gamestate);
    tempGamestate[newSquare] = tempGamestate[currentCell];
    tempGamestate[currentCell] = "";

    //if you are still in check after move then move is not allowed.
    if  (KingInCheck(tempGamestate,playerColour,roomname)){
        console.log("your in check");
        return true;
    }
    return false;
}

//function to return whether king is in check for given gamestate
function KingInCheck(gamestate,playerColour,roomname){
    var king = "";
    var opColour;
    //calc colour
    if (playerColour == "black"){
        king = "bK";
        opColour = "white";
    } else {
        king = "wK";
        opColour = "black";
    }
    //find king and check opponent legal moves
    var kingpos = gamestate.indexOf(king);
    let opponentLegalMoves = Rooms[roomname].OpponentLegalMoves(gamestate,opColour);
  
    if (opponentLegalMoves.includes(kingpos)){ return true;}
    return false;
}

//function for detecting checkmate/stalemate
function IsGameOver(gamestate,playerColour,roomname){
    tempGamestate = Array.from(gamestate);
    var checkMate = false; //checkmate or stalemate

    //if king is in check to begin with AND has no moves => checkmate, else just no moves => stalemate
    if (KingInCheck(tempGamestate,playerColour,roomname)){
        checkMate = true;
    }

    //check each square on the board
    for (let i = 0; i < 64; i++) {
        //checks only your pieces
        if (tempGamestate[i][0] == playerColour[0]) {
            //calculate legal moves for current piece
            var newSquares = Rooms[roomname].LegalMoves(i, playerColour, tempGamestate);
            
            //check each legal move
            for (let j = 0; j < newSquares.length; j++){
                //if the move still ends in a check then go to next move
                tempGamestate[newSquares[j]] = tempGamestate[i];
                tempGamestate[i] = 0;
                if (!(KingInCheck(tempGamestate,playerColour,roomname))){
                    //a move that doesnt end in check is found so the game is not over
                    return;
                }
                //reset gamestate for next iteration
                tempGamestate = Array.from(gamestate);
            }
        }
    }
    //differentiates between checkmate and stalemate
    if (checkMate){
        console.log("Checkmate");
    } else {
        console.log("stalemate");
    }
}

//function for removing castling rights
function HasCastled(currentCell,newSquare,gamestate,canShortCastle,canLongCastle,yourColour){

    //if a king move is made remove all 
    if (gamestate[newSquare][1] == "K"){
        canShortCastle = false;
        canLongCastle = false;
    }
    
    //add colour checker since this introduced a bug--
    //if shortcastle remove short castle rights
    if (gamestate[newSquare][1] == "R"){
        if (currentCell == 7 && yourColour == "black"){
            canShortCastle = false;
        } else if (currentCell == 63 && yourColour == "white"){
            canShortCastle = false;
        }
    }
    //if long castle remove long castle rights
    if (gamestate[newSquare][1] == "R"){
        if(currentCell == 0 && yourColour == "black"){
            canLongCastle = false;
        } else if(currentCell == 56 && yourColour == "white"){
            canLongCastle = false;
        }
    }
    

    return [canShortCastle,canLongCastle];
}
    
//all game rules added now just need to add end sequences and closing the game room