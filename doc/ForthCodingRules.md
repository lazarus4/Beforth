# Forth Coding Rules

The use of certain formatting rules allows the compiler to extract stack pictures and glossary entries. 
These, in turn, are used as quick references during editing and testing as well as documentation generation.

## Stack picture and Glossary
The classic FORTH Inc. stack picture is ( in -- out ) placed right after the colon definition's name. 
If this is encountered, it's saved as the stack picture. If a \ comment is encountered immediately after the stack picture, it's
saved as a glossary entry. Otherwise, if a \ comment appears immediately after ; on the same line, it's likewise saved. 
This scheme allows single-line definitions with stack pictures and glossary entries.

```
: SQUARE1  ( n1 -- n2 )  \ Square a number
   DUP * ;   
: SQUARE2  ( n1 -- n2 ) DUP * ; \ Square a number
```

Any other children of CREATE, such as CONSTANT, VARIABLE, etc. may have a glossary entry captured by \. 
They have implicit stack pictures, so no stack picture is expected.

```
VARIABLE BASE \ Radix for numeric conversion
```

If \ immediately follows the beginning of a colon word, a MPE style stack picture is expected in the remainder of the line. 
A -- indicates that a stack picture exists. If there is more than one space between blank-delimited tokens after the --, 
the rest of the line is considered glossary entry.

```
: SQUARE3  \ n1 -- n2   Square a number
   DUP *
;   
```
The naming convention for stack pictures may determine what letter to use for the first character of a stack picture token:
- a if it's an address
- d if it's a double number
