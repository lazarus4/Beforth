# VM communication
The communication protocol is to be shared between "dumb terminal" and "stand-alone" modes. Basically, the thin client uses an escape 
sequence to intercept strings that would normally go to the TIB. It also returns results in an escape string that the terminal can treat 
appropriately. Escape characters should be in the 80-BF range so as to allow UTF-8 symbols. 
The escape char used is `ESC _` (0x9f, APC – Application Program Command) which marks the beginning of a thin-client command. 
`ESC \` (0x9c, ST – String Terminator) marks the end. 

The thin client avoids the use of bytes in the 80-9F range. In this case, byte b is re-mapped to 80 n, where n is (b & 0F) + 40. 
This allows the ISR to only care about looking for APC and ST when deciding where to direct the stream, and treat 80 as a special case. 
The host end gets the same simplicity.

If interrupt-driven communication is used, the stream could be managed by a UART (or I2C or whatever) ISR. 
The ISR can buffer incoming bytes in a FIFO, for example, and also look for a reset token. 
The hard reset token (80 00) could still be recognizable even if the system is hung.

Thin-client commands are evaluated by the DEBUG task. This task spends most of its time waiting for the next character. 
Spinning (invoking PAUSE if nothing is received) decreases efficiency slightly compared to having an ISR wake the DEBUG task. 
The PAUSE loop runs fast enought that you could get away with no interrupts and no UART buffering. DEBUG digests the UART data one byte 
at a time without impacting the timing of other real-time activity.

## Commands

DEBUG takes a command from the serial stream and returns a response based on the command. 
Some responses may be sent asynchronously depending on other conditions. For example, hard reset. Responses include:

- 0x07 = Hard reset
- 0x06 = ACK, command was successful
- 0x15 = NACK, command was not successful

Numbers are big-endian.
### 00 = Hard Reset
Resets the VM.
### 01 = Get register contents
Sends back VM internal state. May return nothing.
### 02 = Ping
Output: {1 byte ACK, 2 byte cmdlength}. The cmdlength is the maximum command length supported by the system. Usually, it's what you feel comfortable processing (making the system wait on) or the size your input buffer can handle if not real-time. 
### 03 = EXECUTE
Takes stack input, executes the xt, and returns the contents of the stack.

Input: {1 byte n, n\*4 bytes stackInfo}. stackInfo is pushed onto the stack in order of reception. 
The incoming stack is ( ... xt base ). The host expects ( ... ior base ) in the output stack. ior is the return value of CATCH, which is used to execute the xt.

Output: {1 byte ACK, 1 byte n, n\*4 bytes stackInfo}. The ACK marks the beginning of a response. stackInfo is popped from the stack in order.
### 04 = RAM_READ
Reads from data space.

Input: {4 byte Address, 2 byte n}.
Output: {1 byte ACK/NACK, n+1 bytes data}. ACK if valid read address, NACK if not.
### 05 = RAM_WRITE
Writes to data space.

Input: {4 byte Address, 2 byte n, n+1 bytes data}.
Output: {1 byte ACK/NACK}. ACK if valid write address, NACK if not.
### 06 = ROM_READ
Reads from code space.
Input: {4 byte Address, 2 byte n}.
Output: {1 byte ACK/NACK, n+1 bytes data}. ACK if valid read address, NACK if not.
### 07 = ROM_WRITE
Writes to code space.

Input: {4 byte Address, 2 byte n, n+1 bytes data}.
Output: {1 byte ACK/NACK}. ACK if valid write, NACK if not. This is a little tricky, because not all VMs are the same. 
ROM could be flash memory, which has device-specific constraints. The VM may have to erase a page before writing, for example.

## Startup
At startup, a word `SAFEMODE? ( -- flag )` is used to determine whether or not to run the application. This allows recovery from bricked apps by not launching them. If `SAFEMODE?` returns true, only the DEBUG task is run.


