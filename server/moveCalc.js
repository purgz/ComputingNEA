//folder containing functions to improve readability.


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

//piece functions
function RookMoves(currentCell,gamestate,yourPieces,opPieces){
  
    var args = {
        currentCell: currentCell,
        gamestate: gamestate,
        yourPieces: yourPieces,
        opPieces: opPieces
    }

    var moves = [];

    //move options if piece is on edge of board
    if (rightedges.includes(currentCell)) {
        moves = moves.concat(GenerateMoves(8,args)).concat(GenerateMoves(-8,args)).concat(GenerateMoves(-1,args));
        
    } else if (leftedges.includes(currentCell)) {
        moves = moves.concat(GenerateMoves(8,args)).concat(GenerateMoves(-8,args)).concat(GenerateMoves(1,args));
        
    } else {
        moves = moves.concat(GenerateMoves(8,args)).concat(GenerateMoves(-8,args)).concat(GenerateMoves(-1,args)).concat(GenerateMoves(1,args));
    }
    //console.log(this.moves);
    return moves;
}

function BishopMoves(currentCell,gamestate,yourPieces,opPieces){
    
    var args = {
        currentCell: currentCell,
        gamestate: gamestate,
        yourPieces: yourPieces,
        opPieces: opPieces
    }

    var moves = [];

    //move options if piece is on edge of board
    if (rightedges.includes(currentCell)) {
        moves = moves.concat(GenerateMoves(7,args)).concat(GenerateMoves(-9,args));
       
    } else if (leftedges.includes(currentCell)) {
        moves = moves.concat(GenerateMoves(9,args)).concat(GenerateMoves(-7,args));
      
    } else {
        moves = moves.concat(GenerateMoves(7,args)).concat(GenerateMoves(-9,args));
        moves = moves.concat(GenerateMoves(-7,args)).concat(GenerateMoves(9,args));
       
    }
    //console.log(this.moves);
    return moves;
}
//calculates the rook / bishop / queen moves in a given direction
function GenerateMoves(dir,args){
    var moves = [];
    //iterate 7 times in all the directions
    for (let i = 1; i < 8; i++){
        //calculate next square
        var nextCell = args.currentCell + dir*i;
    
        //check if square is in board valid range
        if (nextCell < 64 && nextCell > -1){
            //get string id of next cell
            let piece = args.gamestate[nextCell];
    
            //stop moves when they hit edge of board
            if (!(rightedges.includes(args.currentCell) || leftedges.includes(args.currentCell))) {
                //if the piece is not on the edge of the board then break once edge of board is met to prevent moves overlapping rows.
                if (rightedges.includes(nextCell) || leftedges.includes(nextCell)) { i = 7; }; 
            } 

            if (piece == "") { moves.push(nextCell) } //if square empty allows move
            else if (args.opPieces.includes(piece)) { moves.push(nextCell); i = 8 } //if opponents piece allows take but no further
            else if (args.yourPieces.includes(piece)) { i = 8; }  //if yourcolour does not allow the move
        
        } 
    }
    return moves;
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

function PawnMoves(currentCell,gamestate,opPieces,yourColour,enPassant){ 
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
    
    pawnMoves.push(EnPassant(enPassant,currentCell,yourColour,gamestate))
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
//function for calculating en passant moves
function EnPassant(enPassant,currentCell,yourColour,gamestate){
    let newSquare;
    //enpassant is given a value if the previous move was a double pawn move,
    //if a user is in correct place just after opponent double pawn move then they can enpassant

    //if the selected next move is an enpassant and enpassant is a legal move
    if (currentCell + 1 == enPassant){
        //calculate new position
        if (yourColour == "white"){
            newSquare = currentCell - 7;
        } else {
            newSquare = currentCell+9;
        }
    } else if (currentCell - 1 == enPassant){
        //calc new position
        if (yourColour == "white"){
            newSquare =  currentCell-9;
        } else {
            newSquare = currentCell+7;
        }
    }
    //if the new square is free then allow
    if (gamestate[newSquare] == ""){
        return newSquare;
    }
}


const leftedges = [0, 8, 16, 24, 32, 40, 48, 56]
const rightedges = [7, 15, 23, 31, 39, 47, 55, 63]

const leftedges2 = [1, 9, 17, 25, 33, 41, 49, 57]
const rightedges2 = [6, 14, 22, 30, 38, 46, 54, 62]

module.exports = {
    HasCastled: HasCastled,
    RookMoves: RookMoves,
    BishopMoves: BishopMoves,
    KnightMoves: KnightMoves,
    KingMoves: KingMoves,
    PawnMoves: PawnMoves,
}

//continue refactoring