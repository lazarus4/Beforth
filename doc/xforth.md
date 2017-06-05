# Forth model proposal

By *Brad Eckert*, `hwfwguy/at\gmail.com`

The traditional QUIT loop in Forth uses FIND as part of an outer interpreter. FIND returns a single XT, an execution token that can be used for compilation but not in a straightforward way.

There have been a number of means used to provide separate compile and execution semantics. The STATE variable has been one of these.
The outer loop uses STATE to decide whether to compile or interpret. Interpreting is easy: the xt usually points to the execution address. Compilation requires some tricks. Some Forths use dual wordlists. That complicates the use of the search order, which limits extensibility and ties you to Forth as a language rather than a meta-language.

When QUIT finds a word, the word's execution semantics or compile semantics should be executed depending on the value of STATE. 
This would make STATE an offset into the word's header structure in Name space. As a reminder, Forth has three basic memory spaces: Name space, where the header structure is built, Code space, where executable code is compiled, and Data space where you put variables and perhaps data structures. Read-only data structures are sometimes kept in code space, but that's a language feature. `FIND` would return a "name token", or nt, to point to the header structure. To compile or execute the word, `STATE @ + @ EXECUTE` would handle the nt. 

That is very flexible, perhaps returning Forth to its roots as a virtual language. Various kinds of default semantics are used when building a language such ANS Forth. The foundation for the Forth language is then this QUIT metalanguage that you can drill down to as needed. The basic Forth language elements are `:` and `;`. `:` creates a word in Name space with "compile me" and "execute me" default semantics. Where do these default semantics come from? How about we make them variables? Where to store them?

Words that create something in a wordlist should have the defaults in their namespace. That makes four cells, pointers to functions, in the header of a word: *compile, execute, compile_sem, execute_sem*. When that word creates something, *{compile_sem, execute_sem}* gets copied to the *{compile, execute}* fields. If the word creates nothing (the usual case), the *{compile_sem, execute_sem}* fields are zero or nonexistent. Maybe there's a bit in the header that says they're nonexistent. `IMMEDIATE` would copy the last defined word's *execute* field to its *compile* field rather than setting a bit in the header and letting `FIND` return the bit.

This kind of flexibility simplifies the design of cross compilers. ':' for example can easily have its default semantics changed to target a new CPU. Or, its compile semantics can start out dumb and have optimizations added later. A smart language can build itself.

## Header structures

If there's anything computing has demonstrated, it's the persistence of data structures. Data is like rocks. Code is like sand. It's desirable to define a minimal amount of rock. For the benefit of embedded systems, bloat is optional.

The traditional maximum allowed length of a name in a Forth system is at least 31 characters. This allows three bits of the name string's  to be used as flags. I propose the following three flags:

- `Smudge` is set while a definition is compiling to render it un-FINDable until after ';' clears Smudge.
- `Creator` is set if this word creates a word that will have semantics.
- `Virtual` is set if the execution tokens in the header are doubles. Double execution tokens are used when the Forth runs on a virtual machine hosted by another language.

A double execution token would be a Forth xt and a function pointer in the VM's native language. This would allow the VM to use its native code when the Forth xt is 0, or Forth otherwise. The double-setup is represented by having separate Forth and Native VM groups: Two sets of 2 or 4 cells depending on the Creator flag.

The header structure would pack these bits into the name length byte and fill the rest of the name bytes with the name string. Empty bytes between the end of the string and the next CODE-ALIGNED address would be padded with 0. The rest of the header, at a minimum, would contain: {*compile, execute, \[compile_sem, execute_sem] \[VMcompile, VMexecute, VMcompile_sem, VMexecute_sem]*.
