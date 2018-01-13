const process = require('process')

module.exports = {
  // destination directory name `default: src`'
  dest: 'src',

  // generator directory name `default: generators`
  generator: 'generators',

  // force clean destination directory at first run `default: false`
  clean: false,

  // the snippets to watch and transpile `default: []`
  snippets: [
    '@subuta/snippets'
  ],

  // single run (no-watch) `default: false`
  singleRun: false,

  // path of root `default: process.cwd()`
  root: process.cwd(),

  // not clear console at each run `default: false`
  keepConsole: false,

  // show debug message `default: false`
  debug: false
}
