#include "board.c"
#include "darray.c"
#include "stringType.c"
#include <SDL3_net/SDL_net.h>

#define errorout SDL_Log("Error (%s, %u): %s", __FILE__, __LINE__, SDL_GetError())

SDL_IOStream *indexF, *scriptF, *styleF, *iconF;

typedef struct ChessRoom ChessRoom;

typedef struct Player{
  u32 id;
  String username;
} Player;

struct ChessRoom{
  u32 id;
  Player *blue, *red;
  Board board;
};

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
  string_set(header, stringView("HTTP/1.1 200 OK\r\nConnection: keep-alive\r\nContent-Type: "));
  string_append(header, contType);
  string_append(header, stringView("\r\nContent-Length: "));
  char buf[12];
  string_append(header, string_newView(buf, i32_to_ascii(contLen, buf)));
  string_append(header, stringView("\r\n\r\n"));
}

bool sendFile(NET_StreamSocket *sock, SDL_IOStream *file, const StringView type){
  String str = {0}, fstr = {0};
  string_fill(&fstr, file);
  buildHeader(&str, type, fstr.len);
  string_append(&str, string_view(&fstr));
  bool succ = NET_WriteToStreamSocket(sock, str.data, str.len);
  string_free(&str);
  string_free(&fstr);
  if(!succ) return succ;
  succ = NET_WaitUntilStreamSocketDrained(sock, -1) != -1;
  return succ;
}

typedef struct Client{
  darrayTemplate(NET_StreamSocket*);
} Client;

void handleClients(Client *dcli, String *buf){
  for(i32 i = 0; i < dcli->len; ++i){
    i32 len = NET_ReadFromStreamSocket(dcli->data[i], buf->data, 1 << 12);
    if(len == -1){
      darray_pop(dcli, i, sizeof(void*));
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
    SDL_Log("%.*s", view.len, view.data);
    if(!string_compare(view, stringView("/"))){
      sendFile(dcli->data[i], indexF, stringView("text/html"));
      continue;
    }
    if(!string_compare(view, stringView("/client.js"))){
      sendFile(dcli->data[i], scriptF, stringView("text/javascript"));
      continue;
    }
    if(!string_compare(view, stringView("/style.css"))){
      sendFile(dcli->data[i], styleF, stringView("text/css"));
      continue;
    }
    if(!string_compare(view, stringView("/favicon.ico"))){
      sendFile(dcli->data[i], iconF, stringView("image/svg+xml"));
      continue;
    }
    // Game commands
    if(!string_compare(view, stringView("/getUserId"))){
      StringView res = stringView("{\"id\":1,\"team\":true}");
      buildHeader(buf, stringView("application/json"), res.len);
      string_append(buf, res);
      SDL_Log("Res:\n%.*s", buf->len, buf->data);
      bool succ = NET_WriteToStreamSocket(dcli->data[i], buf->data, buf->len);
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

  Client clients = {0};
  String buf = {0};
  string_reserve(&buf, 1 << 12);

  while(true){
    bool succ = NET_AcceptClient(serv, &cli);
    if(!succ) errorout;
    if(cli) darray_appendPtr(&clients, cli);
    handleClients(&clients, &buf);
    SDL_Delay(10);
  }
}