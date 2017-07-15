# VM

The Beforth VM is a small ISS (instruction set simulator) that implements a stack computer. This ISA can be interpreted in real time on an MCU, PC, or gates (VHDL/Verilog). This provides a high semantic density, simple compiler, and reasonably high speed. Fast ISS is a matter of minimizing the complexity of decoding the ISA in software. The essential parts of the runtime system are contained in the VM and optional compiler extensions are added in a way that allows the Forth and the user application to be ported over to an MCU or FPGA. 

The Harvard architecture of the VM uses a block of RAM for data and stack space, and a block of ROM for code space. Running code in an ISS isn't necessarily slow. Depending on the implementation, you can eliminate cache misses. That does a lot to close the gap between it and native bloatware. In an FPGA implementation, you could simulate async read by clocking BRAM at double clock speed and keeping the data path from BRAM free of delays.

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
- RM[4] = `R` top of return stack.
- RM[5] = `UP` user pointer.
- RM[6] = `SP` data stack pointer.
- RM[7] = `RP` return stack pointer.
- RM[8] = `A` address register.

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

16-bit instructions strike a good balance between size and speed. An MCU implementation can use 1 or 2 multi-way jumps to decode instructions. The VM uses a tight loop that fetches the next 16-bit instruction from CM and executes it. The instruction encoding allows for compact calls and jumps. Taking a hardware-friendly view of the VM, the four MSBs of the instruction are decoded into eight instruction groups. 

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
2 | push R to the return stack (mem[--RP]) before executing the instruction
3 | push N to the data stack (mem[--SP]) before executing the instruction
4 | noop
5 | pop PC from the return stack (mem[RP++]) after executing the instruction
6 | pop R from the return stack (mem[RP++]) after executing the instruction
7 | pop N from the data stack (mem[SP++]) after executing the instruction

Disassembly order: ret, pushes, k, opcode, pops

The assembler uses blank delimited tokens to assemble the instructions. Tokens are looked up in a wordlist and executed, or converted to a number. The token names are listed below:

### opcode5 
Opcodes that take immediate data:
- `0` **x#**  Shift T left 4 places and add unsigned k.
- `1` **up#**  T = user variable address UP + k[4:0]. {UP@, USER variables}
- `2` **rp#**  T = local variable address RP + k[4:0]. {RP@, local variables}
- `3` **sp#**  T = pick address SP + k[4:0]. {SP@, PICK}
- `4` **a[]**  A[0] = k.
- `5` **up[]**  A[0] = user variable address UP + k. {UP@, USER variables}
- `6` **rp[]**  A[0] = local variable address RP + k. {RP@, local variables}
- `7` **sp[]**  A[0] = pick address SP + k. {SP@, PICK}
- `8` **0bran**  Branch if T[0]=0 using displacement k.
- `9` **next**  Branch if (--R)>=0 using displacement k. 
- `A` **-bran**  Branch if T[0]<0 using displacement k.
- `B` **syscall**  ( ? -- ? )  Call Fn[k[23:5] to the underlying system using k[2:0] input and k[4:3] output parameters. 
- `C` **a[]**  A[1] = k.
- `D` **up[]**  A[1] = user variable address UP + k[4:0]. {UP@, USER variables}
- `E` **rp[]**  A[1] = local variable address RP + k[4:0]. {RP@, local variables}
- `F` **sp[]**  A[1] = pick address SP + k[4:0]. {SP@, PICK}

Syscall functions are in a host function array. All others are hard coded in the VM.

### opcode6:
Load T or N with a data source. k[0]=dest: {T,N}.

- `0` **shl**  Left shifted T.
- `1` **rol**  Rotate Left T through carry.
- `2` **asr**  Right shifted T.
- `3` **ror**  Right Right T through carry.
- `4` **shr**  Right shifted T, unsigned.
- `5` **r**  s=0: dm[RP], s=1: user defined.
- `6` **@ac**  cm[A[s]], optional type = k[4:3]: {cell, short, byte, cell}
- `7` **@ac+**  cm[A[s]++], optional type = k[4:3]: {cell, short, byte, cell}
- `8` **a**  k[17:2]={0 or -1}: A[s], else user-defined.
- `9` **\*+**  s=0: multiplication step.
- `9` **/+**  s=1: division step.
- `A` **@a**  dm[A[s]], optional type = k[4:3]: {cell, short, byte, cell}
- `B` **@a+**  dm[A[s]++], optional type = k[4:3]: {cell, short, byte, cell}
- `C` **add**  s=0: T + N, s=1: user defined
- `D` **&**  s=0: T & N, s=1: user defined
- `E` **|**  s=0: T | N
- `E` **n**  s=1: N
- `F` **^**  s=0: T ^ N
- `F` **swap**  s=1: N, N=T

### opcode7:
Store T to register/memory. k[0]=s. Opcode coding is:
- `0` 
- `1` 
- `2`
- `3` 
- `4` 
- `5` **r!**  d=0: dm[RP].
- `5` **n!**  d=1: N.
- `6` 
- `7` 
- `8` **a!**  k[17:2]={0 or -1}: A[d], else user-defined.
- `9` ??? d=0: load mul registers.
- `9` ??? d=1: load div registers.
- `A` **!a**  dm[A[d]], optional type = k[4:3]: {cell, short, byte, cell}
- `B` **!a+**  dm[A[d]++], optional type = k[4:3]: {cell, short, byte, cell}
- `C` 
- `D` **up!**
- `E` **sp!**
- `F` **rp!**

Note that you can't store to cm. Code memory storage is an OS function.

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

