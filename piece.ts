export const moveColor = "#0f0"
export const attackColor = "#f80"

export class Position{
  x: number;
  y: number;
  constructor(x: number, y: number){
    this.x = x;
    this.y = y;
  }
}

export class Tile{
  piece: Piece | null = null;
  color: string = "#0000";
}

export class Board{
  w: number;
  h: number;
  row: Tile[][];
  turnCount: number = 0;
  constructor(w: number, h: number){
    this.w = w;
    this.h = h;
    this.row = [];
    for(let y = 0; y < h; ++y){
      this.row[y] = [];
      for(let x = 0; x < w; ++x)
        this.row[y][x] = new Tile();
    }
  }
  clear(){
    for(let y = 0; y < this.h; ++y)
    for(let x = 0; x < this.w; ++x)
      this.row[y][x].color = "";
  }
}

export class Pattern {
  dir: Position[];
  len: number;
  constructor(directs: Position[], dist: number) {
    this.dir = directs;
    this.len = dist;
  }
};

export class Path {
  dir: Position;
  steps: number;
  constructor(dir: Position, steps: number){
    this.dir = dir;
    this.steps = steps;
  }
};

function getPathing(source: Piece, target: Piece): Path{
  let dx = target.pos.x - source.pos.x;
  let dy = target.pos.y - source.pos.y;
  let dir: Position | null = null;
  let len: number = 0;
  for(let d of source.attack.dir){
    if(d.x && d.y)
    if(dx / d.x == dy / d.y){
      dir = d;
      len = dx / d.x;
      break;
    }
    if(d.x && !dy)
    if(dx / d.x > 0){
      dir = d;
      len = dx / d.x;
      break;
    }
    if(d.y && !dx)
    if(dy / d.y > 0){
      dir = d;
      len = dy / d.y
      break;
    }
  }
  if(dir == null) return new Path(new Position(0, 0), 0);
  return new Path(dir, len);
}

class Piece {
  name!: string;
  pos: Position;
  movement!: Pattern;
  attack!: Pattern;
  team: boolean;
  moved: boolean;
  alive: boolean;
  shared: any = null;
  constructor(x: number, y: number, team: boolean) {
    this.pos = new Position(x, y);
    this.movement;
    this.attack;
    this.team = team;
    this.moved = false;
    this.alive = true;
  }
  specialMove(board: Board) { }
  endOfTurn(board: Board) {
    if(!this.alive) this.die(board, this);
  }
  highlight(board: Board) {
    this.movement.dir.forEach((p: Position) => {
      for (let i = 1; i != this.movement.len + 1; i++) {
        let deltax = this.pos.x + p.x * i;
        let deltay = this.pos.y + p.y * i;
        if (deltax >= 0 && deltax <= board.w - 1 && deltay >= 0 && deltay <= board.h - 1) {
          if (board.row[deltay][deltax].piece != null) break;
          board.row[deltay][deltax].color = moveColor;
        } else break;
      }
    })
    this.attack.dir.forEach((p: Position) => {
      for (let i = 1; i != this.attack.len + 1; i++) {
        let deltax = this.pos.x + p.x * i;
        let deltay = this.pos.y + p.y * i;
        if (deltax >= 0 && deltax <= board.w - 1 && deltay >= 0 && deltay <= board.h - 1) {
          if (board.row[deltay][deltax].piece != null) {
            if (board.row[deltay][deltax].piece?.team == this.team) break;
            else {
              board.row[deltay][deltax].color = attackColor;
              break;
            }
          }
        } else break;
      }
    })
    this.specialMove(board);
  }
  moveEffect(board: Board) { }
  relocate(board: Board, x: number, y: number) {
    if (!this.alive) return;
    board.row[this.pos.y][this.pos.x].piece = null;
    board.row[y][x].piece = this;
    this.pos.x = x;
    this.pos.y = y;
    this.moveEffect(board);
    this.moved = true;
  }
  die(board: Board, source: Piece) {
    this.alive = false;
    board.row[this.pos.y][this.pos.x].piece = null;
  }
  attackEffect(board: Board, target: Piece) {
    target.die(board, this);
    if (board.row[target.pos.y][target.pos.x].piece == null)
      this.relocate(board, target.pos.x, target.pos.y);
    else{
      const p = getPathing(this, target);
      p.steps -= 1;
      this.relocate(board, this.pos.x + p.dir.x * p.steps, this.pos.y + p.dir.y * p.steps);
    }
  }
};

