{
    appDir: '../town/js',
	baseUrl: 'src',
	paths: {
		knockout: '../lib/knockout-3.0.0'
	},
    dir: '../js-built',
	fileExclusionRegExp: /(^test|Squire|jasmine|require)/,
    modules: [
        {
            name: 'app',
            include: ['app', 'townViewModel']
        }

    ]
}
