var gulp = require('gulp');
var jasminePhantomJs = require('gulp-jasmine2-phantomjs');
var specFiles = '**/*.html';
 
gulp.task('test', function() {
    return gulp.src(specFiles).pipe(jasminePhantomJs());
});