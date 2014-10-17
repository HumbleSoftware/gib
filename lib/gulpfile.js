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
      'templates-common',
      'less',
      'js',
      'js-vendor',
      'assets',
      'index'
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

  gulp.task('js', ['js-lint'], function () {
    return gulp.src(config.app_files.js)
      .pipe(gulpCached('js'))
      .pipe(gulpSourcemaps.init())
      .pipe(gulpConcat('app.js'))
      .pipe(gulpSourcemaps.write())
      .pipe(gulp.dest(config.build_dir))
      .pipe(gulpConnect.reload());
  });

  gulp.task('js-vendor', function () {
    return gulp.src(config.vendor_files.js)
      .pipe(gulpConcat('app-vendor.js'))
      .pipe(gulp.dest(config.build_dir))
      .pipe(gulpConnect.reload());
  });

  gulp.task('js-compile', function () {
    return gulp.src([
        config.build_dir + path.sep + 'app-vendor.js',
        config.build_dir + path.sep + '**/*.js'
      ])
      .pipe(gulpNgAnnotate())
      .pipe(gulpConcat('app.min.js'))
      .pipe(gulpUglify())
      .pipe(gulp.dest(config.compile_dir));
  });

  gulp.task('less', function () {
    return gulp.src(config.app_files.less)
      .pipe(
        gulpLess({
        })
        .on('error', gulpUtil.log)
      )
      .pipe(gulpRename('app.css'))
      .pipe(gulp.dest(config.build_dir))
      .pipe(gulpConnect.reload());
  });

  gulp.task('css-compile', function () {
    return gulp.src(config.build_dir + path.sep + '**/*.css')
      .pipe(gulpConcat('app.min.css'))
      .pipe(
        gulpLess({
          cleancss: true
        })
        .on('error', gulpUtil.log)
      )
      .pipe(gulp.dest(config.compile_dir));
  });

  gulp.task('templates', function () {
    return gulp.src(config.app_files.atpl)
      .pipe(gulpAngularTemplatecache({
        root:   '',
        standalone: true,
        module: 'templates-app'
      }))
      .pipe(gulpRename('app-templates.js'))
      .pipe(gulp.dest(config.build_dir))
      .pipe(gulpConnect.reload());
  });

  gulp.task('templates-common', ['templates-common-cache'], function (callback) {
    var module = 'angular.module(\'templates-common\',[]);';
    var template = gulpCached['templates-common-cache'];
    var out = config.build_dir + path.sep + 'common-templates.js';
    fs.writeFile(out, module + template, function () {
      gulpConnect.reload();
      callback();
    });
  });

  gulp.task('templates-common-cache', function () {
    return gulp.src(config.app_files.ctpl)
      .pipe(gulpAngularTemplatecache({
        root:   '',
        module: 'templates-common'
      }))
      .pipe(gulpCached('templates-common-cache'));
  });

  gulp.task('index', function () {
    return gulp.src('src/index.html')
      .pipe(gulpTemplate({
        version: '',
        styles: [
          'app.css'
        ],
        scripts: [
          'app-vendor.js',
          'common-templates.js',
          'app-templates.js',
          'app.js'
        ]
      }))
      .pipe(gulp.dest(config.build_dir))
      .pipe(gulpConnect.reload());
  });

  gulp.task('index-compile', function () {
    return gulp.src('src/index.html')
      .pipe(gulpTemplate({
        version: '',
        styles: [
          'app.min.css'
        ],
        scripts: [
          'app.min.js'
        ]
      }))
      .pipe(gulp.dest(config.compile_dir));
  });

  gulp.task('js-lint', function () {
    var cacheName = 'js-hint';
    return gulp.src(config.app_files.js)
      .pipe(gulpCached(cacheName))
      .pipe(gulpJshint())
      // Remove hinting failures from the cache:
      .pipe(gulpCachedRemove(cacheName, function (file) {
        return !file.jshint.success;
      }))
      // Reporters:
      .pipe(gulpJshint.reporter('jshint-stylish'))
      .pipe(gulpJshint.reporter('fail'));
  });

  gulp.task('assets', function () {
    gulp.src('**', {
        cwd: 'src/assets',
        base: 'src'
      })
      .pipe(gulp.dest(config.build_dir));
  });


  //
  // Utility tasks:
  //

  // Watch:
  gulp.task('watch', ['build'], function () {
    gulp.watch(config.app_files.js, ['js']);
    gulp.watch(config.vendor_files.js, ['js-vendor']);
    gulp.watch(config.app_files.less, ['less']);
    gulp.watch(config.app_files.atpl, ['templates']);
    gulp.watch(config.app_files.ctpl, ['templates-common']);
  });

  // Clean:
  gulp.task('clean', function (callback) {
    del([
      config.build_dir,
      config.compile_dir
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
