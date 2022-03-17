# ComputingNEA
Online multiplayer chess game using socket.io and nodejs for ocr A level computer science nea.

App made using nodejs with express, socket.io and mysql.

For displaying content this application uses ejs templating to allow for pages which include dynamic data.
I chose ejs as it has very similar syntax to html and was very easy to implement. The ejs templates are stored in the views folder.

app.js contains all the server side code including the login system with mysql connection and all the socket.io networking.

The public folder contains frontend javascript and css which can be accessed by the client.

Project is deployed on heroku.