async function authId(){
    auth = false;
    await fetch("authenticateUser=" + localStorage.getItem("id") + "!" + localStorage.getItem("key"), {method: "GET"}).then(res => {
        if(res.ok) return res.json();
        else throw new Error("Id could not be processed");
    }).then(data => {
        auth = data.auth;
    })
    return auth;
}

async function getId() {
    if(localStorage.getItem("id") == null){
        await fetch("getUserId", {method: "GET"}).then(
            res => {
                if(res.ok) return res.json();
                else throw new Error("Failed receiving new ID");
            }
        ).then(data => {
            localStorage.setItem("id", data.id);
            localStorage.setItem("key", data.key);
        });
    }
}

async function handleIdFromServer(){
    let isAuth;
    isAuth = await authId();
    if(!isAuth){
        localStorage.removeItem("id");
        await getId();
    }
}

async function requestRoom(){
    await fetch("roomReq=" + localStorage.getItem("id"));
}

handleIdFromServer();
requestRoom();

const board = document.getElementById("gameBoard");
const backdrop = document.querySelector("html").style;
const turnBoard = document.getElementById("turnBoard");
const lastMove = document.getElementById("turnBoard").querySelectorAll("span");
const params = new URLSearchParams(window.location.search);
const row = [];
let turnCounter = 0;
let teamTurn = true;
let lastPlayCode = "";
let selectedPiece = null;
const boardSize = params.has("extra") ? [10, 8] : [8, 8];

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

for (i = 0; i < boardSize[1]; i++) {
    row[i] = document.createElement("tr");
    row[i].className = i % 2 == 0 ? "even" : "odd";
    row[i].tile = [];
    board.appendChild(row[i]);
    for (j = 0; j < boardSize[0]; j++) {
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
            label.textContent = boardSize[1] - i;
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
        row[i].tile[j].onclick = (e) => {
            if (selectedPiece == null) {
                if (e.currentTarget.piece != null) if (e.currentTarget.piece.team == teamTurn) selectedPiece = e.currentTarget.piece;
            }
            else {
                let initialTile = row[selectedPiece.y].tile[selectedPiece.x];
                let targetPiece = e.currentTarget.piece;
                if (e.currentTarget.style.backgroundColor == "rgb(255, 136, 0)") {
                    selectedPiece.attackEffect(e.currentTarget.piece);
                    endTurn(initialTile, targetPiece);
                }
                else if (e.currentTarget.style.backgroundColor == "rgb(0, 255, 0)") {
                    selectedPiece.relocate(e.currentTarget.x, e.currentTarget.y);
                    endTurn(initialTile, targetPiece);
                }
                selectedPiece = null;
            }
            recolorBoard();
            if (e.currentTarget.piece != null) e.currentTarget.piece.highlight();
        };
        row[i].appendChild(row[i].tile[j]);
    }
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
        row[selectedPiece.y].tile[selectedPiece.x].style.borderColor = teamTurn ? "#00f" : "#f00";
    }
}

function endTurn(origin, targetPiece) {
    turnBoard.style.opacity = 1;
    lastMove[0].textContent = selectedPiece.name;
    lastMove[0].style.color = selectedPiece.team ? "#00f" : "#f00";
    lastMove[1].textContent = String.fromCharCode(65 + origin.x) + `${boardSize[1] - origin.y}`;
    lastMove[2].textContent = " -> ";
    lastMove[3].textContent = targetPiece == null ? "" : targetPiece.name;
    lastMove[3].style.color = targetPiece == null ? "" : targetPiece.team ? "#00f" : "#f00";
    lastMove[4].textContent = String.fromCharCode(65 + selectedPiece.x) + `${boardSize[1] - selectedPiece.y}`;
    teamTurn = !teamTurn;
    backdrop.background = teamTurn ? "linear-gradient(135deg, #003, #000)" : "linear-gradient(135deg, #300, #000)";
    turnCounter++;
    row.forEach(r => {
        r.tile.forEach(t => {
            if (t.piece != null) t.piece.endOfTurn();
        })
    })
}

