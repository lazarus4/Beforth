# Editor Review
The basic platform of Beforth is the text editor. Which editor? So far, I've looked at some C++ based editors. They're pretty impenetrable, outside of their extension APIs which aren't all that powerful. Assuming the text editor will only be extended through its API, here are some possibilities:

## Notepad ++
The API is accessed via a DLL in the plugins directory. On startup, NP++ scans the DLLs to see what's available. For developing, a plugin DLL, check out http://docs.notepad-plus-plus.org/index.php?title=Plugin_Development. Upside: Easy templates for getting started making Visual Studio C++ DLLs. 

### Experiments:
VS2017 compiles the sample DLL project successfully and NP++ performs as advertized.

Key mapping is very easy. You can tell NP++ to perform functions in the DLL upon key/mouse events.

There is no console. The DLL can open a console (okay), but if you close it NP++ also closes. A docked dialog is possible to use as a console. How to resize dialog items to fit the box? I don't think a static RC can do that. This is getting tough.

## SciTE
SciTE has a console, apparently a second instance of Scintilla. Cool. However, to hack SciTE requires C++ expertise and a lot of drilling into the source code. Just using the extension API doesn't provide the extra status bar, for example.

### Experiments:
VS2017 compiles Scintilla and SciTE successfully. After a few hours, I decided to stop hurting my brain. Reverse engineering SciTE is tough. 

## ACE
The ACE programming editor is great for code. It can't be too bad since I'm using it right now in Github. The API is sufficient for hilighting during single stepping. It can be integrated into any JS. 

### Experiments:
The Git repository easily downloaded to my PC. The sample editor scripts (html) opened in my browser just fine. I edited the sample to load Forth syntax hilighting.

The IE browser has no problem opening local files: launch ACE, read the file into a var, and load the var into ACE. 
