# VM

The Beforth VM is a small bytecode interpreter that is equally at home on the desktop and in small embedded systems. The VM and the Forth system are written from the point of view of a small MCU. The essential parts of the runtime system are contained in the VM and optional compiler extensions are added in a way that allows the Forth and the user application to be ported over to an MCU. 

The VM has the following system features:
- 32-bit cell size.
- 8-bit address units.
- Switchable between little-endian (default) and big-endian.
- Separate floating point stack. Floating point is optional.

## VM memory model
Header space is used by the compiler, which is written in JS to facilitate loading of Forth. Header space needs to be accessible by the VM so that it can take over compilation duties as the system grows. The use of header space by the VM is optional. In the simplest configuration, the VM doesn't touch this space.

The VM is written in JavaScript using typed arrays.
```
var HM = new Int32Array(headMemSize); // Header space
var CM = new Int16Array(codeMemSize); // Code space  
var DM = new Int32Array(dataMemSize); // Data space
var RM = new Int32Array(regsMemSize); // Registers for VM
```
Literals are signed, so we want addresses to have small absolute values. In hex, the address ranges could be:

- `00000000` to `00FFFFFF`	Code space, start address is 0.
- `FF000000` to `FFFFFFFF`	Data space, start address is (-DM.length). Use a DM size that's a power of 2.
- `FE000000` to `FE0000FF`	VM registers (PC, SP, RP, etc.)
- `FD000000` to `FDFFFFFF`	Header space.

The single stepper uses these addresses as tokens. The program counter (PC), for example, could be RM[0].

Execution tokens, for example used by `EXECUTE ( xt -- )`, are either VM bytecodes or addresses in code space. EXECUTE treates negative numbers as VM bytecodes. For example, the EXECUTE instruction does a 1s complement negate (~xt) to get the bytecode to execute. An xt of -1 executes bytecode 0.

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

16-bit instructions strike a good balance between size and speed. The VM uses a tight loop that fetches the next 16-bit instruction from CM and executes it. The instruction encoding allows for compact calls and jumps. Taking a hardware-friendly view of the VM, the four MSBs of the instruction are decoded into four instruction groups:

- 000s = opcode: k4/k20 + op6 + def + ret = 4-bit/20-bit optional literal, 6-bit opcode, deferred and return bits [1]
- 001s = opcode: k7/k23 + op5 = opcode with 7-bit/23-bit signed data [2]
- 011s = literal: k12/k28 = 12-bit or 28-bit signed literal
- 100s = jump: k12/k28 = signed PC displacement
- 101s = call: k12/k28 = signed PC displacement
- 110s = ajump: k12/k28 = absolute PC 
- 111s = acall: k12/k28 = absolute PC 

The *s* bit indicates instruction size. If '1', 16-bit immediate data follows. This covers most literals. Extremely large literals can be formed by compiling 28-bit literal and an additional *xlit* opcode (0x2XXX group) to shift in the remaining 4 bits.

\[1]: The opcode should use k in a hardware-friendly way. If the return bit is set, a RET is executed after the opcode. The deferred bit selects the opcode set. There are two 64-code sets. Set[0] is a group of 64 JavaScript functions. Set[1] is a group of 64 deferred functions that have a default JS function that executes when the Forth semantics are undefined.

\[2]: There are 16 common opcodes that take immediate data.
- xlit  ( n -- n\*16 + k )  Shift TOS left 4 places and add 4-bit unsigned k.
- +lit  ( n -- n + k )  Add signed k to TOS. {1+, 1-, CELL+, CHAR+}
- &lit  ( n -- n & k )  Bitwise-and signed k to TOS.
- |lit  ( n -- n & k )  Bitwise-or signed k to TOS.
- ^lit  ( n -- n & k )  Bitwise-xor signed k to TOS. {INVERT}
- uplit  ( -- a )  Get user variable address UP + k. {UP@}
- rplit  ( -- a )  Get local variable address RP + k. {RP@}
- split  ( -- a )  Get pick address SP + k. {SP@}
- @lit  ( -- mem[k] )  Fetch cell from memory address k.
- c@lit  ( -- mem[k] )  Fetch byte from memory address k.
- w@lit  ( -- mem[k] )  Fetch 16-bit from memory address k.
- !lit  ( n -- )  Store cell to memory address k.
- c!lit  ( n -- )  Store byte to memory address k.
- w!lit  ( n -- )  Store 16-bit to memory address k.

