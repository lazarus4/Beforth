// Memory primitives for beForth VM, Brad Eckert, license=Unlicense

// Address masks are 2^N-1
const headMemMask = (1<<13) - 1;		// header space in 32-bit cells
const codeMemMask = (1<<13) - 1;		// code space in 16-bit cells
const dataMemMask = (1<<13) - 1;		// data space in 32-bit cells
const regsMemMask = (1<<4) - 1;			// VM register space in 32-bit cells
const undoMemMask = (1<<12) - 1;		// Undo buffer in 32-bit cells

var HM = new Uint32Array(4*(headMemMask+1)); // Header space
var CM = new Uint16Array(2*(codeMemMask+1)); // Code space
var DM = new Uint32Array(4*(dataMemMask+1)); // Data space
var RM = new Uint32Array(4*(regsMemMask+1)); // Registers for VM
var UM = new Uint32Array(4*(undoMemMask+1)); // Undo buffer for VM

/*
================================================================================
The undo buffer is a circular buffer of 16-byte undo elements. The cells are:
0: flags	Event flags, set by certain events like call, return, etc.
1: address	Byte address of memory cell being modified.
2: old 		Previous value
3: new		New value

flags default to 0. When EOL (bit 31) is set, ignore the element.
The flags of the next element are set to 0x80000000 as an end-of-list marker.
This is to accommodate list wraparound, when new elements overwrite old.
The number of undo elements in the buffer peaks at undoMemMask/16.

The beginning of the list (freshest) is at undoPtr.
The end of the list is at the EOL.

undoNone re-does everything. It restores the latest state if it's not already.
*/

var undoPtr = 0;						// index to next free buffer element
var undoFlags = 0;						// flags to be used when saving element
var undoNow = 0;						// state stream pointer

function undoBack () {					// step backward one
  var addr, old, nu, flags;
  undoNow = (undoNow-1) & undoMemMask;  // handle wrap
  nu = UM[undoNow];
  old = UM[--undoNow];
  addr = UM[--undoNow];
  flags = UM[--undoNow];
  if (addr<0) {
    type = (addr>24) & 0xFF;
    switch (type) {
	  case 0xFF: {						// FFxxxxxx = data memory
	    DM[(addr>>2) & dataMemMask] = old;
		return;
	  }
	  case 0xFE: {						// FExxxxxx = VM registers
	    RM[(addr>>2) & regsMemMask] = old;
		return;
	  }
	  default: {						// FDxxxxxx = header memory
	    HM[(addr>>2) & headMemMask] = old;
		return;
	  }
	}
  } else {
	CM[(addr>>1) & codeMemMask] = old;
  }
  return flags;
}

function undoFwd () {					// step forward one
  var addr, old, nu, flags, type;
  flags = UM[undoNow++];
  addr = UM[undoNow++];
  old = UM[undoNow++];
  nu = UM[undoNow++];
  if (addr<0) {
    type = (addr>24) & 0xFF;
    switch (type) {
	  case 0xFF: {						// FFxxxxxx = data memory
	    DM[(addr>>2) & dataMemMask] = nu;
		return;
	  }
	  case 0xFE: {						// FExxxxxx = VM registers
	    RM[(addr>>2) & regsMemMask] = nu;
		return;
	  }
	  default: {						// FDxxxxxx = header memory
	    HM[(addr>>2) & headMemMask] = nu;
		return;
	  }
	}
  } else {
	CM[(addr>>1) & codeMemMask] = nu;
  }
  return flags;
}

function undoNone () {					// step to latest state
  while (undoNow != undoPtr) {			// undoNow is at or before undoPtr
    undoFwd();							// step forward until in sync
  }
}

function undoAll () {					// step to earliest state
  while ((HM[(undoNow-1) & undoMemMask] & 0x80000000) == 0) {
    undoBack();							// step back until in EOL
  }
}

var undoSaveX = function (addr, old, nu) {	// save an undo element
  undoNone();							// re-sync undo stream if out of sync
  UM[undoPtr++] = undoFlags;
  undoFlags = 0;
  UM[undoPtr++] = addr;
  UM[undoPtr++] = old;
  UM[undoPtr++] = nu;
  undoPtr &= undoMemMask;
  UM[undoPtr] = 0x80000000;				// EOL the next element
  undoNow = undoPtr;
}

var undoSaveN = function (addr, old, nu) {	// high speed version
}

var undoSave = undoSaveX;

function undoClear () {                 // clear the undo buffer
  undoPtr = 0;							// index to next free buffer element
  undoNow = 0;							// state stream pointer
  undoFlags = -1;
  undoSaveX(0,0,0);						// start list with dead element
}
undoClear();							// clear the undo list now

/*
================================================================================
Fetch and store primitives map to the various spaces and handle 8-bit and 16-bit
values using the appropriate shift and mask.

Alignment rules are expected to be followed. If misalignment is detected, an
error flag is set.

VM is little endian
JS is endian-agnostic
*/

var VMerror;							// error flags returned by fetch/store

