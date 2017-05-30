# GUI

The GUI has access to all of the browser's graphical capabilities. They should be utilized. Some possible panes are:

1. The console. It's the scrollable text output used by a command line interpreter.
2. Keyboard history.
3. VM registers and stack contents.
4. Graphic window for simulation of embedded system LCDs.
5. A text editor. Off-the-shelf text editor such as ACE (provides Forth syntax hilighting).

There should be a row of buttons for launching special activities. Maybe they could be customizable. Source code should be compiled by one of these buttons (the Build button) or a function key. The project file is expected to select the project directory and build the project. The compiler builds a cross reference structure as it compiles. This would used in conjunction with the internal text editor state to pop up cross reference information as an aid to editing.

The source file ID is saved in a word's header structure so that it can be viewed easily. In the case of a word with redefinitions, you should be notified if there are multiple instances of the word. The number of instances back should be adjustable in this case so you can skip over the more recent redefinitions. 

Tabs are a popular way to set up HTML pages. Some possible tabs are:
1. Low level debug tab. This single steps through the VM. The left pane is the VM state. The right pane is the source code or a disassembly view. The right pane might not be very smart (as in read-only), but is does highlight the PC position.
2. High level debug tab. This is the Forth view. The left pane is a console. The right pane is the source code.
2. Extra console tab. This replaces the editor tab with other views such as graphic window, stack views, keyboard history, etc.

Text editor integration is important to some tabs. ACE provides the following functions:

1. Get the current cursor line and column: `editor.selection.getCursor();` Used to look up a word for setting breakpoints, hyperlinking to definitions, seeing word statistics, disassembling a word, checking word statistics, etc. Redefinitions can be handled by ensuring that neighboring words in the editor make sense.

2. Assign key bindings to a custom function: `editor.commands.addCommand` Used to invoke the above-mentioned cool toys.

A command to hilight text would be a nice-to-have when running the debugger. However, its lack is no problem. It's probably better to not be dependent on advanced features, so the editor can be replaced if necessary.

## Common Layout

The tabs share a common screen that has control buttons and possibly menus across the top. The favicon and page title show up in the browser tab. Within the browser screen, there are tabs along the top. Each tab opens a different HTML page. Each page has a combination of status dialog items and console windows.

# Low Level Debug

In the editor, F4 sets the breakpoint register to the word in the editor. The breakpoint can also be set manually.

F6 steps the VM one instruction.
F5 runs until breakpoint.

There are three stack displays: Data, Return and Float. The float stack is part of JS so the depth is easy to find. The data and return stacks have depths dependent on SP0 and RP0, which are registers in the VM (or fixed data memory locations) instead of Forth USER variables. The VM uses them to check for underflow. The return stack display attempts to translate stack element values into word names.

There is aren't many VM registers to display: Program counter (PC) and breakpoint (BKP). They are displayed in an HTML form.

There should be a hex dump and/or watch windows. Both can be displayed in panes. Pane configuration such as format and start address can be set by form elements.

