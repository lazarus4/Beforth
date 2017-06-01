# Headers
JavaScript has lots of cool tools for manipulating arrays and building header structures. Alas, the header structure must be accessible later on by the VM for extensibility. The header structure must be explicitly known, so it's built up in a big fixed-size array:

`var HM = new Int32Array(arraySizeHeaders);`

Array elements are 32-bit. Pointers are zero-referenced: HM[0] is the beginning. Name strings are 32-bit aligned (padded with zeros) and packed/unpacked to use 32-bit storage. Header space may be read or written at will. Before code is loaded, JS manages header space. There are also JS functions for searching and appending the search order. These are DEFERed words that may be replaced by Forth. The header space is basically the Forth dictionary, minus code and data. HHERE and HORG explicitly operate on the variable HP, the next free byte in the dictionary. The dictionary is expanded by appending chunks and linking them into the header structure.

As header space is built, a table for reverse lookup should be built for translating code addresses into header indicies. The address is inserted into the list so as to keep it sorted. A binary search traverses the list to find the header index of the word that compiled that address.

String packing puts the first byte in the low byte of the 32-bit cell. When unpacking into a string, `str[ptr++] = N; N >>= 8;` done four times loads a cell into a string array.

### WORDLIST chunk

A wordlist ID (WID) is a pointer to a hash list, an array of pointers to the ends of various lists of headers. A header chain starts with this hash list. A wordlist should have a prime number of hash threads: 31 to 129 is good in plactice, 3 is used for illustration. A new wordlist chunk, created by WORDLIST, looks like this:
```
Cell Name______  Value Meaning__________________________________________________
0    THREADS     3     Number of threads in the hash table, WID points here.    
1    THREAD[0]   0     Pointers to end of list, 0 if list is empty.             
2    THREAD[1]   0                                                              
3    THREAD[2]   0                                                              
4    NAMESTRUCT  0     Pointer to NAMESTRUCT of this wordlist. 0 if nonexistent.
```
### NAMESTRUCT chunk

A NAMESTRUCT only needs a name, but it contains additional instrumentation information.

```
Cell Name______  Value Meaning__________________________________________________
0    NAME        ?     Packed counted string up to 256 bytes long.              
n    FEATURES    ?     Various compiler flags and features.                     
n+1  INTERPRET   0     xt of INTERPRET semantics. 0 if none .                   
n+2  COMPILE     0     xt of COMPILE semantics. 0 if none.                      
n+3  USED        0     Pointer to "This word is referenced by" list.            
n+4  USES        0     Pointer to "This word references" list.                  
n+5  LOCATE      0     Pointer to LOCATE structure, 0 if not available.         
n+6  DATA        0     One or more cells of data used by the semantics.         
```
The FEATURES cell is packed as follows: {smudge.1, immediate.1, type.1, color.3, address}. 
The smudge bit is set during compilation of a word to make it non-findable until ‘;’ successfully executes. Dictionary search will also look at the smudge bit. The address is evaluated by a 1-bit type: {token, vmCode}. Color is used for color highlighting.

DATA is used by EQU and other codeless constants.

## USED and USES chunks

The USED list is a singly linked of NAMESTRUCTs that references this one. The first addition to the list appends a USED chunk to the dictionary with a link value of 0. Subsequent USED chunks have a link to the previous link. USES is the same structure applied slightly differently.

```
Cell Name______  Value Meaning__________________________________________________
0    NAMESTRUCT  ?     NAMESTRUCT that references (or is referenced by) this word.
1    LINK        ?     0 if first element, link to previous otherwise.         
```
## LOCATE chunk

The LOCATE chunk marks the source code file of a word. The FILEID may be a filename (captured by INCLUDED) or a manually-set web URL. In the URL case, FILEPOS could be an pointer to an anchor string.
```
Cell Name______  Value Meaning__________________________________________________
0    FILEID      ?     Pointer to filename string.                              
1    FILEPOS     ?     Bytes from beginning of file.                            
2    STACKPIC    ?     Pointer to this word's stack picture.                    
3    SUMMARY     ?     Pointer to this word's summary.                          
4    GLOSSARY    ?     Pointer to this word's glossary entry.                   
```
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
