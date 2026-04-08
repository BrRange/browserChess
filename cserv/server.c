#include "board.c"
#include "darray.c"
#include "stringType.c"
#include <SDL3_net/SDL_net.h>

#define errorout SDL_Log("Error (%u): %s", __LINE__, SDL_GetError())

SDL_IOStream *indexF, *scriptF, *styleF, *iconF;

typedef struct ChessRoom ChessRoom;

typedef struct Player{
  NET_StreamSocket *sock;
  ChessRoom *room;
  String username;
} Player;

struct ChessRoom{
  Player *red, *blue;
  Board board;
  String lastMove;
};

typedef struct GameState{
  struct GameRoom{darrayTemplate(ChessRoom*);} room;
  struct Client{darrayTemplate(Player*);} cli;
} GameState;

void findRoom(Player *player, void *available){
  darrayTemplate(ChessRoom*) *rooms = available;
  darrayIterate((*rooms)){
    if(!_el->blue){
      player->room = _el;
      _el->blue = player;
      break;
    }
    if(!_el->red){
      player->room = _el;
      _el->red = player;
      break;
    }
  }
  if(!player->room){
    ChessRoom *room = malloc(sizeof *room);
    room->board = board_new(10, 8);
    board_setup(&room->board);
    room->red = NULL;
    room->blue = player;
    room->lastMove = (String){0};
    player->room = room;
    darray_appendPtr(rooms, room);
  }
}

i32 view_atoi(const StringView view){
  i32 acc = 0;
  u32 i = 0;
  bool neg = false;
  if(view.data[0] == '-'){
    i = 1;
    neg = true;
  }
  for(; i < view.len; ++i){
    acc *= 10;
    acc += view.data[i] - '0';
  }
  return neg ? -acc : acc;
}

i32 ilog10(i32 x){
  i32 n = !!x;
  while((x /= 10)) ++n;
  return n;
}

i32 i32_to_ascii(i32 x, char *buf){
  i32 bytes = 10;
  buf[9] = '0';
  if(x) while(x){
    buf[bytes] = '0' + (x % 10);
    x /= 10;
    --bytes;
  }
  else{
    buf[0] = '0';
    return 1;
  }
  i32 len = 10 - bytes;
  SDL_memmove(buf, buf + bytes + 1, len);
  return len;
}

void json_init(String *str){
  string_append(str, stringView("{"));
}

void json_attr(String *str, const StringView name){
  string_append(str, stringView("\""));
  string_append(str, name);
  string_append(str, stringView("\""));
  string_append(str, stringView(":"));
}

void json_i32(String *str, i32 val){
  char buf[12];
  string_append(str, string_newView(buf, i32_to_ascii(val, buf)));
}

void json_bool(String *str, bool val){
  string_append(str, val ? stringView("true") : stringView("false"));
}

void json_string(String *str, const StringView val){
  string_append(str, stringView("\""));
  string_append(str, val);
  string_append(str, stringView("\""));
}

void json_null(String *str){
  string_append(str, stringView("null"));
}

void json_comma(String *str){
  string_append(str, stringView(","));
}

void json_openArr(String *str){
  string_append(str, stringView("["));
}

void json_closeArr(String *str){
  string_append(str, stringView("]"));
}

void json_close(String *str){
  string_append(str, stringView("}"));
}

bool string_fill(String *str, SDL_IOStream *file){
  i64 fileLen = SDL_SeekIO(file, 0, SDL_IO_SEEK_END);
  string_reserve(str, fileLen);
  SDL_SeekIO(file, 0, SDL_IO_SEEK_SET);
  SDL_ReadIO(file, str->data, fileLen);
  str->len = fileLen;
  return SDL_GetIOStatus(file) == SDL_IO_STATUS_EOF;
}

const StringView header = stringView(
  "HTTP/1.1 200 OK\r\n"
  "Connection: keep-alive\r\n"
  "Content-Type: "
);

