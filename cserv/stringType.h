#ifndef STRING_TYPE_H_
#define STRING_TYPE_H_

#include "rustydef.h"

#define stringView(_txt) ((StringView){.data = (_txt), .len = sizeof(_txt) - 1})

extern void *(*stringRealloc)(void *mem, usz bytes);

typedef struct String{
  char *data;
  u32 len, cap;
} String;

typedef struct StringView{
  const char *data;
  u32 len;
} StringView;

String string_new(const StringView view);


StringView string_newView(const char *txt, u32 len);

StringView string_view(const String *str);

void string_reserve(String *str, u32 len);

void string_free(String *str);

/**
 * @brief Frees the String object and clears the string buffer itself
 */
void string_destroy(String *str);

void string_set(String *str, const StringView view);

void string_append(String *str, const StringView view);

u32 string_findAmount(const StringView view, char c);

u32 *string_findAll(const StringView view, char c, u32 *amount);

/**
 * @brief Appends the indexes in a dynamic array of type u32
 * @param darray_u32 Expected to point at a valid darray of u32
 */
void string_findDynamic(const StringView view, char c, void *darray_u32);

u32 string_findFirst(const StringView view, char c);

u32 string_findLast(const StringView view, char c);

u32 string_contains(const StringView view, const StringView sub);

/**
 * @brief Splits a string into a dynamic array based on a delimiter
 * @param view String to be split
 * @param delimiter Delimiter used to split the source string
 * @param darray_String Expected to point at a valid darray of String
 */
void string_split(StringView view, const StringView delimiter, void *darray_String);

/**
 * @brief Splits a string into a dynamic array based on a delimiter
 * @param view String to be split
 * @param delimiter Delimiter used to split the source string
 * @param darray_StringView Expected to point at a valid darray of StringView
 */
void string_splitView(StringView view, const StringView delimiter, void *darray_StringView);

String string_join(String *list, u32 len, const StringView join);

String string_joinView(StringView *list, u32 len, const StringView join);

/**
 * @brief If you want to have the plain ascii comparison use memcmp
 * @return Sign of (base.len - target.len). If there isn't, returns the ascii comparison
 */
i32 string_compare(const StringView base, const StringView target);

#endif