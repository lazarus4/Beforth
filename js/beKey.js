// Keyboard input buffer

/*
Accept keystrokes into the keyboard buffer.
When input is blocked by a busy interpreter, it gets buffered in a FIFO.
*/

var acceptState = 0;					// state of accept FSM
var inserting = true;					// insert/overwrite flag
var keyCursor = 0;						// cursor position
var keyBuffer = '';						// string

function charKeyDo(n) {					// process key event
  if (n > 0xFFFFF) {
	n &= 0x7000FF;						// alt,shift,ctrl included
    switch(n) {
	  case 13: {						// cr
        evalFn (keyBuffer); 	
      }
	  case 8: {							// backspace
      }
	  case 42: {						// delete
      }
	  case 37: {						// left
	    if (keyCursor) { 
		  keyCursor--; 
		}
      }
	  case 39: {						// right
	    if (keyCursor < keyBuffer.length) { 
		  keyCursor++; 
		}
      }
	  case 45: {						// insert
      }
    }
  } else {
	var ch = String.fromCharCode(n);	
	if (inserting) {	
      keyBuffer.splice(keyCursor, 0, ch);	
	  keyCursor;
	} else {
	}
	keyBuffer += ch;
  }
}
  


var keyFifo = [];						// elastic buffer

function charKeyHandler(n) {			// handle characters
  keyFifo.push(n);
  if (acceptState == 0) {				// ready to process?
    while (keyFifo.length) {
	  var ch = keyFifo[0];
	  keyFifo.shift();
	  charKeyDo(ch);
	}
  }
}
