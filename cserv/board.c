#include "board.h"
#include <stdlib.h>

Piece *piece_new(i32 x, i32 y, Team team){
  Piece *piece = malloc(sizeof *piece);

  piece->pos = (Position){.x = x, .y = y};

  piece->team = team;
  piece->moved = false;
  piece->alive = true;

  return piece;
}

void piece_free(Piece *piece){
  if(piece->shared) free(piece->shared);
  free(piece->move.path);
  if(piece->move.path != piece->attack.path) free(piece->attack.path);
  free(piece);
}

void piece_specialMove(const Piece *this, Board *board){
  (void)this;
  (void)board;
  return;
}

void piece_endOfTurn(Piece *this, Board *board){
  if(!this->alive) this->virtual->die(this, board, this);
}

void piece_moveEffect(Piece *this, Board *board){
  (void)this;
  (void)board;
  return;
}

void piece_die(Piece *this, Board *board, Piece *source){
  this->alive = false;
  Tile (*r2d)[board->w] = (void*)board->row;
  r2d[this->pos.y][this->pos.x].piece = NULL;
  piece_free(this);
}

void piece_attackEffect(Piece *this, Board *board, Piece *target){
  const Piece targetView = *target;
  Tile (*r2d)[board->w] = (void*)board->row;
  target->virtual->die(target, board, this);
  if(r2d[targetView.pos.y][targetView.pos.x].piece == NULL)
    piece_relocate(this, board, targetView.pos.x, targetView.pos.y);
  else{
    Path path = piece_pathing(this, target);
    path.steps -= 1;
    piece_relocate(this, board, this->pos.x + path.dir.x * path.steps, this->pos.y + path.dir.y * path.steps);
  }
}

Path piece_pathing(const Piece *source, const Piece *target){
  i32 dx = target->pos.x - source->pos.x;
  i32 dy = target->pos.y - source->pos.y;
  const Position *dir;
  i32 len = 0;
  for(usz i = 0; i < source->attack.len; ++i){
    const Position d = source->attack.path[i].dir;
    if(d.x && d.y)
    if(dx / d.x == dy / d.y){
      dir = &d;
      len = dx / d.x;
      break;
    }
    if(d.x && !dy)
    if(dx / d.x > 0){
      dir = &d;
      len = dx / d.x;
      break;
    }
    if(d.y && !dx)
    if(dy / d.y > 0){
      dir = &d;
      len = dy / d.y;
      break;
    }
  }
  if(!dir) return (Path){.dir = {0}, .steps = 0};
  return (Path){.dir = *dir, .steps = len};
}

void piece_highlight(const Piece *this, Board *board){
  Tile (*r2d)[board->w] = (void*)board->row;
  for(usz p = 0; p < this->move.len; ++p){
    const Path path = this->move.path[p];
    for(i32 i = 1; i != path.steps + 1; ++i){
      i32 deltax = this->pos.x + path.dir.x * i;
      i32 deltay = this->pos.y + path.dir.y * i;
      if(deltax >= 0 && deltax <= board->w - 1 && deltay >= 0 && deltay <= board->h - 1){
        if(r2d[deltay][deltax].piece) break;
        r2d[deltay][deltax].stat = TileStat_Move;
      } else break;
    }
  }
  for(usz p = 0; p < this->attack.len; ++p){
    const Path path = this->attack.path[p];
    for(i32 i = 1; i != path.steps + 1; ++i){
      i32 deltax = this->pos.x + path.dir.x * i;
      i32 deltay = this->pos.y + path.dir.y * i;
      if(deltax >= 0 && deltax <= board->w - 1 && deltay >= 0 && deltay <= board->h - 1){
        if(r2d[deltay][deltax].piece){
          if(r2d[deltay][deltax].piece->team == this->team) break;
          else{
            r2d[deltay][deltax].stat = TileStat_Attack;
            break;
          }
        }
      } else break;
    }
  }
  this->virtual->specialMove(this, board);
}

