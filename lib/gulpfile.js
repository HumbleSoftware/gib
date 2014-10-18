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
var gulpLess                  = require('gulp-less');
var gulpAngularTemplatecache  = require('gulp-angular-templatecache');
var gulpFile                  = require('gulp-file');
var gulpChmod                 = require('gulp-chmod');
var gulpRunSequence           = require('run-sequence');
var gulpTemplate              = require('gulp-template');
var gulpSourcemaps            = require('gulp-sourcemaps');
var gulpUtil                  = require('gulp-util');
var gulpNgAnnotate            = require('gulp-ng-annotate');

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

module.exports = function (config) {

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
    return gulpRunSequence('clean', 'build', [
      'js-compile',
      'css-compile',
      'index-compile'
    ], callback);
  });


  //
  // Source tasks:
  // 


  // JS:
  var watches = [];
  var jsTasks = _.reduce(config.js, function (tasks, src, out) {

    var config = _.isObject(src) ? src : {};
    var src = src.src || src;

    tasks.push('js-' + out);
    watches.push({
      src: src,
      tasks: ['js-' + out]

    });
    var deps = config.hint ? ['js-hint-' + out] : [];
    gulp.task('js-' + out, deps, js(src, out, config));

    if (config.hint) {
      gulp.task('js-hint-' + out, jsHint(src, out, config));
    }


    return tasks;

  }, []);

  gulp.task('js', jsTasks);

  function js (src, out, options) {
    return function () {
      var js = gulp.src(src);
      if (options.sourcemaps) {
        js = js.pipe(gulpSourcemaps.init())
      };
      js = js.pipe(gulpConcat(out))
      if (options.sourcemaps) {
        js = js.pipe(gulpSourcemaps.write())
      }
      return js
        .pipe(gulp.dest(config.build))
        .pipe(gulpConnect.reload());
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

  function jsCompile () {
    return gulp.src([
        config.build + path.sep + 'app-vendor.js',
        config.build + path.sep + '**/*.js'
      ])
      .pipe(gulpNgAnnotate())
      .pipe(gulpConcat('app.min.js'))
      .pipe(gulpUglify())
      .pipe(gulp.dest(config.compile));
  }

  // Less
  function less (src, out, options) {
    return function () {
      gulp.src(src)
        .pipe(
          gulpLess({
          })
          .on('error', gulpUtil.log)
        )
        .pipe(gulpRename(out))
        .pipe(gulp.dest(config.build))
        .pipe(gulpConnect.reload());
    }
  }
  var lessTasks = [];
  _.each(config.less, function (src, out) {
    var options = _.isObject(src) ? src : {};
    var src = src.src || src;
    var name = 'less-' + out;
    lessTasks.push(name);
    gulp.task(name, less(src, out, options));
  });
  gulp.task('less', lessTasks);

  gulp.task('css-compile', function () {
    return gulp.src(config.build + path.sep + '**/*.css')
      .pipe(gulpConcat('app.min.css'))
      .pipe(
        gulpLess({
          cleancss: true
        })
        .on('error', gulpUtil.log)
      )
      .pipe(gulp.dest(config.compile));
  });

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
              fs.writeFile(myOut, 'angular.module(\'' + module + '\',[]);', function (err) {
                gulpConnect.reload();
                callback(err);
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

    gulp.task(buildName, html(src, out, {
      version: '',
      styles: _.map(config.less, function (src, out) {
        return out;
      }),
      scripts: _.map(config.js, function (src, out) {
        return out;
      }).concat(_.map(config.angular, function (src, out) {
        return out;
      }))
    }));

    gulp.task(compileName, html(src, out, {
      version: '',
      styles: [
        'app.min.css'
      ],
      scripts: [
        'app.min.js'
      ]
    }));
  });
  gulp.task('html', buildTasks);

  // Assets:
  gulp.task('assets', function () {
    gulp.src('**', {
        cwd: 'src/assets',
        base: 'src'
      })
      .pipe(gulp.dest(config.build));
  });


  //
  // Utility tasks:
  //

  // Watch:
  gulp.task('watch', ['build'], function () {
    _.each(watches, function (options) {
      gulp.watch(options.src, options.tasks);
    });
    /*
    gulp.watch(config.app_files.less, ['less']);
    gulp.watch(config.app_files.ctpl, ['templates-common']);
    */
  });

  // Clean:
  gulp.task('clean', function (callback) {
    del([
      config.build,
      config.compile
    ], callback);
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
