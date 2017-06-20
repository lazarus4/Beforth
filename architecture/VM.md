# VM

The Beforth VM is a small bytecode interpreter that is equally at home on the desktop and in small embedded systems. The VM and the Forth system are written from the point of view of a small MCU. The essential parts of the runtime system are contained in the VM and optional compiler extensions are added in a way that allows the Forth and the user application to be ported over to an MCU. 

The VM has the following system features:
- 32-bit or 16-bit cell size.
- 16-bit code address units. Used for accessing flash memory.
- 32-bit or 16-bit data address units. Used for accessing SRAM.
- Endian-agnostic: Byte order determined by the host.

## VM memory model
The VM is written in JavaScript using typed arrays. The main part of the VM is a large switch statement that's portable to C. 
The VM is meant to be simple enough to port to anything, including VHDL/Verilog.
```
var CM = new Int16Array(codeMemSize); // Code space  
var DM = new Int32Array(dataMemSize); // Data space
var RM = new Int32Array(regsMemSize); // Registers for VM
```
The fetch and store primitives may implement the address ranges that your hardware prefers. For example, if code starts at 0x8000 in your real life MCU, address 0x8000 maps to CM[0].

The *undo* buffer packs address and data space into a single 32-bit token for undo operations. The upper two MSBs are the type bits: {CM, DM, RM, spare}. The single stepper/unstepper uses a 16-byte undo structure {flags, token, old, new}. The token for program counter (PC), for example, could be RM[0]. The VM registers are:

- RM[0] = `PC` program counter.
- RM[1] = `FLAGS` carry-out flag from +. May contain other flags.
- RM[2] = `T0` top of data stack.
- RM[3] = `T1` aux top of data stack.
- RM[4] = `UP` user pointer.
- RM[5] = `SP` data stack pointer.
- RM[6] = `RP` return stack pointer.

Execution tokens, for example used by `EXECUTE ( xt -- )`, are either VM opcodes or addresses in code space. EXECUTE treates negative numbers as VM opcodes. For example, the EXECUTE instruction does a 1s complement negate (~xt) to get the opcode to execute. An xt of -1 executes opcode 0.