void piece_relocate(Piece *this, Board *board, i32 x, i32 y){
  Tile (*r2d)[board->w] = (void*)board->row;
  if(!this->alive) return;
  r2d[this->pos.y][this->pos.x].piece = NULL;
  r2d[y][x].piece = this;
  this->pos.x = x;
  this->pos.y = y;
  this->virtual->moveEffect(this, board);
  this->moved = true;
}

Board board_new(i32 w, i32 h){
  Board board = {
    .w = w,
    .h = h,
    .turnCount = 0,
    .row = malloc(sizeof(Tile) * w * h)
  };
  for(i32 i = 0; i < w * h; ++i) board.row[i] = (Tile){0};
  return board;
}

void board_setup(Board *board){
  Tile (*r2d)[board->w] = (void*)board->row;
  for(i32 i = 0; i < board->w; ++i)
  if(i == 3 || i == 6){
    r2d[6][i].piece = soldier_new(i, 6, Team_Blue);
    r2d[1][i].piece = soldier_new(i, 1, Team_Red);
  } else if(i == 1 || i == 8){
    r2d[6][i].piece = bomber_new(i, 6, Team_Blue);
    r2d[1][i].piece = bomber_new(i, 1, Team_Red);
  } else{
    r2d[6][i].piece = pawn_new(i, 6, Team_Blue);
    r2d[1][i].piece = pawn_new(i, 1, Team_Red);
  }
  for(i32 i = 0; i < 2; ++i){
    r2d[7][3 + i * 3].piece = bishop_new(3 + i * 3, 7, Team_Blue);
    r2d[0][3 + i * 3].piece = bishop_new(3 + i * 3, 0, Team_Red);
  }
  for(i32 i = 0; i < 2; ++i){
    r2d[7][2 + i * 5].piece = knight_new(2 + i * 5, 7, Team_Blue);
    r2d[0][2 + i * 5].piece = knight_new(2 + i * 5, 0, Team_Red);
  }
  for(i32 i = 0; i < 2; ++i){
    r2d[7][i * 9].piece = rook_new(i * 9, 7, Team_Blue);
    r2d[0][i * 9].piece = rook_new(i * 9, 0, Team_Red);
  }
  for(i32 i = 0; i < 2; ++i){
    r2d[7][1 + i * 7].piece = spear_new(1 + i * 7, 7, Team_Blue);
    r2d[0][1 + i * 7].piece = spear_new(1 + i * 7, 0, Team_Red);
  }
  r2d[7][5].piece = king_new(5, 7, Team_Blue);
  r2d[0][5].piece = king_new(5, 0, Team_Red);
  r2d[7][4].piece = queen_new(4, 7, Team_Blue);
  r2d[0][4].piece = queen_new(4, 0, Team_Red);
}

void board_clear(Board *board){
  for(i32 i = 0; i < board->w * board->h; ++i)
    board->row[i].stat = TileStat_Clear;
}

void board_free(Board *board){
  for(i64 i = 0; i < (i64)board->w * board->h; ++i)
  if(board->row[i].piece) piece_free(board->row[i].piece);
  free(board->row);
}

typedef struct PawnShared{
  i32 enPassant;
  i32 moveLen;
} PawnShared;

void pawn_specialMove(const Piece *this, Board *board){
  Tile (*r2d)[board->w] = (void*)board->row;
  Tile *tileCheck;
  if(this->pos.x - 1 >= 0){
    tileCheck = &r2d[this->pos.y][this->pos.x - 1];
    if(tileCheck->piece)
    if(tileCheck->piece->type == Pawn)
    if(
      board->turnCount - ((PawnShared*)tileCheck->piece->shared)->enPassant == 1
      && tileCheck->piece->team != this->team
    )
      tileCheck->stat = TileStat_Attack;
  }
  if(this->pos.x + 1 <= board->w - 1){
    tileCheck = &r2d[this->pos.y][this->pos.x + 1];
    if(tileCheck->piece)
    if(tileCheck->piece->type == Pawn)
    if(
      board->turnCount - ((PawnShared*)tileCheck->piece->shared)->enPassant == 1
      && tileCheck->piece->team != this->team
    )
      tileCheck->stat = TileStat_Attack;
  }
}