function cellDataFetch (addr) {
  var type = (addr>>24) & 0xFF;
  switch (type) {
    case 0xFF: return DM[(addr>>2) & dataMemMask];	// FFxxxxxx = data memory
    case 0xFE: return RM[(addr>>2) & regsMemMask];	// FExxxxxx = VM registers
    default:   return HM[(addr>>2) & headMemMask];	// FDxxxxxx = header memory
  }
}

function cellFetch (addr) {
  var a;
  if (addr&0x80000000) {
    if (addr & 3) {
	  VMerror |= (1<<0);				// unaligned data memory fetch
	}
    return cellDataFetch(addr);
  } else {
    if (addr & 1) {
	  VMerror |= (1<<1);				// unaligned code memory fetch
	}
    a = (addr>>1) & codeMemMask;		// CM index
	return CM[a] + (CM[a+1]<<16);		// 32-bit, little endian
  }
}

function halfFetch (addr) {
  if (addr&0x80000000) {
    if (addr & 1) {
	  VMerror |= (1<<0);				// unaligned data memory fetch
	}
    if (addr & 2) {
      return (0xFFFF & (cellDataFetch(addr) >> 16));
	} else {
      return (0xFFFF & cellDataFetch(addr));
	}
  } else {
    if (addr & 1) {
	  VMerror |= (1<<1);				// unaligned code memory fetch
	}
	return CM[(addr>>1) & codeMemMask];	// 16-bit
  }
}

function byteFetch (addr) {
  if (addr&0x80000000) {
    switch (addr & 3) {
	  case 0: { return (0xFF &  cellDataFetch(addr));      }
	  case 1: { return (0xFF & (cellDataFetch(addr)>>8));  }
	  case 2: { return (0xFF & (cellDataFetch(addr)>>16)); }
	  default:{ return (0xFF & (cellDataFetch(addr)>>24)); }
    }
  } else {
	if (addr & 1) {
	  return CM[(addr>>1) & codeMemMask] >> 8;
	} return CM[(addr>>1) & codeMemMask] & 0xFF;
  }
}

function cellStore (n, addr) {
  var a;
  if (addr&0x80000000) {
    var type = (addr>>24) & 0xFF;
    if (addr & 3) {
	  VMerror |= (1<<2);				// unaligned data memory store
	}
    switch (type) {
	  case 0xFF: {						// FFxxxxxx = data memory
	    a = (addr>>2) & dataMemMask;
		undoSave(addr, DM[a], n);
	    DM[a] = n;
		return;
	  }
	  case 0xFE: {						// FExxxxxx = VM registers
	    a = (addr>>2) & regsMemMask;
		undoSave(addr, RM[a], n);
	    RM[a] = n;
		return;
	  }
	  default: {						// FDxxxxxx = header memory
	    a = (addr>>2) & headMemMask;
		undoSave(addr, HM[a], n);
	    HM[a] = n;
		return;
	  }
	}
  } else {
    if (addr & 1) {
	  VMerror |= (1<<3);				// unaligned code memory store
	}
    a = (addr>>1) & codeMemMask;		// CM index
	undoSave(addr, CM[a], n & 0xFFFF);
	CM[a] = n;
	undoSave(addr+2, CM[a+1], n>>16);
	CM[a+1] = n >> 16;
  }
}

function halfStore (n, addr) {
  var x, m;
  if (addr&0x80000000) {
    var type = (addr>>24) & 0xFF;
    if (addr & 1) {
	  VMerror |= (1<<2);				// unaligned data memory store
	}
    switch (type) {
	  case 0xFF: {						// FFxxxxxx = data memory
	    a = (addr>>2) & dataMemMask;
		m = DM[a];
		if (addr & 2) {
		  x = (n << 16) + (m & 0xFFFF);
		} else {
		  x = (n & 0xFFFF) + (m & 0xFFFF0000);
		}
		undoSave(addr, m, x);
		DM[a] = x;
		return;
	  }
	  case 0xFE: {						// FExxxxxx = VM registers
	    a = (addr>>2) & regsMemMask;
		m = RM[a];
		if (addr & 2) {
		  x = (n << 16) + (m & 0xFFFF);
		} else {
		  x = (n & 0xFFFF) + (m & 0xFFFF0000);
		}
		undoSave(addr, m, x);
		RM[a] = x;
		return;
	  }
	  default: {						// FDxxxxxx = header memory
	    a = (addr>>2) & headMemMask;
		m = HM[a];
		if (addr & 2) {
		  x = (n << 16) + (m & 0xFFFF);
		} else {
		  x = (n & 0xFFFF) + (m & 0xFFFF0000);
		}
		undoSave(addr, m, x);
		HM[a] = x;
		return;
	  }
	}
  } else {
    if (addr & 1) {
	  VMerror |= (1<<3);				// unaligned code memory store
	}
	a = (addr>>1) & codeMemMask;
	undoSave(addr, CM[a], n);
	CM[a] = n;							// 16-bit
  }
}

