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



module.exports = {
    HasCastled: HasCastled,
    
}

//continue refactoring