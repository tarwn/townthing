var tests = [];

var baseUrl = '';
var isUsingKarma = (window.__karma__ != undefined);
var isUsingWallaby = (wallaby != undefined);

if(isUsingKarma){
  baseUrl = '/base/src';
  for (var file in window.__karma__.files) {
    if (window.__karma__.files.hasOwnProperty(file)) {
      if (/spec\.js$/.test(file)) {
        tests.push(file);
      }
    }
  }
}
else if(isUsingWallaby){
  baseUrl = '/town/js/src';
  wallaby.delayStart();
  tests = wallaby.tests;  
}

requirejs.config({
  // Karma serves files from '/base'
  baseUrl: baseUrl,

  paths: {
    "knockout": "../lib/knockout-3.0.0",
    "Squire": "../lib/Squire"
  }
});

// Let's get started!
require(tests, function(){

  if(isUsingKarma)
  	window.__karma__.start();
  else if(isUsingWallaby)
    wallaby.start();

});