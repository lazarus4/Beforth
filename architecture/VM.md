# VM

The Beforth VM is a small ISS (instruction set simulator) that implements a stack computer. This ISA can be interpreted in real time on an MCU, PC, or gates (VHDL/Verilog). This provides a high semantic density, simple compiler, and reasonably high speed. Fast ISS is a matter of minimizing the complexity of decoding the ISA in software. The essential parts of the runtime system are contained in the VM and optional compiler extensions are added in a way that allows the Forth and the user application to be ported over to an MCU or FPGA. 

The Harvard architecture of the VM uses a block of RAM for data and stack space, and a block of ROM for code space. Running code in an ISS isn't necessarily slow. Depending on the implementation, you can eliminate cache misses. That does a lot to close the gap between it and native bloatware.

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
- RM[2] = `T0` top of data stack.
- RM[3] = `T1` aux top of data stack.
- RM[4] = `N` next on data stack stack.
- RM[5] = `R` top of return stack.
- RM[6] = `UP` user pointer.
- RM[7] = `SP` data stack pointer.
- RM[8] = `RP` return stack pointer.

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

Typical Forth systems are dominated by calls, returns and literals. To facilitate tail recursion, jumps and calls use similar encoding.

- 000s = opcode: ret + op1 + k2/k18 + stack + op4 = 2-bit/18-bit literal, 5-bit opcode, stack operation, and return bit [1]
- 001s = iopcode: k4/k20 + stack + op4 = opcode with 4-bit/20-bit signed data [2]
- 011s = literal: k12/k28 = 12-bit or 28-bit signed literal
- 100s = jump: k12/k28 = signed PC displacement
- 101s = call: k12/k28 = signed PC displacement
- 110s = ajump: k12/k28 = absolute PC 
- 111s = acall: k12/k28 = absolute PC 

The *s* bit indicates instruction size. If '1', 16-bit immediate data follows. This covers most literals. Extremely large literals can be formed by compiling a 28-bit literal and an additional *x#* opcode to shift in the remaining 4 bits.

The assembler uses blank delimited tokens to assemble the instructions. Tokens are looked up in a wordlist and executed, or converted to a number. The token names are listed below:

### \[1]:
The long immediate (s=1) produces a 18-bit k with the upper 14 bits equal to the ret bit. k[17:2] may be used for special modifiers. For example, memory fetch and store can represent a type. 

If the *ret* bit is set, a return is executed with the opcode. With a hardware implementation, the return would be initiated first (PC popped) and then the instruction executed while the branch is in progress. The VM should do it this way. When there are also pushes/pops included in the instruction (see *stack* field), the *ret* executes first, pushes execute next, and pops execute last.

When the instruction executes a push, the instruction should assume it's executing at the same time as the push. That means using the SP value from before the push. No such accommodation is needed with the pop because it's post-decrementing.

The 4-bit *stack* field (one pair each for data and return stacks) tell the hardware what kind of push operations go with this opcode:

- 00 = nothing to do
- 01 = push T/N or R to the data/return stack (mem[--SP/RP]) before/upon executing the instruction.
- 10 = pop T/N or R from the data stack (mem[SP/RP++]) after/upon executing the instruction.

Tokens for the above: `ret` `dup` `push` `drop` `pop` 

The k[1:0] bits may be used to address two instances of TOS. There are two instances of A, an address register used for fetch/store. The default k is 0. 

Tokens that change k are: `s1` `d1`

Disassembly order: ret, pushes, k, opcode, pops

There are two instances of the TOS, like a two-headed snake. The default is T[0], but T[1] is available in cases where it wouldn't add any execution delay. A common problem in Forth is having a little extra state and not having a handy place to stash it. The only downside is with interrupts (possibly more state to save), which tend to be troublesome from a verification standpoint. Forth does just fine without interrupts. A useful way of handling interrupts is to tweak the RET instruction. If an "interrupt" is pending, jump to the interrupt code instead of popping the return address. That's outside the scope of the VM. Conceptually, it's like the Forth technique of waking a clean-up task after an ISR, with the low level part expected to be handled in hardware.

**op1=0** Load T[d] with a data source. k[1]=s, k[0]=d. The sources are:
- `0` **shl**  Left shifted T[s].
- `1` **rol**  Rotate Left T[s] through carry.
- `2` **asr**  Right shifted T[s].
- `3` **ror**  Right Right T[s] through carry.
- `4` **shr**  Right shifted T[s], unsigned.
- `5` **n**  s=0: N.
- `5` **r**  s=1: R.
- `6` **@ac**  cm[A[s]], optional type = k[4:3]: {cell, short, byte, cell}
- `7` **@ac+**  cm[A[s]++], optional type = k[4:3]: {cell, short, byte, cell}
- `8` **a**  k[17:2]={0 or -1}: A[s], else user-defined.
- `9` **\*+**  s=0: multiplication step.
- `9` **/+**  s=1: division step.
- `A` **@a**  dm[A[s]], optional type = k[4:3]: {cell, short, byte, cell}
- `B` **@a+**  dm[A[s]++], optional type = k[4:3]: {cell, short, byte, cell}
- `C` **add**  s=0: T[0] + N, s=1: user defined
- `D` **&**  s=0: T[0] & N, s=1: user defined
- `E` **|**  s=0: T[0] | N, s=1: user defined
- `F` **^**  s=0: T[0] ^ N, s=1: user defined

**op1=1** Store T[s] to register/memory. k[1]=d, k[0]=s. Opcode coding is:
- `0` 
- `1` 
- `2`
- `3` 
- `4` 
- `5` **n!**  d=0: N.
- `5` **r!**  d=1: R.
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

### \[2] 
There are 16 iopcodes that take immediate data. They are:
- `0` **+#**  Add signed k to T[0]. {1+, 1-, CELL+, CHAR+}
- `1` **&#**  Bitwise-and signed k to T[0].
- `2` **|#**  Bitwise-or signed k to T[0].
- `3` **^#**  Bitwise-xor signed k to T[0]. {INVERT}
- `4` **x#**  Shift T[0] left 4 places and add unsigned k.
- `5` **up#**  T[0] = user variable address UP + k. {UP@, USER variables}
- `6` **rp#**  T[0] = local variable address RP + k. {RP@, local variables}
- `7` **sp#**  T[0] = pick address SP + k. {SP@, PICK}
- `8`
- `9` 
- `A` **@#**  Fetch cell from data address k into T[0].
- `B` **!#**  Store cell T[0] to data address k.
- `C` **0bran**  Branch if T[0]=0 using displacement k.
- `D` **next**  Branch if (--R)>=0 using displacement k. 
- `E` **-bran**  Branch if T[0]<0 using displacement k.
- `F` **syscall**  ( ? -- ? )  Call Fn[k[23:5] to the underlying system using k[2:0] input and k[4:3] output parameters. 

Syscall functions are in a host function array. All others are hard coded in the VM.

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

