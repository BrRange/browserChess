#ifndef DYNAMIC_ARRAY_H_
#define DYNAMIC_ARRAY_H_

#include <stdlib.h>
#include <string.h>
#include "rustydef.h"

extern void *(*darrayRealloc)(void *mem, usz bytes, usz previous);

/*
Expected format:
{
  type *data;
  u32 len, cap;
  ...
}

Expected new data:
{0} || {NULL, 0, 0, ...}
*/

#define darrayTemplate(_type...) struct{\
  pointer(_type) data;\
  u32 len, cap;\
}

#define darrayGrow(_da, _target) do{\
  u32 _cap = (_da).cap;\
  _cap += 2 * !_cap;\
  while(_cap < (_target))\
    _cap += (_cap >> 1) + ((_cap >> 1) & 1);\
  if(_cap > (_da).cap){\
    (_da).data = darrayRealloc((_da).data, _cap * sizeof *(_da).data, (_da).cap * sizeof *(_da).data);\
    (_da).cap = _cap;\
  }\
} while(0)

void darray_grow(void *darrayAny, u32 target, u32 typeSize);

#define darrayShrink(_da) do{\
  u32 _cap = (_da).cap;\
  while(_cap / 2 > (_da).len) _cap /= 2;\
  if(_cap < (_da).cap){\
    (_da).data = darrayRealloc((_da).data, _cap * sizeof *(_da).data, (_da).cap * sizeof *(_da).data);\
    (_da).cap = _cap;\
  }\
} while(0)

void darray_shrink(void *darrayAny, u32 typeSize);

#define darrayAppend(_da, _el) do{\
  darrayGrow((_da), (_da).len + 1);\
  (_da).data[(_da).len] = (_el);\
  ++(_da).len;\
} while(0)

void darray_append(void *darrayAny, void *element, u32 typeSize);

void darray_appendPtr(void *darrayAny, void *element);

#define darrayAppendMany(_da, _li, _n) do{\
  (_da).len += (_n);\
  darrayGrow((_da), (_da).len);\
  memcpy((_da).data + (_da).len - (_n), (_li), (_n) * sizeof(*(_da).data));\
} while(0)

void darray_appendMany(void *darrayAny, void *elementList, u32 elementCount, u32 typeSize);

#define darrayRemove(_da, _index) do{\
  --(_da).len;\
  if((_index) < (_da).len)\
    memmove(\
      (_da).data + (_index),\
      (_da).data + (_index) + 1,\
      ((_da).len - (_index)) * sizeof *(_da).data\
    );\
} while(0)

void darray_remove(void *darrayAny, u32 index, u32 typeSize);

#define darrayRemoveMany(_da, _index, _amount) do{\
  (_da).len -= (_amount);\
  if(_index < (_da).len)\
    memmove(\
      (_da).data + (_index),\
      (_da).data + (_index) + (_amount),\
      ((_da).len - (_index)) * sizeof *(_da).data\
    );\
} while(0)

void darray_removeMany(void *darrayAny, u32 index, u32 amount, u32 typeSize);

#define darrayPop(_da, _index) do{\
  --(_da).len;\
  if((_index) < (_da).len)\
    memcpy(\
      (_da).data + (_index),\
      (_da).data + (_da).len,\
      sizeof *(_da).data\
    );\
} while(0)

void darray_pop(void *darrayAny, u32 index, u32 typeSize);

#define darrayPopMany(_da, _index, _amount) do{\
  (_da).len -= (_amount);\
  u32 _diff = (_amount) + (_index) > (_da).len ? (_amount) + (_index) - (_da).len : 0;\
  printf("Diff: %zu\n", _diff);\
  if((_index) < (_da).len)\
    memcpy(\
      (_da).data + (_index),\
      (_da).data + (_da).len + _diff,\
      ((_amount) - _diff) * sizeof *(_da).data\
    );\
} while(0)

void darray_popMany(void *darrayAny, u32 index, u32 amount, u32 typeSize);

#define darrayDestroy(_da) do{\
  free((_da).data);\
  memset(&(_da), 0, sizeof(_da));\
} while(0)

void darray_destroy(void *darrayAny);

#define darrayIterate(_da)\
  for(typeof((_da).data)_ref = NULL; !_ref; _ref = (void*)1)\
  for(typeof(*(_da).data)_el; !_ref; _ref = (void*)1)\
  for(u32 _i = 0; (_ref = (_da).data + _i, _el = *_ref, _i < (_da).len); ++_i)

#endif