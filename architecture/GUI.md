# GUI

The GUI would be an extension of SciTE. Some possible panes are:

1. The console. It's the scrollable text output used by a command line interpreter.
2. Keyboard history.
3. VM registers and stack contents.
4. Graphic window for simulation of embedded system LCDs.
5. A text editor. Off-the-shelf text editor such as ACE (provides Forth syntax hilighting).
6. Search order, Base and connection status.

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

## Low Level Debug

The VM should have a breakpoint register that invokes a low level debugger window. This dialog box (not a Windows-dependent dialog) is separate from SciTE. The VM will have its own execution thread that spins until the breakpoint is hit. To run until "RET", 0 could be pushed onto the return stack and the VM would run until it pops the 0 as a return address.

The editor pane and debugger status are updated after each step of the debugger.

There are three stack displays: Data, Return and Float. The float stack is part of JS so the depth is easy to find. The data and return stacks have depths dependent on SP0 and RP0, which are Forth USER variables. The VM may use them to check for underflow. If UP is 0, SP0 and RP0 are undefined so a fixed number of stack items are displayed. The return stack display attempts to translate stack element values into word names.  

There is aren't many VM registers to display: Program counter (PC), SP, RP, UP and breakpoint (BKP). They could be displayed in an HTML form.

There should be a hex dump and/or watch windows. Both can be displayed in panes. Pane configuration such as format and start address can be set by form elements.

## High Level Debug

ACCEPT in Forth calls PAUSE until a text line is received from tThe console pane. 

The editor pane allows editing as well as hyperlinking and hinting. Hints may be output to the console so you can collect your hints of interest.

