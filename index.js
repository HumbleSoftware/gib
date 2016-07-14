'use strict';

//var gulp = require('gulp');

var pkgUp = require('pkg-up');
var camelCase = require('camelcase');

module.exports = {
  autoload: autoload
  /*
  gulp: gulp,
  gulpfile: require('./lib/gulpfile.js')
  */
};



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

  var bus = {

    /**
     * Trigger a browser refresh.
     */
    refresh: function () {

    },

    /**
     * Trigger a browser refresh from stream changes.
     */
    refreshStream: function () {
      if (registry.server) {
        return registry.server.refreshStream();
      }
    }
  };

  var registry = {

  };

  return {

    /**
     * Regurn registry copy.
     */
    all: function () {
      return Object.assign({}, registry);
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

