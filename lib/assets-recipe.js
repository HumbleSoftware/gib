/**
 * Gulp Assets Recipe
 *
 * This is a declaratively configured assets task builder for gulp.  It creates 
 * tassks for development and production asset management.
 *
 * config:
 * name - task name
 * src - source files
 * out - out files
 * build - build dest
 * compile - optional compile dest
 */

var gulp = require('gulp');
var gulpRename = require('gulp-rename');
var path = require('path');

/**
 * Recipe export
 */
function recipe (config) {

  // Config:
  var name = config.name;
  var src = config.src;
  var out = config.out;
  var buildDest = config.build;
  var compileDest = config.compile || config.build;

  // Create dev task:
  gulp.task(name, assets(src, out, buildDest));

  // Create compile task:
  gulp.task(name + '-compile', assets(src, out, compileDest));
}

/**
 * Main assets task:
 */
function assets (src, out, dest) {
  return function () {
    return gulp.src(src)
      // Add out dirnames:
      .pipe(gulpRename(function (p) {
        p.dirname = out + path.sep +  p.dirname;
      }))
      .pipe(gulp.dest(dest));
  };
}

module.exports = recipe;

