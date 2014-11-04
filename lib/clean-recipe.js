/**
 * Gulp Clean Recipe
 *
 * This is a declaratively configured less task builder for gulp.  It creates
 * tasks for cleaning development and production.
 *
 * config:
 * name - task name
 * patterns - patterns to clean
 * options - options passed through to del
 */

var _ = require('lodash');
var del = require('del');
var gulp = require('gulp');

/**
 * Recipe export
 */
function recipe (config) {

  // Config:
  var name = config.name || 'clean';
  var patterns = config.patterns;
  var options = config.options || {};

  // Clean task:
  gulp.task(name, clean(patterns, options));
}

/**
 * Clean
 */
function clean (patterns, options) {
  return function (callback) {
    del(_.compact(patterns), options, callback);
  };
}

module.exports = recipe;