void buildHeader(String *header, const StringView contType, u32 contLen){
  string_set(header, stringView("HTTP/1.0 200 OK\r\nConnection: keep-alive\r\nContent-Type: "));
  string_append(header, contType);
  string_append(header, stringView("\r\nContent-Length: "));
  char buf[12];
  string_append(header, string_newView(buf, i32_to_ascii(contLen, buf)));
  string_append(header, stringView("\r\n\r\n"));
}

bool sendFile(NET_StreamSocket *sock, SDL_IOStream *file, String *header, String *res, const StringView type){
  string_fill(res, file);
  buildHeader(header, type, res->len);
  string_append(header, string_view(res));
  bool succ = NET_WriteToStreamSocket(sock, header->data, header->len);
  succ = NET_WaitUntilStreamSocketDrained(sock, -1) != -1;
  return succ;
}

StringView pieceName[] = {
  stringView("Pawn"),
  stringView("Rook"),
  stringView("Knight"),
  stringView("Bishop"),
  stringView("King"),
  stringView("Queen"),
  stringView("Spear"),
  stringView("Soldier"),
  stringView("Bomb"),
  stringView("Bomber")
};

void handleClients(GameState *state, String *buf, String *res){
  res->len = 0;
  for(i32 i = 0; i < state->cli.len; ++i){
    i32 len = NET_ReadFromStreamSocket(state->cli.data[i]->sock, buf->data, 1 << 12);
    if(len == -1){
      Player *p = state->cli.data[i];
      darray_pop(&state->cli, i, sizeof *state->cli.data);
      if(p->room){
        if(p->room->blue == p) p->room->blue = NULL;
        else if(p->room->red == p) p->room->red = NULL;
      }
      free(p);
      --i;
      continue;
    }
    buf->len = len;
    if(!len) continue;
    darrayTemplate(StringView) dview = {0};
    StringView view = string_view(buf);
    if(memcmp(view.data, "GET", 3)) continue;
    view.data += 4;
    view.len = string_findFirst(view, ' ');
    if(!string_compare(view, stringView("/"))){
      sendFile(state->cli.data[i]->sock, indexF, buf, res, stringView("text/html"));
      continue;
    }
    if(!string_compare(view, stringView("/client.js"))){
      sendFile(state->cli.data[i]->sock, scriptF, buf, res, stringView("text/javascript"));
      continue;
    }
    if(!string_compare(view, stringView("/style.css"))){
      sendFile(state->cli.data[i]->sock, styleF, buf, res, stringView("text/css"));
      continue;
    }
    if(!string_compare(view, stringView("/favicon.ico"))){
      sendFile(state->cli.data[i]->sock, iconF, buf, res, stringView("image/svg+xml"));
      continue;
    }
    // Game commands
    if(!string_compare(view, stringView("/getUserId"))){
      Player *p = state->cli.data[i];
      if(!p->room)
      findRoom(p, &state->room);
      json_init(res);
      json_attr(res, stringView("id"));
      json_i32(res, 0xbeef);
      json_comma(res);
      json_attr(res, stringView("team"));
      json_bool(res, p->room->blue == p);
      json_close(res);
      buildHeader(buf, stringView("application/json"), res->len);
      string_append(buf, string_view(res));
      bool succ = NET_WriteToStreamSocket(p->sock, buf->data, buf->len);
      if(!succ) errorout;
      continue;
    }

    if(!string_compare(view, stringView("/getTurn"))){
      //{turn: gameState.board.turnCount}
      Player *p = state->cli.data[i];
      if(!p->room) continue;
      json_init(res); json_attr(res, stringView("turn"));
      json_i32(res, p->room->board.turnCount); json_close(res);
      buildHeader(buf, stringView("application/json"), res->len);
      string_append(buf, string_view(res));
      bool succ = NET_WriteToStreamSocket(p->sock, buf->data, buf->len);
      if(!succ) errorout;
      continue; 
    }

    if(!string_compare(view, stringView("/getBoard"))){
      ChessRoom *room = state->cli.data[i]->room;
      if(!room) continue;
      Board *board = &room->board;
      json_init(res);
      json_attr(res, stringView("w")); json_i32(res, board->w); json_comma(res);
      json_attr(res, stringView("h")); json_i32(res, board->h); json_comma(res);
      json_attr(res, stringView("turnCount")); json_i32(res, board->turnCount); json_comma(res);
      json_attr(res, stringView("lastMove"));
      if(room->lastMove.len){
        string_append(res, string_view(&room->lastMove));
      } else json_null(res);
      json_comma(res);
      json_attr(res, stringView("piece")); json_openArr(res);
      for(u64 i = 0; i < (u64)board->w * board->h; ++i){
        Piece *piece = board->row[i].piece;
        json_init(res);
        json_attr(res, stringView("name"));
        if(piece) json_string(res, pieceName[piece->type]);
        else json_null(res);
        json_comma(res);
        json_attr(res, stringView("team"));
        if(piece) json_bool(res, piece->team);
        else json_null(res);
        json_comma(res);
        json_attr(res, stringView("shared"));
        if(piece && piece->shared){
          json_init(res);
          switch(piece->type){
            case Pawn:{
              PawnShared *share = piece->shared;
              json_attr(res, stringView("enPassant")); json_i32(res, share->enPassant); json_comma(res);
              json_attr(res, stringView("moveLen")); json_i32(res, share->moveLen);
            } break;
            case Bomb:{
              BombShared *share = piece->shared;
              json_attr(res, stringView("fuseTimer")); json_i32(res, share->fuseTimer);    
            } break;
          }
          json_close(res);
        }
        else json_null(res);
        json_close(res); json_comma(res);
      }
      res->len -= 1;
      json_closeArr(res); json_close(res);
      buildHeader(buf, stringView("application/json"), res->len);
      string_append(buf, string_view(res));
      bool succ = NET_WriteToStreamSocket(state->cli.data[i]->sock, buf->data, buf->len);
      if(!succ) errorout;
      continue;
    }

    if(!string_contains(view, stringView("/makePlay"))){
      Player *p = state->cli.data[i];
      Board *board = &p->room->board;
      Tile (*r2d)[board->w] = (void*)board->row;
      bool isBlue = p->room->blue == p;
      if(isBlue == (board->turnCount & 1)) goto makePlay_turn;
      u32 idx = string_findFirst(view, '=');
      bool succ;
      if(idx == -1u) goto makePlay_args;
      ++idx;
      view.data += idx;
      if(view.len <= idx) goto makePlay_args;
      view.len -= idx;
      StringView viewBuf[5];
      darrayTemplate(StringView) args = {.data = viewBuf, .len = 0, .cap = 5};
      string_splitView(view, stringView(","), &args);
      if(args.len < 5) goto makePlay_args;
      i32
      iniX = view_atoi(args.data[0]),
      iniY = view_atoi(args.data[1]),
      targX = view_atoi(args.data[2]),
      targY = view_atoi(args.data[3]);

      board_clear(board);
      Piece *selected = r2d[iniY][iniX].piece, *target = NULL;
      if(!selected) goto makePlay_invalid;
      Piece iniCpy = *selected, targCpy;
      piece_highlight(selected, board);
      if(r2d[targY][targX].stat == TileStat_Move){
        piece_relocate(selected, board, targX, targY);
      } else if(r2d[targY][targX].stat == TileStat_Attack){
        target = r2d[targY][targX].piece;
        targCpy = *target;
        selected->virtual->attackEffect(selected, board, target);
      } else goto makePlay_invalid;

      board->turnCount += 1;
      for(i64 t = 0; t < (i64)board->w * board->h; ++t)
      if(board->row[t].piece) board->row[t].piece->virtual->endOfTurn(board->row[t].piece, board);

      String *lm = &p->room->lastMove;
      lm->len = 0;
      json_init(lm);
      json_attr(lm, stringView("iniName")); json_string(lm, pieceName[iniCpy.type]); json_comma(lm);
      json_attr(lm, stringView("iniTeam")); json_bool(lm, iniCpy.team); json_comma(lm);
      json_attr(lm, stringView("iniX")); json_i32(lm, iniX); json_comma(lm);
      json_attr(lm, stringView("iniY")); json_i32(lm, iniY); json_comma(lm);
      json_attr(lm, stringView("targName")); json_string(lm, target ? pieceName[targCpy.type] : stringView("")); json_comma(lm);
      json_attr(lm, stringView("targTeam")); json_bool(lm, target ? targCpy.team : iniCpy.team); json_comma(lm);
      json_attr(lm, stringView("targX")); json_i32(lm, targX); json_comma(lm);
      json_attr(lm, stringView("targY")); json_i32(lm, targY); json_close(lm);

      json_init(res); json_attr(res, stringView("val"));
      json_bool(res, true); json_comma(res);
      json_attr(res, stringView("desc"));
      json_string(res, stringView("Valid")); json_close(res);
      buildHeader(buf, stringView("application/json"), res->len);
      string_append(buf, string_view(res));
      succ = NET_WriteToStreamSocket(state->cli.data[i]->sock, buf->data, buf->len);
      if(!succ) errorout;
      continue;
      makePlay_args:
      json_init(res); json_attr(res, stringView("val"));
      json_bool(res, false); json_comma(res);
      json_attr(res, stringView("desc"));
      json_string(res, stringView("Invalid arguments")); json_close(res);
      buildHeader(buf, stringView("application/json"), res->len);
      string_append(buf, string_view(res));
      succ = NET_WriteToStreamSocket(state->cli.data[i]->sock, buf->data, buf->len);
      if(!succ) errorout;
      continue;
      makePlay_turn:
      json_init(res); json_attr(res, stringView("val"));
      json_bool(res, false); json_comma(res);
      json_attr(res, stringView("desc"));
      json_string(res, stringView("Wrong turn")); json_close(res);
      buildHeader(buf, stringView("application/json"), res->len);
      string_append(buf, string_view(res));
      succ = NET_WriteToStreamSocket(state->cli.data[i]->sock, buf->data, buf->len);
      if(!succ) errorout;
      continue;
      makePlay_invalid:
      json_init(res); json_attr(res, stringView("val"));
      json_bool(res, false); json_comma(res);
      json_attr(res, stringView("desc"));
      json_string(res, stringView("Invalid move")); json_close(res);
      buildHeader(buf, stringView("application/json"), res->len);
      string_append(buf, string_view(res));
      succ = NET_WriteToStreamSocket(state->cli.data[i]->sock, buf->data, buf->len);
      if(!succ) errorout;
      continue;
    }
  }
}

void closeio(SDL_IOStream **io){
  SDL_CloseIO(*io);
}

int main(){
  NET_Init();

  NET_Address *addr = NET_ResolveHostname("0.0.0.0");
  NET_Status stat = NET_WaitUntilResolved(addr, -1);
  if(stat == NET_FAILURE) errorout;
  NET_Server *serv = NET_CreateServer(addr, 80);
  
  NET_StreamSocket *cli;

  indexF = SDL_IOFromFile("../index.html", "r");
  scriptF = SDL_IOFromFile("../client.js", "r");
  styleF = SDL_IOFromFile("../style.css", "r");
  iconF = SDL_IOFromFile("../icon.svg", "r");

  GameState state = {0};
  String buf = {0}, res = {0};
  string_reserve(&buf, 1 << 12);
  string_reserve(&res, 1 << 12);

  SDL_Log("Server set up. Serving HTTP");

  while(true){
    bool succ = NET_AcceptClient(serv, &cli);
    if(!succ) errorout;
    if(cli){
      Player *p = malloc(sizeof *p);
      p->username = (String){0};
      p->sock = cli;
      p->room = NULL;
      darray_appendPtr(&state.cli, p);
    }
    handleClients(&state, &buf, &res);
    SDL_Delay(10);
  }
}