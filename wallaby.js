const babel = require('babel-core');
const path = require('path')

module.exports = function (wallaby) {
  return {
    files: [
      'lib/**/*.js',
      'test/src/**/*.js',
      'test/generators/**/*.js',
      'test/helper.js',
      'test/fixtures/fresh.js',
      { pattern: 'test/fixtures/generated/**/*.js', instrument: false }
    ],

    tests: [
      'test/**/*.test.js'
    ],

    env: {
      type: 'node',
      runner: 'node',
      params: {
        env: 'NODE_ENV=test;NODE_PATH=' + path.join(wallaby.projectCacheDir, '../')
      }
    },

    compilers: {
      '**/*.js': wallaby.compilers.babel({
        babel,
        babelrc: true,
        plugins: [
          ['module-resolver',
            {
              root: ['./'],
              alias: {
                test: './test',
              },
            },
          ],
        ],
      }),
    },

    testFramework: 'ava',

    setup: function() {
      require("babel-register")
    }
  }
}
