//libraries

const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const session = require("express-session");
const http = require("http");
const { Server } = require("socket.io");

//creating server
const app = express();
const server = http.createServer(app); 
const io = new Server(server);

//caching connection to database -- free mysql hosting
const db = mysql.createConnection({
    host:"sql4.freemysqlhosting.net",
    user:"sql4446100",
    password:"4rWsGxg81e",
    database:"sql4446100"
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
    //console.log(session.username)
   
    io.to(socket.id).emit("NewGame",gameRooms);
    socket.on("CreateGame",()=>{
        session.roomname = session.username;
        gameRooms.push(session.username);
        io.emit("NewGame",gameRooms);
        session.save();
    })

    socket.on("JoinRoom",(roomName)=>{
        console.log(roomName)
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
    });
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
        "wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"
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
        //-1 1 from both as they are sent in as square id from 1 to 64 but array is from 0 to 63
        currentCell -= 1;
        newSquare -= 1;

        if (playerColour !== this.turn){ console.log("not your turn");return; } //if not your turn then you cant move

        this.playerLegalMoves = this.LegalMoves(currentCell,playerColour,this.gamestate);
        console.log(this.playerLegalMoves)

        //if the move is legal move piece and make old square = to ""
        if (this.playerLegalMoves.includes(newSquare) && !(CheckAfterMove(this.gamestate,playerColour,currentCell,newSquare,this.player1))){
            this.gamestate[newSquare] = this.gamestate[currentCell];
            this.gamestate[currentCell] = "";
        } else {
            console.log("illegal move");
            return;
        }

        //alternate the turn when a move is finalised.
        if (playerColour == this.player1Colour){
            this.turn = this.player2Colour;
        } else {
            this.turn = this.player1Colour;
        }
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
    if (rightedges.includes(currentCell)){
        possibleMoves.push(dir*9);
    } else if (leftedges.includes(currentCell)){
        possibleMoves.push(dir*7);
    } else{
        possibleMoves.push(dir*7);
        possibleMoves.push(dir*9);
    }
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


//added check system...
//stops moves when you are in check when given the opponent legal moves
function CheckAfterMove(gamestate,playerColour,currentCell,newSquare,roomname){
    tempGamestate = Array.from(gamestate);
    tempGamestate[newSquare] = tempGamestate[currentCell];
    tempGamestate[currentCell] = "";
    
    if  (KingInCheck(tempGamestate,playerColour,roomname)){
        console.log("your in check");
        return true;
    }
    return false;
}

function KingInCheck(gamestate,playerColour,roomname){
    var king = "";
    var opColour;
    if (playerColour == "black"){
        king = "bK";
        opColour = "white";
    } else {
        king = "wK";
        opColour = "black";
    }

    var kingpos = gamestate.indexOf(king);
    let opponentLegalMoves = Rooms[roomname].OpponentLegalMoves(tempGamestate,opColour);
   // console.log(opponentLegalMoves)
    if (opponentLegalMoves.includes(kingpos)){return true;}
    return false;
}