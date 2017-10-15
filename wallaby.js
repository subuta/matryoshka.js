const wallabify = require('wallabify')
const path = require('path')

const wallabyPostprocessor = wallabify(
  {
    // browserify options, such as
    // insertGlobals: false
  }
  // you may also pass an initializer function to chain other
  // browserify options, such as transformers
  // , b => b.exclude('mkdirp').transform(require('babelify'))
)

module.exports = function (wallaby) {
  return {
    files: [
      {pattern: 'lib/**/*.js', load: false},
      {pattern: 'test/helper.js', load: false}
    ],

    tests: [
      {pattern: 'test/**/*.test.js', load: false}
    ],

    testFramework: 'mocha',

    env: {
      kind: 'electron',
      params: {
        env: 'NODE_ENV=test;NODE_PATH=' + path.join(wallaby.projectCacheDir, '../')
      }
    },

    compilers: {
      '**/*.js': wallaby.compilers.babel({
        babelrc: true,
        'presets': [
          'babel-preset-power-assert'
        ],
        'plugins': [
          ['module-resolver',
            {
              'root': ['./'],
              'alias': {
                'test': './test'
              }
            }
          ]
        ]
      })
    },

    postprocessor: wallabyPostprocessor,

    setup: function () {
      // required to trigger tests loading
      window.__moduleBundler.loadTests()
    }
  }
}
