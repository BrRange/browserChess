const http = require("http");
const fs = require("fs");
const port = 80;
const piece = require("./piece.ts");

class GameState {
  constructor() {
    this.blueId = 0;
    this.redId = 0;
    this.board;
    this.teamTurn = true;
    this.lastMove = null;
  }
  init(){
    this.board = new piece.Board(10, 8);
    for (let i = 0; i < this.board.w; i++) 
    if (i == 3 || i == 6) {
      this.board.row[6][i].piece = new piece.Soldier(i, 6, true);
      this.board.row[1][i].piece = new piece.Soldier(i, 1, false);
    } else if (i == 1 || i == 8) {
      this.board.row[6][i].piece = new piece.Bomber(i, 6, true);
      this.board.row[1][i].piece = new piece.Bomber(i, 1, false);
    } else {
      this.board.row[6][i].piece = new piece.Pawn(i, 6, true);
      this.board.row[1][i].piece = new piece.Pawn(i, 1, false);
    }
    for (let i = 0; i < 2; i++) {
      this.board.row[7][3 + i * 3].piece = new piece.Bishop(3 + i * 3, 7, true);
      this.board.row[0][3 + i * 3].piece = new piece.Bishop(3 + i * 3, 0, false);
    }
    for (let i = 0; i < 2; i++) {
      this.board.row[7][2 + i * 5].piece = new piece.Knight(2 + i * 5, 7, true);
      this.board.row[0][2 + i * 5].piece = new piece.Knight(2 + i * 5, 0, false);
    }
    for (let i = 0; i < 2; i++) {
      this.board.row[7][i * 9].piece = new piece.Rook(i * 9, 7, true);
      this.board.row[0][i * 9].piece = new piece.Rook(i * 9, 0, false);
    }
    for (let i = 0; i < 2; i++) {
      this.board.row[7][1 + i * 7].piece = new piece.Spear(1 + i * 7, 7, true);
      this.board.row[0][1 + i * 7].piece = new piece.Spear(1 + i * 7, 0, false);
    }
    this.board.row[7][5].piece = new piece.King(5, 7, true);
    this.board.row[0][5].piece = new piece.King(5, 0, false);
    this.board.row[7][4].piece = new piece.Queen(4, 7, true);
    this.board.row[0][4].piece = new piece.Queen(4, 0, false);
  }
}

const gameState = new GameState();
gameState.init();

const server = http.createServer((req, res) => {
  switch (req.url) {
    case "/":
      fs.readFile('./index.html', (error, data) => {
        if (error) {
          res.writeHead(400);
          res.write("HTML file not found");
        } else {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(data);
        }
      }); return;

    case "/style.css":
      fs.readFile('./style.css', (error, data) => {
        if (error) {
          res.writeHead(400);
          res.write("CSS file not found");
        } else {
          res.writeHead(200, { "Content-Type": "text/css" });
          res.end(data);
        }
      }); return;
    case "/client.js":
      fs.readFile('./client.js', (error, data) => {
        if (error) {
          res.writeHead(400);
          res.write("JavaScript file not found");
        } else {
          res.writeHead(200, { "Content-Type": "application/javascript" });
          res.end(data);
        }
      }); return;
  }
  //Server requests
  const expr = req.url.split("=");
  const request = expr[0];
  res.writeHead(200, { "content-type": "application/json" });
  switch (request) {
    case "/getUserId":{
      let newId = 0;
      let newTeam = true;
      if(gameState.blueId == 0){
        newId = 34290;
        gameState.blueId = newId;
      }
      else if (gameState.redId == 0){
        newId = 88573;
        newTeam = false;
        gameState.redId = newId;
      }
      res.end(JSON.stringify({
        id: newId,
        team: newTeam
      }));
    } return;

    case "/getTurn":{
      res.end(JSON.stringify(
        {turn: gameState.board.turnCount}
      ));
    } return;

    case "/getBoard":{
      const boardRef = gameState.board;
      const bdata = {
        w: boardRef.w,
        h: boardRef.h,
        turnCount: boardRef.turnCount,
        lastMove: gameState.lastMove,
        piece: []
      };
      for(let y = 0; y < boardRef.h; ++y)
        for(let x = 0; x < boardRef.w; ++x){
      if(boardRef.row[y][x].piece)
        bdata.piece[y * boardRef.w + x] = {name: boardRef.row[y][x].piece.name, team: boardRef.row[y][x].piece.team, shared: boardRef.row[y][x].piece.shared};
      else
        bdata.piece[y * boardRef.w + x] = {name: null, team: null, shared: null};
    }
    res.end(JSON.stringify(bdata));
    } return;

    case "/makePlay":{
      const boardRef = gameState.board;
      try{
        const args = expr[1].split(",");
        const ix = Number(args[0]);
        const iy = Number(args[1]);
        const tx = Number(args[2]);
        const ty = Number(args[3]);
        const id = Number(args[4]);
        if(!(id == gameState.blueId && gameState.teamTurn) && !(id == gameState.redId && !gameState.teamTurn)){
          res.end(JSON.stringify({
            val: false,
            desc: "Wrong turn"
          }));
          return;
        }
        const selected = boardRef.row[iy][ix].piece;
        const iname = selected.name;
        const iteam = selected.team;
        const target = boardRef.row[ty][tx];
        let tpiece = null;
        selected.highlight(boardRef);
        if(target.color == piece.attackColor){
          tpiece = target.piece;
          selected.attackEffect(boardRef, target.piece);
        } else if(target.color == piece.moveColor){
          selected.relocate(boardRef, tx, ty);
        } else {
          res.end(JSON.stringify({
            val: false,
            desc: "Illegal"
          }));
          return;
        }
        gameState.teamTurn = !gameState.teamTurn;
        gameState.board.turnCount += 1;
        gameState.lastMove = {
          iniName: iname,
          iniTeam: iteam,
          iniX: ix,
          iniY: iy,
          targName: tpiece ? tpiece.name : "",
          targTeam: tpiece ? tpiece.team : target.piece.team,
          targX: tx,
          targY: ty
        };
        res.end(JSON.stringify({
          val: true,
          desc: "Legal"
        }));
        for(let y = 0; y < boardRef.h; ++y)
        for(let x = 0; x < boardRef.w; ++x)
        if(boardRef.row[y][x].piece) boardRef.row[y][x].piece.endOfTurn(boardRef);
      } catch(err){
        console.log(err);
        res.end(JSON.stringify({
          val: false,
          desc: "Invalid args"
        }));
      }
    } return;
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