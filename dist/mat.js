#!/usr/bin/env node

// this file as shebang for cli.
// https://stackoverflow.com/questions/33451784/how-can-i-use-babel-for-cli-program

const program = require('commander')

program
  .version('0.1.0')
  .description('watch your generator files and put generated files to dest on file changes :)')
  .option('-d, --dest <value>', 'destination directory name `default: src`')
  .option('-g, --generator <value>', 'generator directory name `default: generators`')
  .option('-c, --clean <value>', 'force clean destination directory at first run `default: false`')
  .option('-s, --single-run', 'single run (no-watch) `default: false`')
  .option('-k, --keep-console', 'not clear console at each run `default: false`')
  .option('-D, --debug', 'show debug message `default: false`')

program.parse(process.argv)

const dest = program.dest
const generator = program.generator
const singleRun = program.singleRun
const keepConsole = program.keepConsole
const clean = program.clean
const debug = program.debug

require('./main.js').default({
  dest,
  generator,
  singleRun,
  keepConsole,
  clean,
  debug
})
