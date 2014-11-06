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
 * build - build dest
 * compile - optional compile dest
 * options - passed through to gulp-less
 * sourcemaps - boolean
 */

var _ = require('lodash');
var gulp = require('gulp');
var gulpUtil = require('gulp-util');
var gulpConcat = require('gulp-concat');
var gulpConnect = require('gulp-connect');
var gulpLess = require('gulp-less');
var gulpSourcemaps = require('gulp-sourcemaps');

// Unused.  This would be handy for determining
// which tasks to watch.
var lessImports = require('less-imports');

/**
 * Recipe export
 */
function recipe (config, gulpInstance) {

  // Config:
  gulpInstance = gulpInstance || gulp;
  var name = config.name;
  var src = config.src;
  var out = config.out;
  var buildDest = config.build;
  var compileDest = config.compile || config.build;
  var options = {
    sourcemaps: config.sourcemaps,
    less: config.options
  };
  var compileOptions = _.extend({cleancss: true}, options);

  // Create dev task:
  gulpInstance.task(name, function () {
    return dev(less(src, out, options), buildDest);
  });

  // Create compile task:
  gulpInstance.task(name + '-compile', function () {
    return compile(less(src, out, compileOptions), compileDest);
  });
}

/**
 * Build a Gulp stream for less compilation
 */
function less (src, out, options) {
  var stream = gulp.src(src);
  if (options.sourcemaps) {
    stream = stream.pipe(gulpSourcemaps.init());
  }
  stream = stream.pipe(
      // Pass options along to gulp-less:
      gulpLess(options.less)
      // Log less error messages:
      .on('error', gulpUtil.log)
    );
  if (options.sourcemaps) {
    stream = stream.pipe(gulpSourcemaps.write());
  }
  stream = stream.pipe(gulpConcat(out));
  return stream;
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
    .pipe(gulp.dest(dest))
    .pipe(gulpConnect.reload());
}

module.exports = recipe;

