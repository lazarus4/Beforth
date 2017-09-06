# VM

The Beforth VM is a small ISS (instruction set simulator) that implements a stack computer. This ISA can be interpreted in real time on an MCU, PC, or gates (VHDL/Verilog). This provides a high semantic density, simple compiler, and reasonably high speed. Fast ISS is a matter of minimizing the complexity of decoding the ISA in software. The essential parts of the runtime system are contained in the VM and optional compiler extensions are added in a way that allows the Forth and the user application to be ported over to an MCU or FPGA. 

The Harvard architecture of the VM uses a block of RAM for data and stack space, and a block of ROM for code space. Running code in an ISS isn't necessarily slow. Depending on the implementation, you can eliminate cache misses. That does a lot to close the gap between it and native bloatware. 

In an FPGA implementation, BRAM would use shallow read and write pipelines to deal with fact that the BRAM is fully synchronous. That causes reads to be delayed, so certain writes must be delayed by one clock cycle to compensate. Use of "early-write" in the BRAM compensates for the write delay. This affords more sophisticated addressing because address logic has almost a whole clock period to settle.

The VM has the following system features:
- 32-bit or 16-bit cell size.
- Byte addressed.
- Little endian.

## VM memory model
The VM is written in JavaScript using typed arrays. 
```
var CM = new Int16Array(codeMemSize); // Code space  
var DM = new Int32Array(dataMemSize); // Data space
var RM = new Int32Array(regsMemSize); // Registers for VM
```
Code fetch and data fetch are different primitives. Code fetch may use external SPI flash for XIP code, for example. In a 16-bit system, there can be up to 64K bytes each of code and data space. Both start at 0.

The *undo* buffer packs address and data space into a single 32-bit token for undo operations. The upper two MSBs are the type bits: {CM, DM, RM, spare}. The single stepper/unstepper uses a 16-byte undo structure {flags, token, old, new}. The token for program counter (PC), for example, could be RM[0]. The VM registers are:

- RM[0] = `PC` program counter.
- RM[1] = `FLAGS` carry-out flag from +. May contain other flags.
- RM[2] = `T` top of data stack.
- RM[3] = `N` next on data stack.
- RM[5] = `UP` user pointer.
- RM[6] = `SP` data stack pointer.
- RM[7] = `RP` return stack pointer.
- RM[8..11] = `A0` to `A3` address registers.

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
Stacks are kept in data memory. Stack pointers are registers. The top of the data stack is in a register, as with most Forths. Other registers are SP, RP and UP. In a hardware implementation, stack operations take one clock cycle because data memory is rather small: a few kB. The CPU is a Harvard machine. The main rationale for the classic stack setup is easy context switching in multitasking.

16-bit instructions strike a good balance between size and speed. An MCU ISS implementation can use 1 or 2 multi-way jumps to decode instructions. The VM uses a tight loop that fetches the next 16-bit instruction from CM and executes it. The instruction encoding allows for compact calls and jumps. Taking a hardware-friendly view of the VM, the four MSBs of the instruction are decoded into eight instruction groups. 

Typical Forth systems are dominated by calls, returns and literals. To facilitate tail recursion, jumps and calls use similar encoding. We want instructions to be dispatched with one switch statement if possible. The jump index should be coded in a Hammond-like way, with wider fields for less-used opcodes. Let bits [3:1] of the opcode describe an opcode group G. Bit [0] is a size bit. The corresponding switch index S should be trivial to compute:

G | group | encoding | S | usage
--- | --- | --- | --- | ---
0 | jump | k12/k28 + 0 | 0 | signed PC displacement
1 | call | k12/k28 + 2 | 1 | signed PC displacement
2 | ajump | k12/k28 + 4 | 2 | absolute PC
3 | acall | k12/k28 + 6 | 3 | absolute PC
4 | literal | k12/k28 + 8 | 4 | 12-bit or 28-bit signed literal
5 | opcode5 | k5/k21 + stack3 + op4 + 10 | 5 + op4 | Up to 48 opcodes
6 | opcode6 | k5/k21 + stack3 + op4 + 12 | 20 + op4 | with optional k data
7 | opcode7 | k5/k21 + stack3 + op4 + 14 | 37 + op4 | and stack operations

