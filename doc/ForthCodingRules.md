# Forth Coding Rules

The use of certain formatting rules allows the compiler to extract stack pictures ,summary and glossary entries. 
These, in turn, are used as quick references during editing and testing as well as documentation generation.

## Stack picture and Summary
The classic FORTH Inc. stack picture is ( in -- out ) placed right after the colon definition's name. 
If this is encountered, it's saved as the stack picture. If a \ comment is encountered immediately after the stack picture, it's
saved as a summary entry. Otherwise, if a \ comment appears immediately after ; on the same line, it's likewise saved. 
This scheme allows single-line definitions with stack pictures and summary entries.

```
: SQUARE1  ( n1 -- n2 )  \ Square a number
   DUP * ;   
: SQUARE2  ( n1 -- n2 ) DUP * ; \ Square a number
```

Any other children of CREATE, such as CONSTANT, VARIABLE, etc. may have a summary entry captured by \. 
They have implicit stack pictures, so no stack picture is expected.

```
VARIABLE BASE \ Radix for numeric conversion
```

If \ immediately follows the beginning of a colon word, a MPE style stack picture is expected in the remainder of the line. 
A -- indicates that a stack picture exists. If there is more than one space between blank-delimited tokens after the --, 
the rest of the line is considered summary entry.

```
: SQUARE3  \ n1 -- n2   Square a number
   DUP *
;   
```
The naming convention for stack pictures may determine what letter to use for the first character of a stack picture token:
- a if it's an address
- d if it's a double number
## Glossary
Glossary entries elaborate upon the Summary entry by going into more detail about the word.
Generally, glossary entries are on the second line of a definition if \ is seen in column 1 and ; has not been encountered.
Each new line with \ in column 1 continues the glossary entry.

Each new line immediately after a VARIABLE (etc.) declaration produces a glossary entry if \ is in column 1. For example:
```
VARIABLE BASE \ Radix for numeric conversion
\ This assumes that only one task will be doing numeric conversion at any one time. To be safe, 
\ do not PAUSE in the middle of numeric conversion and don't change BASE between PAUSEs.
( This line is blank, not appended to the glossary entry for BASE. )
```
## Locals
Locals are a funny thing. Every time I implement them, I don't use them. The classical usage isn't really useful because the scope is one word. It would be so much more useful to have locals scoped over a group of words. The order of operations should be:

1. Build up a list of local variables.
2. Define the words that use these locals.
3. In the last word of that section, use /LOCALS to construct a local stack frame for the locals and LOCALS/ to destroy the frame.
4. Forget the list of locals.

Locals could use a dedicated frame stack in data space. Some proposed words to build the list of locals:
```
LOCALS{  ( -- )  Begin a list of locals, reveal the locals syntax.
INT      ( \<name> -- )  Define a 32-bit local variable.
INT16    ( \<name> -- )  Define a 16-bit local variable.
INT8     ( \<name> -- )  Define an 8-bit local variable.
BUFFER   ( n \<name> -- )  Define a buffer n bytes long.
}LOCALS  ( -- )  Forget the locals and hide the locals syntax.
/LOCALS  ( -- )  Construct a stack frame with a size defined by the last LOCALS{.
LOCALS/  ( -- )  Destroy the stack frame.
```
Sample usage:
```
LOCALS{
   INT X  \ Horizontal
   INT Y  \ Vertical
: Euclidean  ( -- n^2 )  X @ DUP *  Y @ DUP *  + ;
: DIAGONAL   ( x y -- n )  /LOCALS Y ! X ! Euclidean SQRT LOCALS/ ;
}LOCALS
```
This is simple enough to add to any Forth, so code that uses it should be portable. It removes the pressure to keep things 
on the stack (creating added complexity) for the sake of reentrancy.
