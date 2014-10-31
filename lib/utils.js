/**
 * Gib Utils
 */

module.exports = {

  /**
   * Create an empty gib tasks config.
   */
  createConfig: function () {
    return {
      dev: [],
      compile: [],
      watch: []
    };
  }
};
