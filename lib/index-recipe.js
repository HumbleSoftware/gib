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

var _ = require('lodash');
var gulp = require('gulp');
var gulpConnect = require('gulp-connect');
var gulpRename = require('gulp-rename');
var gulpTemplate = require('gulp-template');
var gulpUtil = require('gulp-util');

/**
 * Recipe export
 */
function recipe (config, gulpInstance) {

  // Config:
  var gulpInstance = gulpInstance || gulp;
  var name = config.name || 'index';
  var src = config.src;
  var out = config.out;
  var buildDest = config.build;
  var compileDest = config.compile || config.build;
  var buildData = _.extend({}, config.buildData, config.data);
  var compileData = _.extend({}, config.compileData || buildData, config.data);

  // Dev:
  gulpInstance.task(name, html(src, out, buildDest, buildData));

  // Compile:
  gulpInstance.task(name + '-compile', html(src, out, compileDest, compileData));
}

/**
 * Html task
 */
function html (src, out, dest, options) {
  return function () {
    return gulp.src(src)
      .pipe(gulpTemplate(options)
        .on('error', function (e) {
          gulpUtil.log('index recipe error:', e.message)
        })
      )
      .pipe(gulpRename(out || src))
      .pipe(gulp.dest(dest))
      .pipe(gulpConnect.reload());
  };
}

module.exports = recipe;
