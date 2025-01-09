const http = require("http");
const fs = require("fs");
const { randomInt } = require("crypto");
const port = 3000;
const userXor = randomInt(0b11111110) + 1;
const knownUsers = {};
let openRooms = [];
let userAmount = 1;

class User{
  constructor(id){
    this.id = id;
    this.displayName = "User";
    this.Room = null;
  }
}

knownUsers[0] = new User(0);

class Room{
  constructor(num){
    this.num = num;
    this.bluePlayer = null;
    this.redPlayer = null;
  }
};

const server = http.createServer((req, res) => {
  switch (req.url) {
  case "/":
    res.writeHead(200, { "Content-Type": "text/html" });
    fs.readFile('./index.html', (error, data) => {
      if (error) {
        res.writeHead(400);
        res.write("HTML file not found");
      } else {
        res.end(data);
      }
    }); return;

  case "/style.css":
    res.writeHead(200, { "Content-Type": "text/css" });
    fs.readFile('./style.css', (error, data) => {
      if (error) {
        res.writeHead(400);
        res.write("CSS file not found");
      } else {
        res.end(data);
      }
    }); return;
  case "/script.js":

    res.writeHead(200, { "Content-Type": "application/javascript" });
    fs.readFile('./script.js', (error, data) => {
      if (error) {
        res.writeHead(400);
        res.write("JavaScript file not found");
      } else {
        res.end(data);
      }
    }); return;
  }
//Server requests
  const request = req.url.split("=")[0];
  res.writeHead(200, {"content-type": "application/json"});
  switch(request){
    case "/getUserId":
      newId = userAmount;
      knownUsers[newId] = new User(newId);
      userAmount++;
      res.end(JSON.stringify({
        id: newId,
        key: newId ^ userXor
      }));
      return;

    case "/authenticateUser":
      const givenUser = req.url.split("=")[1].split("!");
      const auth = (givenUser[0] ^ userXor) == givenUser[1];
      res.end(JSON.stringify({
        auth: auth
      }));
      return;

    case "/roomReq":
      const clientId = req.url.split("=")[1];
      res.end("");
      return;
    }
});

server.listen(port, (error) => {
  if (error) {
    console.log("There was an error:", error);
    return;
  } else {
    console.log("Connected to server on port", port);
  }
})

let teamTurn = true;