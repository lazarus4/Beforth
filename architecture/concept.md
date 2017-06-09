# Beforth – Features

## Preliminary Musings
Now that SciTE is chosen as the platform, some features can be sketched out. The Forth will be implemented as two big blobs of memory and a bytecode VM. The VM executes out of code/data space. Header space is kept separate for caching reasons. To the underlying hardware, VM bytecodes are data. They are also very compact. A significant run of bytecodes can fit in a data cache line. The VM will hopefully all fit in the instruction cache, as it uses a tight little switch statement. 

Beforth should be implemented as a minimal kernel in C, which loads the rest of the system from Forth source as needed. It will use a bytecode VM to execute compiled code. It should be possible to instrument the VM so as to allow single step debugging, undo-style backward stepping, breakpoints, etc. For speed, a subset of JS called asm.js should be used for the VM.

## Wanna-haves
Instrument the hell out of it. Forth itself provides a lot of instrumentation. However, before the Forth has been bootstrapped up, it’s necessary to provide views of what the Forth rides on. This includes hex dumps of various memory spaces and the VM state. Maybe a separate tab or fat status line.

To help with debugging, the VM should be able to accept external commands from other apps (such as a commercial Forth). The communication channel for this can be a Null-modem emulator such as com0com. Code running in the VM can be debugged with a thin-client debugger.

Scite already provides two panes. One pane should support an editor and the other should support the console. There should be a project file that can be loaded with a button click. 

The editor window should be able to handle the single stepping hilighting as a cursor moves over words being executed. Compilation builds up a list of cursor positions and other cross reference items for use by the editor. The editor code tracks the mouse to pop up mouseover text that load up a cross reference pane with things like:

Real-time monitoring of variable value
Words that use this word
Words that this word uses
Source code of the word
Other statistics

A project file is a collection of "includes" and other declarations. The project file is specified along with the directory of the project. A build compiles the project anew or starting at the last gild point.

The cross reference structure can provide a measure of factorization quality of a file by the following metrics: Coupling and Cohesion. These are reference counts divided by the total references.

Coupling: Measure how many references the file makes outside of itself (besides the basic wordsets), and how many different files reference it. These would be two scores.

Cohesion: Measure how many times (above once) that a word references a word in the same file.

The 3-dimensional factorization score could be converted into a single score.

The compiler should export HTML hyperlinked files that you can open in another browser tab.

## Color Schemes
Syntax highlighting
Stack highlighting
Reference highlighting

Cross reference colorization would colorize external references both in and out (different colors), words with a single internal reference, and words that are never referenced.

Stack highlighting uses stack depth tracked by the compiler. 

Syntax highlighting colors words based on their wordset and function. It’s like typical highlighting.

The structure of source code in memory is an array of bytes such as ASCII or UTF8. Each byte has an associated 32-bit pointer to a reference structure. All bytes of blank-delimited string point to a the reference structure for that word. All other character locations have a pointer value of 0. A colorize structures are laid down in header space as needed. They are only referenced by the source code reference pointers. Editing handles source code in 40-bit characters. Inserting and deleting characters moves source code accordingly so that references stay with their words. Modifying a word should wipe its references, since they are no longer valid.

Real-time syntax highlighting is sometimes used to conjure up a dimly remembered keyword. Rather than highlight in real time, build applies the highlights. You can turn autocomplete to show a list of possible words based on the current word at the cursor.

