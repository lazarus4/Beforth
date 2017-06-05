# Forth model proposal
The traditional QUIT loop in Forth uses FIND as part of an outer interpreter. FIND returns a single XT, an execution token that can be used 
for compilation but not in a straightforward way.

There have been a number of means used to provide separate compile and execution semantics. The STATE variable has been one of these.
The outer loop uses STATE to decide whether to compile or interpret. Interpreting is easy: the xt usually points to the execution address. 
Compilation requires some tricks. Some Forths use dual wordlists. That complicates the use of the search order, which limits extensibility 
and ties you to Forth as a language rather than a metalanguage.

When QUIT finds a word, the word's execution semantics or compile semantics should be executed depending on the value of STATE. 
This would make STATE an offset into the word's header structure. FIND would return a "name token", or nt, to point to the header structure. To compile or execute the word, `STATE @ + @ EXECUTE` would handle the nt.

That is very flexible, perhaps returning Forth to its roots as a virtual language. Various kinds of default semantics are used when building a language such ANS Forth. The foundation for the Forth language is then this QUIT metalanguage that you can drill down to as needed. The basic Forth language elements are `:` and `;`. `:` creates a word in header space with "compile me" and "execute me" default semantics. Where do these default semantics come from? How about we make them variables? Where to store them?

Words that create something in a wordlist should have the defaults in their namespace. That makes four cells, pointers to functions, in the 
header of a word: *compile, execute, compile_sem, execute_sem*. 
