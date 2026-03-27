const http = require("http");
const fs = require("fs");
const port = 3000;
const piece = require("./piece.ts");

class GameState {
  constructor() {
    this.blueId = 0;
    this.redId = 0;
    this.board;
    this.teamTurn;
    this.init();
  }
  init(){
    this.board = new piece.Board(10, 8);
    for (let i = 0; i < this.board.w; i++) {
      if (i == 3 || i == 6) {
        this.board.row[6][i] = new piece.Soldier(i, 6, true);
        this.board.row[1][i] = new piece.Soldier(i, 1, false);
      } else if (i == 1 || i == 8) {
        this.board.row[6][i] = new piece.Bomber(i, 6, true);
        this.board.row[1][i] = new piece.Bomber(i, 1, false);
      } else {
        this.board.row[6][i] = new piece.Pawn(i, 6, true);
        this.board.row[1][i] = new piece.Pawn(i, 1, false);
      }
    }
    for (let i = 0; i < 2; i++) {
      this.board.row[7][3 + i * 3] = new piece.Bishop(3 + i * 3, 7, true);
      this.board.row[9][3 + i * 3] = new piece.Bishop(3 + i * 3, 0, false);
    }
    for (let i = 0; i < 2; i++) {
      this.board.row[7][2 + i * 5] = new piece.Knight(2 + i * 5, 7, true);
      this.board.row[0][2 + i * 5] = new piece.Knight(2 + i * 5, 0, false);
    }
    for (let i = 0; i < 2; i++) {
      this.board.row[7][i * 9] = new piece.Rook(i * 9, 7, true);
      this.board.row[0][i * 9] = new piece.Rook(i * 9, 0, false);
    }
    for (let i = 0; i < 2; i++) {
      this.board.row[7][1 + i * 7] = new piece.Spear(1 + i * 7, 7, true);
      this.board.row[0][1 + i * 7] = new piece.Spear(1 + i * 7, 0, false);
    }
    this.board.row[7][5] = new piece.King(5, 7, true);
    this.board.row[0][5] = new piece.King(5, 0, false);
    this.board.row[7][4] = new piece.Queen(4, 7, true);
    this.board.row[0][4] = new piece.Queen(4, 0, false);
  }
}

const gameState = new GameState();

const server = http.createServer((req, res) => {
  switch (req.url) {
    case "/":
      res.writeHead(200, { "Content-Type": "text/html" });
      fs.readFile('./index.html', (error, data) => {
        if (error) {
          res.writeHead(400);
          res.write("HTML file not found");
        } else {
          res.write("<metauserid:" + 0 + "/>");
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
    case "/client.js":

      res.writeHead(200, { "Content-Type": "application/javascript" });
      fs.readFile('./client.js', (error, data) => {
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
  res.writeHead(200, { "content-type": "application/json" });
  switch (request) {
    case "/getUserId":
      newId = 0;
      if (gameState.blueId == 0) gameState.blueId = newId = 1;
      else if (gameState.redId == 0) gameState.redId = newId = 2;
      res.end(JSON.stringify({
        id: newId
      }));
    return;

    case "/getBoard":
      res.end(JSON.stringify(gameState.board));
    return;
  }
});

server.listen(port, "0.0.0.0", (error) => {
  if (error) {
    console.log("There was an error:", error);
    return;
  } else {
    console.log("Connected to server on port", port);
  }
})