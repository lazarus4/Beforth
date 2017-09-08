# Target Debugging Interface
Thin client debugging (in Forth) classically sends a stream of bytes from the host to the target. The target interprets the stream using a simple interpreter and returns a stream.

## Debugging in a multi-threaded environment.
Single stepping in realtime systems is often not possible. You want to single-step one thread while allowing other threads to continue running. All CPU state is swapped into and out of memory using a breakpoint to pass control back to the supervisor. The breakpoint is a non-maskable (or very high priority) interrupt that invokes code to exit the debug state. A debug task is responsible for entering the debug state. If the breakpoint is never reached, the system is hung. This should seldom happen, but when it does (such as in the early stages of development), debugging should still be possible.

## Debugging in a single-threaded environment.
A VM (or hardware CPU) should be single steppable without software intervention. Hardware implements the debugger protocol to allow access to various register and memory spaces and run/stop/step the CPU. Applications tend to benefit from instrumentation. They should be able to stream out data without paying for overhead. This suggests that the target CPU should be the (for example, SPI) bus master and host PC should be a slave device. In a real system, there would be several devices on the SPI bus. The debug host would be one of the devices, with a 4-wire interface.

This suggests the use of an FPGA or CPLD for implementing a fast-turnaround protocol that buffers the slow-turnaround communications of modern computers. The target CPU operates by means of multi-byte transfers where input and output chunks are the same length. The protocol is designed around 4-wire SPI. The FPGA could interface to a FTDI FT232H USB chip in parallel sync mode, which provides enough bandwidth that the SPI is the bottleneck even when clocked at 100 to 200 MHz.

The protocol uses a *start* symbol (such as falling edge of /SS) to mark the beginning of a full duplex transfer. Byte 1 negotiates flow control, byte 2 sets the transfer size, and the rest is data. The transfer consists of:

- TX: # of bytes that host may transmit. RX: # of bytes that target may transmit
- TX: # of outgoing bytes. RX: # of incoming bytes
- TX: outgoing data. RX: incoming data

With the SPI clocked at 60 MHz, the maximum packet of 258 bytes lasts about 35 microseconds. When the host has nothing to send, byte 2 is 0 so if the target likewise has nothing to send the SPI transfer terminates after two bytes. The host is polled at a few MHz to keep latency to a minimum. This polling may be blocked to allow the application to steal the bus for its own use. In this case, the application tells the SPI to stop polling and waits for it to be stopped. After using the bus, it tells the SPI to resume polling.

The target side uses a simple FSM to process the incoming stream. While the stream is being processed, the CPU is stopped.

The octet-oriented stream uses escape sequences to redirect the stream to different destinations. For example, host-bound data could be directed to a log file, a terminal, or a debugger. Character 0xF0 is the escape character for a 3-byte {0xF0 c n} sequence. The next byte is the destination followed by the byte count. All chunks of octets start with 0xF0. Data not wrapped in an escape sequence may be ignored or be application-specific. Here, x is 4-bit and n is 8-bit, for a 12-bit length allowing up to 4095-byte chunks of data.

- 0xFx = 0xF0 character (not an esc sequence)
- 0xEx = debugger data (to host)
- 0xDx = terminal data (to console)
- 0xCx = binary log stream

Target-bound data is interpreted using a similar 0xF0 c n sequence where c is:

- 0xFx = 0xF0 character (not an esc sequence), usually ignored. Expect m=0.
- 0xEx = debugger data (from host)




