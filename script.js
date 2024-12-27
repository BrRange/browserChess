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

for(i = 0; i < boardSize[1]; i++){
    row[i] = document.createElement("tr");
    row[i].className = i % 2 == 0 ? "even" : "odd";
    row[i].tile = [];
    board.appendChild(row[i]);
    for(j = 0; j < boardSize[0]; j++){
        row[i].tile[j] = document.createElement("th");
        row[i].tile[j].x = j;
        row[i].tile[j].y = i;
        row[i].tile[j].className = (i + j) % 2 == 0 ? "even" : "odd";
        row[i].tile[j].piece = null;
        if(j == 0){
            let label = document.createElement("label");
            label.style.position = "absolute";
            label.textContent = boardSize[1] - i;
            label.className = "verticalLabel"
            row[i].tile[0].appendChild(label);
        }
        if(i == 0){
            let label = document.createElement("label");
            label.style.position = "absolute";
            label.textContent = String.fromCharCode(65 + j);
            label.className = "horizontalLabel";
            row[0].tile[j].appendChild(label);
        }
        row[i].tile[j].onmouseenter = (e) => {
            if(e.target.style.backgroundColor != "rgb(0, 255, 0)" && e.target.style.backgroundColor != "rgb(255, 136, 0)")
                e.target.style.backgroundColor = "#fff";
            if(e.target.piece != null && selectedPiece == null)
                e.target.piece.highlight();
        };
        row[i].tile[j].onmouseleave = (e) => {recolorBoard();};
        row[i].tile[j].onclick = (e) => {
            if(selectedPiece == null){
                if(e.target.piece != null) if(e.target.piece.team == teamTurn) selectedPiece = e.target.piece;
            }
            else{
                let initialTile = row[selectedPiece.y].tile[selectedPiece.x];
                let targetPiece = e.target.piece;
                if(e.target.style.backgroundColor == "rgb(255, 136, 0)"){
                    selectedPiece.attackEffect(e.target.piece);
                    endTurn(initialTile, targetPiece);
                }
                else if(e.target.style.backgroundColor == "rgb(0, 255, 0)"){
                    selectedPiece.relocate(e.target.x, e.target.y);
                    endTurn(initialTile, targetPiece);
                }
                selectedPiece = null;
            }
            recolorBoard();
            if(e.target.piece != null) e.target.piece.highlight();
        };
        row[i].appendChild(row[i].tile[j]);
    }
}

function recolorBoard(){
    row.forEach(r => {
        r.tile.forEach(t => {
            if(t.piece != null) t.style.backgroundImage = `url("res/${t.piece.img}${t.piece.team ? "Blue" : "Red"}.png")`;
            else t.style.backgroundImage = "";
            t.style.backgroundColor = t.className == "even" ? "#ddd" : "#888";
            t.style.borderColor = "#000";
        })
    });
    if(selectedPiece != null){
        selectedPiece.highlight();
        row[selectedPiece.y].tile[selectedPiece.x].style.borderColor = teamTurn ? "#00f" : "#f00";
    }
}

function endTurn(origin, targetPiece){
    turnBoard.style.opacity = 1;
    lastMove[0].textContent = selectedPiece.img;
    lastMove[0].style.color = selectedPiece.team ? "#00f" : "#f00";
    lastMove[1].textContent = String.fromCharCode(65 + origin.x) + `${boardSize[1] - origin.y}`;
    lastMove[2].textContent = " -> ";
    lastMove[3].textContent = targetPiece == null ? "" : targetPiece.img;
    lastMove[3].style.color = targetPiece == null ? "" : targetPiece.team ? "#00f" : "#f00";
    lastMove[4].textContent = String.fromCharCode(65 + selectedPiece.x) + `${boardSize[1] - selectedPiece.y}`;
    teamTurn = !teamTurn;
    backdrop.background = teamTurn ? "linear-gradient(135deg, #003, #000)" : "linear-gradient(135deg, #300, #000)";
    turnCounter++;
    row.forEach(r => {
        r.tile.forEach(t => {
            if(t.piece != null) t.piece.endOfTurn();
        })
    })
}

class Pattern{
    constructor(directs, dist){
        this.dir = directs;
        this.len = dist;
    }
};

