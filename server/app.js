//libraries
const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const session = require("express-session");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const GameMode = require("./GameMode");

//creating server
const app = express();
const server = http.createServer(app); 
const io = new Server(server);

//caching connection to database -- free mysql hosting
const db = mysql.createConnection({
    host:"remotemysql.com",
    user:"RLkSuyT2jN",
    password:"OujzgvJnPr",
    database:"RLkSuyT2jN"
});
/*
const db = mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"",
    database:"logininfo"
});*/
/*
CREATE TABLE users (
	id int NOT NULL AUTO_INCREMENT,
	username varchar(255) NOT NULL,
	password varchar(255) NOT NULL,
    rating varchar(255) NOT NULL,
	PRIMARY KEY (id)
);
*/

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
    secret:"De.SHz{P^A!?q>>4~W",
})
app.use(sessionMiddleware);

//setting path for view and public folder
let viewPath = path.join(__dirname, "../views");
let publicPath = path.join(__dirname, "../public");
app.use(express.static(publicPath));
app.set("views", viewPath);

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
    req.session.save();
})

//access menu page if logged in
app.get("/menuPage",(req,res)=>{
    if (req.session.loggedIn){              
        res.render("menuPage.ejs");
    } else {
        res.send("login to view this page");           
    }
    req.session.save()
});

//render create account page
app.get("/createaccount",(req,res)=>{           
    res.render("createAccount.ejs");
})

//page requests
//login requests
app.post("/login",(req,res)=>{
    
    //bodyparser to get element
    var username = req.body.username;  
    var password = req.body.password;

    //username and password field not blank
    if (username && password){        
        let sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
        let query = db.query(sql,[username,password],(error,results)=>{
            if (results.length>0){
                req.session.loggedIn = true;    
                req.session.username = username;  
                //parse results
                results=JSON.parse(JSON.stringify(results))
                req.session.rating = results[0].rating;
                
                res.redirect("/menuPage");
            } else{
                res.send("incorrect login");
            }
        });
    } else{
        //back to login page
        res.redirect("/")           
    }
});

