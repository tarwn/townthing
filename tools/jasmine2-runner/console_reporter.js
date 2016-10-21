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
        
        var failedSpecs = [];

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
            self.startedTime = performance.now();
            log('jasmine started');
        };
        self.suiteStarted = function(suite) {
            suite = getSuite(suite);
            suite._parent = currentSuite;
            suite.startedTime = performance.now();
            // suite.totalSpecCount = 0;
            // suite.successSpecCount = 0;
            currentSuite = suite;
        };
        self.specStarted = function(spec) {
            if (!currentSuite) {
                // focused spec (fit) -- suiteStarted was never called
                self.suiteStarted(fakeFocusedSuite);
            }
            spec = getSpec(spec);
        };
        self.specDone = function(spec) {
            self.totalSpecCount++;
            currentSuite.totalSpecCount++;
            spec = getSpec(spec);
            if (isSkipped(spec) || isDisabled(spec)) {

            }
            else if (isFailed(spec) && spec.failedExpectations.length) {
                var failure = spec.failedExpectations[0];

                failedSpecs.push({
                    name: spec.description,
                    message: failure.message,
                    details: failure.stack
                });
            }
            else{
                self.successSpecCount++;
                currentSuite.successSpecCount++;
            }
        };
        self.suiteDone = function(suite) {
            suite = getSuite(suite);
            if(suite._parent == null){
                // log('suiteDone [' + humanReadableElapsed(performance.now() - suite.startedTime) + ',' + suite.successSpecCount + '/' + suite.totalSpecCount + '] : ' + suite.description);
                log('suiteDone [' + humanReadableElapsed(performance.now() - suite.startedTime) + '] : ' + suite.description);
            }
            if (suite._parent === UNDEFINED) {
                // disabled suite (xdescribe) -- suiteStarted was never called
                self.suiteStarted(suite);
            }
            else{
                // suite._parent.totalSpecCount += suite.totalSpecCount;
                // suite._parent.successSpecCount += suite.successSpecCount;
            }
            currentSuite = suite._parent;
        };
        self.jasmineDone = function() {
            if (currentSuite) {
                // focused spec (fit) -- suiteDone was never called
                self.suiteDone(fakeFocusedSuite);
            }
            var totalTimeElapsed = performance.now() - self.startedTime;
            log(self.successSpecCount + '/' + self.totalSpecCount + ' specs in ' + humanReadableElapsed(totalTimeElapsed));

            if(failedSpecs.length > 0){
                log('Spec Failures: \n\n');
                failedSpecs.forEach(function(spec){
                    log('Spec: ' + spec.name + 'Message: ' + spec.message + '\nStack: ' + spec.details + '\n\n');
                });
            }

            self.finished = true;
            // this is so phantomjs-testrunner.js can tell if we're done executing
            exportObject.endTime = new Date();
        };

    };
})(this);
