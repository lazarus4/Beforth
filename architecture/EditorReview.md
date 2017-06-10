# Editor Review
The basic platform of Beforth is the text editor. Which editor? So far, I've looked at some C++ based editors. They're pretty impenetrable, outside of their extension APIs which aren't all that powerful. Assuming the text editor will only be extended through its API, here are some possibilities:

## Notepad ++
The API is accessed via a DLL in the plugins directory. On startup, NP++ scans the DLLs to see what's available. For developing, a plugin DLL, check out http://docs.notepad-plus-plus.org/index.php?title=Plugin_Development. Upside: Easy templates for getting started making Visual Studio C++ DLLs. This seems to be the path of least integration pain.

### Experiments:
VS2017 compiles the sample DLL project successfully and NP++ performs as advertized.

Key mapping is very easy. You can tell NP++ to perform functions in the DLL upon key/mouse events.

### Strategy:

Getting the cwd for the project:
- A menu item captures and saves the cwd of the current file.
- A menu item pops up an alert showing the cwd (project directory).

Upon launch, do the following:
- Allocate memory for the VM.
- Initialize the VM and run it in in a new thread.
- Set the cwd for the Forth project.
- Open a docked dialog window in NP++ for the terminal pane.
- Load the build.f file from that working directory.

At shutdown:
- Close the docked dialog box.
- Kill the VM thread.
- Free the memory.

## ACE
The ACE programming editor is great for code. It has a good syntax hilighting syntax. The API is sufficient for single stepping. It can be integrated into any JS. However, the VM would have be expressed in C. Ignoring Emscripten, which translates C to asm.js but can't make 64-bit integer math native.

