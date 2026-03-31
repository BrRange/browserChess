let myId;
let myTeam;
let boardAbs;

const board = document.getElementById("gameBoard");
const backdrop = document.querySelector("html").style;
const turnBoard = document.getElementById("turnBoard");
const lastMove = document.getElementById("turnBoard").querySelectorAll("span");
const params = new URLSearchParams(window.location.search);
const row = [];
let lastPlayCode = "";
let selectedPiece = null;


function getBaseSVG() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute('width', '64');
  svg.setAttribute('height', '64');
  svg.setAttribute('stroke', '#000');
  svg.setAttribute('stroke-width', '1');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
  return svg;
}

function setupBoard(){
  for (i = 0; i < boardAbs.h; i++) {
    row[i] = document.createElement("tr");
    row[i].className = i % 2 == 0 ? "even" : "odd";
    row[i].tile = [];
    board.appendChild(row[i]);
    for (j = 0; j < boardAbs.w; j++) {
      row[i].tile[j] = document.createElement("th");
      row[i].tile[j].x = j;
      row[i].tile[j].y = i;
      row[i].tile[j].className = (i + j) % 2 == 0 ? "even" : "odd";
      row[i].tile[j].piece = null;
      row[i].tile[j].sprite = getBaseSVG();
      row[i].tile[j].appendChild(row[i].tile[j].sprite);

      if (j == 0) {
        let label = document.createElement("label");
        label.style.position = "absolute";
        label.textContent = boardAbs.h - i;
        label.className = "verticalLabel"
        row[i].tile[0].appendChild(label);
      }
      if (i == 0) {
        let label = document.createElement("label");
        label.style.position = "absolute";
        label.textContent = String.fromCharCode(65 + j);
        label.className = "horizontalLabel";
        row[0].tile[j].appendChild(label);
      }
      row[i].tile[j].onmouseenter = (e) => {
        if (e.currentTarget.style.backgroundColor != "rgb(0, 255, 0)" && e.currentTarget.style.backgroundColor != "rgb(255, 136, 0)")
          e.currentTarget.style.backgroundColor = "#fff";
        if (e.currentTarget.piece != null && selectedPiece == null)
          e.currentTarget.piece.highlight();
      };
      row[i].tile[j].onmouseleave = (e) => { recolorBoard(); };
      row[i].tile[j].onclick = async(e) => {
        let validTurn;
        const ct = e.currentTarget;
        if (selectedPiece == null) {
          if (e.currentTarget.piece != null) if (e.currentTarget.piece.team == myTeam) selectedPiece = e.currentTarget.piece;
        }
        else {
          let iniX = selectedPiece.x;
          let iniY = selectedPiece.y;
          if (
            e.currentTarget.style.backgroundColor == "rgb(255, 136, 0)"
            ||
            e.currentTarget.style.backgroundColor == "rgb(0, 255, 0)"
          ) {
            validTurn = await endTurn(iniX, iniY, e.currentTarget.x, e.currentTarget.y);
            console.log(validTurn.desc);
          }
          selectedPiece = null;
        }
        recolorBoard();
        if (ct.piece != null) ct.piece.highlight();
      };
      row[i].appendChild(row[i].tile[j]);
    }
  }
  if(boardAbs.lastMove){
    const lmove = boardAbs.lastMove;
    lastMove[0].textContent = lmove.iniName;
    lastMove[0].style.color = lmove.iniTeam ? "#00f" : "#f00";
    lastMove[1].textContent = String.fromCharCode(65 + lmove.iniX) + `${boardAbs.h - lmove.iniY}`;
    lastMove[2].textContent = " -> ";
    lastMove[3].textContent = lmove.targName;
    lastMove[3].style.color = lmove.targTeam ? "#00f" : "#f00";
    lastMove[4].textContent = String.fromCharCode(65 + lmove.targX) + `${boardAbs.h - lmove.targY}`;
  }
  rewriteBoard();
}

async function endTurn(ix, iy, tx, ty){
  return await askServer(`makePlay=${ix},${iy},${tx},${ty},${myId}`);
}

function recolorBoard() {
  row.forEach(r => {
    r.tile.forEach(t => {
      if (t.piece != null) {
        t.sprite.setAttribute('fill', t.piece.team ? "#00f" : "#f00")
        t.sprite.innerHTML = t.piece.sprite;
      }
      else t.sprite.innerHTML = "";
      t.style.backgroundColor = t.className == "even" ? "#ddd" : "#888";
      t.style.borderColor = "#000";
    })
  });
  if (selectedPiece != null) {
    selectedPiece.highlight();
    row[selectedPiece.y].tile[selectedPiece.x].style.borderColor = myTeam ? "#00f" : "#f00";
  }
}

