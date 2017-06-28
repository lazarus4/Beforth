# Forth model proposal

By *Brad Eckert*, `hwfwguy/at\gmail.com`
## Memory Model

The memory model of the Forth virtual machine (in tha ANS/ISO standard) consists of three memory spaces: code, data and header. The goal of this model is to run comfortably in an embedded system. This doesn't mean cross compilation, however. Computers are very fast these days. The host PC can run an instruction set simulator of the target CPU to execute the code the compiler uses. This avoids the quirks of cross compilation to simplify language extension. It also simplifies modeling of the embedded system in the PC environment.

Embedded systems have memory differences that need to be taken into account:

Code memory is usually read-only at run time. When hosted on a PC, writes to code space (a RAM image in the host) are allowed at compile time. Writes are not allowed at run time. That's a hardware dependency that involves flash programming. Header space is a section of code space that may be included in or left out of the application.

Data memory is initialized at startup. In terms of die area, RAM is ten times as costly as flash memory. That means the RAM size will be quite manageable in an embedded system (assuming absence of DRAM). There's no need to distinguish between initialized and uninitialized data (IDATA vs UDATA in cross compiler parlance). It's all IDATA. The implementation clears all of RAM, then loads selected runs of cells with table data from ROM. 

When compiling data to the dictionary with *comma*, you can use the ROM and RAM keywords to switch between the memory spaces you're compiling to. There are, however, multiple instances of the RAM and ROM pointers to support multiple sections. Some sections make it into the embedded system, some don't. It depends what functionality is needed. You can visualize the sections as:
![Memory Spaces Illustration](https://github.com/lazarus4/Beforth/raw/master/doc/memspaces01.png)



## Interpreting

The traditional INTERPRET loop in Forth uses FIND as part of an outer interpreter. FIND returns a single *xt*, an execution token that can be used for compilation but not in a straightforward way. One solution is to have a dual-xt system. The header (in name space) contains an xt for execution and an xt for compilation. A new dialect of Forth, called DXT (for dual XT) is proposed. This can be a derivative of the 2012x Forth standard. Applications written in ANS can run on DXT with a compatibility layer written in DXT. Applications written in DXT may run on an ANS system with a non-standard compatibility layer. The DXT version of INTERPRET uses a version of FIND that takes a string token and finds its name token, *nt*, a namespace reference that easily converts to the appropriate xt.

- `PARSE-NAME`  ( "{spaces}name[space]" -- c-addr u )  *2012:* Skip leading space delimiters. Parse name delimited by a space.
- `NAME>COMP`  ( nt -- xt )  xt is the compilation token for the word nt.
- `NAME>INT`  ( nt -- xt )  *gforth:* xt represents the interpretation semantics of the word nt. If nt has no interpretation semantics (i.e. is compile-only), xt is the execution token for ticking-compile-only-error, which performs -2048 throw.
- `FIND-NAME`  ( c-addr u -- 0 nt | c-addr u )  Finds the word from its string token. Performs -16 throw if zero-length string.
- `NUMBER`  ( c-addr u -- ? )  Converts string to a number, performs -13 throw (undefined word) if it can't.
- `NAME>W`  ( nt -- w )  w is a general purpose parameter in the header.
- `NAME>NAME`  ( nt -- c-addr u )  Name of the word.

```
VARIABLE NT

: INTERPRET ( -- )  // DXT interpreter loop
   BEGIN  PARSE-NAME  DUP WHILE
      FIND-NAME OVER IF NUMBER ELSE
         NIP  DUP NT !  STATE @ IF         
         NAME>COMP ELSE
         NAME>EXEC THEN  EXECUTE
      THEN
   REPEAT  2DROP
;
```
IMMEDIATE works by copying the last word's xtE to its xtC.


## Header structures

If there's anything computing has demonstrated, it's the persistence of data structures. Data is like rocks. Code is like sand. It's desirable to define a minimal amount of rock. For the benefit of embedded systems, bloat is optional.

The header structure would start with the counted name string. The MSB of the count byte would contain the *smudge* flag and bit 6 would contain the *immediate* flag. Empty bytes between the end of the string and the next CODE-ALIGNED address would be padded with 0. The rest of the header would contain:

- *{execute, compile, w, nameString, ...}* 

Note that for Forths running on a VM, an xt could be distinguished between Forth and VM functions using the xt's sign bit.

*w* is a cell that could be the code execution address of a word, a token value for a VM, a literal, or a pointer to a data structure. Extra cells in the header are implementation dependent. They could be links into a cross reference structure, source code information, for example.

*nameString* is variable length. All fields afterwards are implementation dependent and take a little (not much) arithmetic to get to from the nt.

## Whither Smudge

A Smudge bit could added to support strict ANS Forth compliance. Chuck Moore omitted it in some Forths. Smudge is used to force a word referenced in a word to use its previous definition rather than compiling a recursive call. Redefinitions aren't necessarily an error. They just mean you don't need that name anymore. You're terminating its scope. Terminating its scope and using it one last time, as in ANS, is a nice trick. It also hides definitions that didn't compile. 

Smudge is a good concession to ANS Forth. Also nice for hiding bad definitions. 

## Input Stream

The INTERPRET (or QUIT) loop operates on an input stream such as a keyboard buffer (the TIB) or a file. The TIB is still central to file loading in order to handle a line at a time. It would be a little silly to buffer the whole file before evaluating it. TIB and >IN could still be virtual, components of a 2VARIABLE `(SOURCE)`. To nest into a new source, `(SOURCE)` could be pushed onto the stack. There tends to be a little more information to store during file loading, such as file ID and line number. Such fancy stuff is outside the scope of QUIT.

## Defining words

How about a napkin sketch of some defining words?

VARIABLE FOO would compile default xts for FOO. Let's call them FOO_E and FOO_C. The w field is a data address. FOO_E pushes w onto the stack. FOO_C compiles w as a literal. Hmm, easy. In a fancier compiler, FOO_C could push w into a virtual stack in a graph structure. Code would be generated at the next control flow switch. Still easy.

```
: FOO  CREATE , DOES> @ MYFUNC ;
123 FOO BAR
```
CREATE creates a header for BAR when FOO executes. BAR has code in Code space. This code pushes a literal w (the address of BAR data) onto the stack and then returns. BAR_E executes the BAR code. BAR_C executes `CREATE , DOES>` compile semantics to compile code that creates a header, compiles a cell (you had better be in the right memory space), and compiles a jump. It should be okay as compile semantics go.




