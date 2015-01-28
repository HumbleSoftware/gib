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
 * sourcemaps - boolean (true for dev by default)
 * browserify - boolean or object passed through to browserify
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
var notifier = require('node-notifier');
var path = require('path');
var mkdirp = require('mkdirp');

// Optional deps:
var browserify = require('browserify');
var exorcist = require('exorcist');
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

  // Create dev task with sourcemaps on by default:
  gulpInstance.task(name, deps, dev(src, out, buildDest, _.defaults(options, {
    sourcemaps: true
  })));

  // Create compile task:
  gulpInstance.task(name + '-compile', deps, compile(src, out, compileDest, options));

  // Create hint task:
  gulpInstance.task(hintTask, hint(src, out, hintOptions, hintTask));

  // No watches for browserify.  Handled internally.
  if (options.browserify) {
    return {
      watches: []
    };
  }
}


/**
 * Base js task.
 */
function jsBase (src, out, dest, options, watch) {

  var bundler;

  if (options.browserify) {
    if (watch) {
      bundler = watchify(browserify(src, _.extend({
        debug: options.sourcemaps
      }, options.browserify, watchify.args)));
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

      // TODO duped from dev task :-(
      bundler.on('update', function () {
        return jsBundle()
          .pipe(gulp.dest(dest))
          .pipe(gulpConnect.reload());
      });
    }
  }

  function jsBundle () {

    var js;

    // Browserify stream:
    if (options.browserify) {
      var map = path.join(dest, out + '.map');
      mkdirp.sync(path.dirname(map));
      js = bundler.bundle()
        // Log errors if they happen.
        // Do this before proceeding down the pipeline.
        .on('error', function (e) {
          var title = 'Browserify Error';
          var message = e.message;
          gulpUtil.log(title + ':\n' + message);
          notifier.notify({
            title: title,
            message: message
          });
        })
        // Exorcise the source maps:
        .pipe(exorcist(map))
        .pipe(vinylSourceStream(out));
    }
    // Js concat stream:
    else {
      js = gulp.src(src);
      if (options.sourcemaps) {
        js = js.pipe(gulpSourcemaps.init());
      }
      js = js.pipe(gulpConcat(out));
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
    var js = jsBase(src, out, dest, options, true)()
    // Write source maps to directory
    if (!options.browserify && options.sourcemaps) {
      js = js.pipe(gulpSourcemaps.write('.'));
    }
    js.pipe(gulp.dest(dest))
      .pipe(gulpConnect.reload());
  };
}

/**
 * Build production-ready assets
 */
function compile (src, out, dest, options) {
  return function () {
    var js = jsBase(src, out, dest, options)();
    if (options.angular) {
      if (_.isObject(options.angular)) {
        js = js.pipe(gulpNgAnnotate(options.angular));
      } else {
        js = js.pipe(gulpNgAnnotate());
      }
    }
    js = js.pipe(vinylBuffer())
      .pipe(gulpUglify());
    // Write source maps to directory
    if (!options.browserify && options.sourcemaps) {
      js = js.pipe(gulpSourcemaps.write('.'));
    }
    js.pipe(gulp.dest(dest))
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
      .pipe(gulpJshint.reporter('fail'))
      .pipe(gulpConnect.reload());
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