function rewriteBoard(){
  for(let y = 0; y < boardAbs.h; ++y)
  for(let x = 0; x < boardAbs.w; ++x){
    piece = boardAbs.piece[y * boardAbs.w + x];
    if(piece.name != null)
    for(pt in pieceTypes)
    if(pieceTypes[pt].name == piece.name){
      row[y].tile[x].piece = new pieceTypes[pt](x, y, piece.team, piece.shared);
      break;
    }else;
    else{
      row[y].tile[x].piece = null;
    }
  }
  if(boardAbs.lastMove != null){
    const lmove = boardAbs.lastMove;
    lastMove[0].textContent = lmove.iniName;
    lastMove[0].style.color = lmove.iniTeam ? "#00f" : "#f00";
    lastMove[1].textContent = String.fromCharCode(65 + lmove.iniX) + `${boardAbs.h - lmove.iniY}`;
    lastMove[2].textContent = " -> ";
    lastMove[3].textContent = lmove.targName;
    lastMove[3].style.color = lmove.targTeam ? "#00f" : "#f00";
    lastMove[4].textContent = String.fromCharCode(65 + lmove.targX) + `${boardAbs.h - lmove.targY}`;
  }
  recolorBoard();
}

class Pattern {
  constructor(directs, dist) {
    this.dir = directs;
    this.len = dist;
  }
};

class Piece {
  constructor(x, y, team, shared) {
    this.name;
    this.x = x;
    this.y = y;
    this.movement;
    this.attack;
    this.team = team;
    this.sprite = "";
    this.moved = false;
    this.alive = true;
    this.shared = shared
    row[y].tile[x].piece = this;
  }
  specialMove() { }
  highlight() {
    this.movement.dir.forEach(d => {
      for (i = 1; i != this.movement.len + 1; i++) {
        let deltax = this.x + d.x * i;
        let deltay = this.y + d.y * i;
        if (deltax >= 0 && deltax < boardAbs.w && deltay >= 0 && deltay < boardAbs.h) {
          if (row[deltay].tile[deltax].piece != null) break;
          row[deltay].tile[deltax].style.backgroundColor = "#0f0";
        } else break;
      }
    })
    this.attack.dir.forEach(d => {
      for (i = 1; i != this.attack.len + 1; i++) {
        let deltax = this.x + d.x * i;
        let deltay = this.y + d.y * i;
        if (deltax >= 0 && deltax < boardAbs.w && deltay >= 0 && deltay < boardAbs.h) {
          if (row[deltay].tile[deltax].piece != null) {
            if (row[deltay].tile[deltax].piece.team == this.team) break;
            else {
              row[deltay].tile[deltax].style.backgroundColor = "#f80";
              break;
            }
          }
        } else break;
      }
    })
    this.specialMove();
  }
  moveEffect() { }
  relocate(x, y) {
    if (!this.alive) return;
    row[this.y].tile[this.x].piece = null;
    row[y].tile[x].piece = this;
    this.x = x;
    this.y = y;
    this.moveEffect();
    this.moved = true;
  }
};

