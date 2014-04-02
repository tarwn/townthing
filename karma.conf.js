module.exports = function(config) {
	config.set({
		basePath: 'town/js',
		frameworks: ['jasmine', 'requirejs'],
		files: [
		  'test/test-main.js',
		  {pattern: '**/*.js', included: false}
		],
		exclude: [ '**/main.js' ],
		reporters: ['dots'],
		port: 9876,
		colors: true,
		// possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
		logLevel: config.LOG_INFO,
		autoWatch: true,
		browsers: ['PhantomJS'],
		captureTimeout: 60000,
		singleRun: false
	});
};
