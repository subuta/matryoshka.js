import path from 'path'
import clearModule from 'clear-module'
import _ from 'lodash'
import madge from 'madge'

import multimatch from 'multimatch'
import createRunner from 'lib/runner'
import watcher from 'lib/utils/watcher'
import { absolutePath } from 'lib/utils/path'
import {
  debug
} from 'lib/utils/log'

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
  } = opts

  // transpile these by default.
  let snippets = ['!**/snippet*/**/*', '**/snippet*/node_modules/**/*']

  if (opts.snippets) {
    if (_.includes(opts.snippets, ',')) {
      snippets = opts.snippets.split(',')
    } else if (!_.isEmpty(opts.snippets)) {
      snippets = [`!**/${opts.snippets}`]
    }
  }

  // transpile non node_modules files by default.
  snippets = _.uniq(['**/node_modules/**/*', ...snippets])

  // include babel-register for dynamic import.
  require('babel-register')({
    ignore: (filename) => {
      // ignore matched.
      if (!_.isEmpty(multimatch(filename, snippets))) {
        return true
      }
      debug('babel-register filename = ', filename)
      // transpile others.
      return false
    }
  })

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
    debug('absGeneratorPaths =', absGeneratorPaths)
    debug('skipped =', res.warnings().skipped)

    _.each(parseDependencies(res.obj(), filepath), (module) => {
      clearModule(absolutePath(path.join(generator, module)))
      debug(`[clearModule] clear require.cache of '${module}'. (absolutePath = '${absolutePath(path.join(generator, module))}')`)
    })

    generators = await runner.run()
  }

  watcher.on('change', handler)
  watcher.on('add', () => handler)
  watcher.on('delete', () => runner.run())
}

export default run