Some ideas for execution of opcodes:

1. Use a switch statement. Each case terminates in a “goto next”, where the goto destination is declared with “[lbl] next”.
2. Use a function table. 

Since the opcode functions should be accessible through the JS debug terminal, option 2 is the way to go.

DEFERed words shared by C and Forth should call a C function that has default C and Forth usages. An array of deferFn[] elements would be a handy place to keep such DEFERed words. Each deferFn would have a C function and a Forth address. An address of 0 causes the C function to be used. Otherwise, a call is made to the Forth address. 

- `REDIRECT ( xt fn# -- )` Redirect deferred fn# (0 to 63) to use Forth word instead.
- `UNDIRECT ( fn# -- )` Restore JS functionality.

Implementing double precision arithmetic such as UM/MOD and UM\* will require some finesse, since JavaScript doesn't do 64-bit integers. First, the operands are checked to see if they fit a 32-bit operation. If not, things get done the "slow" way. Multiply is done using four 16\*16 operations. Divide is done using either shift-and-subtract or several 32/16 divides.

Rather than taking the classic approach of `: * UM* DROP ;`, the VM provides a single \* primitive and expects things like UM\* and M\* to be defined in Forth. Note that /\* is a primitive. JS will use the FPU to execute it. UM\* isn't so tough: Use \* four times to multiply 16-bit numbers and merge the results. This means that scaling tricks like `scaleVal M* NIP` will be slower, not faster, than `scaleVal 65536 */`. A more useful word for scaling would be `.*`, fractional multiply, the equivalent of `: .* ( n1 -- n2 ) M* D2* D2* NIP ;`. The scale value would be between -2 and +2.

UM/MOD is not a VM primitive. Numeric conversion could use a bignum-like primitive that uses an 8-bit divisor and 64-bit dividend.

## Usage
The basic Forth system is designed as a kernel that can run stand-alone in an embedded system. In other words, the code image compiled by the C can conceivably be copied over to a static ROM image and run in an embedded system. The VM is simple enough to port to the embedded system, so it doesn't need any C. Essentially, Beforth is an embedded system simulator with the cross compiler written in C.

The console is by default used by the C interpreter. The interpreter behaves in different ways depending on the context. 

- In low level debugging, it directly controls the VM by bookmarking the return stack, calling the word to execute, and stepping the VM until the return stack is empty (or blown).
- In high level debugging, it sends commands to the VM's COMMAND task (a thin client) through a real or simulated communication channel.
- In stand-alone mode, the VM has copied header information into its code space (of just accesses the host's header space) and has its own CLI. The terminal sends straight text, behaving like a dumb terminal.

## Single Stepping
The VM should have reversible single stepping, letting you step backwards through execution. When a VM run-time error occurs, such as accessing undefined memory or underflowing/overflowing a stack, you can step backwards in the execution thread to see where it went wrong.

Undo would be handled by a doubly linked list of data structures containing old and new values and a “register ID”, which means all components of the VM should be defined in array. This list could be built in a big chunk of allocated RAM. When it gets to the end of that space, it wraps to the beginning. It removes the oldest elements to make space for new elements. Since C doesn't do explicit allocation, the list can be handled by the C and the deleted elements reclaimed by GC.

The VM has the option of weak or strong error checking. Strong error checking would perform more checks at each instruction step. The VM restricts write activity to code space by providing an optional run-time check.