The way memory is used is central to the VM. The UP register points to a Task Control Block (TCB), a small buffer in RAM that's used by a round-robin cooperative multitasker.
![Stacks Illustration](https://github.com/lazarus4/Beforth/raw/master/architecture/stacks_01.png)
The first USER variable of the task is FOLLOWER. FOLLOWER is placed first because it's a data address, which is a negative number. If the return stack underflows, the negative return address generates an exception in the VM. The USER variables in task space are:
- Follower: address of the next task's status 
- Status: xt of word that resumes this task 
- RP0: initial return stack pointer      
- SP0: initial data stack pointer        
- TOS: -> top of saved stack                   
- Handler: catch/throw handler     

Octet handling is not the VM's job. In hardware, there's no reason for C@ etc. That's a software thing. Implement your own byte space. Using bytes for flags is a common shortcut. Use ON and OFF to manage bits in a bit space. SRAM isn't cheap.

## VM metal
Stacks are kept in data memory. Stack pointers are registers. The top of the data stack is in a register, as with most classic Forths. Other registers are SP, RP and UP. In a hardware implementation, stack operations take one clock cycle because data memory is rather small: a few kB. The CPU would be a Harvard machine. The cost for this is extra time for memory access operations: Two clocks instead of one. Fetch using T as the address would be single cycle. Store using A as the address would be two cycles: Store and pop. Return stack access would be two-cycle due to dual push/pop. The main rationale for the classic stack setup is easy context switching in multitasking.

16-bit instructions strike a good balance between size and speed. The VM uses a tight loop that fetches the next 16-bit instruction from CM and executes it. The instruction encoding allows for compact calls and jumps. Taking a hardware-friendly view of the VM, the four MSBs of the instruction are decoded into four instruction groups:

- 000s = opcode: k2/k18 + ret + push + pop + spare + op6 = 2-bit/18-bit optional literal, opcode, push and return bits [1]
- 001s = iopcode: k8/k24 + op4 = opcode with 8-bit/24-bit signed data [2]
- 011s = literal: k12/k28 = 12-bit or 28-bit signed literal
- 100s = jump: k12/k28 = signed PC displacement
- 101s = call: k12/k28 = signed PC displacement
- 110s = ajump: k12/k28 = absolute PC 
- 111s = acall: k12/k28 = absolute PC 

The *s* bit indicates instruction size. If '1', 16-bit immediate data follows. This covers most literals. Extremely large literals can be formed by compiling 28-bit literal and an additional *xlit* opcode (0x2XXX group) to shift in the remaining 4 bits.

\[1]: If the *ret* bit is set, a return is executed with the opcode. With a hardware implementation, the return would be initiated first (PC popped) and then the instruction executed while the branch is in progress. The VM should do it this way. If the *push* bit is set, TOS is pushed onto the data stack (mem[--SP]=TOS) before the instruction is executed. If the *ret* bit is also set, the return will be executed first, then TOS will be pushed, then the instruction will execute. In a hardware implementation, the instruction could write to TOS concurrently. In the case of memory operations, it may be blocked until the TOS is written. If the *pop* bit is set, TOS will be popped from the data stack after the instruction.

The two k bits may be used to address two instances of TOS. k[1]=s, k[0]=d. There are four instances of A.

Opcode coding is:
- 00pppp = Two-input, one-output operation. TOS[d] = func(TOS[s], mem[SP]). func codes p are: {+, &, |, ^, nop, \*+, -, R-}. 
- 01pppp = One-output operation. TOS[d] = func(TOS[s]). func codes p are: {2\*, 2/, u2/, ror, rol, cy@}. 
- 10000p = Fetch from cm[A[k]]. Postincrement A if p='1'.
- 10001p = Store to cm[A[k]]. Postincrement A if p='1'. 
- 10010p = Fetch from dm[A[k]]. Postincrement A if p='1'.
- 10011p = Store to dm[A[k]]. Postincrement A if p='1'. 
- 101xxx = reserved for user.
- 110rrr = TOS[s] to register: {A[d], up, sp, rp, R, push]
- 111rrr = Register to TOS[d]: {A[s], up, sp, rp, R, pop, t, n]

\[2]: There are 16 iopcodes that take immediate data. They are:
- `0` +lit  ( n -- n + k )  Add signed k to TOS[0]. {1+, 1-, CELL+, CHAR+}
- `1` &lit  ( n -- n & k )  Bitwise-and signed k to TOS[0].
- `2` |lit  ( n -- n & k )  Bitwise-or signed k to TOS[0].
- `3` ^lit  ( n -- n & k )  Bitwise-xor signed k to TOS[0]. {INVERT}
- `4` xlit  ( n -- n<<8 + k )  Shift TOS[0] left 8 places and add unsigned k.
- `5` uplit  ( -- a )  Get user variable address UP + k. {UP@, USER variables}
- `6` rplit  ( -- a )  Get local variable address RP + k. {RP@, local variables}
- `7` split  ( -- a )  Get pick address SP + k. {SP@, PICK}
- `8` @lit  ( -- mem[k] )  Fetch cell from data address k into TOS[0].
- `9` @litc  ( -- mem[k] )  Fetch cell from code address k into TOS[0].
- `A` !lit  ( n -- )  Store TOS[0] cell to data address k.
- `B` !litc  ( n -- )  Store TOS[0] cell to code address k.
- `C` 0bran  ( flag -- )  Branch if flag=0 using displacement k into TOS[0].
- `D` next  ( R: n -- n-1 )  Branch if (--R)>=0 using displacement k into TOS[0]. Pop if branch not taken.
- `E` -bran  ( n -- n )  Branch if n<0 using displacement k into TOS[0].
- `F` syscall  ( ? -- ? )  Call Fn[k[23:5] to the underlying system using k[2:0] input and k[4:3] output parameters. 

Syscall functions are in a JS function array. All others are hard coded in the VM.

Multiplication is done with a `*+` step, which is a fractional multiply (multiplier range = 0 to 1).

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

