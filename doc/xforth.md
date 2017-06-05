# Forth model proposal

By *Brad Eckert*, `hwfwguy/at\gmail.com`

The traditional QUIT loop in Forth uses FIND as part of an outer interpreter. FIND returns a single *xt*, an execution token that can be used for compilation but not in a straightforward way.

There have been a number of means used to provide separate compile and execution semantics. The STATE variable has been one of these.
The outer loop uses STATE to decide whether to compile or interpret. Interpreting is easy: the xt usually points to the execution address. Compilation requires some tricks. Some Forths use dual wordlists. That complicates the use of the search order, which limits extensibility and ties you to Forth as a language rather than a meta-language.

When QUIT finds a word, the word's execution semantics or compile semantics should be executed depending on the value of STATE. 
This would make STATE an offset into the word's header structure in Name space. As a reminder, Forth has three basic memory spaces: Name space, where the header structure is built; Code space, where executable code is compiled; and Data space where you put variables and perhaps data structures. Read-only data structures are sometimes kept in code space, but that's a language feature. `FIND` would return a "name token", or nt, to point to the header structure. To compile or execute the word, `STATE @ + @ EXECUTE` would handle the nt. 

That is very flexible, perhaps returning Forth to its roots as a virtual language. Various kinds of default semantics are used when building a language such ANS Forth. The foundation for the Forth language is then this QUIT meta-language that you can drill down to as needed. The basic Forth language elements are `:` and `;`. `:` creates a word in Name space with "compile me" and "execute me" default semantics. Where do these default semantics come from? How about we make them variables? Where to store them?

Words that create something in a wordlist should have the defaults in their namespace. That makes four cells, pointers to functions, in the header of a word: *compile, execute, compile_sem, execute_sem*. When that word creates something, *{compile_sem, execute_sem}* gets copied to the *{compile, execute}* fields. If the word creates nothing (the usual case), the *{compile_sem, execute_sem}* fields are zero or nonexistent. Maybe there's a bit in the header that says they're nonexistent. `IMMEDIATE` would copy the last defined word's *execute* field to its *compile* field rather than setting a bit in the header and letting `FIND` return the bit.

This kind of flexibility simplifies the design of cross compilers. ':' for example can easily have its default semantics changed to target a new CPU. Or, its compile semantics can start out dumb and have optimizations added later. A smart language can build itself.

In a cross compiler, for example, TARGET would patch `:` and others to generate machine code for the target processor. Granted, that could be a lot of words. And, if you overwrite defaults, there needs to be a way to restore them. The trick is to allow space in the header structure so that STATE can be modified to use the appropriate xt when generating code, etc. It the COMPILER scope, for example, new definitions affect the corresponding *{compile, execute)* in the word.

This brings up redefinitions. Creation words look for existing word names first. If the name exists and the semantics are defined, it does a redefinition by creating a new structure in namespace. Otherwise, it uses the old header and patches the blank semantics. In Forth, redefinitions aren't necessarily an error. They just mean you don't need that name anymore. You're terminating its scope.

## Header structures

If there's anything computing has demonstrated, it's the persistence of data structures. Data is like rocks. Code is like sand. It's desirable to define a minimal amount of rock. For the benefit of embedded systems, bloat is optional.

The header structure would start with the counted name string. Empty bytes between the end of the string and the next CODE-ALIGNED address would be padded with 0. The rest of the header would contain at a minimum: 

- *{ROH, compile, execute, parm, [spare]}*. 

Note that for Forths running on a VM, an xt could be distinguished between Forth and VM functions using the xt's sign bit.

ROH is a pointer to the rest of the header, after the STATE list.

*parm* is a cell that could be the code execution address of a word, a token value for a VM, a literal, or a pointer to a data structure. Cells in the header beyond that are implementation dependent. They could be links into a cross reference structure, for example.  

## Whither Smudge

A Smudge bit could added to support strict ANS Forth compliance. Chuck Moore omitted it in some Forths. Smudge is used to force a word referenced in a word to use its previous definition rather than compiling a recursive call. It's a relatively rare situation, so I would decide against smudge. But, that's an implementation detail.

So, how would you access a previous definition? How about allowing an xt to be passed into a definition? For example: `' FOO  : FOO [COMPILE] ;`. That's a nice technique to have. The ANS TC didn't adopt it because of existing implementations.

## Input Stream

The QUIT loop operates on an input stream such as a keyboard buffer (the TIB) or a file. The most common usage of TIB at the application level is to do simple parsing of the input stream. A double VARIABLE called (SOURCE) should be used as the text input buffer. The first cell is the length remeining to be processed and the second cell is the address of the first byte. My code sometimes uses `>IN @` and `>IN !` to parse the input stream twice, so `>IN` could be defined as `(SOURCE) @`. The remainder of the buffer could be `: /SOURCE ( -- c-addr u )  (SOURCE) 2@ /STRING ;`. The idea is to evaluate blocks and files as whole buffers. Elimination of TIB simplifies `(` and other multi-line operations such as `[IF]`. The main difference is that WORD and PARSE don't necessarily recognize line breaks. That's good, you shouldn't depend on them to. `(SOURCE)` should have a third cell, line count, to let parsing words bump it when they see a newline.