class Piece{
    constructor(x, y, team){
        this.x = x;
        this.y = y;
        this.movement;
        this.attack;
        this.team = team;
        this.img;
        this.moved = false;
        this.alive = true;
        row[y].tile[x].piece = this;
    }
    specialMove(){}
    endOfTurn(){}
    highlight(){
        this.movement.dir.forEach(d => {
            for(i = 1; i <= this.movement.len; i++){
                let deltax = this.x + d.x * i;
                let deltay = this.y + d.y * i;
                if(deltax >= 0 && deltax <= boardSize[0] - 1 && deltay >= 0 && deltay <= boardSize[1] - 1){
                    if(row[deltay].tile[deltax].piece != null) break;
                    row[deltay].tile[deltax].style.backgroundColor = "#0f0";
                } else break;
            }
        })
        this.attack.dir.forEach(d => {
            for(i = 1; i <= this.attack.len; i++){
                let deltax = this.x + d.x * i;
                let deltay = this.y + d.y * i;
                if(deltax >= 0 && deltax <= boardSize[0] - 1 && deltay >= 0 && deltay <= boardSize[1] - 1){
                    if(row[deltay].tile[deltax].piece != null){
                        if(row[deltay].tile[deltax].piece.team == this.team) break;
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
    moveEffect(){}
    relocate(x, y){
        if(!this.alive) return;
        row[this.y].tile[this.x].piece = null;
        row[y].tile[x].piece = this;
        this.x = x;
        this.y = y;
        this.moveEffect();
        this.moved = true;
    }
    die(source){
        this.alive = false;
        row[this.y].tile[this.x].piece = null;
    }
    attackEffect(target){
        target.die(this);
        if(row[target.y].tile[target.x].piece == null)
            this.relocate(target.x, target.y);
    }
};

class Pawn extends Piece{
    constructor(x, y, team){
        super(x, y, team);
        this.movement = new Pattern([{x: 0, y: team ? -1 : 1}], 2);
        this.attack = new Pattern([{x:-1, y: team ? -1 : 1}, {x: 1, y: team ? -1 : 1}], 1);
        this.img = "Pawn";
        this.enPassant = 0;
    }
    moveEffect(){
        if(!this.moved && this.y == (this.team ? boardSize[1] - 4 : 3)) this.enPassant = turnCounter;
        this.movement.len = 1;
        if(this.y == (this.team ? 0 : boardSize[1] - 1)) row[this.y].tile[this.x].piece = new Knight(this.x, this.y, this.team);
    }
    attackEffect(target){
        if(turnCounter - target.enPassant == 1 && target.y == this.y){
            target.die(this);
            if(row[this.team ? target.y - 1 : target.y + 1].tile[target.x].piece == null)
                this.relocate(target.x, this.team ? target.y - 1 : target.y + 1);
            return;
        }
        this.movement.len = 1;
        target.die(this);
        if(row[target.y].tile[target.x].piece == null)
            this.relocate(target.x, target.y);
    }
    specialMove(){
        let tileCheck = null;
        if(this.x - 1 >= 0){
            tileCheck = row[this.y].tile[this.x - 1];
            if(tileCheck.piece instanceof Pawn)
                if(turnCounter - tileCheck.piece.enPassant == 1 && tileCheck.piece.team != this.team)
                    tileCheck.style.backgroundColor = "#f80";
        }
        if(this.x + 1 <= boardSize[0] - 1){
            tileCheck = row[this.y].tile[this.x + 1];    
            if(tileCheck.piece instanceof Pawn)
                if(turnCounter - tileCheck.piece.enPassant == 1 && tileCheck.piece.team != this.team)
                    tileCheck.style.backgroundColor = "#f80";
        }
    }
};
class Rook extends Piece{
    constructor(x, y, team){
        super(x, y, team);
        this.movement = new Pattern([{x: 1, y: 0}, {x: 0, y: -1}, {x: -1, y: 0}, {x: 0, y: 1}], 9);
        this.attack = this.movement;
        this.img = "Rook";
    }
};
class Knight extends Piece{
    constructor(x, y, team){
        super(x, y, team);
        this.movement = new Pattern([{x: -2, y: -1}, {x: -1, y: -2}, {x: 1, y: -2}, {x: 2, y: -1}, {x: 2, y: 1}, {x: 1, y: 2}, {x: -2, y: 1}, {x: -1, y: 2}], 1);
        this.attack = this.movement;
        this.img = "Knight";
    }
};
class Bishop extends Piece{
    constructor(x, y, team){
        super(x, y, team);
        this.movement = new Pattern([{x: 1, y: 1}, {x: 1, y: -1}, {x: -1, y: 1}, {x: -1, y: -1}], 9);
        this.attack = this.movement;
        this.img = "Bishop";
    }
};
class King extends Piece{
    constructor(x, y, team){
        super(x, y, team);
        this.movement = new Pattern([{x: 1, y: 0}, {x: 0, y: -1}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 1, y: -1}, {x: -1, y: 1}, {x: -1, y: -1}], 1);
        this.attack = this.movement;
        this.img = "King";
    }
};
class Queen extends Piece{
    constructor(x, y, team){
        super(x, y, team);
        this.movement = new Pattern([{x: 1, y: 0}, {x: 0, y: -1}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 1, y: -1}, {x: -1, y: 1}, {x: -1, y: -1}], 9);
        this.attack = this.movement;
        this.img = "Queen";
    }
};
class Spear extends Piece{
    constructor(x, y, team){
        super(x, y, team);
        this.movement = new Pattern([{x: -1, y: 0}, {x: 1, y: 0}, {x: 0, y: team ? -1 : 1}], 1);
        this.attack = new Pattern([{x: 0, y: team ? -1 : 1}], 2);
        this.img = "Spear";
    }
    moveEffect(){
        if(this.y == (this.team ? 0 : boardSize[1] - 1)) row[this.y].tile[this.x].piece = new Rook(this.x, this.y, this.team);
    }
    attackEffect(targ){
        targ.die(this);
    }
};
class Soldier extends Piece{
    constructor(x, y, team){
        super(x, y, team);
        this.movement = new Pattern([{x: 1, y: team ? -1 : 1}, {x: -1, y: team ? -1 : 1}, {x: 0, y: team ? -1 : 1}], 1);
        this.attack = new Pattern([{x: 1, y: 0}, {x: -1, y: 0}, {x: 1, y: team ? -1 : 1}, {x: -1, y: team ? -1 : 1}, {x: 0, y: team ? -1 : 1}], 1);
        this.img = "Soldier";
    }
    moveEffect(){
        if(this.y == (this.team ? 0 : boardSize[1] - 1)) row[this.y].tile[this.x].piece = new Queen(this.x, this.y, this.team);
    }
};
class Bomb extends Piece{
    constructor(x, y, team){
        super(x, y, team);
        this.movement = new Pattern([], 0);
        this.attack = new Pattern([{x: 1, y: 0}, {x: 0, y: -1}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 1, y: -1}, {x: -1, y: 1}, {x: -1, y: -1}], 1);
        this.img = "Bomb";
        this.fuseTimer = turnCounter;
    }
    specialMove(){
        if(selectedPiece == this)
            selectedPiece = null;
    }
    die(source){
        this.alive = false;
        this.attack.dir.forEach(d => {
            for(i = 1; i <= this.attack.len; i++){
                let deltax = this.x + d.x * i;
                let deltay = this.y + d.y * i;
                if(deltax >= 0 && deltax <= boardSize[0] - 1 && deltay >= 0 && deltay <= boardSize[1] - 1){
                    if(row[deltay].tile[deltax].piece != null){
                        if(row[deltay].tile[deltax].piece.team == this.team) break;
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
    endOfTurn(){
        if(turnCounter - this.fuseTimer > 2){
            this.highlight();
            this.die();
        }
    }
};
class Bomber extends Piece{
    constructor(x, y, team){
        super(x, y, team);
        this.movement = new Pattern([{x: 1, y: 1}, {x: -1, y: 1}, {x: -1, y: -1}, {x: 1, y: -1}], 1);
        this.attack = new Pattern([], 0);
        this.img = "Bomber";
    }
    specialMove(){
        row[this.y].tile[this.x].style.backgroundColor = "#f80";
    }
    die(source){
        this.alive = false;
        row[this.y].tile[this.x].piece = new Bomb(this.x, this.y, this.team);
    }
};

if(params.has("extra")){
    for(i = 0; i < boardSize[0]; i++){
        if(i == 3 || i == 6){
            new Soldier(i, 6, true);
            new Soldier(i, 1, false);
        } else if(i == 1 || i == 8){
            new Spear(i, 6, true);
            new Spear(i, 1, false);
        } else{
            new Pawn(i, 6, true);
            new Pawn(i, 1, false);
        }
    }
    for(i = 0; i < 2; i++){
        new Bishop(3 + i * 3, 7, true);
        new Bishop(3 + i * 3, 0, false);
    }
    for(i = 0; i < 2; i++){
        new Knight(2 + i * 5, 7, true);
        new Knight(2 + i * 5, 0, false);
    }
    for(i = 0; i < 2; i++){
        new Rook(0 + i * 9, 7, true);
        new Rook(0 + i * 9, 0, false);
    }
    for(i = 0; i < 2; i++){
        new Bomber(1 + i * 7, 7, true);
        new Bomber(1 + i * 7, 0, false);
    }
    new King(5, 7, true);
    new King(5, 0, false);
    new Queen(4, 7, true);
    new Queen(4, 0, false);
} else {
    for(i = 0; i < boardSize[0]; i++){
        new Pawn(i, 6, true);
        new Pawn(i, 1, false);
    }
    for(i = 0; i < 2; i++){
        new Bishop(2 + i * 3, 7, true);
        new Bishop(2 + i * 3, 0, false);
    }
    for(i = 0; i < 2; i++){
        new Knight(1 + i * 5, 7, true);
        new Knight(1 + i * 5, 0, false);
    }
    for(i = 0; i < 2; i++){
        new Rook(0 + i * 7, 7, true);
        new Rook(0 + i * 7, 0, false);
    }
    new King(4, 7, true);
    new King(4, 0, false);
    new Queen(3, 7, true);
    new Queen(3, 0, false);
}

recolorBoard();