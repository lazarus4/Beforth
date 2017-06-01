# VM

The Beforth VM is a small bytecode interpreter that is equally at home on the desktop and in small embedded systems. The VM and the Forth system are written from the point of view of a small MCU. The essential parts of the runtime system are contained in the VM and optional compiler extensions are added in a way that allows the Forth and the user application to be ported over to an MCU. 

The VM has the following system features:
- 32-bit cell size.
- 8-bit address units.
- Switchable between little-endian (default) and big-endian.
- Separate floating point stack. Floating point is optional.
- Restricted to operations that can be expressed in both JS and C. This affects 64-bit math.

## VM memory model
The VM’s code space contains only code and read-only data. Data space is separate. Code space is assumed to be readable, but writable only under certain conditions. The CDATA and UDATA descriptors switch between the two when the application is compiling data to the dictionary. RAM is initialized to all zeros at startup. IDATA is just as well avoided. If you want data initialized, you can just as easily do it yourself.

Fetch is a different operation depending on the address space. Code space may be internal or external flash, for example. There are two ways to handle this. One way is to have a smart fetch. The upper bits of the address determine where to read from. The other way is to provide separate words for the two kinds of fetch. There should be an option to use either smart or dumb fetch when compiling. System code can use either. User code has the option of using one or the other depending on an option setting. For example, legacy code might use @ to fetch from code space. That needs a smart fetch. But, new code could use @C to fetch from code space to allow a simpler @. ANS compatibility would be facilitated by `: @C @ ;`.

Header space is used by the compiler, which is written in JS to facilitate loading of Forth. Header space needs to be accessible by the VM so that it can take over compilation duties as the system grows. The use of header space by the VM is optional. In the simplest configuration, the VM doesn't touch this space.

Implementing the VM in JavaScript, the memory spaces are declared as Typed array. Native array is about the same, but there's no guarantee that native is 32-bit. DataView is very slow: Do not use. CM and DM are code and data memories respectively. For example:

```
var arraySize = 65536;
var DM = new Int32Array(4 * arraySize);           // data memory is cells 
var CM = new Int8Array(arraySize);                // code memory is bytes 
```
Memory transfer widths other than the declared memory types are handled by shift-and-mask code. Code activity is mostly bytes, data activity is mostly cells. Thus the different data types. The VM should complain about address misalignment.

The code and data address spaces don’t overlap even though in the smart fetch case they could. Literals are signed, so we want addresses to have small absolute values. In hex, the address ranges could be:

- `00000000` to `00FFFFFF`	Code space, start address is 0.
- `80000000` to `80FFFFFF`	Header space.
- `FF000000` to `FFFFFFFF`	Data space, start address is (-DM.length). Use a DM size that's a power of 2.
- `FE000000` to `FE0000FF`	VM registers (PC, SP, RP, etc.)
- `FD000000` to `FDFFFFFF`	I/O space (could be used by VM in embedded systems)

The single stepper uses these addresses as tokens. The program counter (PC), for example, could be VMreg[0].

Execution tokens, for example used by `EXECUTE ( xt -- )`, are either VM bytecodes or addresses in code space. EXECUTE treates negative numbers as VM bytecodes. For example, the EXECUTE instruction does a 1s complement negate (~xt) to get the bytecode to execute. An xt of -1 executes bytecode 0.

Data space is sized as a power of 2 to allow easy translation of small negative numbers to an index range that starts at 0. For example:

- Declare the size mask: `var maskDM = 0xFFFF;` The JIT compiler should understand that this is a constant.
- Store to the SP (SP!): `SP = vmPop() & maskDM;` Strips the upper bits 
- Fetch from the SP (SP@): `vmPush(SP | (~maskDM));` Restores the upper bits 

