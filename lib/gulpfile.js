/**
 * Gib setup:
 *
 * TODO watchers
 *  - pass around watch tasks as well
 *  - handle special watch cases such as browserify
 * TODO source task dependencies
 *  - handle (optional) helper tasks for source tasks eg. linting
 * TODO recipes document tasks
 *  - recipes should return a list of tasks created
 *  - recipes should describe metadata about a task
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
var gulpChanged               = require('gulp-changed');
var gulpRename                = require('gulp-rename');
var gulpUsing                 = require('gulp-using');
var gulpNewer                 = require('gulp-newer');
var gulpAngularTemplatecache  = require('gulp-angular-templatecache');
var gulpFile                  = require('gulp-file');
var gulpChmod                 = require('gulp-chmod');
var gulpRunSequence           = require('run-sequence');
var gulpTemplate              = require('gulp-template');
var gulpUtil                  = require('gulp-util');
var mkdirp                    = require('mkdirp');

// Gib tools:
var gulpRecipeLess            = require('./less-recipe');
var gulpRecipeJS              = require('./js-recipe');
var gulpRecipeAssets          = require('./assets-recipe');
var utils                     = require('./utils');

module.exports = function (config, gulp) {

  gulp = gulp || require('gulp');
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

  var watchCallbacks = [];

  // Map keys to recipes:
  var recipes = {
    assets: gulpRecipeAssets,
    js: gulpRecipeJS,
    less: gulpRecipeLess
  };

  // Register gulp tasks:
  var watches = [];
  _.each([
    'js',
    'less',
    'assets'
  ], function (name) {
    var tasks = utils.registerSourceTasks(name, recipes[name], config);
    if (tasks.dev) {
      gulp.task(name, tasks.dev);
    }
    if (tasks.compile) {
      gulp.task(name + '-compile', tasks.compile);
    }
    watches = watches.concat(tasks.watch || []);
  });

  // Templates:
  var angularTasks = _.reduce(config.angular, function (tasks, src, out) {
    var name = 'ng-templates-' + out;
    var options = _.isObject(src) ? src : {};
    src = src.src || src;
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
          hasFiles = true;
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
    };
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
    };
  }
  var buildTasks = [];
  var compileTasks = [];
  _.each(config.html, function (src, out) {
    var options = _.isObject(src) ? src : {};
    src = src.src || src;

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

};