void pawn_moveEffect(Piece *this, Board *board){
  PawnShared *share = this->shared;
  if(!this->moved) share->enPassant = board->turnCount;
  this->move.path[0].steps = 1;
  share->moveLen = 1;
  if(this->pos.y == (this->team ? 0 : board->h - 1)){
    Tile (*r2d)[board->w] = (void*)board->row;
    r2d[this->pos.y][this->pos.x].piece = knight_new(this->pos.x, this->pos.y, this->team);
    piece_free(this);
  }
}

void pawn_attackEffect(Piece *this, Board *board, Piece *target){
  Tile (*r2d)[board->w] = (void*)board->row;
  if(target->type == Pawn)
  if(
    board->turnCount - ((PawnShared*)target->shared)->enPassant == 1
    && target->pos.y == this->pos.y
  ){
    target->virtual->die(target, board, this);
    if (r2d[this->team ? target->pos.y - 1 : target->pos.y + 1][target->pos.x].piece == NULL)
      piece_relocate(this, board, target->pos.x, this->team ? target->pos.y - 1 : target->pos.y + 1);
    return;
  }
  this->move.path[0].steps = 1;
  ((PawnShared*)this->shared)->moveLen = 1;
  target->virtual->die(target, board, this);
  if(r2d[target->pos.y][target->pos.x].piece == NULL)
    piece_relocate(this, board, target->pos.x, target->pos.y);
}

const PieceVT pawnVT = {
  .specialMove = pawn_specialMove,
  .endOfTurn = piece_endOfTurn,
  .moveEffect = pawn_moveEffect,
  .die = piece_die,
  .attackEffect = pawn_attackEffect
};

Piece *pawn_new(i32 x, i32 y, Team team){
  Piece *pawn = piece_new(x, y, team);
  pawn->virtual = &pawnVT;
  PawnShared *share = malloc(sizeof(PawnShared));
  share->enPassant = 0;
  share->moveLen = 2;
  pawn->shared = share;
  pawn->type = Pawn;

  pawn->move.path = malloc(sizeof(Path) * 1);
  pawn->move.path[0] = (Path){.dir = {.x = 0, .y = team ? -1 : 1}, .steps = 2};
  pawn->move.len = 1;
  pawn->attack.path = malloc(sizeof(Path) * 2);
  pawn->attack.path[0] = (Path){.dir = {.x = -1, .y = team ? -1 : 1}, .steps = 1};
  pawn->attack.path[1] = (Path){.dir = {.x = 1, .y = team ? -1 : 1}, .steps = 1};
  pawn->attack.len = 2;
  
  return pawn;
}

const PieceVT rookVT = {
  .specialMove = piece_specialMove,
  .endOfTurn = piece_endOfTurn,
  .moveEffect = piece_moveEffect,
  .die = piece_die,
  .attackEffect = piece_attackEffect
};

Piece *rook_new(i32 x, i32 y, Team team){
  Piece *rook = piece_new(x, y, team);

  rook->virtual = &rookVT;
  rook->shared = NULL;
  rook->type = Rook;

  rook->move.path = malloc(sizeof(Path) * 4);
  rook->move.path[0] = (Path){.dir = {.x = 0, .y = -1}, .steps = -1};
  rook->move.path[1] = (Path){.dir = {.x = 1, .y = 0}, .steps = -1};
  rook->move.path[2] = (Path){.dir = {.x = 0, .y = 1}, .steps = -1};
  rook->move.path[3] = (Path){.dir = {.x = -1, .y = 0}, .steps = -1};
  rook->move.len = 4;
  rook->attack = rook->move;

  return rook;
}

const PieceVT knightVT = {
  .specialMove = piece_specialMove,
  .endOfTurn = piece_endOfTurn,
  .moveEffect = piece_moveEffect,
  .die = piece_die,
  .attackEffect = piece_attackEffect
};

