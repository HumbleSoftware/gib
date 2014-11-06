/**
 * Gulp Index Recipe
 *
 * This is a declaratively configured index task builder for gulp.  It creates
 * tasks for development and production index template mangement.
 *
 * config:
 * name - task name
 * src - source files
 * out - out files
 * build - build dest
 * compile - optional compile dest
 * buildData - build template data
 * compileData - optional compile template data
 */

var gulp = require('gulp');
var gulpTemplate = require('gulp-template');
var gulpRename = require('gulp-rename');
var gulpConnect = require('gulp-connect');

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
  var buildData = config.buildData || {};
  var compileData = config.compileData || buildData;

  // Dev:
  gulp.task(name, html(src, out, buildDest, buildData));

  // Compile:
  gulp.task(name + '-compile', html(src, out, compileDest, compileData));
}

/**
 * Html task
 */
function html (src, out, dest, options) {
  return function () {
    return gulp.src(src)
      .pipe(gulpTemplate(options))
      .pipe(gulpRename(out || src))
      .pipe(gulp.dest(dest))
      .pipe(gulpConnect.reload());
  };
}

module.exports = recipe;
