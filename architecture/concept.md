# Beforth – A JavaScript-powered Forth Development Environment

## Preliminary Musings
Why JavaScript? It’s available everywhere there’s a browser. Windows, Mac and Linux all support the Chrome browser, for example. Note that JavaScript is like Java about as much as Latinos speak Latin. They’re totally different animals. JavaScript (JS) has loose type checking and a Python-like feel. JS uses a JIT compiler which makes it "about as fast" as C. JIT should be quick for a relatively simple app such as Beforth.

The devil is, as always in the details. Apples to apples comparison of C/Enscripten and JS in real world apps like FFTs show about a 2:1 to 3:1 difference. So, the Emscrypten route is certainly tempting. Possibly perilous, but since it's my duty as a programmer to sample as much peril as possible, that will be explored. It sure would be nice to have a single C-based VM that runs on anything.

Beforth will be a JS-based (kinda-mostly) Forth that supports compilation and execution of Forth. It should be implemented as a minimal kernel in JS, which loads the rest of the system from Forth source as needed. It can use a bytecode VM to execute compiled code. It should be possible to instrument the VM so as to allow single step debugging, undo-style backward stepping, breakpoints, etc. For speed, a subset of JS called asm.js should be used for the VM.

Beforth could be a platform for cross development. Cross development would be an environment that loads and runs on top of Beforth. It only needs local COM port or TCP access, which some browsers support when running JS locally. Such port access should be in the VM.

The system consists of three files loaded in order:

vm.js, the VM. Loaded by JS to define the VM and memory spaces. It loads:
Beforth.js, the compiler. Loaded by JS to define the outer loop. It INCLUDEs:
Beforth.f, the system. Loaded by the outer loop to define the system.
## Development Strategy
There are some jobs to do before actually implementing Beforth. The project will be implemented in JS and hosted in Github. That means:

- Learn the workflow of Github.
- Learn the workflow of JS.
- Work out an IDE layout with split panes, tabs, etc.
- Test the console components that will be needed by Beforth.
- Create tools for instrumenting the VM
- Create the VM
- Create the Forth
- Create the Forth system

Development of the JS can be accomplished with (or without) the help of various IDEs. The JS should be called from within a web page and use the browser API (for example HTML5) to talk to the user interface. It should be possible to double-click on the HTML page in the local file system and have the browser launch it. 

The browser API must have the following capabilities:
Access files.
Access serial ports and/or network sockets.
Implement a console window.

It should also have:
Support for tabs or panes.
Multi-color support.
Refresh of HTML on demand.

The JS development strategy is to instrument the hell out of it. Forth itself provides a lot of instrumentation. However, before the Forth has been bootstrapped up, it’s necessary to provide JS views of what the Forth rides on. This includes hex dumps of various memory spaces and the VM state.

To help with debugging, the VM should be able to accept external commands from other apps (such as a commercial Forth). The communication channel for this can be a Null-modem emulator such as com0com. Code running in the VM can be debugged with a thin-client debugger.

Re-creating the classic Forth console is the first task in developing a user interface. The old "dumb terminal" style keeps the focus on the last-typed lines as well as the last output text. Split the screen into console and text editor HTML views. The views can be refreshed/reloaded as needed. There are multi-pane terminals online, for example https://codepen.io/AndrewBarfield/pen/qEqWMq.

One pane should support an editor and the other should support the console. There should be a project file that can be loaded with a button click. 

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

