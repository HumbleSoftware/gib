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
 *  - settle on recipes that depend on metadata from other tasks (html task)
 * TODO handle tasks with same type
 *  - need a way to combine output from disparate tasks
 *  - eg. js + coffee; js + compiled templates
 * TODO handle options for multi-plugin tasks
 *  - eg. js has angular, browserify, etc. options
 * TODO handle utility tasks such as clean, etc.
 *  - some type of semantics in the recipe metadata
 * TODO declarative interface for combining tasks
 *  - need a declarative interface for combining tasks
 *  - handles sourcemapping
 *  - compile (should there be disparate targets for dev, combined for compile?)
 * TODO global options/config
 *  - we want some way to declare global options and config
 *  - ability to pass these ase cli args at build time
 *  - stuff like sourcemaps on/off (even compile on/off)
 */

'use strict';

var _                         = require('lodash');
var gulp                      = require('gulp');
var gulpRunSequence           = require('run-sequence');
var gulpUtil                  = require('gulp-util');

// Gib tools:
var gulpRecipeLess            = require('./less-recipe');
var gulpRecipeJS              = require('./js-recipe');
var gulpRecipeAssets          = require('./assets-recipe');
var gulpRecipeNgTemplates     = require('./ng-templates-recipe');
var gulpRecipeIndex           = require('./index-recipe');
var gulpRecipeClean           = require('./clean-recipe');
var gulpRecipeServer          = require('./server-recipe');
var utils                     = require('./utils');

module.exports = function (config, gulp) {

  // Gulp instance:
  gulp = gulp || require('gulp');

  // Set up run sequence:
  gulpRunSequence = gulpRunSequence.use(gulp);

  //
  // Composite tasks:
  // 

  // Default:
  gulp.task('default', [
    'server',
    'watch'
  ]);

  // Build:
  gulp.task('build', function (callback) {
    return gulpRunSequence('clean', [
      'ng-templates',
      'less',
      'js',
      'assets',
      'index'
    ], callback);
  });

  // Compile:
  gulp.task('compile', function (callback) {
    return gulpRunSequence('clean', [
      'ng-templates-compile',
      'less-compile',
      'js-compile',
      'assets',
      'index-compile'
    ], callback);
  });


  //
  // Source tasks:
  // 

  // Map keys to recipes:
  var recipes = {
    'assets': gulpRecipeAssets,
    'js': gulpRecipeJS,
    'less': gulpRecipeLess,
    'ng-templates': gulpRecipeNgTemplates
  };

  // Register gulp tasks:
  var watches = [];
  _.each([
    'js',
    'less',
    'assets',
    'ng-templates'
  ], function (name) {
    var tasks = utils.registerSourceTasks(name, recipes[name], config, null, gulp);
    if (tasks.dev) {
      gulp.task(name, tasks.dev);
    }
    if (tasks.compile) {
      gulp.task(name + '-compile', tasks.compile);
    }
    watches = watches.concat(tasks.watch || []);
  });

  // Index task:
  (function () {
    var data = {
      styles: _.map(config.less, function (src, out) {
        return out;
      }),
      scripts: _.map(config.js, function (src, out) {
        return out;
      }).concat(_.map(config['ng-templates'], function (src, out) {
        return out;
      }))
    };
    var tasks = utils.registerSourceTasks('index', gulpRecipeIndex, config, {
      buildData: data,
      compileData: data
    }, gulp);
    gulp.task('index', tasks.dev);
    gulp.task('index-compile', tasks.compile);
    watches = watches.concat(tasks.watch || []);
  })();

  // Watch:
  gulp.task('watch', ['build'], function () {
    _.each(watches, function (options) {
      gulp.watch(options.src, options.tasks);
    });
  });

  gulpRecipeClean({
    patterns: [config.build, config.compile]
  }, gulp);

  gulpRecipeServer(null, gulp);
};
