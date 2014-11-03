/**
 * Gulp Assets Recipe
 *
 * This is a declaratively configured assets task builder for gulp.  It creates 
 * tassks for development and production asset management.
 */

var gulp = require('gulp');
var gulpRename = require('gulp-rename');
var path = require('path');

/**
 * Recipe export
 */
function recipe (config) {

  var name = config.name;
  var src = config.src;
  var out = config.out;
  var options = config.options;


  gulp.task(name, function () {
    return assets(src, out, options);
  });

  gulp.task(name + '-compile', function () {
    return assets(src, out, options);
  });
}

/**
 * Main assets task:
 */
function assets (src, out, options) {
  return function () {
    return gulp.src(src)
      // Add out dirnames:
      .pipe(gulpRename(function (p) {
        p.dirname = out + path.sep +  p.dirname;
      }))
      .pipe(gulp.dest(config.build));
  };
}

module.exports = recipe;

