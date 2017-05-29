# Beforth
## About Forth
Forth, the computer language, was created for programming embedded and real-time applications. It was also used widely in the 80s and 90s to create desktop applications. Today, a small number of Forth experts still use it in embedded systems, with great results in terms of productivity and product quality. In today's era of code bloat, the "Keep It Simple" philosophy is more important than ever.

Forth is a language for building languages. You should end up with a Forth-flavored language that fits the application domain. 

The lexicon of words you build is there to: 
1. Minimize information entropy, Shannon's famous H. 
2. Debug the programmer. 
3. Debug the program. 

Experienced programmers have to develop new habits. Not only should you keep functions to less than a page, you should keep them to between 7 and 15 words. This isn't a strict rule, but it has been shown to work well. It goes well with: 

1. Keep it simple. 
2. Test as you go. This is the best way to debug the programmer, since programmers are notoriously buggy. 
3. Crash early and crash often. Like B, but with the humility to actively look for flaws in your reasoning (by getting your hands dirty) instead of assuming you've already thought of the best approach and coded it with minimal bugs. 
## Why Beforth?
Be the Forth. Well okay, the Beforth name could also come from the originator's initials (Brad Eckert), but "Be the Forth" is so much more Zen. It's all about having fun. Forth is supposed to be fun. Programming is supposed to be fun. A Forth system should teach you what good Forth looks like and it should help you easily remember and explore aspects of the system so that your memory only has to be "sharp enough".

A Forth implementation should have a pretty face and be heavily instrumented. This is where JavaScript comes in. Today's browsers have a JIT compiler that approaches the efficiency of C code. They offer platform independence. When the JS is run locally, they allow access to the local file system and serial ports. It's all you need to host a real Forth. 

Beforth is a public domain Forth under the Unlicense license. This allows the JavaScript and Forth sources to be freely distributed. The load sequence for Beforth is as follows:

1. Browser loads vm.js, the VM. It defines the VM and memory spaces. It loads:
2. Beforth.js, the compiler. It defines the interpreter/compiler and user interface. It INCLUDEs:
3. Beforth.f, the system. Loaded by the outer loop to define the system.

Beforth will use a VM that is conceptually friendly to embedded hardware: Large ROM, small RAM. It will ease compatibility when cross compilers are added to the project.
## Status of project:
Design documents (LibreOffice ODT format) are being worked out. 