app.post("/createaccount",(req,res)=>{        
    //bodyparser username and password      
    var username = req.body.username;             
    var password = req.body.password;
    //default rating
    var rating = 1000;
    if (username && password){                   
        let sql1 = 'SELECT id FROM users WHERE username =?';
        let query1 = db.query(sql1,[username],(error,results)=>{
            if (error) throw error;
            //check if username is already in the database
            if (results.length > 0){
                console.log("username is already taken")
                res.redirect("/")
                
            } else {
                //insert username and password
                let sql2 = 'INSERT INTO users set ?';                
                let query2 = db.query(sql2,[{username:username,password:password, rating:rating}],(error,result)=>{
                    if (error) throw error;
                    //redirect to login
                    res.redirect("/")                     
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
var spectateRooms = []; //holds games you can watch
var Rooms = {};     //holds the live game objects for each game

//socket.io session setup - cookies for user info
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));

//connect to menu page
io.on("connection", (socket) => {
    const session = socket.request.session;
    session.roomname = "";
    
    let sql = 'SELECT rating FROM users WHERE username = ?';
    let query = db.query(sql,[session.username],(error,result)=>{
        //sets rating to updated value whenever someone loads onto the menu page
        result=JSON.parse(JSON.stringify(result))
        session.rating = result[0].rating;
        console.log(session.username, session.rating);
        io.to(socket.id).emit("ShowRating",session.rating);
        
    })
    //display all joinable games on connection
    io.emit("NewGame",gameRooms,spectateRooms);
    
    //user clicks button to create game
    socket.on("CreateGame",(type,time)=>{
        //if there is already a game made by that user - cant create
        if (gameRooms.includes(session.username) || spectateRooms.includes(session.username)){
            //prevent user connecting
            session.InGame = true;
            session.save();
        } else{
            //code for creating a room
            session.gameType = type;
            session.Time = time;
            session.roomname = session.username.slice();
            gameRooms.push(session.username.slice());
            //displaying the new room to all users
            io.emit("NewGame",gameRooms,spectateRooms);
            session.save();
        }
    })
    //connecting to room
    socket.on("JoinRoom",(roomName)=>{
        //set roomaname var - used in most logic
        session.roomname = roomName
        //add gameroom to spectate if 2 users
        if (gameRooms.includes(session.roomname)){
            spectateRooms.push(session.roomname);
            //remove from join list
            gameRooms.splice(gameRooms.indexOf(session.roomname),1)
        }
        
        io.emit("NewGame",gameRooms,spectateRooms)
        session.save();  
    });
});

//redirect to game page if the user is not in game or they are the creator
app.get("/newGame",(req,res)=>{
    if (!req.session.InGame || (req.session.roomname == req.session.username)){
        if (req.session.loggedIn){
            res.render("gamePage.ejs")
        } else {
            res.send("login to view this page");
        }
    }  
    else {
        res.send("you already have a game created on your account")
    }
})


//namespace of live game
const gameNamespace = io.of("/livegame");
//session var setup
gameNamespace.use(wrap(sessionMiddleware));

//connect to game
gameNamespace.on("connection",(socket)=>{

    const session = socket.request.session;   

    socket.join(session.roomname);
    
    //checks if room already exists - if not creates a new room
    if (!Rooms.hasOwnProperty(session.roomname)){
        if (session.gameType == "regular"){
            Rooms[session.roomname] = new GameMode.GameRoom();
        } else {
            Rooms[session.roomname] = new GameMode.TimedGameRoom(session.Time);
        }        
    }
    
    //user setup
    session.yourColour = Rooms[session.roomname].AddUsers(session.username,session.rating);

    //render and orient board
    gameNamespace.to(session.roomname).emit("Render",Rooms[session.roomname].gamestate); 
    gameNamespace.to(socket.id).emit("Orientation",session.yourColour)

    //cache playername and rating
    let player1 = Rooms[session.roomname].player1;
    let player2 = Rooms[session.roomname].player2;
    let rating1 = Rooms[session.roomname].player1rating;
    let rating2 = Rooms[session.roomname].player2rating;
    let player2Colour = Rooms[session.roomname].player2Colour;

    //code for starting timers if game is timed 
    if (player2 && session.yourColour !== "spectator"){
        gameNamespace.to(session.roomname).emit("playerNames",player1,player2,rating1,rating2);
        
        //initialise clocks
        //clock function is now working the the othergameroom class
        if (Rooms[session.roomname].GetGameType() == "Timed"){
            
            Rooms[session.roomname].countdown = setInterval(function() {

                //if your turn find what player you are and - 1 sec per sec
                if (Rooms[session.roomname].turn == Rooms[session.roomname].player1Colour){
                    Rooms[session.roomname].player1Time--;
                    gameNamespace.to(session.roomname).emit('timer', Rooms[session.roomname].player1Time,"player1" );
                } else {
                    Rooms[session.roomname].player2Time--;
                    gameNamespace.to(session.roomname).emit('timer', Rooms[session.roomname].player2Time,"player2" );
                }

                //check if a user has run out of time
                if (Rooms[session.roomname].player1Time == 0){
                    Timeout(Rooms[session.roomname].player1,Rooms[session.roomname].player2)
                    clearInterval(Rooms[session.roomname].countdown);
                } else if (Rooms[session.roomname].player2Time == 0){
                    Timeout(Rooms[session.roomname].player2,Rooms[session.roomname].player1);
                    clearInterval(Rooms[session.roomname].countdown);
                }
                //figues out elo for timeout
                function Timeout(yourName, opName){
                    //set elo for draw
                    SetScore(session.roomname,opName);
                    UpdateRating();
                    gameNamespace.to(session.roomname).emit("game-over",yourName,"Timeout");
                }
            }, 1000);
            session.save();
        }

    //if spectator joins add names then swap them if player1 is black
    } else if (session.yourColour == "spectator"){
        //spectator board setup
        gameNamespace.to(socket.id).emit("playerNames",player1,player2,rating1,rating2);
        if (player2Colour == "white"){
            gameNamespace.to(socket.id).emit("swapName");
        }
    }
    //put displayed names in correct side of board
    if (session.yourColour == player2Colour){
        gameNamespace.to(session.roomname).emit("addOpName");
        gameNamespace.to(socket.id).emit("swapName");
    }
    //remove draw buttons
    if (session.yourColour == "spectator"){
        gameNamespace.to(socket.id).emit("RemoveButtons");
    }
    //cache op name
    socket.on("addOpName", ()=>{
        console.log("p1p2 "+player1,player2)
        if (session.username == Rooms[session.roomname].player1){
            session.opName = Rooms[session.roomname].player2;
        } else if (session.username = Rooms[session.roomname].player2){
            session.opName = Rooms[session.roomname].player1;
        } 
        session.save();
        
    })
    //handling player moves
    socket.on("move-request",(currentCell,newSquare)=>{
      
        let move = Rooms[session.roomname].UpdateBoard(currentCell,newSquare,session.yourColour);
        if (move == "Checkmate"){
            //add elo calc
            //add actual scores of game
            SetScore(session.roomname,session.username);
            UpdateRating();
            
            gameNamespace.to(session.roomname).emit("game-over",session.username,"Checkmate")

        } else if (move == "Stalemate"){
            //add the scores and updated rating for a draw
            SetDrawScore(session.roomname);
            UpdateRating();

            gameNamespace.to(session.roomname).emit("game-over",session.username,"Stalemate")
        }
        //nested function to refactor some repeated code

        //update game board
        gameNamespace.to(session.roomname).emit("Render",Rooms[session.roomname].gamestate);
        session.save();
    });
    //if a user leaves
    socket.on("disconnect", () => {
        
        //spectator leave doest matter
        if (session.yourColour == "spectator") { session.save(); return; } 
        
        gameNamespace.to(session.roomname).emit("player-disconnect");
        //if the room still exists then stop the timer loop
        if (Rooms[session.roomname]){
            clearInterval(Rooms[session.roomname].countdown);
        }
        
        delete Rooms[session.roomname];
        
        if (gameRooms.includes(session.roomname)){ //prevents removing other games from list when last player dc
            gameRooms.splice(gameRooms.indexOf(session.roomname),1);
        } 
        if (spectateRooms.includes(session.roomname)){  //remove from specate rooms
            spectateRooms.splice(spectateRooms.indexOf(session.roomname),1);
        }
        
        console.log(gameRooms,spectateRooms)
        session.InGame = false;
        session.save();
    })

    //socket emits for specific game ending types.
    socket.on("Resign",()=>{ 
        console.log("test "+ session.username,session.opName);
        SetScore(session.roomname,session.opName);
        UpdateRating();

        gameNamespace.to(session.roomname).emit("game-over",session.username,"Resign");
        
    })
    socket.on("OfferDraw",()=>{
        socket.broadcast.to(session.roomname).emit("OfferDraw",(session.username));
    }) 
    socket.on("AcceptDraw",()=>{
        console.log("draw test "+ session.username, session.opName);
        //alter the elo if the game is a draw
        SetDrawScore(session.roomname,session.username);
        UpdateRating();

        gameNamespace.to(session.roomname).emit("game-over",session.username,"Draw");
    })

    socket.on("chat", (msg)=>{
        gameNamespace.to(session.roomname).emit("chat",msg,session.username);
    })

    //refactor update rating code
    function UpdateRating(){
        session.updatedRatingA = Rooms[session.roomname].UpdateRatings(session.username);
        session.updatedRatingB = Rooms[session.roomname].UpdateRatings(session.opName);
        
        UpdateRatingInDb(session.updatedRatingA,session.updatedRatingB,session.username,session.opName);
    }
  
});

//start server on port 3000
server.listen(process.env.PORT || 3000,()=>{
    console.log("server is running on port 3000");
})

function SetScore(roomname,username){ 
    if (Rooms[roomname].player1 == username){
        Rooms[roomname].player1Score = 1;
        Rooms[roomname].player2Score = 0;
    } else if (Rooms[roomname].player2 == username){
        Rooms[roomname].player2Score = 1;
        Rooms[roomname].player1Score = 0;
    }
}
function SetDrawScore(roomname){
        Rooms[roomname].player1Score = 0.5;
        Rooms[roomname].player2Score = 0.5; 
}

function UpdateRatingInDb(updatedRatingA,updatedRatingB, username,opponentName){
    
    let sql3 = 'UPDATE users SET rating = ? WHERE username = ?';
    
    let query3 = db.query(sql3,[updatedRatingA, username],(error,result)=>{
        if (error) throw error;
       // console.log("Updated");
    })
    let sql4 = 'UPDATE users SET rating = ? WHERE username = ?';
    let query4 = db.query(sql4,[updatedRatingB, opponentName],(error,result)=>{
        if (error) throw error;
        //console.log("Updated");
    })
}