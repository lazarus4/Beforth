# Target Debugging Interface
Thin client debugging (in Forth) classically sends a stream of bytes from the host to the target. The target interprets the stream using a simple interpreter and returns a stream.

## Debugging in a multi-threaded environment.
Single stepping in realtime systems is often not possible. You want to single-step one thread while allowing other threads to continue running. All CPU state is swapped into and out of memory using a breakpoint to pass control back to the supervisor. The breakpoint is a non-maskable (or very high priority) interrupt that invokes code to exit the debug state. A debug task is responsible for entering the debug state. If the breakpoint is never reached, the system is hung. This should seldom happen, but when it does (such as in the early stages of development), debugging should still be possible.

## Debugging in a single-threaded environment.
A VM (or hardware CPU) should be single steppable without software intervention. Hardware implements the debugger protocol to allow access to various register and memory spaces and run/stop/step the CPU. Applications tend to benefit from instrumentation. They should be able to stream out data without paying for overhead. This suggests that the target CPU should be the (for example, SPI) bus master and host PC should be a slave device. In a real system, there would be several devices on the SPI bus. The debug host would be one of the devices, with a 4-wire interface.

This suggests the use of an FPGA for implementing a fast-turnaround protocol that buffers the slow-turnaround communications of modern computers. The target CPU operates by means of multi-byte transfers where input and output chunks are the same length. The protocol is designed around 4-wire SPI. The FPGA could interface to a FTDI FT232H USB chip in parallel sync mode, which provides enough bandwidth that the SPI is the bottleneck even when clocked at 100 to 200 MHz.

The first outgoing byte is a stream ID. The FPGA decides what to do with the rest of the stream based on this.

- 0 = Application data