Piece *knight_new(i32 x, i32 y, Team team){
  Piece *knight = piece_new(x, y, team);

  knight->virtual = &knightVT;
  knight->shared = NULL;
  knight->type = Knight;

  knight->move.path = malloc(sizeof(Path) * 8);
  knight->move.path[0] = (Path){.dir = {.x = 1, .y = -2}, .steps = 1};
  knight->move.path[1] = (Path){.dir = {.x = 2, .y = -1}, .steps = 1};
  knight->move.path[2] = (Path){.dir = {.x = 2, .y = 1}, .steps = 1};
  knight->move.path[3] = (Path){.dir = {.x = 1, .y = 2}, .steps = 1};
  knight->move.path[4] = (Path){.dir = {.x = -1, .y = 2}, .steps = 1};
  knight->move.path[5] = (Path){.dir = {.x = -2, .y = 1}, .steps = 1};
  knight->move.path[6] = (Path){.dir = {.x = -2, .y = -1}, .steps = 1};
  knight->move.path[7] = (Path){.dir = {.x = -1, .y = -2}, .steps = 1};
  knight->move.len = 8;
  knight->attack = knight->move;
  
  return knight;
}

const PieceVT bishopVT = {
  .specialMove = piece_specialMove,
  .endOfTurn = piece_endOfTurn,
  .moveEffect = piece_moveEffect,
  .die = piece_die,
  .attackEffect = piece_attackEffect
};

Piece *bishop_new(i32 x, i32 y, Team team){
  Piece *bishop = piece_new(x, y, team);

  bishop->virtual = &bishopVT;
  bishop->shared = NULL;
  bishop->type = Bishop;

  bishop->move.path = malloc(sizeof(Path) * 4);
  bishop->move.path[0] = (Path){.dir = {.x = 1, .y = -1}, .steps = -1};
  bishop->move.path[1] = (Path){.dir = {.x = 1, .y = 1}, .steps = -1};
  bishop->move.path[2] = (Path){.dir = {.x = -1, .y = 1}, .steps = -1};
  bishop->move.path[3] = (Path){.dir = {.x = -1, .y = -1}, .steps = -1};
  bishop->move.len = 4;
  bishop->attack = bishop->move;

  return bishop;
}

const PieceVT kingVT = {
  .specialMove = piece_specialMove,
  .endOfTurn = piece_endOfTurn,
  .moveEffect = piece_moveEffect,
  .die = piece_die,
  .attackEffect = piece_attackEffect
};

Piece *king_new(i32 x, i32 y, Team team){
  Piece *king = piece_new(x, y, team);

  king->virtual = &kingVT;
  king->shared = NULL;
  king->type = King;

  king->move.path = malloc(sizeof(Path) * 8);
  king->move.path[0] = (Path){.dir = {.x = 1, .y = -1}, .steps = 1};
  king->move.path[1] = (Path){.dir = {.x = 1, .y = 1}, .steps = 1};
  king->move.path[2] = (Path){.dir = {.x = -1, .y = 1}, .steps = 1};
  king->move.path[3] = (Path){.dir = {.x = -1, .y = -1}, .steps = 1};
  king->move.path[4] = (Path){.dir = {.x = 0, .y = -1}, .steps = 1};
  king->move.path[5] = (Path){.dir = {.x = 1, .y = 0}, .steps = 1};
  king->move.path[6] = (Path){.dir = {.x = 0, .y = 1}, .steps = 1};
  king->move.path[7] = (Path){.dir = {.x = -1, .y = 0}, .steps = 1};
  king->move.len = 8;
  king->attack = king->move;

  return king;
}

const PieceVT queenVT = {
  .specialMove = piece_specialMove,
  .endOfTurn = piece_endOfTurn,
  .moveEffect = piece_moveEffect,
  .die = piece_die,
  .attackEffect = piece_attackEffect
};

