
/*
Web Worker task. 
*/

console.log("Loading beEval.f");

postMessage("Hello from WebWorker Land!");

function deadmeat() {
  while (1);
}

// deadmeat

var myfoo = 123;

// Note: JS terminal can't see myfoo.
// This file can't access JS outside this file.
// So, security is too tight to be useful.
