# Forth model proposal

By *Brad Eckert*, `hwfwguy/at\gmail.com`

The traditional QUIT loop in Forth uses FIND as part of an outer interpreter. FIND returns a single *xt*, an execution token that can be used for compilation but not in a straightforward way. There have been a number of means used to provide separate compile and execution semantics. The STATE variable has been one of these. The outer loop uses STATE to decide whether to compile or interpret. Interpreting is easy: the xt usually points to the execution address. Compilation requires some tricks. Some Forths use dual wordlists. That complicates the use of the search order, which limits extensibility and ties you to Forth as a language rather than a meta-language. Moving up a level of abstraction to the *nt*, or name token, enables more elaborate compilation by QUIT. The main enabler of this is a new memory space, Pile (compiler) space. So, the Forth model has four different memory spaces:  

- Name space, where the header structure is built.
- Code space, where executable code is compiled to.
- Data space where you put variables and perhaps data structures. Read-only data structures are sometimes kept in code space, but that's a language feature.
- To this ANS94 list we add Pile space, where optional compile semantics of a word are stored. 

In a cross compiler environment, Name and Pile spaces would be kept on the host and possibly interleaved. Pile space contains executable code, but only code that's executable on the host CPU. Pile space, like header space, is considered read-write. Code and data spaces would be ported to a remote CPU for execution. Cross compilers would still use namespace scoping, but be not quite so be dependent on it. For example, the TARGET version of ':' would have different default semantics than the HOST version. Since default semantics are patchable, they can start out dumb and have optimizations added later. A smart language can build itself.

Pile space is important to have on Forths that are hosted on a language other than Forth. Pile space holds executable code, usually for a VM. That's different than Code space, which is a ROM image for an alien CPU. No, not that alien.

When QUIT finds a word, the word's execution semantics or compile semantics should be executed depending on the value of STATE. 
This would make STATE an offset into the word's header structure in Name space. `FIND-NAME` would return a "name token", or nt, to point to the header structure. To compile or execute the word, `STATE @ + @ EXECUTE` could handle the nt, given the right header structure. 

Definitions would simultaneously compile to Code space and Pile space. Pile space could fill in a graph and apply an analytical compiler, or it could just compile a call/jump to code. It could make the decision to compile native code or a call at compile time. The basic idea is that Pile space is essentially free. Host systems are built to handle some really fat bloatware, so the overhead of compiling semantics to Pile space even if they aren't used is negligible.

The compiler will string compilation semantics together. For example, `: 2DUP OVER OVER ;` might cause 2DUP to compile two OVER opcodes rather than a call to 2DUP. The classical way of cross compiling worked out by MPE ltd. and FORTH inc. (for the EuroPay project) would be to compile 2DUP into the TARGET and COMPILE wordspaces. The 2DUP definition could be copied to the COMPILER scope to improve its compilation semantics. When COMPILING, the compiling version of 2DUP is found in the search order before the executable version. That works great when you're not using custom wordlists. However, to avoid the wordlist restrictions of dual headers, the dual-definition method (with Code and Pile spaces) is used. Everything you need is accessible from Name space.

`IMMEDIATE` would copy the last defined word's *execute* field to its *compile* field rather than setting a bit in the header and letting `FIND` return the bit.

## QUIT words

*find-name*  ( c-addr u –– nt | 0 ) From gForth: Find the name c-addr u in the current search order. Return its nt, if found, otherwise 0.

For a QUIT loop built on top of a Forth with implementation-dependent header structure, I suggest using the following words:

*name>exec*  ( nt –– addr )  The address of name's execution/immediate semantics. `NOOP` in proposed header structure.

*name>cmp*  ( nt –– addr )  The address of name's compilation semantics (2-cell xt w ). `CELL+` in proposed header structure.

*name>string*  ( nt –– addr count )  addr count is the name of the word represented by nt. `2 CELLS + COUNT 63 AND` in proposed header structure.

## Header structures

If there's anything computing has demonstrated, it's the persistence of data structures. Data is like rocks. Code is like sand. It's desirable to define a minimal amount of rock. For the benefit of embedded systems, bloat is optional.

The header structure would start with the counted name string. The MSB of the count byte would contain the *smudge* flag. Empty bytes between the end of the string and the next CODE-ALIGNED address would be padded with 0. The rest of the header would contain:

- *{execute, compile, w, nameString, ...}* 

Note that for Forths running on a VM, an xt could be distinguished between Forth and VM functions using the xt's sign bit.

*w* is a cell that could be the code execution address of a word, a token value for a VM, a literal, or a pointer to a data structure. Extra cells in the header are implementation dependent. They could be links into a cross reference structure, source code information, for example.

*nameString* is variable length. All fields afterwards are implementation dependent and take a little (not much) arithmetic to get to from the nt.

## Whither Smudge

A Smudge bit could added to support strict ANS Forth compliance. Chuck Moore omitted it in some Forths. Smudge is used to force a word referenced in a word to use its previous definition rather than compiling a recursive call. Redefinitions aren't necessarily an error. They just mean you don't need that name anymore. You're terminating its scope. Terminating its scope and using it one last time, as in ANS, is a nice trick. It also hides definitions that didn't compile. 

Smudge is a good concession to ANS Forth. Also nice for hiding bad definitions. 

## Input Stream

The QUIT loop operates on an input stream such as a keyboard buffer (the TIB) or a file. The TIB is still central to file loading in order to handle a line at a time. It would be a little silly to buffer the whole file before evaluating it. TIB and >IN could still be virtual, components of a 2VARIABLE `(SOURCE)`. To nest into a new source, `(SOURCE)` could be pushed onto the stack. There tends to be a little more information to store during file loading, such as file ID and line number. Such fancy stuff is outside the scope of QUIT.





