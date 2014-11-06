var gib = require('gib');
var gulp = require('gulp');
var pkg = require('./package');
var config = {
  build: 'build',
  compile: 'bin',
  js: {
    'app-vendor.js': [
      'vendor/angular/angular.js',
      'vendor/angular-bootstrap/ui-bootstrap-tpls.min.js',
      'vendor/placeholders/angular-placeholders-0.0.1-SNAPSHOT.min.js',
      'vendor/angular-ui-router/release/angular-ui-router.js',
      'vendor/angular-ui-utils/modules/route/route.js'
    ],
    'app.js': {
      hint: true,
      angular: true,
      src: [
        'src/**/*.js',
        '!src/**/*.spec.js',
        '!src/assets/**/*.js'
      ],
    }
  },
  assets: {
    'assets/': 'src/assets/**/*'
  },
  'ng-templates': {
    'app-templates.js': {
      module: 'templates-app',
      standalone: true,
      src: [ 'src/app/**/*.tpl.html' ]
    },
    'common-templates.js': {
      module: 'templates-common',
      standalone: true,
      src: [ 'src/common/**/*.tpl.html' ]
    }
  },
  index: {
    'index.html': {
      data: {
        version: pkg.version
      },
      src: 'src/index.html'
    }
  },
  less: {
    'app.css': {
      watch: 'src/**/*.less',
      src: 'src/less/main.less'
    }
  }
};

// Populate gulp file:
gib.gulpfile(config, gulp);
