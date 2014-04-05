module.exports = function (grunt) {
  'use strict';
  /*jshint -W107 */

  require('source-map-support').install();

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-concat-sourcemap');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-regex-replace');
  grunt.loadNpmTasks('grunt-mocha');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      options: grunt.util._.extend(grunt.file.readJSON('.jshintrc'), {
        reporter: './node_modules/jshint-path-reporter'
      }),
      support: {
        options: {
          node: true
        },
        src: ['Gruntfile.js']
      },
      source: ['src/parsimmon.js'],
      test: {
        src: ['test/**/*.js']
      }
    },
    mochaTest: {
      options: {
        reporter: 'mocha-unfunk-reporter',
        require: 'test/intro.js',
        ui: 'tdd'
      },
      specs: ['test/*.test.js']
    },
    mocha: {
      options: {
        run: true,
        reporter: 'Dot'
      },
      specs: ['test/*.html']
    },
    clean: {
      build: ['build/*.js', 'build/*.js.map']
    },
    'regex-replace': {
      build: {
        src: ['build/**/*.js'],
        actions: [
          {
            name: 'map',
            search: '\r?\n?\\\/\\\/# sourceMappingURL=.*',
            replace: '',
            flags: 'g'
          }
        ]
      }
    },
    concat_sourcemap: {
      options: {
        sourceRoot: '../'
      },
      browser: {
        files: {
          'build/parsimmon.browser.js': [
            'src/browser/pre.js',
            'node_modules/pjs/src/p.js',
            'src/parsimmon.js',
            'src/browser/post.js'
          ]
        }
      },
      commonjs: {
        files: {
          'build/parsimmon.commonjs.js': [
            'src/commonjs/pre.js',
            'src/parsimmon.js',
            'src/commonjs/post.js'
          ]
        }
      }
    },
    uglify: {
      options: {},
      browser: {
        files: {
          'build/parsimmon.browser.min.js': ['build/parsimmon.browser.js']
        }
      }
    }
  });

  grunt.registerTask('prep', [
    'clean:build',
    'jshint:support'
  ]);

  grunt.registerTask('build', [
    'prep',
    'concat_sourcemap:browser',
    'concat_sourcemap:commonjs',
    'uglify:browser',
  ]);

  grunt.registerTask('test', [
    'build',
    // 'jshint:source',
    // 'jshint:test',
    'mochaTest:specs',
    'mocha:specs',
  ]);

  grunt.registerTask('dist', [
    'build',
    "regex-replace:build"
    // add grunt-release (or grunt-bump etc) task
  ]);

  grunt.registerTask('dev', ['ts:typings']);

  grunt.registerTask('default', ['build']);
};
