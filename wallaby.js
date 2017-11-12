const babel = require('babel-core');
const path = require('path')

module.exports = function (wallaby) {
  return {
    files: [
      'lib/**/*.js',
      'test/fixtures/**/*.js',
      'test/helper.js'
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

    testFramework: 'ava'
  }
}