The *s* bit indicates instruction size. If '1', 16-bit immediate data follows. This covers most literals. Extremely large literals can be formed by compiling a 28-bit literal and an additional *x#* opcode to shift in the remaining 4 bits.

stack3 | usage
------ | -----
0 | noop
1 | push PC to the return stack (mem[--RP]) before executing the instruction
2 | push T to the return stack (mem[--RP]) before executing the instruction
3 | push N to the data stack (mem[--SP]) before executing the instruction
4 | pop PC from the return stack (mem[RP++]) before executing the instruction
5 | pop PC from the return stack (mem[RP++]) after executing the instruction
6 | pop T from the return stack (mem[RP++]) after executing the instruction
7 | pop N from the data stack (mem[SP++]) after executing the instruction

Disassembly order: ret, pushes, k, opcode, pops

The assembler uses blank delimited tokens to assemble the instructions. Tokens are looked up in a wordlist and executed, or converted to a number. The token names are listed below:

### opcode6 
Opcodes that route k to the ALU and usually store to T:
- `0` **T+K**  Add
- `1` **T&K**  Bitwise AND
- `2` **T|K**  Bitwise OR
- `3` **T^K**  Bitwise XOR
- `4` **K-T**  Subtract
- `5` **T<<K**  Left barrel shift
- `6` **T>>K**  Right barrel shift
- `8` **T\*K**  cell * cell --> cell, truncated.
- `9` **T\*KF**  (cell * cell) >> cellsize --> cell
- `C` **pjump**  PC-relative jump: PC = k - T.
- `D` **0bran**  Branch if T=0 using displacement k.
- `E` **-bran**  Branch if T<0 using displacement k.
- `F` **syscall**  ( ? -- ? )  Call Fn[k[23:5] to the underlying system using k[2:0] input and k[4:3] output parameters. 

Syscall functions are in a host function array. All others are hard coded in the VM.

Multiply is provided in regular and fractional versions. `UM*` can be built from `T*N` and `T*NF` if needed.

pjump is used for computed jumps such as in an unrolled loop or n-way branch. An application may want to decouple itself from address dependencies in the ROM kernel by use of an execution table at a low address. The execution table could contain jumps to kernel words.

### opcode5:
Load T with a data source. Route N to the ALU.

- `0` **T+N** if k[4]=0 else **x#** Shift T left 4 places and add unsigned k[3:0].
- `1` **T&N** if k[4]=0 else **T&A** using A[k[3:0]].
- `2` **T|N** if k[4]=0 else **T|A** using A[k[3:0]].
- `3` **T^N** if k[4]=0 else **T^A** using A[k[3:0]].
- `4` **N-T** if k[4]=0 else **A-T** using A[k[3:0]].
- `5` **T<<N** if k[4]=0 else left shift T once, modified by k (see shift operations)
- `6` **T>>N** if k[4]=0 else right shift T once, modified by k (see shift operations)
- `7` **reg@**  Fetch from register[k]: {a[k[3:0]], up, sp, rp, carry, timer }
- `8` **T\*N** if k[4]=0 else division step, modified by k
- `9` **T\*NF** if k[4]=0 else user coprocessor
- `A` **@u**  fetch from user variable, address UP + k.
- `B` **@r**  fetch from local variable, address RP + k.
- `C` **@s**  fetch from stack, address SP + k. 
- `D` **@sn**  fetch from stack, address SP + k. Also load T to N.
- `E` **@a**  dm[A[k[1:0]]], optional type = k[3:2]: {cell, short, byte, cell}, postinc if k[4]=1.
- `F` **@ac**  cm[A[k[1:0]]], optional type = k[3:2]: {cell, short, byte, cell}, postinc if k[4]=1.

**shift** operations:
- `0` **shl** Left shift T, shift in 0 (2\*)
- `1` **shr** Right shift T, shift in 0 (U2/)
- `2` **rol** Left shift T, shift in MSB
- `3` **asr** Right shift T, shift in MSB (2/)
- `4` **rlc** Left shift T, shift in carry
- `5` **rrc** Right shift T, shift in carry 

### opcode7:
Store T to register/memory.
- `0` 
- `1` 
- `2` 
- `3` 
- `4` 
- `5` 
- `6` 
- `7` **reg!**  Store to register[k]: {A[k[3:0]], up, sp, rp, carry, timer, divisor, dividendL, dividendH} 
- `8` **!u**  store to user variable, address UP + k.
- `9` **!r**  store to local variable, address RP + k.
- `A` **!s**  store to stack, address SP + k.
- `B` 
- `C` 
- `D`   
- `E` **!a**  dm[A[k[1:0]]], optional type = k[3:2]: {cell, short, byte, cell}, postinc if k[4]=1.
- `F` 

Note that you can't store to cm. Code memory storage is an OS function.

## Usage
The basic Forth system is designed as a kernel that can run stand-alone in an embedded system. In other words, the code image compiled by the C can conceivably be copied over to a static ROM image and run in an embedded system. The VM is simple enough to port to the embedded system, so it doesn't need any C. Essentially, Beforth is an embedded system simulator with the cross compiler written in whatever. The C part is a thin client connected to the host through a messaging interface.

The console is by default used by the C interpreter. The interpreter behaves in different ways depending on the context. 

- In low level debugging, it directly controls the VM by bookmarking the return stack, calling the word to execute, and stepping the VM until the return stack is empty (or blown).
- In high level debugging, it sends commands to the VM's COMMAND task (a thin client) through a real or simulated communication channel.
- In stand-alone mode, the VM has copied header information into its code space (of just accesses the host's header space) and has its own CLI. The terminal sends straight text, behaving like a dumb terminal.

In practice, messages should be moved into and out of VM memory by "hardware". A frame buffer in shared memory is accessed by hardware for this purpose. It implements the stream protocol to provide error-corrected messages. Messages can come from the host or other CPUs in the system. Message passing is a way to form a network of CPU nodes as well as a debugging interface. An FPGA can have many instances of the CPU, for example.

## Single Stepping
The VM should have reversible single stepping, letting you step backwards through execution. When a VM run-time error occurs, such as accessing undefined memory or underflowing/overflowing a stack, you can step backwards in the execution thread to see where it went wrong.

Undo would be handled by a doubly linked list of data structures containing old and new values and a “register ID”, which means all components of the VM should be defined in array. This list could be built in a big chunk of allocated RAM. When it gets to the end of that space, it wraps to the beginning. It removes the oldest elements to make space for new elements. Since C doesn't do explicit allocation, the list can be handled by the C and the deleted elements reclaimed by GC.

The VM has the option of weak or strong error checking. Strong error checking would perform more checks at each instruction step. The VM restricts write activity to code space by providing an optional run-time check.

## Web Worker Implementation
A Web Worker is a black box with its own execution thread and a 2-way message stream. The VM ISS can be implemented with a Web Worker. Memory access and step instructions would be through a simple command interpreter. I/O would be handled by the host web page. The stream can use a protocol similar to that of serial debuggers to allow the host to access memory. It would add a means of writing to virtual output ports. The benefits of this are:

- It allows the ISS to run continuously, just like a real target system.
- It doesn't allow cheating. The host must use the stream protocol to access the internals of the VM.
- It enforces a protocol that's simple enough to put in hardware.

In the real world, the host would redirect its data stream from the Web Worker to a real device (MCU, FPGA, etc.) through a serial port or socket connection. In front-end Javascript, this could be the native messaging interface. 


