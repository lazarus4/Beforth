# VM
The VM has the option of weak or strong error checking. It may also perform single stepping. The internal state of the VM should be viewable during single stepping. An undo should be able to step backwards through execution.

Undo would be handled by a doubly linked list of data structures containing old and new values and a “register ID”, which means all components of the VM should be defined in array. This list could be built in a big chunk of allocated RAM. When it gets to the end of that space, it wraps to the beginning. It removes the oldest elements to make space for new elements. Since JS doesn't do explicit allocation, the list can be handled by the JS and the deleted elements reclaimed by GC.

When a VM run-time error occurs, such as accessing undefined memory or underflowing/overflowing a stack, you can step backwards in the execution thread to see where it went wrong.

The VM’s code space contains only code. Data space is separate. The CDATA and UDATA descriptors switch between the two when the application is compiling data to the dictionary.

## VM memory model
Code space is assumed to be readable, but writable only under certain conditions. The VM restricts write activity by providing a stop condition for debugging.

RAM is initialized to all zeros at startup. IDATA is just as well avoided. If you want data initialized, you can just as easily do it yourself.

Fetch is a different operation depending on the address space. Code space may be internal or external flash, for example. There are two ways to handle this. One way is to have a smart fetch. The upper bits of the address determine where to read from. The other way is to provide separate words for the two kinds of fetch. There should be an option to use either smart or dumb fetch when compiling. System code can use either. User code has the option of using one or the other depending on an option setting. 

Implementing the VM in JavaScript, the memory spaces are declared as Typed array. Native array is about the same, but there's no guarantee that native is 32-bit. DataView is very slow: Do not use. CM and DM are code and data memories respectively. For example:

```
var arraySize = 10000;
var DM = new Int32Array(4 * arraySize);           // data memory is cells 
var CM = new Int8Array(arraySize);                // code memory is bytes 
```
Memory transfer widths other than the declared memory types are handled by shift-and-mask code. Code activity is mostly bytes, data activity is mostly cells. Thus the different data types. The VM should complain about address misalignment.

The code and data address spaces don’t overlap even though in the smart fetch case they could. Literals are signed, so we want addresses to have small absolute values. In hex, the address ranges could be:

- `00000000` to `00FFFFFF`	Code space, start address is 0.
- `FF000000` to `FFFFFFFF`	Data space, start address is (-DM.length)
- `FE000000` to `FE0000FF`	VM registers (PC, SP, RP, etc.)
- `FD000000` to `FDFFFFFF`	I/O space (could be used by VM in embedded systems)

The single stepper uses these addresses as tokens. The program counter (PC), for example, could be VMreg[0].

## VM metal
Stacks are kept in data memory. Stack pointers are registers. The top of the data stack is in a register, as with most classic Forths. Other registers are SP, RP and UP. 

The VM uses a tight loop that fetches the next 8-bit instruction and executes it. Some ideas for execution::

1. Use a switch statement to dispatch a command byte. Each case terminates in a “goto next”, where the goto destination is declared with “[lbl] next”.
2. Use a function table whose index is the command byte. An execution table, in other words.
3. Use a combination of these: the switch’s default goes to an execution table. 

For the sake of simplicity, speed and flexibility in opcode assignment, option 1 is used. Tokens that take immediate data (a variable length byte sequence following the opcode) are placed at the end of the (00-EF) range so that the disassembler easily knows whether or not to display it. Extended opcodes are in the F0-FF range, as per Openboot tradition. These take the lower eight bits of the opcode from the next byte in the byte stream. They're typically used for words you might not find in an embedded system, such as file access and floating point words. These 256-byte pages can be decoded by separate switch statements.

DEFERed words shared by JS and Forth should call a JS function that has default JS and Forth usages. An array of deferFn[] elements would be a handy place to keep such DEFERed words. Each deferFn would have a JS function and a Forth address. An address of 0 causes the JS function to be used. Otherwise, a call is made to the Forth address.

Implementing double precision arithmetic such as UM/MOD and UM\* will require some finesse, since JavaScript doesn't do 64-bit integers. First, the operands are checked to see if they fit a 32-bit operation. If not, things get done the "slow" way. Multiply is done using four 16\*16 operations. Divide is done using either shift-and-subtract or several 32/16 divides.

