module.exports = function (wallaby) {
  return {
    files: [
      { pattern: 'town/js/lib/require-2.1.11.js', instrument: false },
      { pattern: 'town/js/lib/*.js', load: false },
      { pattern: 'town/js/src/*.js', load: false },
      { pattern: 'town/js/test/test-main.js' }
    ],

    tests: [
      { pattern: 'town/js/test/*.spec.js', load: false },
    ],

    testFramework: 'jasmine'
  };
};