function byteStore (n, addr) {
  var x, m;
  if (addr&0x80000000) {
    var type = (addr>>24) & 0xFF;
    switch (type) {
	  case 0xFF: {						// FFxxxxxx = data memory
	    a = (addr>>2) & dataMemMask;
		m = DM[a];
		switch (addr & 3) {
		  case 0: {
		    x = (n & 0xFF) (m & 0xFFFFFF00);
		    break;
		  }
		  case 1: {
		    x = (n & 0xFF) (m & 0xFFFF00FF);
		    break;
		  }
		  case 2: {
		    x = (n & 0xFF) (m & 0xFF00FFFF);
		    break;
		  }
		  default: {
		    x = (n & 0xFF) (m & 0x00FFFFFF);
		    break;
		  }
		}
		undoSave(addr, m, x);
		DM[a] = x;
	  }
	  case 0xFE: {						// FExxxxxx = VM registers
	    a = (addr>>2) & regsMemMask;
		m = RM[a];
		switch (addr & 3) {
		  case 0: {
		    x = (n & 0xFF) (m & 0xFFFFFF00);
		    break;
		  }
		  case 1: {
		    x = (n & 0xFF) (m & 0xFFFF00FF);
		    break;
		  }
		  case 2: {
		    x = (n & 0xFF) (m & 0xFF00FFFF);
		    break;
		  }
		  default: {
		    x = (n & 0xFF) (m & 0x00FFFFFF);
		    break;
		  }
		}
		undoSave(addr, m, x);
		RM[a] = x;
	  }
	  default: {						// FDxxxxxx = header memory
	    a = (addr>>2) & headMemMask;
		m = HM[a];
		switch (addr & 3) {
		  case 0: {
		    x = (n & 0xFF) (m & 0xFFFFFF00);
		    break;
		  }
		  case 1: {
		    x = (n & 0xFF) (m & 0xFFFF00FF);
		    break;
		  }
		  case 2: {
		    x = (n & 0xFF) (m & 0xFF00FFFF);
		    break;
		  }
		  default: {
		    x = (n & 0xFF) (m & 0x00FFFFFF);
		    break;
		  }
		}
		undoSave(addr, m, x);
		HM[a] = x;
	  }
	}
  } else {
	a = (addr>>1) & codeMemMask;
	m = CM[a];
	if (addr & 1) {
	  x = (n << 8) + (m & 0x00FF);
	} else {
	  x = (n & 0xFF) + (m & 0xFF00);
	}
	undoSave(addr, m, x);
	CM[a] = x;
  }
}

/*
================================================================================
Some functions to dump memory to the JS console. They return the dump string.
Example: F12 opens Chrome debug terminal, byteDump(0,64) displays 64 bytes of
code space.

hexstr converts a uint32 to string in hex format.
strFetch fetches a UTF-8 string from octets.
byteDump and cellDump displays any memory in hex format.
undoDump displays the most recent undo records.
*/

function hexstr (n, len) {				// convert n to hex string
  var s = '';                           // toString(16) is not used because
  var c = "0123456789ABCDEF";           // we want unsigned with leading zeros
  for (var i = 0; i < len; i++) {
    s = c.charAt(n&15) + s;
	n >>= 4;
  }
  return s;
}

function strFetch(addr, len) {			// Fetch octets to JS string
  var str = '';
  for (i = 0; i < len; i++) {
    str += "%" + hexstr(byteFetch(addr++),2);
  }
  return decodeURIComponent(str);
}

var foos = "오리 수프";

function byteDump (addr, length) {		// dump bytes
  var str = '';
  var linelength = 16;
  while (length) {
    var len = Math.min(length,linelength);
    str += "\n" + hexstr(addr, 8) + ": ";
	var a = addr;						// save for ASCII dump
    for (var i = 0; i < len; i++) {
	  str += hexstr(byteFetch(addr++), 2) + " ";
	}
	str += "| ";
    for (i = 0; i < len; i++) {
	  var c = byteFetch(a++);
	  if ((c<32) || (c>127)) { c=46; }
  	  str += String.fromCharCode(c);
	}
	length -= len;
  }
  return str;
}

function cellDump (addr, length) {		// dump cells
  var str = '';
  while (length) {
    var len = Math.min(length, 4);
    str += "\n" + hexstr(addr, 8) + ": ";
    for (var i = 0; i < len; i++) {
	  str += hexstr(cellFetch(addr), 8) + " ";
	  addr += 4;
	}
	length -= len;
  }
  return str;
}

function undoDump (depth) {				// display undo buffer
  var addr, old, nu, flags;
  var ptr = undoPtr;
  var str = "\n--flags- Address  OldValue NewValue";
  while (depth>0) {
    var ishere = (ptr == undoNow);
    ptr = (ptr-1) & undoMemMask;		// handle wrap
    nu = UM[ptr];
    old = UM[--ptr];
    addr = UM[--ptr];
    flags = UM[--ptr];
    depth--;
	str += "\n"
	    + hexstr(flags, 8) + " " + hexstr(addr, 8) + " "
	    + hexstr(old, 8)   + " " + hexstr(nu, 8);
	if (ishere) str += " <--";
  }
  return str;
}

cellStore(0x12345678,0);
cellStore(0x11223344,4);
cellStore(0x55667788,0xFFFFFF00);
