


// Fetch octets to JS string
function strFetch(addr, len) {
   var str = '';
   for (i = 0; i < len; i++) {
     str += byteFetch(addr++);
   }
   return str;
}

var foo = function () { return 1; }
foo = function () { return 2; }


cellStore(0x12345678,0);
cellStore(0x11223344,-4);

////////////////////////////////////////////////////////////////////////////////
// Header structure construction
// The JS will build header space, but the Forth tools need a known structure.

var HP = 0;								// header space pointer
var wThreads = 3;						// # of wordlist threads when creating WID

function hComma (n) { HM[HP++] = n; }   // append cell to header space

// Compilation and execution semantics are either Forth or Native words.

function noop () { }
var semantics = [0, noop, 0, noop]		// semantics for header creation

// Creates a named header structure
function lengthInUtf8Bytes(str) {
  // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
  var m = encodeURIComponent(str).match(/%[89ABab]/g);
  return str.length + (m ? m.length : 0);
}
var foos = "오리 수프";  // .length for this is 5. lengthInUtf8Bytes(foos) is 13.

function chunkNAMESTRUCT (name) {		// compile NAMESTRUCT chunk
  for (i = 0; i < 4; i++) {				// compile semantics:
    hcomma(semantics[i]);				// exec, execNative, comp, compNative
  }
}

// Creates a hash array of pointers to the end of a wordlist
function chunkWORDLIST (namestruct) {	// compile WORDLIST chunk
  hcomma(wThreads);
  for (i = 0; i < wThreads; i++) {		// empty all threads
    hcomma(0);
  }
  hcomma(namestruct);					// namestruct is optional (0=none)
}



////////////////////////////////////////////////////////////////////////////////
// I/O

// The terminal can process UTF-8, so we just feed it raw 8-bit data.
function jsType(addr, len) {
   term.write(strFetch(addr, len));
}