function serv(){
    endTurn(row[0].tile[0].piece, null);
}

class Pattern {
    constructor(directs, dist) {
        this.dir = directs;
        this.len = dist;
    }
};

class Piece {
    constructor(x, y, team) {
        this.name;
        this.x = x;
        this.y = y;
        this.movement;
        this.attack;
        this.team = team;
        this.sprite = "";
        this.moved = false;
        this.alive = true;
        row[y].tile[x].piece = this;
    }
    specialMove() { }
    endOfTurn() { }
    highlight() {
        this.movement.dir.forEach(d => {
            for (i = 1; i != this.movement.len + 1; i++) {
                let deltax = this.x + d.x * i;
                let deltay = this.y + d.y * i;
                if (deltax >= 0 && deltax <= boardSize[0] - 1 && deltay >= 0 && deltay <= boardSize[1] - 1) {
                    if (row[deltay].tile[deltax].piece != null) break;
                    row[deltay].tile[deltax].style.backgroundColor = "#0f0";
                } else break;
            }
        })
        this.attack.dir.forEach(d => {
            for (i = 1; i != this.attack.len + 1; i++) {
                let deltax = this.x + d.x * i;
                let deltay = this.y + d.y * i;
                if (deltax >= 0 && deltax <= boardSize[0] - 1 && deltay >= 0 && deltay <= boardSize[1] - 1) {
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
    die(source) {
        this.alive = false;
        row[this.y].tile[this.x].piece = null;
    }
    attackEffect(target) {
        target.die(this);
        if (row[target.y].tile[target.x].piece == null)
            this.relocate(target.x, target.y);
    }
};

class Pawn extends Piece {
    constructor(x, y, team) {
        super(x, y, team);
        this.name = "Pawn";
        this.movement = new Pattern([{ x: 0, y: team ? -1 : 1 }], 2);
        this.attack = new Pattern([{ x: -1, y: team ? -1 : 1 }, { x: 1, y: team ? -1 : 1 }], 1);
        this.sprite = "<circle cx='32'cy='20'r='12'/><polygon points='32,33 16,64 48,64'/>";
        this.enPassant = 0;
    }
    moveEffect() {
        if (!this.moved && this.y == (this.team ? boardSize[1] - 4 : 3)) this.enPassant = turnCounter;
        this.movement.len = 1;
        if (this.y == (this.team ? 0 : boardSize[1] - 1)) row[this.y].tile[this.x].piece = new Knight(this.x, this.y, this.team);
    }
    attackEffect(target) {
        if (turnCounter - target.enPassant == 1 && target.y == this.y) {
            target.die(this);
            if (row[this.team ? target.y - 1 : target.y + 1].tile[target.x].piece == null)
                this.relocate(target.x, this.team ? target.y - 1 : target.y + 1);
            return;
        }
        this.movement.len = 1;
        target.die(this);
        if (row[target.y].tile[target.x].piece == null)
            this.relocate(target.x, target.y);
    }
    specialMove() {
        let tileCheck = null;
        if (this.x - 1 >= 0) {
            tileCheck = row[this.y].tile[this.x - 1];
            if (tileCheck.piece instanceof Pawn)
                if (turnCounter - tileCheck.piece.enPassant == 1 && tileCheck.piece.team != this.team)
                    tileCheck.style.backgroundColor = "#f80";
        }
        if (this.x + 1 <= boardSize[0] - 1) {
            tileCheck = row[this.y].tile[this.x + 1];
            if (tileCheck.piece instanceof Pawn)
                if (turnCounter - tileCheck.piece.enPassant == 1 && tileCheck.piece.team != this.team)
                    tileCheck.style.backgroundColor = "#f80";
        }
    }
};
class Rook extends Piece {
    constructor(x, y, team) {
        super(x, y, team);
        this.name = "Rook";
        this.movement = new Pattern([{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }], -1);
        this.attack = this.movement;
        this.sprite = "<rect x='9'y='8'width='12'height='12'/><rect x='43'y='8'width='12'height='12'/><rect x='20'y='18'width='24'height='46'/><rect x='26'y='8'width='12'height='12'/>";
        this.sprite = "<polygon points='20,64 44,64 44,20 54,20 54,8 42,8 42,20 38,20 38,8 26,8 26,20, 22,20 22,8 10,8 10,20 20,20'/>";
    }
    getSprite() { }
};
class Knight extends Piece {
    constructor(x, y, team) {
        super(x, y, team);
        this.name = "Knight";
        this.movement = new Pattern([{ x: -2, y: -1 }, { x: -1, y: -2 }, { x: 1, y: -2 }, { x: 2, y: -1 }, { x: 2, y: 1 }, { x: 1, y: 2 }, { x: -2, y: 1 }, { x: -1, y: 2 }], 1);
        this.attack = this.movement;
        this.sprite = "<polygon points='34,24 38,16 42,24'/><polygon points='42,23 46,15 50,23'/><polygon points='50,23 56,50 10,50 20,26'/><circle cx='40'cy='30'r='2'/>";
    }
};
class Bishop extends Piece {
    constructor(x, y, team) {
        super(x, y, team);
        this.name = "Bishop";
        this.movement = new Pattern([{ x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }], -1);
        this.attack = this.movement;
        this.sprite = "<path d='M28 64l8 0l0-2q28-16-4-48q-32 32-4 48Z'/><circle cx='32'cy='10'r='2'/><line x1='44'y1='28'x2='30'y2='40'stroke-width='2'/>";
    }
};
class King extends Piece {
    constructor(x, y, team) {
        super(x, y, team);
        this.name = "King";
        this.movement = new Pattern([{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }], 1);
        this.attack = this.movement;
        this.sprite = "<polygon points='20,64 44,64 52,42 48,38 40,46 24,46 16,38 12,42'/><polygon points='28,40 36,40 36,24 44,24 44,16 36,16 36,8 28,8 28,16 20,16 20,24 28,24'/>";
    }
};
class Queen extends Piece {
    constructor(x, y, team) {
        super(x, y, team);
        this.name = "Queen";
        this.movement = new Pattern([{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }], -1);
        this.attack = this.movement;
        this.sprite = "<circle cx='32'cy='36'r='18'/><polygon points='18,64 46,64 60,30 46,36 32,30 18,36 4,30'/><circle cx='32'cy='10'r='2'/>";
    }
};
class Spear extends Piece {
    constructor(x, y, team) {
        super(x, y, team);
        this.name = "Spear";
        this.movement = new Pattern([{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: team ? -1 : 1 }], 1);
        this.attack = new Pattern([{ x: 0, y: team ? -1 : 1 }], 2);
        this.sprite = "<polygon points='44,14 50,20 14,56 8,50'/><polygon points='24,16 56,8 48,40 44,20'/>";
    }
    moveEffect() {
        if (this.y == (this.team ? 0 : boardSize[1] - 1)) row[this.y].tile[this.x].piece = new Rook(this.x, this.y, this.team);
    }
    attackEffect(target) {
        target.die(this);
    }
};
class Soldier extends Piece {
    constructor(x, y, team) {
        super(x, y, team);
        this.name = "Soldier";
        this.movement = new Pattern([{ x: 1, y: team ? -1 : 1 }, { x: -1, y: team ? -1 : 1 }, { x: 0, y: team ? -1 : 1 }], 1);
        this.attack = new Pattern([{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 1, y: team ? -1 : 1 }, { x: -1, y: team ? -1 : 1 }, { x: 0, y: team ? -1 : 1 }], 1);
        this.sprite = "<polygon points='56,8 56,16 28,44 20,36 48,8'/><line x1='52'y1='12'x2='26'y2='38'stroke-width='2'/><polygon points='32,48 28,52 12,36 16,32'/><polygon points='22,46 18,42 8,56'/><rect x='8'y='50'width='6'height='6'/>";
    }
    moveEffect() {
        if (this.y == (this.team ? 0 : boardSize[1] - 1)) row[this.y].tile[this.x].piece = new Queen(this.x, this.y, this.team);
    }
};
class Bomb extends Piece {
    constructor(x, y, team) {
        super(x, y, team);
        this.name = "Bomb";
        this.movement = new Pattern([], 0);
        this.attack = new Pattern([{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }], 1);
        this.sprite = "<path d='M44 20q-2-6,4-4t4-4'fill='none'/><polygon points='36,36 48,24 40,16 28,28'/><circle cx='26'cy='38'r='20'/><path d='M46 12q6 0,6-6q0 6,6 6q-6 0,-6 6q0-6,-6-6'fill='yellow'/>";
        this.fuseTimer = turnCounter;
    }
    specialMove() {
        if (selectedPiece == this)
            selectedPiece = null;
    }
    die(source) {
        this.alive = false;
        this.attack.dir.forEach(d => {
            for (i = 1; i <= this.attack.len; i++) {
                let deltax = this.x + d.x * i;
                let deltay = this.y + d.y * i;
                if (deltax >= 0 && deltax <= boardSize[0] - 1 && deltay >= 0 && deltay <= boardSize[1] - 1) {
                    if (row[deltay].tile[deltax].piece != null) {
                        if (row[deltay].tile[deltax].piece.team == this.team) break;
                        else {
                            row[deltay].tile[deltax].piece.die(this);
                            break;
                        }
                    }
                } else break;
            }
        })
        row[this.y].tile[this.x].piece = null;
    }
    endOfTurn() {
        if (turnCounter - this.fuseTimer > 2) {
            this.highlight();
            this.die();
        }
    }
};
class Bomber extends Piece {
    constructor(x, y, team) {
        super(x, y, team);
        this.name = "Bomber";
        this.movement = new Pattern([{ x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 }], 1);
        this.attack = new Pattern([], 0);
        this.sprite = "<path d='M44 20q-2-6,4-4t4-4'fill='none'/><polygon points='36,36 48,24 40,16 28,28'/><circle cx='26'cy='38'r='20'/>";
    }
    specialMove() {
        row[this.y].tile[this.x].style.backgroundColor = "#f80";
    }
    die(source) {
        this.alive = false;
        row[this.y].tile[this.x].piece = new Bomb(this.x, this.y, this.team);
    }
};

if (params.has("extra")) {
    for (i = 0; i < boardSize[0]; i++) {
        if (i == 3 || i == 6) {
            new Soldier(i, 6, true);
            new Soldier(i, 1, false);
        } else if (i == 1 || i == 8) {
            new Bomber(i, 6, true);
            new Bomber(i, 1, false);
        } else {
            new Pawn(i, 6, true);
            new Pawn(i, 1, false);
        }
    }
    for (i = 0; i < 2; i++) {
        new Bishop(3 + i * 3, 7, true);
        new Bishop(3 + i * 3, 0, false);
    }
    for (i = 0; i < 2; i++) {
        new Knight(2 + i * 5, 7, true);
        new Knight(2 + i * 5, 0, false);
    }
    for (i = 0; i < 2; i++) {
        new Rook(0 + i * 9, 7, true);
        new Rook(0 + i * 9, 0, false);
    }
    for (i = 0; i < 2; i++) {
        new Spear(1 + i * 7, 7, true);
        new Spear(1 + i * 7, 0, false);
    }
    new King(5, 7, true);
    new King(5, 0, false);
    new Queen(4, 7, true);
    new Queen(4, 0, false);
} else {
    for (i = 0; i < boardSize[0]; i++) {
        new Pawn(i, 6, true);
        new Pawn(i, 1, false);
    }
    for (i = 0; i < 2; i++) {
        new Bishop(2 + i * 3, 7, true);
        new Bishop(2 + i * 3, 0, false);
    }
    for (i = 0; i < 2; i++) {
        new Knight(1 + i * 5, 7, true);
        new Knight(1 + i * 5, 0, false);
    }
    for (i = 0; i < 2; i++) {
        new Rook(0 + i * 7, 7, true);
        new Rook(0 + i * 7, 0, false);
    }
    new King(4, 7, true);
    new King(4, 0, false);
    new Queen(3, 7, true);
    new Queen(3, 0, false);
}

recolorBoard();