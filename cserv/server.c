#include "darray.c"
#include "stringType.c"
#include <SDL3_net/SDL_net.h>

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
  char buf[1 << 12];
  usz code;
  do{
    code = SDL_ReadIO(file, buf, 1 << 12);
    if(code) string_append(str, string_newView(buf, code));
  } while(SDL_GetIOStatus(file) == SDL_IO_STATUS_READY);
  bool succ = SDL_GetIOStatus(file) == SDL_IO_STATUS_EOF;
  SDL_SeekIO(file, 0, SDL_IO_SEEK_SET);
  return succ;
}

const StringView header = stringView(
  "HTTP/1.1 200 OK\r\n"
  "Connection: keep-alive\r\n"
  "Content-Type: text/html; charset=utf-8\r\n"
  "Content-Length: "
);

const StringView endHeader = stringView("\r\n\r\n");

bool sendFile(NET_StreamSocket *sock, SDL_IOStream *file){
  String str = {0}, fstr = {0};
  string_set(&str, header);
  string_fill(&fstr, file);
  char buf[12];
  string_append(&str, string_newView(buf, i32_to_ascii(fstr.len, buf)));
  string_append(&str, endHeader);
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

int main(){
  NET_Init();

  NET_Address *addr = NET_ResolveHostname("0.0.0.0");
  NET_Status stat = NET_WaitUntilResolved(addr, -1);
  NET_Server *serv = NET_CreateServer(addr, 3000);
  
  NET_StreamSocket *cli;

  SDL_IOStream *file = SDL_IOFromFile("../index.html", "r");

  while(true){
    NET_AcceptClient(serv, &cli);
    if(cli) sendFile(cli, file);
    SDL_Delay(10);
  }
}