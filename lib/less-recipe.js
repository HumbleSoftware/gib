/**
 * Gulp Less Recipe
 *
 * This is a declaratively configured less task builder for gulp.  It creates
 * tasks for development and production assets.
 *
 * config:
 * name - task name
 * src - source files
 * out - out files
 * dest - destination for out files
 * options - passed through to gulp-less
 *
 * TODO refactor dev and compile into something gulp-y?
 */

var gulp = require('gulp');
var gulpUtil = require('gulp-util');
var gulpConcat = require('gulp-concat');
var gulpConnect = require('gulp-connect');
var gulpLess = require('gulp-less');

// Unused.  This would be handy for determining
// which tasks to watch.
var lessImports = require('less-imports');

/**
 * Build a Gulp stream for less compilation
 */
function less (src, out, options) {
  return gulp.src(src)
    .pipe(
      // Pass options along to gulp-less:
      gulpLess(options)
      // Log less error messages:
      .on('error', gulpUtil.log)
    )
    .pipe(gulpConcat(out));
}

/**
 * Build development assets
 */
function dev (less, dest) {
  less
    .pipe(gulp.dest(dest))
    .pipe(gulpConnect.reload());
}

/**
 * Build production-ready assets
 */
function compile (less, dest) {
  return less
    .pipe(gulp.dest())
    .pipe(gulpConnect.reload());
}

/**
 * Recipe export
 */
function recipe (config) {

  var name = config.name;
  var src = config.src;
  var out = config.out;
  var dest = config.dest;
  var options = config.options;

  // Create dev task:
  gulp.task(name, function () {
    return dev(
      less(src, out, options),
      config.build
    );
  });

  // Create compile task:
  gulp.task(name + '-compile', function () {
    return compile(
      less(src, out, _.extend({cleancss: true}, options)),
      config.compile || config.build
    );
  });
}

module.exports = recipe;

