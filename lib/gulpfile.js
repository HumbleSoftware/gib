/**
 * Gang
 */

'use strict';

var _                         = require('lodash');
var fs                        = require('fs');
var del                       = require('del');
var gulp                      = require('gulp');
var path                      = require('path');
var stylish                   = require('jshint-stylish');
var map                       = require('map-stream');
var merge                     = require('merge-stream');
var gulpConnect               = require('gulp-connect');
var gulpConcat                = require('gulp-concat');
var gulpUglify                = require('gulp-uglify');
var gulpChanged               = require('gulp-changed');
var gulpRename                = require('gulp-rename');
var gulpUsing                 = require('gulp-using');
var gulpNewer                 = require('gulp-newer');
var gulpCached                = require('gulp-cached');
var gulpJshint                = require('gulp-jshint');
var gulpAngularTemplatecache  = require('gulp-angular-templatecache');
var gulpFile                  = require('gulp-file');
var gulpChmod                 = require('gulp-chmod');
var gulpRunSequence           = require('run-sequence');
var gulpTemplate              = require('gulp-template');
var gulpSourcemaps            = require('gulp-sourcemaps');
var gulpUtil                  = require('gulp-util');
var gulpNgAnnotate            = require('gulp-ng-annotate');
var gulpBrowserify            = require('gulp-browserify');
var browserify                = require('browserify');
var watchify                  = require('watchify');
var vinylSourceStream         = require('vinyl-source-stream');
var vinylBuffer               = require('vinyl-buffer');
var mkdirp                    = require('mkdirp');

// Gib tools:
var gulpRecipeLess            = require('./less-recipe');
var utils                     = require('./utils');

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

