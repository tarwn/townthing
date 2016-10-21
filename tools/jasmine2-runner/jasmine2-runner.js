var system = require('system');
var fs = require('fs');

var files = [];
if(system.args[1] != null){
    files = eval(system.args[1]);
}
console.log(files);

console.log('J2R: Starting...');
var page = require('webpage').create();

page.onConsoleMessage = function(msg) {
    if(msg.indexOf('CONTROLRUNNER:') === 0){
        var controlMsg = msg.substring(15);
        switch(controlMsg){
            case "jasmineDone":
                console.log('JSR: Done.');
                phantom.exit();
                break;
            // default:
            //     console.log(controlMsg);
        }
    }
    else{
        console.log(msg);
    }
};
page.onResourceError = function(resourceError){
    console.log("ERROR: Failed to load resource '" + resourceError.url + "'. Error " + resourceError.errorCode + ': ' + resourceError.errorString);
};

console.log("J2R: Working Dir is: " + fs.workingDirectory);
var expectedContent = '<html><head></head><body></body></html>';
var expectedLocation = 'file:///' + fs.workingDirectory + '/';
console.log("J2R: Setting page location to: " + expectedLocation);
page.setContent(expectedContent, expectedLocation);

// standard files
console.log('J2R: Inject Jasmine Files');
page.injectJs('town/js/lib/jasmine-2.0.0/jasmine.js');
page.injectJs('town/js/lib/jasmine-2.0.0/jasmine-html.js');
page.injectJs('jasmine2-runner-boot.js');

// inject reporter
// console.log('J2R: Inject TeamCity reporter');
// page.injectJs('teamcity_reporter.js');
// page.evaluate(function(){
//     jasmine.addReporter(new jasmineReporters.TeamCityReporter());
// });

console.log('J2R: Inject Console reporter');
page.injectJs('console_reporter.js');
page.evaluate(function(){
    jasmine.addReporter(new jasmineReporters.ConsoleReporter());
});

// inject control reporter
page.evaluate(function(){
    jasmine.addReporter({
        jasmineStarted: function(){ console.log('CONTROLRUNNER: jasmineStarted');   },
        suiteStarted: function(){   console.log('CONTROLRUNNER: suiteStarted');     },
        specStarted: function(){    console.log('CONTROLRUNNER: specStarted');      },
        specDone: function(){       console.log('CONTROLRUNNER: specDone');         },
        suiteDone: function(){      console.log('CONTROLRUNNER: suiteDone');        },
        jasmineDone: function(){    console.log('CONTROLRUNNER: jasmineDone');      }        
    });
    
});

// inject additional required files
console.log('J2R: Inject your include files');
page.injectJs('town/js/lib/require-2.1.11.js');

// execute passed code
console.log('J2R: Execute your code');
page.evaluate(function(specs){

	require.config({
		baseUrl: "town/js/src",
		paths: {
			"knockout": "../lib/knockout-3.0.0",
			"Squire": "../lib/Squire"
		}
	});

	require(specs, function(){
		window.executeTests();
	});

}, files);
