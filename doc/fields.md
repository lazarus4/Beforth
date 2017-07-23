# Bit Fields

Embedded systems (MCUs) differ from desktop systems in that RAM isn't cheap. The die area cost of SRAM compared to flash memory is about 10:1. It would be great to have low level support for defining variables to use only the number of bits they need rather than a fixed chunk size of 8, 16 or 32 bits.

The Forth concept of the VALUE is very powerful because it decouples the code from implementation details. A simple lexicon could support "stingey locals" and gracefully degrade to "do nothing" on systems that don't need it.

- `VALUE-BITS` ( n -- ) Sets the number of bits to be used by VALUEs.
- `VALUE` ( n *name* -- ) Define a value with a default setting. If it crosses a cell boundary, throw an error.

Another way to handle bit fields is with structures. A sample structure declaration could be:
```
BIT-STRUCTURE point \ create the named structure, aligned at bit 0 of cell address
   6 BITS           \ set the bit width
   INT x            \ 6-bit x field initialized to 0 
   2 VALUE y        \ 6-bit y field initialized to 2 
END-STRUCTURE
point p             \ declare an instance of a point
```

When referenced, structure `p` should make visible its internal fields over a brief scope. This would be done by manipulating the search order. Under ANS Forth token rules, the "p.x" syntax isn't allowed. No problem, work with Forth. `p` begins the scope. A brace (]) can end the scope. That way, the scope can last as long as you want it. Yes, I know `]` means compile. The `]` in p's namespace is found first. The point count be named `p[` for a prettier syntax. For example, suppose you wanted to declare three points and sum two of them into the third point:

```
point p1[  point p2[  point p3[  
: add  ( -- )
   p1[ x ]  p2[ x ]  +  p3[ to x ] 
   p1[ y ]  p2[ y ]  +  p3[ to y ] 
;
```
In the example, `x` and `to x` illustrate the two main use cases: reading and writing. At a lower level, the bit field is expressed by an address, field width and bit position. These are converted to static shifts and masks at compile time so that run-time overhead is minimized.

- Read x: T=mem[addr], right shift T by bit position B, bitwise and T with mask M.
- Write x: left shift x by B, T=mem[addr] and (M<<B), mem[addr]=T or x.

The hardware support required for this is a barrel shifter and logic instructions. Feeding the ALU immediate data would be a bonus since the shifts, ands and ors are static. A barrel shifter costs a lot of FPGA LUTs, but most FPGAs also have hard multipliers that can be used for the same thing. The same rationale goes for MCUs. Rather than use individual shifts in a loop, the fetch/store code could look up 2^N and do a hardware multiply.

## OOPs

The BIT-STRUCTURE syntax could be the beginning of a cheap OOP paradigm. Each of the p1, p2, p3 structures in the example has its own instance of x and y. Words in point are common to each p. 

The search order between `p1[` and `]` would be ( context: ... point p1 | current: p1 ). Within an individual scope, new words are compiled there by default. `]` will restore current. For example:
```
p1[ : star 42 emit ; ]
p2[ : star 65 emit ; ]
```
Late binding is the main thing missing here. That's basically a value with an xt and `execute` bound to it. Instead of INT or VALUE declaring the word, FUNC ( xt *name* -- ) could be used. For example, `' NOOP FUNC FOO` in the `point` declaration would produce in instance FOO in each p. The FOO in p2 could be changed with:
```
p2[ :noname ." My Foo" ; is foo ]
```
