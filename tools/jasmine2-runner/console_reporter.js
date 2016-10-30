(function(global) {
    var UNDEFINED,
        exportObject;

    if (typeof module !== "undefined" && module.exports) {
        exportObject = exports;
    } else {
        exportObject = global.jasmineReporters = global.jasmineReporters || {};
    }

    function isFailed(obj) { return obj.status === "failed"; }
    function isSkipped(obj) { return obj.status === "pending"; }
    function isDisabled(obj) { return obj.status === "disabled"; }
    function extend(dupe, obj) { // performs a shallow copy of all props of `obj` onto `dupe`
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                dupe[prop] = obj[prop];
            }
        }
        return dupe;
    }

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


    /**
     * Basic reporter that outputs spec results to console
     *
     * Usage:
     *
     * jasmine.getEnv().addReporter(new jasmineReporters.ConsoleReporter());
     */
    exportObject.ConsoleReporter = function(options) {
        options = options || {};
        var self = this;
        self.started = false;
        self.finished = false;
        self.startedTime = null;
        self.successSpecCount = 0;
        self.totalSpecCount = 0;

        function log(str) {
            var con = global.console || console;
            if (con && con.log) {
                con.log(str);
            }
        }
        
        self.stats = {
            failedSpecs: [],
            suites: [],
            constructionTime: performance.now(),
            totalSpecCount: 0,
            successSpecCount: 0
        };

        if(options.modifySuiteName && typeof options.modifySuiteName !== 'function') {
            throw new Error('option "modifySuiteName" must be a function');
        }

        var delegates = {};
        delegates.modifySuiteName = options.modifySuiteName;

        var currentSuite = null,
            totalSpecsDefined,
            // when use use fit, jasmine never calls suiteStarted / suiteDone, so make a fake one to use
            fakeFocusedSuite = {
                id: 'focused',
                description: 'focused specs',
                fullName: 'focused specs'
            };

        var __suites = {}, __specs = {};
        function getSuite(suite) {
            __suites[suite.id] = extend(__suites[suite.id] || {}, suite);
            return __suites[suite.id];
        }
        function getSpec(spec) {
            __specs[spec.id] = extend(__specs[spec.id] || {}, spec);
            return __specs[spec.id];
        }

        self.jasmineStarted = function(summary) {
            totalSpecsDefined = summary && summary.totalSpecsDefined || NaN;
            exportObject.startTime = new Date();
            self.started = true;
            self.stats.startedTime = performance.now();
            log('display: jasmine started');
        };
        self.suiteStarted = function(suite) {
            suite = getSuite(suite);
            suite._parent = currentSuite;
            if(suite.stats === undefined){
                suite.stats = {
                    description: suite.description,
                    startedTime: performance.now(),
                    totalSpecCount: 0,
                    successSpecCount: 0,
                    specs: [],
                    suites: []
                }
            }
            currentSuite = suite;
        };
        self.specStarted = function(spec) {
            if (!currentSuite) {
                // focused spec (fit) -- suiteStarted was never called
                self.suiteStarted(fakeFocusedSuite);
            }
            spec = getSpec(spec);
            spec.stats = {
                description: spec.description,
                startedTime: performance.now()                
            };
        };
        self.specDone = function(spec) {
            spec = getSpec(spec);
            
            self.stats.totalSpecCount++;
            currentSuite.stats.totalSpecCount++;
            currentSuite.stats.specs.push(spec.stats);
            spec.stats.executionTime = performance.now() - spec.stats.startedTime;

            if (isSkipped(spec)){
                spec.stats.status = "skipped";
            }
            else if(isDisabled(spec)){
                spec.stats.status = "disabled";
            }
            else if (isFailed(spec) && spec.failedExpectations.length) {
                var failure = spec.failedExpectations[0];
                spec.stats.status = "failed";
                spec.stats.statusMessage = failure.message;
                spec.stats.statusStack = failure.stack;
            }
            else{
                self.stats.successSpecCount++;
                currentSuite.stats.successSpecCount++;
                spec.stats.status = "passed";
            }
        };
        self.suiteDone = function(suite) {
            suite = getSuite(suite);

            if (suite._parent === UNDEFINED) {
                // disabled suite (xdescribe) -- suiteStarted was never called
                self.suiteStarted(suite);
            }

            suite.stats.executionTime = performance.now() - suite.stats.startedTime
            if(suite._parent == null){
                log('display: suiteDone [' + humanReadableElapsed(performance.now() - suite.stats.startedTime) + ',' + suite.stats.successSpecCount + '/' + suite.stats.totalSpecCount + '] : ' + suite.stats.description);
                self.stats.suites.push(suite.stats);
            }
            else{
                suite._parent.stats.totalSpecCount += suite.stats.totalSpecCount;
                suite._parent.stats.successSpecCount += suite.stats.successSpecCount;
                suite._parent.stats.suites.push(suite.stats);
            }

            currentSuite = suite._parent;
        };
        self.jasmineDone = function() {
            if (currentSuite) {
                // focused spec (fit) -- suiteDone was never called
                self.suiteDone(fakeFocusedSuite);
            }
            var totalTimeElapsed = performance.now() - self.stats.startedTime;
            log("display: " + self.stats.successSpecCount + '/' + self.stats.totalSpecCount + ' specs in ' + humanReadableElapsed(totalTimeElapsed));            
            log("stats: " + JSON.stringify(self.stats));
            self.finished = true;
            // this is so phantomjs-testrunner.js can tell if we're done executing
            exportObject.endTime = new Date();
            log("jasmineDone");
        };

    };
})(this);