Piece *queen_new(i32 x, i32 y, Team team){
  Piece *queen = piece_new(x, y, team);

  queen->virtual = &queenVT;
  queen->shared = NULL;
  queen->type = Queen;

  queen->move.path = malloc(sizeof(Path) * 8);
  queen->move.path[0] = (Path){.dir = {.x = 1, .y = -1}, .steps = -1};
  queen->move.path[1] = (Path){.dir = {.x = 1, .y = 1}, .steps = -1};
  queen->move.path[2] = (Path){.dir = {.x = -1, .y = 1}, .steps = -1};
  queen->move.path[3] = (Path){.dir = {.x = -1, .y = -1}, .steps = -1};
  queen->move.path[4] = (Path){.dir = {.x = 0, .y = -1}, .steps = -1};
  queen->move.path[5] = (Path){.dir = {.x = 1, .y = 0}, .steps = -1};
  queen->move.path[6] = (Path){.dir = {.x = 0, .y = 1}, .steps = -1};
  queen->move.path[7] = (Path){.dir = {.x = -1, .y = 0}, .steps = -1};
  queen->move.len = 8;
  queen->attack = queen->move;

  return queen;
}

void spear_moveEffect(Piece *this, Board *board){
  Tile (*r2d)[board->w] = (void*)board->row;
  if(this->pos.y == (this->team ? 0 : board->h - 1)){
    r2d[this->pos.y][this->pos.x].piece = rook_new(this->pos.x, this->pos.y, this->team);
    piece_free(this);
  }
}

void spear_attackEffect(Piece *this, Board *board, Piece *target){
  target->virtual->die(target, board, this);
}

const PieceVT spearVT = {
  .specialMove = piece_specialMove,
  .endOfTurn = piece_endOfTurn,
  .moveEffect = spear_moveEffect,
  .die = piece_die,
  .attackEffect = spear_attackEffect
};

Piece *spear_new(i32 x, i32 y, Team team){
  Piece *spear = piece_new(x, y, team);

  spear->virtual = &spearVT;
  spear->shared = NULL;
  spear->type = Spear;

  spear->move.path = malloc(sizeof(Path) * 3);
  spear->move.path[0] = (Path){.dir = {.x = -1, .y = 0}, .steps = 1};
  spear->move.path[1] = (Path){.dir = {.x = 0, .y = team ? -1 : 1}, .steps = 1};
  spear->move.path[2] = (Path){.dir = {.x = 1, .y = 0}, .steps = 1};
  spear->move.len = 3;
  spear->attack.path = malloc(sizeof(Path) * 1);
  spear->attack.path[0] = (Path){.dir = {.x = 0, .y = team ? -1 : 1}, .steps = 2};
  spear->attack.len = 1;

  return spear;
}

void soldier_moveEffect(Piece *this, Board *board){
  Tile (*r2d)[board->w] = (void*)board->row;
  if(this->pos.y == (this->team ? 0 : board->h - 1)){
    r2d[this->pos.y][this->pos.x].piece = queen_new(this->pos.x, this->pos.y, this->team); 
    piece_free(this);
  }
}

const PieceVT soldierVT = {
  .specialMove = piece_specialMove,
  .endOfTurn = piece_endOfTurn,
  .moveEffect = soldier_moveEffect,
  .die = piece_die,
  .attackEffect = piece_attackEffect
};

Piece *soldier_new(i32 x, i32 y, Team team){
  Piece *soldier = piece_new(x, y, team);

  soldier->virtual = &soldierVT;
  soldier->shared = NULL;
  soldier->type = Soldier;

  soldier->move.path = malloc(sizeof(Path) * 5);
  soldier->move.path[0] = (Path){.dir = {.x = -1, .y = team ? -1 : 1}, .steps = 1};
  soldier->move.path[1] = (Path){.dir = {.x = 0, .y = team ? -1 : 1}, .steps = 1};
  soldier->move.path[2] = (Path){.dir = {.x = 1, .y = team ? -1 : 1}, .steps = 1};
  soldier->move.path[3] = (Path){.dir = {.x = -1, .y = 0}, .steps = 1};
  soldier->move.path[4] = (Path){.dir = {.x = 1, .y = 0}, .steps = 1};
  soldier->move.len = 3;
  soldier->attack.path = soldier->move.path;
  soldier->attack.len = 5;

  return soldier;
}

typedef struct BombShared{
  i32 fuseTimer;
} BombShared;

