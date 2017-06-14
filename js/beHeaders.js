// Header primitives for beForth VM, Brad Eckert, license=Unlicense
// uses: beMemory.js

var wThreads = 31;						// # of wordlist threads in a WID
var caseInsensitive = true;

function hashCode (str, threads) {
  var hash = 0, i, chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr  = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash %= threads; 					// divisor should be a prime #
  }
  return hash;
};

function strHead(idx) {					// Fetch header string to JS string
  var str = '';
  var m = HM[idx++];
  var len = m & 0xFF;
  for (i = 1; i <= len; i++) {
    str += "%" + hexstr((m>>(8*(i&3)))&0xFF,2);
	if ((i&3) == 3) { m = HM[idx++]; }
  }
  return decodeURIComponent(str);
}

/*------------------------------------------------------------------------------
Compilation to header space doesn't need undo functionality nor compiler access
by the VM except for special cases. So, vars used for it are plain JS.
The actual data structure is explicit so that non-JS tools can use it.
------------------------------------------------------------------------------*/

var HP = 0;								// header space pointer

function hComma (n) {					// append cell to header space
  var me = HP;
  HM[HP++] = n;
  return me;
}
function hCommaS (str) {				// append string to header space
  if (caseInsensitive) {
    str = str.toUpperCase();			// if case insensitive system
  }
  var me = HP;							// handle UTF-8 strings
  var s = encodeURIComponent(str);
  var m = s.match(/%[89ABab]/g);
  var len = str.length + (m ? m.length : 0);
  s = "%" + hexstr(len,2) + s;			// convert to counted string
  len++;
  while (len&3) {
    s += "%00";							// pad with zeros
	len++;
  }
  var m = 0;							// accumulator
  var i = 0;							// string index
  while (len--) {						// compile HM cells
    var c = s.charAt(i++);
    if (c == "%") {
	  c = parseInt(s.substr(i,2), 16);
	  i += 2;
	} else {
	  c = s.charCodeAt(i-1);            // re-cast as code#
	}
	m |= c << (8*(3-(len&3)));
	if ((len&3) == 0) {
	  HM[HP++] = m;
	  m = 0;
	}
  }
  return me;
}

/*------------------------------------------------------------------------------
Creates a hash array of pointers to the end of a wordlist
createWID created a new wordlist, returns a WID.
orderDump dumps the search order. { ... context | current }
Use only, order.push(wid) and order.pop() to manipulate the search order
------------------------------------------------------------------------------*/

function createWID (name) {				// create a new WORDLIST
  var wid = HP;
  hComma(wThreads);
  for (i = 0; i < wThreads; i++) {		// empty all threads
    hComma(0);
  }
  if (name) {
    hCommaS(name);						// name is optional (0=none)
  } else {
    hComma(0);
  }
  return wid;
}

var testWID = createWID("Test"); 		// create test wordlist
var current = testWID;					// definitions go here
var order = [];							// search order is indicies into headers

function only () {						// clear the search order
   while (order.length) { order.pop(); }
}
only();
order.push(testWID);					// test wordlist is at top of order

function orderName (wid) {				// display wordlist name or idx
  var idx = HM[wid] + wid + 1;			// hash table size, skip to name
  if (HM[idx]) {
    return strHead(idx);				// use name string
  } else {
    return hexstr(wid,4);				// unknown, use hex WID
  }
}

function orderDump () {					// dump the search order
  str = "\n{ "
  var i = order.length;
  while (i--) {							// put top of search order on right
    str += orderName (order[i]) + " ";
  }
  str += "| " + orderName (current) + " }";
  return str;
}

/*------------------------------------------------------------------------------
Find in the header structure in one wordlist, return nt or 0.
searchName searches a given WID.
findName searches all WIDs in the search order.
createHeader creates a new header.
------------------------------------------------------------------------------*/

function hashIdx (name, wid) {			// get indes for the
  var idx = hashCode(name,HM[wid]); 	// get hash value
  return idx + wid + 1;					// index into hash table
}

function searchName (name, wid) {		// search one wordlist
  var nt = 0;
  var idx = HM[hashIdx (name, wid)];	// top of wordlist
  do {
    var str = strHead (idx+4);			// get string to test
	if (name == str) {
	  nt = idx;							// found
	  break;
	}
    idx = HM[idx];
  } while (idx);
  return nt;
}

function findName (name) {				// search the order list
  var nt = 0;
  for (i = 0; i < order.length; i++) {
    if (caseInsensitive) {				// allow for case insensitivity
      nt = searchName (name.toUpperCase(), order[i]);
    } else {
      nt = searchName (name, order[i]);
    }
	if (nt) break;
  }
}

var exec_sem;							// execution semantics for header
var comp_sem;							// compilation semantics for header

function createHeader (name, w) {		// compile NAMESTRUCT structure
  var idx = hashIdx(name, current);     // get index into hash table
  var prev = HM[idx];
  HM[idx] = hComma(prev);				// link
  hComma(exec_sem);
  hComma(comp_sem);
  hComma(w);
  hCommaS(name);						// bare bones header
}

createHeader("Hello",0x11);
createHeader("World",0x22);
createHeader(foos,0x3333);
createHeader("Hello",0x44);

////////////////////////////////////////////////////////////////////////////////
// I/O

// The terminal can process UTF-8, so we just feed it raw 8-bit data.
function jsType(addr, len) {
   term.write(strFetch(addr, len));
}