## Headers
The header space is a collection of arrays, each of which contains a different element a word’s vital statistics. For example, a simple implementation could have wordNames[], wordAddress[] and wordWID[] defined. A dictionary search would use lastIndexOf() to find the index of a string token.

Arrays in JS are dynamic: grow as you go. This is no problem for the header structure, because that’s what it does. When a MARKER is executed, the arrays are truncated (slice method) to the corresponding snapshot state. The header array could contain such fields as Name, Address and WID. However, lastIndexOf should be assumed to be an O(N) operation. Hashing it into several different arrays of strings will speed lookup. A new name gets appended to the string array whose index it hashes to. Likewise, lookup picks the string array using the hash. The name array record includes an index to the unhashed header information.

The wordNames array consists of strings. It’s initially populated by the vm.js file. Note: name strings may need escape sequences \”, \’ or \\.

The lastIndexOf() function starts either at the end of the string list or at a specific end point and scans toward the beginning. This makes it easy to support multiple wordlists. If the wordWID of the found string token doesn’t match the current search order ID, it keeps searching backward for the next instance of the string token.

The wordWID values start from 0 and increase by 1. WORDLIST returns the next value. The search order is an array of WIDs whose length is tracked by WIDS. 

The wordAddress element can be a packed array of this structure:
{smudge.1, immediate.1, type.1, forthComp.1, forthInt.1, address}. 
The smudge bit is set during compilation of a word to make it non-findable until ‘;’ successfully executes. Dictionary search will also look at the smudge bit. The address (which starts at 0) is evaluated by a 1-bit type: {token, vmCode}. 

The semanticsCompile element of the header is the function to be performed when STATE is 1. The function can compile a call, skip past a comment, perform tail call optimization, etc. If forthComp=1, it’s a Forth function. Otherwise, it’s a JS function. The Forth system appends the compiler by setting forthComp.

The semanticsInterpret element of the header is the JS function to be performed when STATE is 0. The function can execute the word, skip past a comment, push a number to the stack, etc.  If forthInt=1, it’s a Forth function. Otherwise, it’s a JS function. 

Some ideas for extra fields: Word type, file ID. 

Beforth adds some goodies to instrument the code. An array of “referenced by” elements contains a dynamic list of indicies of words that reference the word, which could be used by WHERE. An array of “references” elements contains a dynamic list of indicies of words that are referenced by the word. This pair of arrays forms the cross reference structure.

Word type would indicate the color of the word in syntax highlighting. It could also be used for mouseover value inspection. A format indicator could be part of the type. For example, when compiling the current base would be the default format. “HEX VARIABLE FOO” would by default display in hex when you hover over FOO. The default can be changed by the PRAGMA (tentative name) directive, which evaluates until EOL using a special wordlist. FORMAT would be in this wordlist.

As header space is built, a table for reverse lookup should be built for translating code addresses into header indicies. The address is inserted into the list so as to keep it sorted. A binary search traverses the list to find the header index of the word that compiled that address.

The location of the source code should be part of the header.

The input stream is shared by the JS interpreter and the VM. That means >IN and TIB are at a fixed address in data memory. These addresses are constants as far as either is concerned. JS implements the QUIT loop and the outer interpreter. String tokens (blank delimited strings) are either numeric tokens for the VM or call addresses that reference code space. Code space starts out empty. It gets built up by the JS interpreter. The Forth system is loaded at startup from source. The VM contains all of the basic Forth “amino acids” so that it can build itself.

Sample JS hash function:
```
String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr  = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash %= 31; // return the thread number (divisor should be a prime #)
  }
  return hash;
};
```

The Forth outer loop gets the next blank-delimited string and looks it up in the header structure. If it finds it, it executes its semantics based on STATE and the word’s semantics functions. Otherwise, it tries to convert it to a number. If it’s not a number, it reports an error. The outer loop is in JS, so it’s not extensible. ANS Forth contains the building blocks to build another interpreter. However, the standard FIND returns only limited semantic information. So, non-standard building blocks should be in the VM to allow a Forth version of the interpreter to run.

