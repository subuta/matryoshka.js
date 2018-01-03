require('babel-register') // include babel-register for dynamic import.

import path from 'path'
import clearModule from 'clear-module'
import _ from 'lodash'

import createRunner from 'lib/runner'
import watcher from 'lib/utils/watcher'
import { absolutePath } from 'lib/utils/path'
import madge from 'madge'

import {
  parseDependencies
} from 'lib/utils/require'

// export createRunner for non-CLI usage.
export { createRunner }

// will called from dist/mat.js with opts.
const run = async (opts = {}) => {
  const {
    generator = 'generators',
    singleRun = false,
    debug = false
  } = opts

  // if it's called from module bundler(require/import)
  if (module.parent) return

  const runner = createRunner(opts)
  let generators = await runner.run()

  // skip watcher on singleRun
  if (singleRun) return process.exit(0)

  const handler = async function (filepath, root, stat) {
    const absGeneratorPaths = _.map(generators, (filepath) => absolutePath(filepath))
    const res = await madge(absGeneratorPaths)

    // clear changed modules from require cache.
    if (debug) {
      console.log('absGeneratorPaths =', absGeneratorPaths);
      console.log('skipped =', res.warnings().skipped);
    }

    _.each(parseDependencies(res.obj(), filepath), (module) => {
      clearModule(absolutePath(path.join(generator, module)))
      if (debug) {
        console.log(`[clearModule] clear require.cache of '${module}'. (absolutePath = '${absolutePath(path.join(generator, module))}')`);
      }
    })

    generators = await runner.run()
  }

  watcher.on('change', handler)
  watcher.on('add', () => handler)
  watcher.on('delete', () => runner.run())
}

export default run
