var system = require('system');
var fs = require('fs');

var files = [];
if(system.args[1] != null){
    files = eval(system.args[1]);
}
console.log(files);

function humanReadableElapsed(rawMilliseconds){
    var minutes = Math.floor(rawMilliseconds / (1000 * 60)); 
    var seconds = ((rawMilliseconds / 1000) % (1000 * 60)).toFixed(3);

    if(minutes > 0){
        minutes + ":" + (100 + seconds).substring(1) + "s";
    }
    else {
        return seconds + "s";
    }
}


var Runner = {
    execute: function(callback){
        console.log('J2R: Starting...');
        var page = require('webpage').create();

        page.onConsoleMessage = function(msg) {
            if(msg == 'jasmineDone'){
                // ?
            }
            else if(msg.indexOf('display: ') === 0){
                console.log(msg.substring(9));
            }
            else if(msg.indexOf('stats: ') === 0){
                callback(JSON.parse(msg.substring(7)));
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
    }
};

var StatsProcessor = {
    evaluate: function(rawStats){
        var flatStats = [];
        var flatSuites = [];
        StatsProcessor.flattenSpecs("", rawStats, flatStats, flatSuites);
        var sortedFlatStats = flatStats.sort(function(a,b){
            // sort descending by execution time
            return b.executionTime - a.executionTime;
        });

        var averages = StatsProcessor.getAverages(flatStats);
        if(averages.total > 0){
            var fiftyPercentOfTotalIndex = StatsProcessor.getPercentOfTotalIndex(sortedFlatStats, averages, 0.50);
            var ninetyPercentOfTotalIndex = StatsProcessor.getPercentOfTotalIndex(sortedFlatStats, averages, 0.90);

            return {
                averageExecutionTime: averages.average,
                standardDeviation: averages.standardDeviation,
                totalExecutionTime: averages.total,
                totalCount: sortedFlatStats.length,

                fiftyPercent: {
                    numberOfTests: fiftyPercentOfTotalIndex + 1
                },
                ninetyPercent: {
                    numberOfTests: ninetyPercentOfTotalIndex + 1
                },

                specs: sortedFlatStats          
            };
        }
        else{
            return 0;
        }
    },

    flattenSpecs: function(description, stats, flatStats, flatSuites){
        if(stats.specs !== undefined){
            stats.specs.forEach(function(spec){
                if(spec.status == "passed"){
                    spec.fullName = description + spec.description;
                    flatStats.push(spec);
                }
            });
        }

        if(stats.suites !== undefined){
            stats.suites.forEach(function(suite){
                StatsProcessor.flattenSpecs(description + suite.description + " -> ", suite, flatStats, flatSuites);
            });
        }
    },

    getAverages: function(flatStats){
        var sum = flatStats.reduce(function(memo, stats){
            return memo + stats.executionTime;
        }, 0);
        var avg = sum / flatStats.length;
        var squaredDiffs = flatStats.map(function(stats){
            return Math.pow((stats.executionTime - avg), 2);
        });
        var sumSquaredDiffs = squaredDiffs.reduce(function(memo,diff){
            return memo + diff;
        }, 0);
        var avgSquaredDiff = sumSquaredDiffs/flatStats.length;
        var stdDev = Math.sqrt(avgSquaredDiff);
        return {
            average: avg,
            total: sum,
            standardDeviation: stdDev
        };
    },

    getPercentOfTotalIndex: function(sortedFlatStats, averages, percentage){
        var percentOfTotal = averages.total * percentage;  
        var runningTotal = 0;
        var percentIndex = undefined;
        for(var i = 0; i < sortedFlatStats.length; i++){
            runningTotal += sortedFlatStats[i].executionTime;
            percentIndex = i;
            if(runningTotal >= percentOfTotal)
                break;
        }
        return percentIndex;
    }
};


Runner.execute(function(result){
    var stats = StatsProcessor.evaluate(result);

    if(stats === 0){
        console.log("-----------------------------------------------------------------");
        console.log("No passed specs, cannot calculate statistics.")
        console.log("-----------------------------------------------------------------");
    }
    else{
        console.log("-----------------------------------------------------------------");
        console.log(stats.totalCount + " tests passed in " + humanReadableElapsed(stats.totalExecutionTime));
        console.log("Average Time: " + humanReadableElapsed(stats.averageExecutionTime));
        console.log("Standard Deviation: " + humanReadableElapsed(stats.standardDeviation));
        var ninetyPerBy = Math.round((stats.ninetyPercent.numberOfTests / stats.totalCount) * 100.0);
        console.log(ninetyPerBy + "% (" + stats.ninetyPercent.numberOfTests + ") of the tests account for 90% of the overall time.");
        var fiftyPerBy = Math.round((stats.fiftyPercent.numberOfTests / stats.totalCount) * 100.0);
        console.log(fiftyPerBy + "% (" + stats.fiftyPercent.numberOfTests + ") of the tests account for 50% of the overall time.");
        console.log("-----------------------------------------------------------------");
        console.log("Slowest Tests:")
        stats.specs.slice(0, stats.fiftyPercent.numberOfTests - 1).forEach(function(spec){
            var time = ("          " + humanReadableElapsed(spec.executionTime)).slice(-10);
            console.log(" [" + time + "]: " + spec.fullName);
        });
        console.log("-----------------------------------------------------------------");
    }

    phantom.exit();
});
