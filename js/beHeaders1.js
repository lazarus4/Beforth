// Header primitives for beForth VM, Brad Eckert, license=Unlicense
// uses: beMemory.js

function strFetch(addr, len) {			// Fetch octets to JS string
  var str = '';
  for (i = 0; i < len; i++) {
    str += byteFetch(addr++);
  }
  return str;
}

function lengthInBytes(str) {			// get the actual byte length of string
  var m = encodeURIComponent(str);      // convert byte to %HH
  return str.length/3;
}

var foos = "오리 수프";  // foos.length is 5. lengthInUtf8Bytes(foos) is 13.

/*
================================================================================
Compilation to header space doesn't need undo functionality nor compiler access
by the VM except for special cases. So, vars used for it are plain JS.
The actual data structure is explicit so that non-JS tools can use it.
*/

var HP = 0;								// header space pointer

function hComma (n) {					// append cell to header space
  var r = HP;
  HM[HP++] = n;
  return r;
}
function hCommaS (str) {				// append string to header space
  var r = HP;							// handle UTF-8 strings
  var s = encodeURIComponent(str);      // convert string to %HH format
  var len = s.length/3;					// length in bytes
  s = "%" + hexstr(len, 2) + s;			// convert to counted string
  while (((s.length/3)+3)&3) {			// for 4-byte alignment,
    s += "%00";							// pad with zeros
  }
  len = s.length/3;						// actual length
  var m = 0;
  for (i = 0; i < len; i++) {			// compile HM cells
    var c = parseInt(s.substr(i*3,3), 16);
	m += c << 8*(3 - (i&3));
	if ((i&3) == 3) {
	  HM[HP++] = m;
	  m = 0;
	}
  }
  return s;
}

// Compilation and execution semantics are either Forth or Native words.

function noop () { }
var semantics = [0, noop, 0, noop]		// semantics for header creation

/*------------------------------------------------------------------------------
Creates a named header structure
------------------------------------------------------------------------------*/
function chunkNAMESTRUCT (name) {		// compile NAMESTRUCT chunk
  for (i = 0; i < 4; i++) {				// compile semantics:
    hcomma(semantics[i]);				// exec, execNative, comp, compNative
  }
}

/*------------------------------------------------------------------------------
Creates a hash array of pointers to the end of a wordlist
------------------------------------------------------------------------------*/
var wThreads = 3;						// # of wordlist threads if creating WID

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


