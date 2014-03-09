var tests = [];
for (var file in window.__karma__.files) {
  if (window.__karma__.files.hasOwnProperty(file)) {
    if (/spec\.js$/.test(file)) {
      tests.push(file);
    }
  }
}

requirejs.config({
    // Karma serves files from '/base'
    baseUrl: 'base/src',

	paths: {
		"knockout": "../lib/knockout-3.0.0",
		"Squire": "../lib/Squire"
	}
});
require(tests, function(){
	window.__karma__.start();
});