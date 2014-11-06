/**
 * Gulp Server Recipe
 *
 * This is a declaratively configured server task builder for gulp.  It
 * creates a development task for serving assets.
 *
 * TODO add proxying support.
 *
 * config:
 * name - task name
 * options - options passed through to gulp-connect
 *
 * gulp-connect defaults:
 *  - livereload: true
 *  - root: '.'
 */

var _ = require('lodash');
var gulp = require('gulp');
var gulpConnect = require('gulp-connect');
var path = require('path');

/**
 * Recipe export
 */
function recipe (config) {

  // Config:
  var name = config.name || 'server'
  var options = config.options || {};

  // Defaults:
  _.defaults(options, {
    root: path.resolve('./'),
    livereload: true
  })

  // Task:
  gulp.task(name, server(options));
}

/**
 * Server task
 */
function server (name, options) {
  gulp.task(name, function () {
    return gulpConnect.server(options);
  });
}

module.exports = recipe;
