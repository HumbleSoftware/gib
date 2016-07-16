'use strict';

//var gulp = require('gulp');

var camelCase    = require('camelcase');
var EventEmitter = require('events');
var gutil        = require('gulp-util');
var pkgUp        = require('pkg-up');


module.exports = gib;


gib.autoload = autoload;


function gib (gulp, options) {

  var options  = config(options);
  var registry = autoload();
  var recipes  = registry.all();
  var server   = recipes['server'];
  var tasks    = [];
  var watches  = {};


  // Recipe tasks:
  Object.keys(options).sort().forEach(function (key) {

    var recipe        = recipes[key]
    var recipeOptions = options[key];
    var taskName      = key;
    var taskKey       = taskName + 'Task';
    var watchName     = taskName + '-watch';

    if (recipe[taskKey]) {

      gulp.task(taskName, recipe[taskKey](recipeOptions));
      tasks.push(taskName);

      // Add recipe watch task:
      if (recipe.watch) {
        console.log('Adding task ' + watchName + '...');
        gulp.task(watchName, [taskName], registry.refresh)
        tasks.push(taskName);
        watches[watchName] = recipeOptions.src;
      }
    }
  });


  // Watch task:
  if (Object.keys(watches).length) {
    console.log('Adding task watch...');
    gulp.task('watch', function () {
      Object.keys(watches).forEach(function (watchName) {
        console.log('watching... ' + watchName);
        gulp.watch(watches[watchName], [watchName]);
      });
    })
    tasks.push('watch');
  }


  // Default task:
  gulp.task('default', tasks);


  return recipes;
}


function config (options) {
  options = options || {};
  return options;
}


function autoload () {

  var config = require(pkgUp.sync());
  var searchKeys = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']
  var recipes = new Registry();

  searchKeys
    // Get packages names:
    .reduce(function (p, searchKey) {
      var dependencies = config[searchKey] || [];
      return p.concat(Array.isArray(dependencies) ? dependencies : Object.keys(dependencies));
    }, [])
    // Filter for recipe names:
    .filter(function (packageName) {
      return /^gib-recipe-.*/.test(packageName);
    })
    // Load recipes:
    .forEach(function (recipeName) {
      recipes.register(recipeName, require(recipeName));
    });

  return recipes;
}


function Registry () {

  var bus = new EventEmitter();
  var registry = {};

  /**
   * Trigger a browser refresh.
   */
  bus.refresh = function () {
    return registry.server.refresh();
  };

  /**
   * Trigger a browser refresh from stream changes.
   */
  bus.refreshStream = function () {
    if (registry.server) {
      return registry.server.refreshStream();
    }
  };

  /**
   * Handle an error.
   */
  bus.error = function (error) {
    gutil.log(error.message);
    bus.emit('notify-error', error.message, 'Error');
    this.emit('end');
  };

  /**
   * Handle a log.
   */
  bus.log = function (message) {
    gutil.log(message);
  };



  return {

    /**
     * Regurn registry copy.
     */
    all: function () {
      return Object.assign({}, registry);
    },

    refresh: function () {
      return bus.refresh();
    },

    /**
     * Register a recipe
     */
    register: function (name, recipe) {
      // Fancy name:
      // gib-recipe-fancy-pants -> fancyPants
      name = camelCase.apply(camelCase, name.split('-').slice(2));
      registry[name] = recipe;
      if (typeof recipe.register === 'function') {
        recipe.register(bus);
      }
    }
  };
}
