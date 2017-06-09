# Beforth
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
A Forth implementation should have a pretty face and be heavily instrumented. After some shopping around, I found a good platform for a Forth: SciTE. Its most important features are:
1. Small memory footprint. That indicates better attention to detail. 2.3MB, single Windows .EXE.
2. Open source, totally free (thanks, Neil!).
3. Re-buildable and debuggable with free (at least "free beer") tools.
4. Multi-platform: Windows, Linux and Mac.
### Option 1
SciTE is a C++ open source text editor. It has a built-in console that can be re-purposed to Forth. It already has a Lua extension whose implementation can be used as a guide for hooking in the Forth implementation. SciTE's extension abstraction layer might be up to the job, or if not then SciTE can be tweaked. SciTE has a long list of supported languages. I might strip those out.

SciTE as a platform is an editor enhancement. The editor has instant access to compiled features such as the cross reference structure, source code hints, statistics, stack pictures, etc. Where do you really do Forth? It's a combination of the command line and the editor. Design top down, implement bottom up. Both sides are open at the same time. The console drills down. The editor builds up. In this case, the editor also keeps things visible so you don't have to keep so many of them in your head. 

Where to put the extra "visible things" is still up in the air. Maybe mouse-over (hover) popups, maybe a separate pane or an extra status bar. 

### Option 2
Visual Studio Code provides a nice extensible editor. It should be possible to have the Forth compile an extension along with your code. Reload that extension, and you have the "evolved editing" features that match your code. Not very real-time. Also, the debugger has a pre-set architecture. It doesn't provide for reverse stepping or bouncing-ball debugging. No, thanks.

## Why Beforth?
Be the Forth. Well okay, the Beforth name could also come from the originator's initials (Brad Eckert), but "Be the Forth" is so much more Zen. It's all about having fun. Forth is supposed to be fun. Programming is supposed to be fun. A Forth system should teach you what good Forth looks like and it should help you easily remember and explore aspects of the system so that your memory only has to be "sharp enough".

Beforth is a public domain Forth under the Unlicense license. This allows the Forth sources to be freely distributed. The load sequence for Beforth is as follows:

1. The Beforth fork of SciTE launches under Windows, Linux or MacOS.
2. Beforth INCLUDEs Beforth.f, the system, which extends a bare bones Forth to a full-featured Forth.

Beforth will use a VM that is conceptually friendly to embedded hardware: Large ROM, small RAM. It will ease compatibility when cross compilers are added to the project.
## Status of project:
Design documents (architecture/) are being worked out.

I was able to build SciTE and its Scintilla platform with the free version of Visual Studio 2017. That's a good sign.

If you have ideas to contribute, contact me and I'll see about getting you on the project. I'm new to Github, but hopefully the project is easy enough to manage.

