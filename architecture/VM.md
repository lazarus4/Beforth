# VM
The VM has the option of weak or strong error checking. It may also perform single stepping. The internal state of the VM should be viewable during single stepping. An undo should be able to step backwards through execution.

Undo would be handled by a doubly linked list of data structures containing old and new values and a “register ID”, which means all components of the VM should be defined in array. This list could be built in a big chunk of allocated RAM. When it gets to the end of that space, it wraps to the beginning. It removes the oldest elements to make space for new elements. Since JS doesn't do explicit allocation, the list can be handled by the JS and the deleted elements reclaimed by GC.

When a VM run-time error occurs, such as accessing undefined memory or underflowing/overflowing a stack, you can step backwards in the execution thread to see where it went wrong.

The VM’s code space contains only code and read-only data. Data space is separate. The CDATA and UDATA descriptors switch between the two when the application is compiling data to the dictionary.

## VM memory model
Code space is assumed to be readable, but writable only under certain conditions. The VM restricts write activity by providing an optional stop condition for debugging.

RAM is initialized to all zeros at startup. IDATA is just as well avoided. If you want data initialized, you can just as easily do it yourself.

Fetch is a different operation depending on the address space. Code space may be internal or external flash, for example. There are two ways to handle this. One way is to have a smart fetch. The upper bits of the address determine where to read from. The other way is to provide separate words for the two kinds of fetch. There should be an option to use either smart or dumb fetch when compiling. System code can use either. User code has the option of using one or the other depending on an option setting. For example, legacy code might use @ to fetch from code space. That needs a smart fetch. But, new code could use @C to fetch from code space to allow a simpler @. ANS compatibility would be facilitated by `: @C @ ;`.

Implementing the VM in JavaScript, the memory spaces are declared as Typed array. Native array is about the same, but there's no guarantee that native is 32-bit. DataView is very slow: Do not use. CM and DM are code and data memories respectively. For example:

```
var arraySize = 10000;
var DM = new Int32Array(4 * arraySize);           // data memory is cells 
var CM = new Int8Array(arraySize);                // code memory is bytes 
```
Memory transfer widths other than the declared memory types are handled by shift-and-mask code. Code activity is mostly bytes, data activity is mostly cells. Thus the different data types. The VM should complain about address misalignment.

The code and data address spaces don’t overlap even though in the smart fetch case they could. Literals are signed, so we want addresses to have small absolute values. In hex, the address ranges could be:

- `00000000` to `00FFFFFF`	Code space, start address is 0.
- `FF000000` to `FFFFFFFF`	Data space, start address is (-DM.length)
- `FE000000` to `FE0000FF`	VM registers (PC, SP, RP, etc.)
- `FD000000` to `FDFFFFFF`	I/O space (could be used by VM in embedded systems)

The single stepper uses these addresses as tokens. The program counter (PC), for example, could be VMreg[0].

## VM metal
Stacks are kept in data memory. Stack pointers are registers. The top of the data stack is in a register, as with most classic Forths. Other registers are SP, RP and UP. 

The VM uses a tight loop that fetches the next 8-bit instruction and executes it. Some ideas for execution::

1. Use a switch statement to dispatch a command byte. Each case terminates in a “goto next”, where the goto destination is declared with “[lbl] next”.
2. Use a function table whose index is the command byte. An execution table, in other words.
3. Use a combination of these: the switch’s default goes to an execution table. 

For the sake of simplicity, speed and flexibility in opcode assignment, option 1 is used. Tokens that take immediate data (a variable length byte sequence following the opcode) are placed at the end of the (00-EF) range so that the disassembler easily knows whether or not to display it. Extended opcodes are in the F0-FF range, as per Openboot tradition. These take the lower eight bits of the opcode from the next byte in the byte stream. They're typically used for words you might not find in an embedded system, such as file access and floating point words. These 256-byte pages can be decoded by separate switch statements.

Rather than have an explosion in the number of opcodes needed to handle small, medium and large literals, only one kind of literal is supported: Variable length. The first byte (byte[0]) of a literal consists of a 3-bit type and a 5-bit k value. The types are decoded as follows:

0. N = k (signed) 
1. N = k (unsigned)
2. N = k<<8 + byte[1] (signed)
3. N = k<<8 + byte[1] (unsigned)
4. N = k<<16 + byte[1]<<8 + byte[2] (signed)
5. N = k<<16 + byte[1]<<8 + byte[2] (unsigned)
6. N = k<<24 + byte[1]<<16 + byte[2]<<8 + byte[3] (signed)
7. N = byte[1]<<24 + byte[2]<<16 + byte[3]<<8 + byte[4]

This scheme should decode nicely with a switch statement and some byte-oriented moves. The compiler chooses the lowest type ID that fits the number. The sizes and ranges of the types are:

0. 1 byte, -16 to +15
1. 1 byte, 0 to +31
2. 2 bytes, -4096 to +4095
3. 2 bytes, 0 to 8191
4. 3 bytes, -1048576 to +1048575
5. 3 bytes, 0 to +2097151
6. 4 bytes, -268435456 to +268435455
7. 5 bytes, -2147483648 to +2147483647

DEFERed words shared by JS and Forth should call a JS function that has default JS and Forth usages. An array of deferFn[] elements would be a handy place to keep such DEFERed words. Each deferFn would have a JS function and a Forth address. An address of 0 causes the JS function to be used. Otherwise, a call is made to the Forth address.

Implementing double precision arithmetic such as UM/MOD and UM\* will require some finesse, since JavaScript doesn't do 64-bit integers. First, the operands are checked to see if they fit a 32-bit operation. If not, things get done the "slow" way. Multiply is done using four 16\*16 operations. Divide is done using either shift-and-subtract or several 32/16 divides.

