# Editor Review
The basic platform of Beforth is the text editor. Which editor? So far, I've looked at some C++ based editors. They're pretty impenetrable, outside of their extension APIs which aren't all that powerful. Assuming the text editor will only be extended through its API, here are some possibilities:

## ACE
The ACE programming editor is great for code. It has a good syntax hilighting syntax. The API is sufficient for single stepping. It can be integrated into any JS.

## Notepad ++
The API is accessed via a DLL in the plugins directory. On startup, NP++ scans the DLLs to see what's available. For developing, a plugin DLL, check out http://docs.notepad-plus-plus.org/index.php?title=Plugin_Development.


