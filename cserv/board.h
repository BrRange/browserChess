#ifndef BOARD_H_
#define BOARD_H_

#include "rustydef.h"

typedef struct Position{
  i32 x, y;
} Position;

typedef enum PieceType{
  Pawn,
  Rook,
  Knight,
  Bishop,
  King,
  Queen,
  Spear,
  Soldier,
  Bomb,
  Bomber
} PieceType;

typedef enum TileStat{
  TileStat_Clear,
  TileStat_Move,
  TileStat_Attack
} TileStat;

typedef enum Team: u8{
  Team_Red,
  Team_Blue,
  Team_Patron
} Team;

typedef struct Tile Tile;
typedef struct Board Board;
typedef struct PieceVT PieceVT;
typedef struct Path Path;
typedef struct Pattern Pattern;
typedef struct Piece Piece;

struct Tile{
  Piece *piece;
  TileStat stat;
};

struct Board{
  Tile *row;
  i32 w, h, turnCount;
};


struct Pattern{
  Path *path;
  usz len;
};

struct Path{
  Position dir;
  i32 steps;  
};

struct PieceVT{
  void
  (*specialMove)(Piece *this, Board *board),
  (*endOfTurn)(Piece *this, Board *board),
  (*moveEffect)(Piece *this, Board *board),
  (*die)(Piece *this, Board *board, Piece *source),
  (*attackEffect)(Piece *this, Board *board, Piece *target);
};

struct Piece{
  const PieceVT *virtual;
  void *shared;
  PieceType type;
  Position pos;
  Pattern move, attack;
  Team team;
  bool moved, alive;
};

Piece *piece_new(i32 x, i32 y, Team team);
void piece_free(Piece *piece);

Piece
*pawn_new(i32 x, i32 y, Team team),
*rook_new(i32 x, i32 y, Team team),
*knight_new(i32 x, i32 y, Team team),
*bishop_new(i32 x, i32 y, Team team),
*king_new(i32 x, i32 y, Team team),
*queen_new(i32 x, i32 y, Team team),
*spear_new(i32 x, i32 y, Team team),
*soldier_new(i32 x, i32 y, Team team),
*bomb_new(i32 x, i32 y, Team team, Board *board),
*bomber_new(i32 x, i32 y, Team team);

Path piece_pathing(Piece *this, Piece *target);
void piece_highlight(Piece *this, Board *board);
void piece_relocate(Piece *this, Board *board, i32 x, i32 y);

Board board_new(i32 w, i32 h);
void board_clear(Board *board);

#endif