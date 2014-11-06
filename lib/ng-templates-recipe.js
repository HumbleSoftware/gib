/**
 * Gulp Angular Templates Recipe
 *
 * This is a declaratively configured less task builder for gulp.  It creates
 * tasks for development and production angular templates.
 *
 * name - task name
 * src - source files
 * out - out files
 * build - build dest
 * compile - optional compile dest
 * options - passed through to gulp-angular-templatecache
 */

var _ = require('lodash');
var fs = require('fs');
var gulp = require('gulp');
var gulpAngularTemplatecache = require('gulp-angular-templatecache');
var gulpConnect = require('gulp-connect');
var gulpRename = require('gulp-rename');
var map = require('map-stream');
var mkdirp = require('mkdirp');
var path = require('path');

/**
 * Recipe export
 */
function recipe (config, gulpInstance) {

  // Config:
  gulpInstance = gulpInstance || gulp;
  var name = config.name || 'ng-templates';
  var src = config.src;
  var out = config.out;
  var options = config.options || {};
  var buildDest = config.build;
  var compileDest = config.compile || config.build;

  _.defaults(options, {
    'module': 'templates-app',
    'root': ''
  });


  gulpInstance.task(name, ngTemplates(src, out, buildDest, options));

  gulpInstance.task(name + '-compile', ngTemplates(src, out, compileDest, options));
}

/**
 * Main angular templates task 
 */
function ngTemplates (src, out, dest, options) {
  var module = options.module;
  return function (callback) {
    var hasFiles = false;
    gulp.src(src)
      .pipe(map(function (file, callback) {
        hasFiles = true;
        callback(null, file);
      }))
      .pipe(gulpAngularTemplatecache(options))
      .pipe(gulpRename(out))
      .pipe(gulp.dest(dest))
      .on('end', function () {
        // Even if there are no templates,
        // write the angular module:
        if (hasFiles) {
          callback();
        } else {
          if (options.standalone) {
            var myOut = dest + path.sep + out;
            mkdirp(dest, function (err) {
              if (err) return callback(err);
              fs.writeFile(myOut, 'angular.module(\'' + module + '\',[]);', function (err) {
                gulpConnect.reload();
                callback(err);
              });
            });
          }
        }
      });
  };
}

module.exports = recipe;