class Pawn extends Piece {
  constructor(x, y, team, shared) {
    super(x, y, team, shared);
    this.name = "Pawn";
    this.movement = new Pattern([{ x: 0, y: team ? -1 : 1 }], shared.moveLen);
    this.attack = new Pattern([{ x: -1, y: team ? -1 : 1 }, { x: 1, y: team ? -1 : 1 }], 1);
    this.sprite = "<circle cx='32'cy='20'r='12'/><polygon points='32,33 16,64 48,64'/>";
    this.enPassant = shared.enPassant;
  }
  specialMove() {
    let tileCheck = null;
    if (this.x > 0) {
      tileCheck = row[this.y].tile[this.x - 1];
      if (tileCheck.piece instanceof Pawn)
        if (boardAbs.turnCount - tileCheck.piece.enPassant == 1 && tileCheck.piece.team != this.team)
          tileCheck.style.backgroundColor = "#f80";
    }
    if (this.x + 1 < boardAbs.w) {
      tileCheck = row[this.y].tile[this.x + 1];
      if (tileCheck.piece instanceof Pawn)
        if (boardAbs.turnCount - tileCheck.piece.enPassant == 1 && tileCheck.piece.team != this.team)
          tileCheck.style.backgroundColor = "#f80";
    }
  }
};
class Rook extends Piece {
  constructor(x, y, team, shared) {
    super(x, y, team, shared);
    this.name = "Rook";
    this.movement = new Pattern([{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }], -1);
    this.attack = this.movement;
    this.sprite = "<polygon points='20,64 44,64 44,20 54,20 54,8 42,8 42,20 38,20 38,8 26,8 26,20, 22,20 22,8 10,8 10,20 20,20'/>";
  }
};
class Knight extends Piece {
  constructor(x, y, team, shared) {
    super(x, y, team, shared);
    this.name = "Knight";
    this.movement = new Pattern([{ x: -2, y: -1 }, { x: -1, y: -2 }, { x: 1, y: -2 }, { x: 2, y: -1 }, { x: 2, y: 1 }, { x: 1, y: 2 }, { x: -2, y: 1 }, { x: -1, y: 2 }], 1);
    this.attack = this.movement;
    this.sprite = "<polygon points='34,24 38,16 42,24'/><polygon points='42,23 46,15 50,23'/><polygon points='50,23 56,50 10,50 20,26'/><circle cx='40'cy='30'r='2'/>";
  }
};
class Bishop extends Piece {
  constructor(x, y, team, shared) {
    super(x, y, team, shared);
    this.name = "Bishop";
    this.movement = new Pattern([{ x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }], -1);
    this.attack = this.movement;
    this.sprite = "<path d='M28 64l8 0l0-2q28-16-4-48q-32 32-4 48Z'/><circle cx='32'cy='10'r='2'/><line x1='44'y1='28'x2='30'y2='40'stroke-width='2'/>";
  }
};
class King extends Piece {
  constructor(x, y, team, shared) {
    super(x, y, team, shared);
    this.name = "King";
    this.movement = new Pattern([{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }], 1);
    this.attack = this.movement;
    this.sprite = "<polygon points='20,64 44,64 52,42 48,38 40,46 24,46 16,38 12,42'/><polygon points='28,40 36,40 36,24 44,24 44,16 36,16 36,8 28,8 28,16 20,16 20,24 28,24'/>";
  }
};
class Queen extends Piece {
  constructor(x, y, team, shared) {
    super(x, y, team, shared);
    this.name = "Queen";
    this.movement = new Pattern([{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }], -1);
    this.attack = this.movement;
    this.sprite = "<circle cx='32'cy='36'r='18'/><polygon points='18,64 46,64 60,30 46,36 32,30 18,36 4,30'/><circle cx='32'cy='10'r='2'/>";
  }
};
class Spear extends Piece {
  constructor(x, y, team, shared) {
    super(x, y, team, shared);
    this.name = "Spear";
    this.movement = new Pattern([{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: team ? -1 : 1 }], 1);
    this.attack = new Pattern([{ x: 0, y: team ? -1 : 1 }], 2);
    this.sprite = "<polygon points='44,14 50,20 14,56 8,50'/><polygon points='24,16 56,8 48,40 44,20'/>";
  }
};
class Soldier extends Piece {
  constructor(x, y, team, shared) {
    super(x, y, team, shared);
    this.name = "Soldier";
    this.movement = new Pattern([{ x: 1, y: team ? -1 : 1 }, { x: -1, y: team ? -1 : 1 }, { x: 0, y: team ? -1 : 1 }], 1);
    this.attack = new Pattern([{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 1, y: team ? -1 : 1 }, { x: -1, y: team ? -1 : 1 }, { x: 0, y: team ? -1 : 1 }], 1);
    this.sprite = "<polygon points='56,8 56,16 28,44 20,36 48,8'/><line x1='52'y1='12'x2='26'y2='38'stroke-width='2'/><polygon points='32,48 28,52 12,36 16,32'/><polygon points='22,46 18,42 8,56'/><rect x='8'y='50'width='6'height='6'/>";
  }
};
class Bomb extends Piece {
  constructor(x, y, team, shared) {
    super(x, y, team, shared);
    this.name = "Bomb";
    this.movement = new Pattern([], 0);
    this.attack = new Pattern([{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }], 1);
    this.sprite = "<path d='M44 20q-2-6,4-4t4-4'fill='none'/><polygon points='36,36 48,24 40,16 28,28'/><circle cx='26'cy='38'r='20'/><path d='M46 12q6 0,6-6q0 6,6 6q-6 0,-6 6q0-6,-6-6'fill='yellow'/>";
  }
  specialMove() {
    if (selectedPiece == this)
      selectedPiece = null;
  }
};
class Bomber extends Piece {
  constructor(x, y, team, shared) {
    super(x, y, team, shared);
    this.name = "Bomber";
    this.movement = new Pattern([{ x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 }], 1);
    this.attack = new Pattern([], 0);
    this.sprite = "<path d='M44 20q-2-6,4-4t4-4'fill='none'/><polygon points='36,36 48,24 40,16 28,28'/><circle cx='26'cy='38'r='20'/>";
  }
  specialMove() {
    row[this.y].tile[this.x].style.backgroundColor = "#f80";
  }
};

const pieceTypes = [Pawn, Rook, Knight, Bishop, King, Queen, Spear, Soldier, Bomb, Bomber];

async function askServer(command) {
  const res = await fetch(command);
  const obj = await res.json();
  return obj;
}

const setId = (val) => { myId = val.id; myTeam = val.team };
const setBoard = (obj) => { boardAbs = obj };

async function clientTick(){
  const lastTurn = boardAbs.turnCount;
  const obj = await askServer("getTurn");
  const newTurn = obj.turn;
  if(newTurn > lastTurn){
    const newBoard = await askServer("getBoard");
    Object.assign(boardAbs, newBoard);
    rewriteBoard();
  }
}

async function setupAll(){
  const objID = await askServer("getUserId");
  myId = objID.id;
  myTeam = objID.team;
  if(!myTeam) backdrop.background = "linear-gradient(135deg, #300, #000)";
  const objBoard = await askServer("getBoard");
  boardAbs = objBoard;
  setupBoard();
  setInterval(clientTick, 1000);
}

setupAll();