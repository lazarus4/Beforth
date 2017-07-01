# Beforth
## Status: preliminary
- Have an IDE window with multiple panes. 
- Memory model is set up for a VM and header structures.
- Search order, find and add-header are working.
- Don't yet have a VM.
## Running beForth
1. Download the archive and unzip it to a local folder on your computer. 
2. Launch beForth.html in a web browser.
### To Do
- Handle keyboard input (beKey.js)
- Allow switching between Forth and JS input
- Implement the interpreters
- Implement the VM
## Rationale
Beforth is an ANS-like (maybe ANS compliant) Forth for embedded systems development. I want a good tool that I can give away.

## About Forth
Forth, the computer language, was created for programming embedded and real-time applications. It was also used widely in the 80s and 90s to create desktop applications. Today, a small number of Forth experts still use it in embedded systems, with great results in terms of productivity and product quality. In today's era of code bloat, the "Keep It Simple" philosophy is more important than ever. Computer programming as an art form still matters. Forth holds a unique position in *KISS* space.

Forth is a language for building languages. You should end up with a Forth-flavored language that fits the application domain. 

The lexicon of words you build is there to: 
1. Minimize information entropy, Shannon's famous H. 
2. Debug the programmer. 
3. Debug the program. 

Experienced programmers have to develop new habits. Not only should you keep functions to less than a page, you should keep them to between 7 and 15 words. This isn't a strict rule, but it has been shown to work well. It goes well with: 

1. Keep it simple. 
2. Test as you go. This is the best way to debug the programmer, since programmers are notoriously buggy. 
3. Crash early and crash often. Like B, but with the humility to actively look for flaws in your reasoning (by getting your hands dirty) instead of assuming you've already thought of the best approach and coded it with minimal bugs. 
## Choosing a platform
A Forth implementation should have a pretty face and be heavily instrumented. Beforth is basically a Forth with integrated editor. It needs to be built on an existing editor. Here's what I ran into shopping around for a platform:

1. SciTE. Found it impenetrable.
2. NotePad++. An add-on DLL was feasible but hacking the GUI was too much.
3. Visual Studio Code. Bloated, and the debugger is not reversible.
4. Web Browser. ACE is a good editor. This breed of cat is overprotective of its sandbox.
5. QT or wxWidgets, cross-platform IDEs. They have a Scintilla editor widget and a terminal widget.

Mostly it's a choice between a difficult sandbox and bloatware. I downloaded wxWidgets and MinGW. wxWidgets spent a good long time compiling and quit with an error. Not awe-inspiring. I tried QT Creator. It created and built an example program. Okay, but where's the executable?

The browser sandbox can be dealt with. It should be easy to import and export tarballs of projects for archival purposes. Maybe later on there can be integration with a repository. Client side Javascript produces pressure for remote file storage, so that should become more prevalent. So, maybe I'll stick with the mean cat for a while.

Option 4 is nice. Search engines answer most questions about the Javascript languages and open source tools (found in jsTools folder). Choosing a terminal was painful. I finally settled on xterm after not getting past scoping problems with JQuery Terminal. So, I have to implement my own buffer editor and history buffer. ACE is good, but not tiny. There are other editors.

## Why Beforth?
Be the Forth. Well okay, the Beforth name could also come from the originator's initials (Brad Eckert), but "Be the Forth" is so much more Zen. It's all about having fun. Forth is supposed to be fun. Programming is supposed to be fun. A Forth system should teach you what good Forth looks like and it should help you easily remember and explore aspects of the system so that your memory only has to be "sharp enough".

Beforth is a public domain Forth under the Unlicense license. This allows the Forth sources to be freely distributed. The load sequence for Beforth is as follows:

1. beForth 
2. Beforth INCLUDEs Beforth.f, the system, which extends a bare bones Forth to a full-featured Forth.

Beforth will use a VM that is conceptually friendly to embedded hardware: Large ROM, small RAM. It will ease compatibility when cross compilers are added to the project.
