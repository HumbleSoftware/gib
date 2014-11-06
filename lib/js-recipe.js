/**
 * Gulp JS Recipe
 *
 * This is a declaratively configured js task builder for gulp.  It creates
 * tasks for development and production assets.
 *
 * config:
 * name - task name
 * src - source files
 * out - out files
 * build - build dest
 * compile - optional compile dest
 * uglify - object passed through to gulp-uglify
 * hint - boolean or object passed through to gulp-jshint
 * angular - boolean or object passed through to gulp-ng-annotate
 * sourcemaps - boolean
 * browserify - boolean
 */

// Gulp deps:
var _ = require('lodash');
var gulp = require('gulp');
var gulpCached = require('gulp-cached');
var gulpConcat = require('gulp-concat');
var gulpConnect = require('gulp-connect');
var gulpUglify = require('gulp-uglify');
var gulpUtil = require('gulp-util');
var map = require('map-stream');

// Optional deps:
var browserify = require('browserify');
var gulpBrowserify = require('gulp-browserify');
var gulpJshint = require('gulp-jshint');
var gulpNgAnnotate = require('gulp-ng-annotate');
var gulpSourcemaps = require('gulp-sourcemaps');
var stylish = require('jshint-stylish');
var vinylBuffer = require('vinyl-buffer');
var vinylSourceStream = require('vinyl-source-stream');
var watchify = require('watchify');

/**
 * Recipe export
 */
function recipe (config, gulpInstance) {

  // Config:
  gulpInstance = gulpInstance || gulp;
  var name = config.name || 'js';
  var src = config.src;
  var out = config.out;
  var dest = config.dest;
  var hintOptions = config.hint;
  var buildDest = config.build;
  var compileDest = config.compile || config.build;
  var options = {
    uglify: config.uglify || {},
    angular: config.angular,
    sourcemaps: config.sourcemaps,
    browserify: config.browserify
  };

  // Optional hinting:
  var deps = [];
  var hintTask = name + '-hint';
  if (hintOptions) {
    deps.push(hintTask);
  }

  // Create dev task:
  gulpInstance.task(name, deps, dev(src, out, buildDest, options));

  // Create compile task:
  gulpInstance.task(name + '-compile', deps, compile(src, out, compileDest, options));

  // Create hint task:
  gulpInstance.task(hintTask, hint(src, out, hintOptions, hintTask));
}


/**
 * Base js task.
 */
function jsBase (src, out, options, watch) {

  var bundler;

  if (options.browserify) {
    if (watch) {
      bundler = watchify(browserify(src, _.extend({
        debug: options.sourcemaps
      }, watchify.args)));
    } else {
      bundler = browserify(src, {
        debug: options.sourcemaps
      });
    }
    bundler
      .on('time', function (time) {
        gulpUtil.log('Bundle created in ' + (time / 1000).toFixed(2) + ' s');
      });

    // Browserify watching:
    if (watch) {
      bundler.on('update', jsBundle);
    }
  }

  function jsBundle () {

    var js;

    // Browserify stream:
    if (options.browserify) {
      js = bundler.bundle()
        // Log errors if they happen
        .on('error', gulpUtil.log.bind(gulpUtil, 'Browserify Error'))
        .pipe(vinylSourceStream(out));
    }
    // Js concat stream:
    else {
      js = gulp.src(src);
      if (options.sourcemaps) {
        js = js.pipe(gulpSourcemaps.init());
      }
      js = js.pipe(gulpConcat(out));
      if (options.sourcemaps) {
        js = js.pipe(gulpSourcemaps.write());
      }
    }
    return js;
  }

  return jsBundle;
}

/**
 * Build development assets
 */
function dev (src, out, dest, options) {
  return function () {
    return jsBase(src, out, options, true)()
      .pipe(gulp.dest(dest))
      .pipe(gulpConnect.reload());
  };
}

/**
 * Build production-ready assets
 */
function compile (src, out, dest, options) {
  return function () {
    var js = jsBase(src, out, options)();
    if (options.angular) {
      js = js.pipe(gulpNgAnnotate(options.angular));
    }
    js.pipe(vinylBuffer())
      .pipe(gulpUglify(options.uglify))
      .pipe(gulp.dest(dest))
      .pipe(gulpConnect.reload());
    return js;
  };
}

/**
 * Hint helper.
 * 
 * TODO Maybe this should be moved to a separate module.
 */
function hint (src, out, options, name) {
  return function () {
    return gulp.src(src)
      // Cache this for speed:
      .pipe(gulpCached(name))
      .pipe(gulpJshint(options))
      // Remove hinting failures from the cache:
      .pipe(gulpCachedRemove(name, function (file) {
        return !file.jshint.success;
      }))
      // Configure default reporters:
      .pipe(gulpJshint.reporter('jshint-stylish'))
      .pipe(gulpJshint.reporter('fail'));
  };
}

/**
 * Remove files from the cache.
 */
function gulpCachedRemove (name, test) {
  return map(function (file, callback) {
    if (!test || test(file)) {
      delete gulpCached.caches[name][file.path];
    }
    callback(null, file);
  });
}

module.exports = recipe;
