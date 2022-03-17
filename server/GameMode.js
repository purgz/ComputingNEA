const tools = require("./tools");

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
        this.enPassant;
        //elo
        this.player1rating;
        this.player2rating;
        this.player1ExpectedScore;
        this.player2ExpectedScore;
        this.player1Score;
        this.player2Score;

        this.gameType = "regular";
    }

    GetGameType(){
        return this.gameType;
    }
    //adds users to the game and gives them their session colour variables - spectators do not get colour
    AddUsers(uname,rating){
        if (this.player1 && this.player2){
            return "spectator";
        }
        rating = parseInt(rating);
        //randomly assinging player 1 and 2 colours white or black. spectator does not get a colour
        if (!(this.player1)){
            this.player1 = uname;
            this.player1rating = rating;
            if (Math.floor(Math.random() * 2) == 1){
                this.player1Colour = "white";
            } else {
                this.player1Colour = "black";
            }
            return this.player1Colour;
        } else {
            this.player2 = uname;
            this.player2rating = rating;
            if (this.player1Colour == "white"){
                this.player2Colour = "black";
            } else {
                this.player2Colour = "white";
            }
            this.ExpectedScores();
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
        if (this.playerLegalMoves.includes(newSquare) && !(this.CheckAfterMove(playerColour,currentCell,newSquare))){
            //checks for pawn promotion
            if (this.gamestate[currentCell][1] == "P"){
                this.Promotion(currentCell,newSquare);
                if (newSquare == currentCell + 16 || newSquare == currentCell - 16){
                    //if a user makes a pawn move then the latest square is set to enpassant
                    this.enPassant = newSquare;

                } else{
                    this.enPassant = "";
                }
            } else{
                this.enPassant = "";
            }
            //enpassant move
            if (this.gamestate[currentCell][1] == "P"){
                if (this.gamestate[newSquare]==""){
                    if (newSquare == currentCell - 9 || newSquare == currentCell + 7){
                        this.gamestate[currentCell-1] = "";
                    } else if(newSquare == currentCell + 9 || newSquare == currentCell - 7){
                        this.gamestate[currentCell+1] = "";
                    }
                }
            }
            this.gamestate[newSquare] = this.gamestate[currentCell];
            this.gamestate[currentCell] = "";

        //deals with castling - checks if check after move then if the moves inbetween are in check, then changes players castling status on and off
        } else if(this.gamestate[currentCell][1] == "K" && !(this.playerLegalMoves.includes(newSquare)) 
            && !(this.CheckAfterMove(playerColour,currentCell,newSquare))){

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
            let castlingRights = tools.HasCastled(currentCell,newSquare,this.gamestate,this.player1ShortCastle,this.player1LongCastle,playerColour)
            this.player1ShortCastle = castlingRights[0];
            this.player1LongCastle = castlingRights[1];
        
        } else {
            this.turn = this.player1Colour;
            let castlingRights = tools.HasCastled(currentCell,newSquare,this.gamestate,this.player2ShortCastle,this.player2LongCastle,playerColour);
            this.player2ShortCastle = castlingRights[0];
            this.player2LongCastle = castlingRights[1];
        }
        //checks whether the game is over by checkmate or stalemate on each move.
        return this.IsGameOver(opponentColour);
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
                tempMoves = tools.RookMoves(currentCell,gamestate,yourPieces,opPieces);
                break;
            case piece = "B":
                tempMoves = tools.BishopMoves(currentCell,gamestate,yourPieces,opPieces);
                break;
            case piece = "N":
                tempMoves = tools.KnightMoves(currentCell,gamestate,opPieces);
                break;
            case piece = "Q":
                tempMoves = tools.RookMoves(currentCell,gamestate,yourPieces,opPieces);
                tempMoves = tempMoves.concat(tools.BishopMoves(currentCell,gamestate,yourPieces,opPieces));
                break;
            case piece = "K":
                tempMoves = tools.KingMoves(currentCell,gamestate,opPieces);
                break;
            case piece = "P":
                tempMoves = tools.PawnMoves(currentCell,gamestate,opPieces,playerColour,this.enPassant)
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

    //elo rating system
    ExpectedScores(){
    
        console.log(this.player1rating,this.player2rating)
        this.player1ExpectedScore = 1/(1 + 10**((this.player2rating - this.player1rating)/400));
        this.player2ExpectedScore = 1/(1 + 10**((this.player1rating - this.player2rating)/400));
        //console.log(this.player1ExpectedScore,this.player2ExpectedScore);
    }
    UpdateRatings(name){
        
        if (this.player1 == name){
            var newRating = this.player1rating + 32*(this.player1Score - this.player1ExpectedScore);
        } else if (this.player2 == name){
            var newRating = this.player2rating + 32*(this.player2Score - this.player2ExpectedScore);
        }
        console.log(newRating);
        return newRating;
    }
    //stops moves when you are in check when given the opponent legal moves
    CheckAfterMove(playerColour,currentCell,newSquare){
        //creates a clone of gamestate to test move
        var tempGamestate = Array.from(this.gamestate);
        if (tempGamestate[currentCell][1] == "P"){
            if (tempGamestate[newSquare]==""){
                if (newSquare == currentCell - 9 || newSquare == currentCell + 7){
                    tempGamestate[currentCell-1] = "";
                } else if(newSquare == currentCell + 9 || newSquare == currentCell - 7){
                    tempGamestate[currentCell+1] = "";
                }
            }
        }

        tempGamestate[newSquare] = tempGamestate[currentCell];
        tempGamestate[currentCell] = "";

        //if you are still in check after move then move is not allowed.
        if  (this.KingInCheck(tempGamestate,playerColour)){
            console.log("your in check");
            return true;
        }
        return false;
    }

    //function to return whether king is in check for given gamestate
    KingInCheck(gamestate,playerColour){
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
        let opponentLegalMoves = this.OpponentLegalMoves(gamestate,opColour);
    
        if (opponentLegalMoves.includes(kingpos)){ return true;}
        return false;
    }

    //function for detecting checkmate/stalemate
    IsGameOver(playerColour){
        var tempGamestate = Array.from(this.gamestate);
        var checkMate = false; //checkmate or stalemate

        //if king is in check to begin with AND has no moves => checkmate, else just no moves => stalemate
        if (this.KingInCheck(tempGamestate,playerColour)){
            checkMate = true;
        }

        //check each square on the board
        for (let i = 0; i < 64; i++) {
            //checks only your pieces
            if (tempGamestate[i][0] == playerColour[0]) {
                //calculate legal moves for current piece
                var newSquares = this.LegalMoves(i, playerColour, tempGamestate);
                
                //check each legal move
                for (let j = 0; j < newSquares.length; j++){
                    //if the move still ends in a check then go to next move
                    tempGamestate[newSquares[j]] = tempGamestate[i];
                    tempGamestate[i] = 0;
                    if (!(this.KingInCheck(tempGamestate,playerColour))){
                        //a move that doesnt end in check is found so the game is not over
                        return;
                    }
                    //reset gamestate for next iteration
                    tempGamestate = Array.from(this.gamestate);
                }
            }
        }
        //differentiates between checkmate and stalemate
        if (checkMate){
            return "Checkmate";
        } else {
            return "Stalemate";
        }
    }
}
//use classes for different game variations
class TimedGameRoom extends GameRoom {
    constructor(time){
        super();
        this.gameType = "Timed";
        this.player1Time = time;
        this.player2Time = time;
        this.countdown;
    }
    GetGameType(){
        return this.gameType;
    }
}


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

//could add a number of different variants easily by inheriting GameRoom

module.exports = {
    GameRoom: GameRoom,
    TimedGameRoom: TimedGameRoom,
}