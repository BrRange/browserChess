#include "darray.h"

void *(*darrayRealloc)(void *mem, usz bytes, usz previous) = (void *(*)(void*, usz, usz))realloc;

void darray_grow(void *darrayAny, u32 target, u32 typeSize){
  darrayTemplate(void) *darray = darrayAny;
  u32 cap = darray->cap;
  cap += 2 * !cap;
  while(cap < target){
    u32 incr = cap >> 1;
    cap += incr + (incr & 1);
  }
  if(cap > darray->cap){
    darray->data = darrayRealloc(darray->data, cap * typeSize, darray->cap * typeSize);
    darray->cap = cap;
  }
}

void darray_shrink(void *darrayAny, u32 typeSize){
  darrayTemplate(void) *darray = darrayAny;
  u32 cap = darray->cap;
  while(cap / 2 > darray->len) cap /= 2;
  if(cap < darray->cap){
    darray->data = darrayRealloc(darray->data, cap * typeSize, darray->cap * typeSize);
    darray->cap = cap;
  }
}

void darray_append(void *darrayAny, void *element, u32 typeSize){
  darrayTemplate(void) *darray = darrayAny;
  darray_grow(darrayAny, darray->len + 1, typeSize);
  u8 (*sized)[typeSize] = darray->data;
  memcpy(sized + darray->len, element, typeSize);
  ++darray->len;
}

void darray_appendPtr(void *darrayAny, void *element){
  darray_append(darrayAny, &element, sizeof element);
}

void darray_appendMany(void *darrayAny, void *elementList, u32 elementCount, u32 typeSize){
  darrayTemplate(void) *darray = darrayAny;
  darray->len += elementCount;
  darray_grow(darray, darray->len, typeSize);
  u8 (*sized)[typeSize] = darray->data;
  memcpy(sized + darray->len - elementCount, elementList, elementCount * typeSize);
}

void darray_remove(void *darrayAny, u32 index, u32 typeSize){
  darrayTemplate(void) *darray = darrayAny;
  u8 (*sized)[typeSize] = darray->data;
  --darray->len;
  if(index < darray->len)
    memmove(
      sized + index,
      sized + index + 1,
      (darray->len - index) * typeSize
    );
}

void darray_removeMany(void *darrayAny, u32 index, u32 amount, u32 typeSize){
  darrayTemplate(void) *darray = darrayAny;
  u8 (*sized)[typeSize] = darray->data;
  darray->len -= amount;
  if(index < darray->len)
    memmove(
      sized + index,
      sized + index + amount,
      (darray->len - index) * typeSize
    );
}

void darray_pop(void *darrayAny, u32 index, u32 typeSize){
  darrayTemplate(void) *darray = darrayAny;
  u8 (*sized)[typeSize] = darray->data;
  --darray->len;
  if(index < darray->len)
    memcpy(
      sized + index,
      sized + darray->len,
      typeSize
    );
}

void darray_popMany(void *darrayAny, u32 index, u32 amount, u32 typeSize){
  darrayTemplate(void) *darray = darrayAny;
  u8 (*sized)[typeSize] = darray->data;
  darray->len -= amount;
  u32 diff = amount + index > darray->len ? amount + index - darray->len : 0;
  if(index < darray->len)
    memcpy(
      sized + index,
      sized + darray->len + diff,
      (amount - diff) * typeSize
    );
}

void darray_destroy(void *darrayAny){
  darrayTemplate(void) *darray = darrayAny;
  free(darray->data);
  memset(darray, 0, sizeof(*darray));
}