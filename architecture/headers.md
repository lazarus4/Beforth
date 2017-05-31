# Headers
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