void bomb_die(Piece *this, Board *board, Piece *source){
  Tile (*r2d)[board->w] = (void*)board->row;
  r2d[this->pos.y][this->pos.x].piece = NULL;
  for(usz pathI = 0; pathI < this->attack.len; ++pathI){
    const Path path = this->attack.path[pathI];
    for(usz i = 1; i != path.steps + 1; ++i){
      i32 deltax = this->pos.x + path.dir.x * i;
      i32 deltay = this->pos.y + path.dir.y * i;
      if(deltax >= 0 && deltax <= board->w - 1 && deltay >= 0 && deltay <= board->h - 1){
        if(r2d[deltay][deltax].piece){
          if(r2d[deltay][deltax].piece->team == this->team) break;
          else{
            r2d[deltay][deltax].piece->virtual->die(r2d[deltay][deltax].piece, board, this);
            break;
          }
        }
      } else break;
    }
  }
  piece_free(this);
}

void bomb_endOfTurn(Piece *this, Board *board){
  BombShared *share = this->shared;
  if(board->turnCount >= share->fuseTimer)
    this->virtual->die(this, board, this);
}

const PieceVT bombVT = {
  .specialMove = piece_specialMove,
  .endOfTurn = bomb_endOfTurn,
  .moveEffect = piece_moveEffect,
  .die = bomb_die,
  .attackEffect = piece_attackEffect
};

Piece *bomb_new(i32 x, i32 y, Team team, Board *board){
  Piece *bomb = piece_new(x, y, team);

  bomb->virtual = &bombVT;
  BombShared *share = malloc(sizeof(BombShared));
  share->fuseTimer = board->turnCount + 2;
  bomb->shared = share;
  bomb->type = Bomb;

  bomb->move.path = malloc(sizeof(Path) * 8);
  bomb->move.len = 0;
  bomb->attack.path = bomb->move.path;
  bomb->attack.path[0] = (Path){.dir = {.x = 1, .y = -1}, .steps = 1};
  bomb->attack.path[1] = (Path){.dir = {.x = 1, .y = 1}, .steps = 1};
  bomb->attack.path[2] = (Path){.dir = {.x = -1, .y = 1}, .steps = 1};
  bomb->attack.path[3] = (Path){.dir = {.x = -1, .y = -1}, .steps = 1};
  bomb->attack.path[4] = (Path){.dir = {.x = 0, .y = -1}, .steps = 1};
  bomb->attack.path[5] = (Path){.dir = {.x = 1, .y = 0}, .steps = 1};
  bomb->attack.path[6] = (Path){.dir = {.x = 0, .y = 1}, .steps = 1};
  bomb->attack.path[7] = (Path){.dir = {.x = -1, .y = 0}, .steps = 1};
  bomb->attack.len = 8;

  return bomb;
}

void bomber_specialMove(const Piece *this, Board *board){
  Tile (*r2d)[board->w] = (void*)board->row;
  r2d[this->pos.y][this->pos.x].stat = TileStat_Attack;
}

void bomber_die(Piece *this, Board *board, Piece *source){
  Tile (*r2d)[board->w] = (void*)board->row;
  r2d[this->pos.y][this->pos.x].piece = bomb_new(this->pos.x, this->pos.y, this->team, board);
  piece_free(this);
}

const PieceVT bomberVT = {
  .specialMove = bomber_specialMove,
  .endOfTurn = piece_endOfTurn,
  .moveEffect = piece_moveEffect,
  .die = bomber_die,
  .attackEffect = piece_attackEffect
};

Piece *bomber_new(i32 x, i32 y, Team team){
  Piece *bomber = piece_new(x, y, team);

  bomber->virtual = &bomberVT;
  bomber->shared = NULL;
  bomber->type = Bomber;

  bomber->move.path = malloc(sizeof(Path) * 4);
  bomber->move.path[0] = (Path){.dir = {.x = 1, .y = -1}, .steps = 1};
  bomber->move.path[1] = (Path){.dir = {.x = 1, .y = 1}, .steps = 1};
  bomber->move.path[2] = (Path){.dir = {.x = -1, .y = 1}, .steps = 1};
  bomber->move.path[3] = (Path){.dir = {.x = -1, .y = -1}, .steps = 1};
  bomber->move.len = 4;
  bomber->attack.path = bomber->move.path;
  bomber->attack.len = 0;

  return bomber;
}