module.exports = function (config, gulp) {

  var gulp = gulp || require('gulp');
  gulpRunSequence = gulpRunSequence.use(gulp);

  //
  // Composite tasks:
  // 

  // Default:
  gulp.task('default', [
    'connect',
    'watch'
  ]);

  // Build:
  gulp.task('build', function (callback) {
    return gulpRunSequence('clean', [
      'templates',
      'less',
      'js',
      'assets',
      'html'
    ], callback);
  });

  // Compile:
  gulp.task('compile', function (callback) {
    return gulpRunSequence('clean', [
      'templates',
      'less-compile',
      'js-compile',
      'assets',
      'html'
    ], callback);
  });


  //
  // Source tasks:
  // 

  // Watcher state:
  var watches = [];
  var watchCallbacks = [];

  // JS:
  var jsTasks = [];
  var jsCompileTasks = [];
  _.each(config.js, function (src, out) {
    var options = _.isObject(src) ? src : {};
    var src = src.src || src;

    jsTasks.push('js-' + out);
    jsCompileTasks.push('js-compile-' + out);
    watches.push({
      src: src,
      tasks: ['js-' + out]

    });
    var deps = options.hint ? ['js-hint-' + out] : [];
    gulp.task('js-' + out, deps, js(src, out, options));
    gulp.task('js-compile-' + out, deps, jsCompile(src, out, options));
    if (options.hint) {
      gulp.task('js-hint-' + out, jsHint(src, out, options));
    }

  }, []);

  gulp.task('js', jsTasks);
  gulp.task('js-compile', jsCompileTasks);

  function jsBase(src, out, options) {

    if (options.browserify) {
      var bundler = watchify(browserify(src, watchify.args));
      bundler
        .on('time', function (time) {
          gulpUtil.log('Bundle created in ' + (time / 1000).toFixed(2) + ' s');
        });
      watchCallbacks.push(function () {
        bundler.on('update', jsBundle)
      });
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
          js = js.pipe(gulpSourcemaps.init())
        };
        js = js.pipe(gulpConcat(out))
        if (options.sourcemaps) {
          js = js.pipe(gulpSourcemaps.write())
        }
      }
      return js
    }

    return jsBundle;
  }

  function js (src, out, options) {
    return function () {
      return jsBase(src, out, options)()
        .pipe(gulp.dest(config.build))
        .pipe(gulpConnect.reload());
    }
  }

  function jsCompile (src, out, options) {
    return function () {
      var js = jsBase(src, out, options)();
      if (options.angular) {
        js = js.pipe(gulpNgAnnotate());
      }
      js.pipe(vinylBuffer())
        .pipe(gulpUglify())
        .pipe(gulp.dest(config.compile || config.build))
        .pipe(gulpConnect.reload());
      return js;
    }
  }

  function jsHint (src, out) {
    var cacheName = 'js-hint';
    return function () {
      return gulp.src(src)
        .pipe(gulpCached(cacheName))
        .pipe(gulpJshint())
        // Remove hinting failures from the cache:
        .pipe(gulpCachedRemove(cacheName, function (file) {
          return !file.jshint.success;
        }))
        // Reporters:
        .pipe(gulpJshint.reporter('jshint-stylish'))
        .pipe(gulpJshint.reporter('fail'));
    }
  }

  // Less
  var lessTasks = _.reduce(config.less, function (p, src, out) {

    // Do some less:
    var options = _.isObject(src) ? src : {};
    var src = src.src || src;
    var name = 'less-' + out;
    gulpRecipeLess({
      name: name,
      src: src,
      out: out,
      build: config.build,
      compile: config.compile
    });

    // Less task configuration:
    p.dev.push(name);
    p.compile.push(name + '-compile');
    p.watch.push({
      src: options.watch || src,
      tasks: [name]
    });
    return p;
  }, utils.createConfig());

  // Register gulp tasks:
  gulp.task('less', lessTasks.dev);
  gulp.task('less-compile', lessTasks.compile);
  watches = watches.concat(lessTasks.watch);

  // Templates:
  var angularTasks = _.reduce(config.angular, function (tasks, src, out) {
    var options = _.isObject(src) ? src : {};
    var src = src.src || src;
    var name = 'ng-templates-' + out;
    tasks.push(name);
    watches.push({
      src: src,
      tasks: [name]
    });
    gulp.task(name, ngTemplates(src, out, options));
    ngTemplates(src, out, options);
    return tasks;
  }, []);

  function ngTemplates (src, out, options) {
    var module = options.module || 'templates-app';
    return function (callback) {
      var hasFiles = false;
      gulp.src(src)
        .pipe(map(function (file, callback) {
          hasFiles = true
          callback(null, file);
        }))
        .pipe(gulpAngularTemplatecache({
          root: '',
          standalone: options.standalone,
          module: module
        }))
        .pipe(gulpRename(out))
        .pipe(gulp.dest(config.build))
        .on('end', function () {
          // Even if there are no templates,
          // write the angular module:
          if (hasFiles) {
            callback();
          } else {
            if (options.standalone) {
              var myOut = config.build + path.sep + out;
              mkdirp(config.build, function (err) {
                if (err) return callback(err);
                fs.writeFile(myOut, 'angular.module(\'' + module + '\',[]);', function (err) {
                  gulpConnect.reload();
                  callback(err);
                });
              });
            }
          }
        });
    }
  }

  gulp.task('templates', angularTasks);

  // Html:
  function html (src, out, options) {
    return function () {
      return gulp.src(src)
        .pipe(gulpTemplate(options))
        .pipe(gulpRename(out || src))
        .pipe(gulp.dest(config.build))
        .pipe(gulpConnect.reload());
    }
  }
  var buildTasks = [];
  var compileTasks = [];
  _.each(config.html, function (src, out) {
    var options = _.isObject(src) ? src : {};
    var src = src.src || src;

    var buildName = 'html-build-' + out;
    var compileName = 'html-compile-' + out;

    buildTasks.push(buildName);
    compileTasks.push(compileName);

    gulp.task(buildName, html(src, out, _.extend({
      version: '',
      styles: _.map(config.less, function (src, out) {
        return out;
      }),
      scripts: _.map(config.js, function (src, out) {
        return out;
      }).concat(_.map(config.angular, function (src, out) {
        return out;
      }))
    }, options.data)));

    gulp.task(compileName, html(src, out, _.extend({
      version: '',
      styles: [
        'app.min.css'
      ],
      scripts: [
        'app.min.js'
      ]
    }, options.data)));
  });
  gulp.task('html', buildTasks);

  // Assets:
  var assetTasks = [];
  function assets (src, out, options) {
    return function () {
      return gulp.src(src)
        // Add out dirnames:
        .pipe(gulpRename(function (p) {
          p.dirname = out + path.sep +  p.dirname;
        }))
        .pipe(gulp.dest(config.build));
    }
  }
  _.each(config.assets, function (src, out) {
    var options = _.isObject(src) ? src : {};
    var src = src.src || src;
    var name = 'assets-' + out;
    gulp.task(name,assets(src, out, options));
    assetTasks.push(name);
    watches.push({src: src, tasks: [name]});
  });
  gulp.task('assets', assetTasks);


  //
  // Utility tasks:
  //

  // Watch:
  gulp.task('watch', ['build'], function () {
    _.each(watches, function (options) {
      gulp.watch(options.src, options.tasks);
    });
    _.each(watchCallbacks, function (callback) {
      callback();
    });
  });

  // Clean:
  gulp.task('clean', function (callback) {
    del(_.compact([
      config.build,
      config.compile
    ]), callback);
  });

  // Server:
  gulp.task('connect', function () {
    return gulpConnect.server({
      root: path.resolve('./'),
      livereload: {
        port: 35737
      }
    });
  });

}