export class Pawn extends Piece {
  constructor(x: number, y: number, team: boolean) {
    super(x, y, team);
    this.name = "Pawn";
    this.movement = new Pattern([{ x: 0, y: team ? -1 : 1 }], 2);
    this.attack = new Pattern([{ x: -1, y: team ? -1 : 1 }, { x: 1, y: team ? -1 : 1 }], 1);
    this.shared = {enPassant: 0, moveLen: 2};
  }
  moveEffect(board: Board) {
    if (!this.moved && this.pos.y == (this.team ? board.h - 4 : 3)) this.shared.enPassant = board.turnCount;
    this.movement.len = 1;
    this.shared.moveLen = 1;
    if (this.pos.y == (this.team ? 0 : board.h - 1)) board.row[this.pos.y][this.pos.x].piece = new Knight(this.pos.x, this.pos.y, this.team);
  }
  attackEffect(board: Board, target: Piece) {
    if(target instanceof Pawn)
    if (board.turnCount - target.shared.enPassant == 1 && target.pos.y == this.pos.y) {
      target.die(board, this);
      if (board.row[this.team ? target.pos.y - 1 : target.pos.y + 1][target.pos.x].piece == null)
        this.relocate(board, target.pos.x, this.team ? target.pos.y - 1 : target.pos.y + 1);
      return;
    }
    this.movement.len = 1;
    this.shared.moveLen = 1;
    target.die(board, this);
    if (board.row[target.pos.y][target.pos.x].piece == null)
      this.relocate(board, target.pos.x, target.pos.y);
  }
  specialMove(board: Board) {
    let tileCheck: Tile;
    if (this.pos.x - 1 >= 0) {
      tileCheck = board.row[this.pos.y][this.pos.x - 1];
      if (tileCheck.piece instanceof Pawn)
      if (board.turnCount - tileCheck.piece.shared.enPassant == 1 && tileCheck.piece.team != this.team)
        tileCheck.color = attackColor;
    }
    if (this.pos.x + 1 <= board.w - 1) {
      tileCheck = board.row[this.pos.y][this.pos.x + 1];
      if (tileCheck.piece instanceof Pawn)
      if (board.turnCount - tileCheck.piece.shared.enPassant == 1 && tileCheck.piece.team != this.team)
        tileCheck.color = attackColor;
    }
  }
};
export class Rook extends Piece {
  constructor(x: number, y: number, team: boolean) {
    super(x, y, team);
    this.name = "Rook";
    this.movement = new Pattern([{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }], -1);
    this.attack = this.movement;
  }
};
export class Knight extends Piece {
  constructor(x: number, y: number, team: boolean) {
    super(x, y, team);
    this.name = "Knight";
    this.movement = new Pattern([{ x: -2, y: -1 }, { x: -1, y: -2 }, { x: 1, y: -2 }, { x: 2, y: -1 }, { x: 2, y: 1 }, { x: 1, y: 2 }, { x: -2, y: 1 }, { x: -1, y: 2 }], 1);
    this.attack = this.movement;
  }
};
export class Bishop extends Piece {
  constructor(x: number, y: number, team: boolean) {
    super(x, y, team);
    this.name = "Bishop";
    this.movement = new Pattern([{ x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }], -1);
    this.attack = this.movement;
  }
};
export class King extends Piece {
  constructor(x: number, y: number, team: boolean) {
    super(x, y, team);
    this.name = "King";
    this.movement = new Pattern([{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }], 1);
    this.attack = this.movement;
  }
};
export class Queen extends Piece {
  constructor(x: number, y: number, team: boolean) {
    super(x, y, team);
    this.name = "Queen";
    this.movement = new Pattern([{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }], -1);
    this.attack = this.movement;
  }
};
export class Spear extends Piece {
  constructor(x: number, y: number, team: boolean) {
    super(x, y, team);
    this.name = "Spear";
    this.movement = new Pattern([{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: team ? -1 : 1 }], 1);
    this.attack = new Pattern([{ x: 0, y: team ? -1 : 1 }], 2);
  }
  moveEffect(board: Board) {
    if (this.pos.y == (this.team ? 0 : board.h - 1))
      board.row[this.pos.y][this.pos.x].piece = new Rook(this.pos.x, this.pos.y, this.team);
  }
  attackEffect(board: Board, target: Piece) {
    target.die(board, this);
  }
};
export class Soldier extends Piece {
  constructor(x: number, y: number, team: boolean) {
    super(x, y, team);
    this.name = "Soldier";
    this.movement = new Pattern([{ x: 1, y: team ? -1 : 1 }, { x: -1, y: team ? -1 : 1 }, { x: 0, y: team ? -1 : 1 }], 1);
    this.attack = new Pattern([{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 1, y: team ? -1 : 1 }, { x: -1, y: team ? -1 : 1 }, { x: 0, y: team ? -1 : 1 }], 1);
  }
  moveEffect(board: Board) {
    if (this.pos.y == (this.team ? 0 : board.h - 1))board.row[this.pos.y][this.pos.x].piece = new Queen(this.pos.x, this.pos.y, this.team);
  }
};
export class Bomb extends Piece {
  fuseTimer: number;
  constructor(x: number, y: number, team: boolean, board: Board) {
    super(x, y, team);
    this.name = "Bomb";
    this.movement = new Pattern([], 0);
    this.attack = new Pattern([{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }], 1);
    this.fuseTimer = board.turnCount;
  }
  die(board: Board, source: Piece) {
    this.alive = false;
    this.attack.dir.forEach(d => {
      for (let i = 1; i <= this.attack.len; i++) {
        let deltax = this.pos.x + d.x * i;
        let deltay = this.pos.y + d.y * i;
        if (deltax >= 0 && deltax <= board.w - 1 && deltay >= 0 && deltay <= board.h - 1) {
          if (board.row[deltay][deltax].piece != null) {
            if (board.row[deltay][deltax].piece.team == this.team) break;
            else {
              board.row[deltay][deltax].piece.die(board, this);
              break;
            }
          }
        } else break;
      }
    })
    source.alive = false;
    board.row[this.pos.y][this.pos.x].piece = null;
  }
  endOfTurn(board: Board) {
    if (board.turnCount - this.fuseTimer > 2) {
      this.highlight(board);
      this.die(board, this);
    }
  }
};
export class Bomber extends Piece {
  constructor(x: number, y: number, team: boolean) {
    super(x, y, team);
    this.name = "Bomber";
    this.movement = new Pattern([{ x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 }], 1);
    this.attack = new Pattern([], 0);
  }
  specialMove(board: Board) {
    board.row[this.pos.y][this.pos.x].color = attackColor;
  }
  die(board: Board, source: Piece) {
    this.alive = false;
    board.row[this.pos.y][this.pos.x].piece = new Bomb(this.pos.x, this.pos.y, this.team, board);
  }
};