The way memory is used is central to the VM. The UP register points to a Task Control Block (TCB), a small buffer in RAM that's used by a round-robin cooperative multitasker.
![Stacks Illustration](https://github.com/lazarus4/Beforth/raw/master/architecture/stacks_01.png)
The first USER variable of the task is FOLLOWER. FOLLOWER is placed first because it's a data address, which is a negative number. If the return stack underflows, the negative return address generates an exception in the VM. The USER variables in task space are:
- Follower: address of the next task's status 
- Status: xt of word that resumes this task 
- RP0: initial return stack pointer      
- SP0: initial data stack pointer        
- TOS: -> top of saved stack                   
- Handler: catch/throw handler               

## VM metal
Stacks are kept in data memory. Stack pointers are registers. The top of the data stack is in a register, as with most classic Forths. Other registers are SP, RP and UP. 

The VM uses a tight loop that fetches the next 8-bit instruction and executes it. Some ideas for execution::

1. Use a switch statement to dispatch a command byte. Each case terminates in a “goto next”, where the goto destination is declared with “[lbl] next”.
2. Use a function table whose index is the command byte. An execution table, in other words.
3. Use a combination of these: the switch’s default goes to an execution table. 

For the sake of simplicity, speed and flexibility in opcode assignment, option 1 is used. Tokens that take immediate data (a variable length byte sequence following the opcode) are grouped together so that the disassembler easily knows whether or not to display immediate data. Extended opcodes are in the F0-FF range, as per Openboot tradition. These take the lower eight bits of the opcode from the next byte in the byte stream. They're typically used for words you might not find in an embedded system, such as file access and floating point words. These 256-byte pages can be decoded by separate switch statements.

Rather than have an explosion in the number of opcodes needed to handle small, medium and large literals, a variable length literal is used by most literal-using opcodes. The first byte (byte[0]) of a literal consists of a 3-bit type and a 5-bit k value. The types are decoded as follows:

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

Rather than taking the classic approach of `: * UM* DROP ;`, the VM provides a single \* primitive and expects things like UM\* and M\* to be defined in Forth. Note that /\* is a primitive. JS will use the FPU to execute it. UM\* isn't so tough: Use \* four times to multiply 16-bit numbers and merge the results. This means that scaling tricks like `scaleVal M* NIP` will be slower, not faster, than `scaleVal 65536 */`. Note that in the latter case, 65536 is a power of 2 so the optimizer (or you) could optimize out the division if needed.

UM/MOD is not a VM primitive. Numeric conversion uses a bignum-like primitive that uses an 8-bit divisor and 64-bit dividend.

## Opcode map
The opcodes range from 00 to FF. To group them by their immediate data usage:
- 00 to n-1 = No immediate data used.
- n to m-1 = Smart immediate literal is used.
- m to FF = Unsigned 8-bit literal is used.

Let n and m be defined by `FirstSmartImmediate = 0x80` and `FirstByteImmediate = 0xE0` in the JS. The optimal values depend on how the opcode map fills out as instructions are added to the VM.

The N range includes CALL, JUMP, 0JUMP, +LIT, ANDLIT, etc.

The M range includes VMFUNC, PAGE0, PAGE1, etc. PAGEn is a range of extended opcodes. VMFUNC is a shared JS/Forth DEFERed word. There can be up to 256 of these. Their default action is JS, but they can be directed use to Forth by the opcode `REDIRECT ( xt fn# -- )`. The JS behavior can be restored with `UNDIRECT ( fn# -- )`.

## Usage
The basic Forth system is designed as a kernel that can run stand-alone in an embedded system. In other words, the code image compiled by the JS can conceivably be copied over to a static ROM image and run in an embedded system. The VM is simple enough to port to the embedded system, so it doesn't need any JS. Essentially, Beforth is an embedded system simulator with the cross compiler written in JS.

The console is by default used by the JS interpreter. The interpreter behaves in different ways depending on the context. 

- In low level debugging, it directly controls the VM by bookmarking the return stack, calling the word to execute, and stepping the VM until the return stack is empty (or blown).
- In high level debugging, it sends commands to the VM's COMMAND task (a thin client) through a real or simulated communication channel.
- In stand-alone mode, the VM has copied header information into its code space (of just accesses the host's header space) and has its own CLI. The terminal sends straight text, behaving like a dumb terminal.

## Single Stepping
The VM should have reversible single stepping, letting you step backwards through execution. When a VM run-time error occurs, such as accessing undefined memory or underflowing/overflowing a stack, you can step backwards in the execution thread to see where it went wrong.

Undo would be handled by a doubly linked list of data structures containing old and new values and a “register ID”, which means all components of the VM should be defined in array. This list could be built in a big chunk of allocated RAM. When it gets to the end of that space, it wraps to the beginning. It removes the oldest elements to make space for new elements. Since JS doesn't do explicit allocation, the list can be handled by the JS and the deleted elements reclaimed by GC.

The VM has the option of weak or strong error checking. Strong error checking would perform more checks at each instruction step. The VM restricts write activity to code space by providing an optional run-time check.




