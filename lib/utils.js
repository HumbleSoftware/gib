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
  registerSourceTasks : function (name, recipe, config) {
    return _.reduce(config[name], function (p, src, out) {

      // Config:
      var options = _.isObject(src) ? src : {};
      src = src.src || src;
      name = name + '-' + out;

      // Register gulp tasks:
      recipe({
        name: name,
        src: src,
        out: out,
        options: options,
        build: config.build,
        compile: config.compile
      });

      // Task aggregation:
      p.dev.push(name);
      p.compile.push(name + '-compile');
      p.watch.push({
        src: options.watch || src,
        tasks: [name]
      });

      return p;

    }, utils.createConfig());
  }
};
