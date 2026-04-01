#include "stringType.h"

#include <string.h>
#include "darray.h"

void *(*stringRealloc)(void *mem, usz bytes) = realloc;

String string_new(const StringView view){
  String str = {0};
  str.len = view.len;
  u32 cap = 2;
  while(cap < str.len) cap += (cap >> 1) + ((cap >> 1) & 1);
  str.cap = cap;
  str.data = stringRealloc(str.data, cap);
  memcpy(str.data, view.data, view.len);
  return str;
}

StringView string_newView(const char *txt, u32 len){
  StringView view = {
    .data = txt,
    .len = len
  };
  return view;
}

StringView string_view(String *str){
  StringView view = {
    .data = str->data,
    .len = str->len
  };
  return view;
}

void string_free(String *str){
  char *const data = str->data;
  *str = (String){0};
  free(data);
}

void string_destroy(String *str){
  char *const data = str->data;
  *str = (String){0};
  memset(data, 0, str->len);
  free(data);
}

void string_set(String *str, const StringView view){
  str->len = view.len;
  u32 cap = str->cap;
  cap += 2 * !cap;
  while(cap < str->len) cap += (cap >> 1) + ((cap >> 1) & 1);
  if(cap > str->cap){
    str->cap = cap;
    str->data = stringRealloc(str->data, cap);
  }
  memcpy(str->data, view.data, view.len);
}

void string_append(String *str, const StringView view){
  u32 newLen = str->len + view.len;
  u32 cap = str->cap;
  cap += 2 * !cap;
  while(cap < newLen) cap += (cap >> 1) + ((cap >> 1) & 1);
  if(cap > str->cap){
    str->cap = cap;
    str->data = stringRealloc(str->data, cap);
  }
  memcpy(str->data + str->len, view.data, view.len);
  str->len = newLen;
}

u32 string_findAmount(const StringView view, char c){
  u32 amount = 0;
  for(u32 i = 0; i < view.len; ++i)
    if(view.data[i] == c) ++amount;
  return amount;
}

u32 *string_findAll(const StringView view, char c, u32 *amount){
  u32 found = string_findAmount(view, c), cur = 0;
  u32 *list = malloc(found * sizeof *list);
  for(u32 i = 0; cur < found; ++i)
    if(view.data[i] == c) list[cur++] = i;
  *amount = found;
  return list;
}

void string_findDynamic(const StringView view, char c, void *darray_u32){
  darrayTemplate(u32) *darray = darray_u32;
  u32 found = string_findAmount(view, c), cur = 0;
  darrayGrow(*darray, darray->len + found);
  for(u32 i = 0; cur < found; ++i)
    if(view.data[i] == c){
      darrayAppend(*darray, i);
      ++cur;
    }
}

u32 string_findFirst(const StringView view, char c){
  char *sub = memchr(view.data, c, view.len);
  if(sub) return sub - view.data;
  return -1u;
}

u32 string_findLast(const StringView view, char c){
  for(u32 i = view.len - 1; i < view.len; --i)
    if(view.data[i] == c) return i;
  return -1u;
}

u32 string_contains(const StringView view, const StringView sub){
  if(view.len < sub.len) return -1u;
  u32 cur = 0;
  while(view.len - cur >= sub.len){
    if(!memcmp(view.data + cur, sub.data, sub.len)) return cur;
    char *findings = memchr(view.data + cur + 1, sub.data[0], view.len - cur - sub.len);
    if(!findings) break;
    cur = findings - view.data;
  }
  return -1u;
}

void string_split(StringView view, const StringView delimiter, void *darray_String){
  darrayTemplate(String) *darray = darray_String;
  u32 index = string_contains(view, delimiter);
  while(index + 1){
    String newEl = string_new(string_newView(view.data, index));
    darrayAppend(*darray, newEl);
    view.data += index + delimiter.len;
    view.len -= index + delimiter.len;
    index = string_contains(view, delimiter);
  }
  darrayAppend(*darray, string_new(view));
}

void string_splitView(StringView view, const StringView delimiter, void *darray_StringView){
  darrayTemplate(StringView) *darray = darray_StringView;
  u32 index = string_contains(view, delimiter);
  while(index + 1){
    StringView newEl = string_newView(view.data, index);
    darrayAppend(*darray, newEl);
    view.data += index + delimiter.len;
    view.len -= index + delimiter.len;
    index = string_contains(view, delimiter);
  }
  darrayAppend(*darray, view);
}

String string_join(String *list, u32 len, const StringView join){
  String joined = {0};
  if(!len) return joined;
  for(u32 i = 0; i < len - 1; ++i){
    darrayAppendMany(joined, list[i].data, list[i].len);
    darrayAppendMany(joined, join.data, join.len);
  }
  darrayAppendMany(joined, list[len - 1].data, list[len - 1].len);
  return joined;
}

String string_joinView(StringView *list, u32 len, const StringView join){
  String joined = {0};
  if(!len) return joined;
  for(u32 i = 0; i < len - 1; ++i){
    darrayAppendMany(joined, list[i].data, list[i].len);
    darrayAppendMany(joined, join.data, join.len);
  }
  darrayAppendMany(joined, list[len - 1].data, list[len - 1].len);
  return joined;
}

i32 string_compare(const StringView base, const StringView target){
  if(base.len != target.len) return (base.len > target.len) - (base.len < target.len);
  return memcmp(base.data, target.data, base.len);
}