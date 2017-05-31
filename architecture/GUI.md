# GUI

The GUI has access to all of the browser's graphical capabilities. They should be utilized. Some possible panes are:

1. The console. It's the scrollable text output used by a command line interpreter.
2. Keyboard history.
3. VM registers and stack contents.
4. Graphic window for simulation of embedded system LCDs.
5. A text editor. Off-the-shelf text editor such as ACE (provides Forth syntax hilighting).

There should be a row of buttons for launching special activities. Maybe they could be customizable. Source code should be compiled by one of these buttons (the Build button) or a function key. The project file is expected to select the project directory and build the project. The compiler builds a cross reference structure as it compiles. This would used in conjunction with the internal text editor state to pop up cross reference information as an aid to editing.

Features that are nice to have in a Forth:
- LOCATE 
- EDIT 
- WHERE 
- SEE 
- being able to turn the optimizer off 
- DASM 
- DUMP 
- Single Stepping 
- the system being written in Forth (mostly)

The source file ID is saved in a word's header structure so that it can be viewed easily. In the case of a word with redefinitions, you should be notified if there are multiple instances of the word. The number of instances back should be adjustable in this case so you can skip over the more recent redefinitions. 

Tabs are a popular way to set up HTML pages. Some possible tabs are:
1. Low level debug tab. This single steps through the VM. The left pane is the VM state. The right pane is the source code or a disassembly view. The right pane might not be very smart (as in read-only), but is does highlight the PC position.
2. High level debug tab. This is the Forth view. The left pane is a console. The right pane is the source code.
2. Plug-ins tab. This replaces the editor tab with other views such as graphic window, stack views, keyboard history, etc.

Text editor integration is important to some tabs. ACE provides the following functions:

1. Get the current cursor line and column: `editor.selection.getCursor();` Used to look up a word for setting breakpoints, hyperlinking to definitions, seeing word statistics, disassembling a word, checking word statistics, etc. Redefinitions can be handled by ensuring that neighboring words in the editor make sense.
2. Go to a line: `editor.gotoLine(lineNumber);` Used for hyperlinking.
3. Assign key bindings to a custom function: `editor.commands.addCommand` Used to invoke the above-mentioned cool toys.

A command to hilight text would be a nice-to-have when running the debugger. However, its lack is no problem. It's probably better to not be dependent on advanced features, so the editor can be replaced if necessary.

## Common Layout

The tabs share a common screen that has control buttons and possibly menus across the top. The favicon and page title show up in the browser tab. Within the browser screen, there are tabs along the top. Each tab opens a different HTML page. Each page has a combination of status dialog items and console windows.

## Low Level Debug

In the editor, F4 sets the breakpoint register to the word in the editor. The breakpoint can also be set manually.

F6 steps the VM one instruction.
F5 runs until breakpoint.

The "editor pane" isn't really an editor. It's a view of either the source code or VM assembly or both, converted to HTML and reloaded at each instruction step. So, it could be slow. You *are* running the js on the client side, right? Fortunately, the HTML only spans your browser screen height so it's not too much.

There are three stack displays: Data, Return and Float. The float stack is part of JS so the depth is easy to find. The data and return stacks have depths dependent on SP0 and RP0, which are Forth USER variables. The VM may use them to check for underflow. If UP is 0, SP0 and RP0 are undefined so a fixed number of stack items are displayed. The return stack display attempts to translate stack element values into word names. The VM should be able to cache SP0 and UP0 as registers, refreshing them when UP changes. 

There is aren't many VM registers to display: Program counter (PC), SP, RP, UP and breakpoint (BKP). They could be displayed in an HTML form.

There should be a hex dump and/or watch windows. Both can be displayed in panes. Pane configuration such as format and start address can be set by form elements.

## High Level Debug

The VM view is replaced with a console pane since the VM is now hosting a Forth system. Jquery is a nice console plug-in. It looks like a typical monochrome command line. It also features keyboard history, cut&paste, etc. Not bad. ACCEPT in Forth calls PAUSE until a text line is received from Jquery. An even simpler terminal is *terminal.js*. No keyboard history there.

The editor pane allows editing as well as hyperlinking and hinting. Hints are output to the console. Here's where the ACE editor is used.

## Plug-ins

The editor pane is replaced with a plug-in. 

An example of a plug-in (that I would like) is a simulated LCD screen. Touch screens are quickly becoming part of everyday embedded systems. The LCD (such as TFT 240 x 320) and its touch screen are simulated here. A few buttons should be included: simple on/off flags that the Forth can check. The simulated LCD could double as a graphic terminal if you're not into the embedded scene.

Other plug-ins would be views of the task queue, watch lists, etc.



