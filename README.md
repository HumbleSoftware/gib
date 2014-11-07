Gib - A Build Tool
==================

Gib is a build tool for static assets inspired by NGBP, Brunch and Grunt.
Built on top of gulp, Gib is declaratively configured, favors convention and
is extensible.  It may be used in an existing gulp file and gulp tasks may be
created directly in a gibberish file.

# Examples

Gib is usable with gulp and has it's own CLI.  It is configured declaratively
using a plain old js object or JSON format called `gibberish`.  Gib will 
define several default tasks including: `build`, `compile`, `watch`, `server`.

## Gulp

You may use gib to declaratively configure tasks in your gulp file.  You may
continue using your own gulp tasks, extending your build as necessary.

### gulpfile.js

After installing gulp and gib, you may do `gulp` to start a development watcher.
`gulp compile` will produce production assets.

```javascript
var gib = require('gib');
var gulp = require('gulp');

// Gib configuration:
var config = {
  // Destination for built assets:
  build: 'build',
  js: {
    // JS target using browserify:
    'scripts/site.js': {
      browserify: true,
      src: './src/index.js'
    }
  },
  less: {
    // Less target for vendor assets:
    'styles/site-vendor.css': [
      '../vendor/styles/bootstrap/bootstrap.less',
      '../vendor/styles/font-awesome/font-awesome.less',
    ],
    // Less target using custom watch pattern and single entry:
    'styles/site.css': {
      watch: './**/*.less',
      src: './styles/index.less'
    }
  },
  // Misc. static assets:
  assets: {
    '': 'assets/**/*'
  },
  // Development index populated with js and css targets:
  index: {
    'index.html': './markup/index.html'
  }
};

// Populate gulp file:
gib.gulpfile(config, gulp);

// Extend build with custom gulp tasks here:

```

## Gib CLI

The Gib CLI reads a declarative config from a file `gibberish.js` by default.
All it does right now is run the default task: development build and watch.
We'll build out a clean interface soon; for now it is recommended to use Gib 
with gulp.

### gibberish.js

```javascript
module.exports = {
  // Destination for built assets:
  build: 'build',
  js: {
    // JS target using browserify:
    'scripts/site.js': {
      browserify: true,
      src: './src/index.js'
    }
  },
  less: {
    // Less target for vendor assets:
    'styles/site-vendor.css': [
      '../vendor/styles/bootstrap/bootstrap.less',
      '../vendor/styles/font-awesome/font-awesome.less',
    ],
    // Less target using custom watch pattern and single entry:
    'styles/site.css': {
      watch: './**/*.less',
      src: './styles/index.less'
    }
  },
  // Misc. static assets:
  assets: {
    '': 'assets/**/*'
  },
  // Development index populated with js and css targets:
  index: {
    'index.html': ./markup/index.html'
  }
};
```

## NGBP

Gib may be used to build a number of other projects, notably NGBP.  To try
this:

* `git clone https://github.com/ngbp/ngbp.git` clone ngbp
* `npm install --save-dev gib gulp` install gulp and gib
* copy the [ngbp config](https://github.com/HumbleSoftware/gib/blob/master/examples/ngbp-gulpfile.js) into the repository as `gulpfile.js`
* `gulp` start the development watcher
* navigate to http://localhost:8080/build/#/home


