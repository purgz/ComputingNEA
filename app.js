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
//socket.io code
var gameRooms = [];

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
        //console.log(roomName)
        session.roomname = roomName
        session.save();  //means can use the session vars on multiple socket.io connections.
    });

    
});

app.get("/newGame",(req,res)=>{
    res.render("gamePage.ejs")
})

//keeeping the same session variables over the new page which will be the live game page.
const gameNamespace = io.of("/livegame");

gameNamespace.use(wrap(sessionMiddleware));
gameNamespace.on("connection",(socket)=>{
    const session = socket.request.session;
    //console.log(session.roomname)
    socket.join(session.roomname);
    gameNamespace.to(session.roomname).emit("welcome",session.roomname);
    
});


//start server on port 3000
server.listen(3000,()=>{
    console.log("server is running on port 3000");
})