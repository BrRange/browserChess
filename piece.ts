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
  selected: Piece | null = null;
  turnCount: number = 0;
  constructor(w: number, h: number){
    this.w = w;
    this.h = h;
    this.row = [];
    for(let y = 0; y < w; ++y){
      this.row[y] = [];
      for(let x = 0; x < h; ++x)
        this.row[y][x] = new Tile();
    }
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

class Piece {
  name!: string;
  pos: Position;
  movement!: Pattern;
  attack!: Pattern;
  team: boolean;
  sprite: string;
  moved: boolean;
  alive: boolean;
  constructor(x: number, y: number, team: boolean) {
    this.pos = new Position(x, y);
    this.movement;
    this.attack;
    this.team = team;
    this.sprite = "";
    this.moved = false;
    this.alive = true;
  }
  specialMove(board: Board) { }
  endOfTurn(board: Board) { }
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
  }
};

export class Pawn extends Piece {
  enPassant: number;
  constructor(x: number, y: number, team: boolean) {
    super(x, y, team);
    this.name = "Pawn";
    this.movement = new Pattern([{ x: 0, y: team ? -1 : 1 }], 2);
    this.attack = new Pattern([{ x: -1, y: team ? -1 : 1 }, { x: 1, y: team ? -1 : 1 }], 1);
    this.sprite = "<circle cx='32'cy='20'r='12'/><polygon points='32,33 16,64 48,64'/>";
    this.enPassant = 0;
  }
  moveEffect(board: Board) {
    if (!this.moved && this.pos.y == (this.team ? board.h - 4 : 3)) this.enPassant = board.turnCount;
    this.movement.len = 1;
    if (this.pos.y == (this.team ? 0 : board.h - 1)) board.row[this.pos.y][this.pos.x].piece = new Knight(this.pos.x, this.pos.y, this.team);
  }
  attackEffect(board: Board, target: Piece) {
    if(target instanceof Pawn)
    if (board.turnCount - target.enPassant == 1 && target.pos.y == this.pos.y) {
      target.die(board, this);
      if (board.row[this.team ? target.pos.y - 1 : target.pos.y + 1][target.pos.x].piece == null)
        this.relocate(board, target.pos.x, this.team ? target.pos.y - 1 : target.pos.y + 1);
      return;
    }
    this.movement.len = 1;
    target.die(board, this);
    if (board.row[target.pos.y][target.pos.x].piece == null)
      this.relocate(board, target.pos.x, target.pos.y);
  }
  specialMove(board: Board) {
    let tileCheck: Tile;
    if (this.pos.x - 1 >= 0) {
      tileCheck = board.row[this.pos.y][this.pos.x - 1];
      if (tileCheck.piece instanceof Pawn)
      if (board.turnCount - tileCheck.piece.enPassant == 1 && tileCheck.piece.team != this.team)
        tileCheck.color = attackColor;
    }
    if (this.pos.x + 1 <= board.w - 1) {
      tileCheck = board.row[this.pos.y][this.pos.x + 1];
      if (tileCheck.piece instanceof Pawn)
      if (board.turnCount - tileCheck.piece.enPassant == 1 && tileCheck.piece.team != this.team)
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
    this.sprite = "<polygon points='20,64 44,64 44,20 54,20 54,8 42,8 42,20 38,20 38,8 26,8 26,20, 22,20 22,8 10,8 10,20 20,20'/>";
  }
};
export class Knight extends Piece {
  constructor(x: number, y: number, team: boolean) {
    super(x, y, team);
    this.name = "Knight";
    this.movement = new Pattern([{ x: -2, y: -1 }, { x: -1, y: -2 }, { x: 1, y: -2 }, { x: 2, y: -1 }, { x: 2, y: 1 }, { x: 1, y: 2 }, { x: -2, y: 1 }, { x: -1, y: 2 }], 1);
    this.attack = this.movement;
    this.sprite = "<polygon points='34,24 38,16 42,24'/><polygon points='42,23 46,15 50,23'/><polygon points='50,23 56,50 10,50 20,26'/><circle cx='40'cy='30'r='2'/>";
  }
};
export class Bishop extends Piece {
  constructor(x: number, y: number, team: boolean) {
    super(x, y, team);
    this.name = "Bishop";
    this.movement = new Pattern([{ x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }], -1);
    this.attack = this.movement;
    this.sprite = "<path d='M28 64l8 0l0-2q28-16-4-48q-32 32-4 48Z'/><circle cx='32'cy='10'r='2'/><line x1='44'y1='28'x2='30'y2='40'stroke-width='2'/>";
  }
};
export class King extends Piece {
  constructor(x: number, y: number, team: boolean) {
    super(x, y, team);
    this.name = "King";
    this.movement = new Pattern([{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }], 1);
    this.attack = this.movement;
    this.sprite = "<polygon points='20,64 44,64 52,42 48,38 40,46 24,46 16,38 12,42'/><polygon points='28,40 36,40 36,24 44,24 44,16 36,16 36,8 28,8 28,16 20,16 20,24 28,24'/>";
  }
};
export class Queen extends Piece {
  constructor(x: number, y: number, team: boolean) {
    super(x, y, team);
    this.name = "Queen";
    this.movement = new Pattern([{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }], -1);
    this.attack = this.movement;
    this.sprite = "<circle cx='32'cy='36'r='18'/><polygon points='18,64 46,64 60,30 46,36 32,30 18,36 4,30'/><circle cx='32'cy='10'r='2'/>";
  }
};
export class Spear extends Piece {
  constructor(x: number, y: number, team: boolean) {
    super(x, y, team);
    this.name = "Spear";
    this.movement = new Pattern([{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: team ? -1 : 1 }], 1);
    this.attack = new Pattern([{ x: 0, y: team ? -1 : 1 }], 2);
    this.sprite = "<polygon points='44,14 50,20 14,56 8,50'/><polygon points='24,16 56,8 48,40 44,20'/>";
  }
  moveEffect(board: Board) {
    if (this.pos.y == (this.team ? 0 : board.h - 1)) board.row[this.pos.y][this.pos.x].piece = new Rook(this.pos.x, this.pos.y, this.team);
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
    this.sprite = "<polygon points='56,8 56,16 28,44 20,36 48,8'/><line x1='52'y1='12'x2='26'y2='38'stroke-width='2'/><polygon points='32,48 28,52 12,36 16,32'/><polygon points='22,46 18,42 8,56'/><rect x='8'y='50'width='6'height='6'/>";
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
    this.sprite = "<path d='M44 20q-2-6,4-4t4-4'fill='none'/><polygon points='36,36 48,24 40,16 28,28'/><circle cx='26'cy='38'r='20'/><path d='M46 12q6 0,6-6q0 6,6 6q-6 0,-6 6q0-6,-6-6'fill='yellow'/>";
    this.fuseTimer = board.turnCount;
  }
  specialMove(board: Board){
    if(board.selected == this) board.selected = null;
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
    this.sprite = "<path d='M44 20q-2-6,4-4t4-4'fill='none'/><polygon points='36,36 48,24 40,16 28,28'/><circle cx='26'cy='38'r='20'/>";
  }
  specialMove(board: Board) {
    board.row[this.pos.y][this.pos.x].color = attackColor;
  }
  die(board: Board, source: Piece) {
    this.alive = false;
    board.row[this.pos.y][this.pos.x].piece = new Bomb(this.pos.x, this.pos.y, this.team, board);
  }
};