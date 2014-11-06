/**
 * Gib Utils
 */

var _ = require('lodash');

/**
 * Utils export
 */
var utils = module.exports = {

  /**
   * Create an empty gib tasks config.
   */
  createConfig: function () {
    return {
      dev: [],
      compile: [],
      watch: []
    };
  },

  /**
   * Register source manipulation tasks.
   *
   * This registers source manipulation tasks and creates an aggregate
   */
  registerSourceTasks : function (name, recipe, config, extension, gulp) {
    return _.reduce(config[name], function (p, src, out) {

      // Config:
      var options = _.isObject(src) ? src : {};
      var taskName = name + '-' + out;
      src = src.src || src;
      var recipeConfig = {
        name: taskName,
        src: src,
        out: out,
        options: options,
        build: config.build,
        compile: config.compile
      };

      // Extension with blacklist:
      _.extend(recipeConfig, extension, _.omit(options, _.keys(recipeConfig)));

      // Register gulp tasks:
      recipe(recipeConfig, gulp);

      // Task aggregation:
      p.dev.push(taskName);
      p.compile.push(taskName + '-compile');
      p.watch.push({
        src: options.watch || src,
        tasks: [taskName]
      });

      return p;

    }, utils.createConfig());
  }
};
