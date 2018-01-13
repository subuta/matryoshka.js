import path from 'path'
import clearModule from 'clear-module'
import _ from 'lodash'
import madge from 'madge'

import createRunner from 'lib/runner'
import createWatcher from 'lib/utils/watcher'
import { absolutePath } from 'lib/utils/path'
import {
  ignore
} from 'lib/utils/match'

import {
  debug,
  toggleDebug
} from 'lib/utils/log'

import process from 'process'
import loadConfig from 'lib/utils/config'

import {
  parseDependencies
} from 'lib/utils/require'

// export createRunner for non-CLI usage.
export { createRunner }

// will called from dist/mat.js with opts.
const run = async (opts = {}) => {
  // opts take precedence configuration from file.
  opts = {
    ...loadConfig(),
    ..._.pickBy(opts, (v) => v !== undefined) // ignore undefined at opts.
  }

  const {
    singleRun = false,
    root = process.cwd(),
  } = opts

  // force keepConsole to true if debug.
  if (opts.debug === true) {
    debug('debug = ', opts.debug)
    toggleDebug(true)
    opts.keepConsole = true
  }

  // if it's called from module bundler(require/import)
  if (module.parent) return

  // transpile these by default.
  let packages = ['snippet*']
  if (opts.snippets) {
    if (_.isArray(opts.snippets)) {
      packages = opts.snippets
    } else if (_.includes(opts.snippets, ',')) {
      packages = opts.snippets.split(',')
    } else if (!_.isEmpty(opts.snippets)) {
      packages = [opts.snippets]
    }
  }

  const matcher = ignore(packages, root)

  // include babel-register for dynamic import.
  require('babel-register')({
    ignore: (filename) => {
      // ignore matched.
      if (matcher(filename)) {
        return true
      }
      debug('[transpile with babel] filename = ', filename)
      // transpile others.
      return false
    }
  })

  const runner = createRunner(opts)
  let generators = await runner.run()

  // skip watcher on singleRun
  if (singleRun) return process.exit(0)

  const handler = async function (filepath, watcherRoot) {
    const absGeneratorPaths = _.map(generators, (filepath) => absolutePath(filepath))

    const res = await madge(absGeneratorPaths, {
      baseDir: root,
      includeNpm: true
    })

    // clear changed modules from require cache.
    debug('absGeneratorPaths =', absGeneratorPaths)
    debug('skipped =', res.warnings())

    _.each(parseDependencies(res.obj(), filepath), (module) => {
      clearModule(path.resolve(watcherRoot, module))
      debug(`[clearModule] clear require.cache of '${module}'. (absolutePath = '${path.resolve(watcherRoot, module)}')`)
    })

    generators = await runner.run()
  }

  const watcher = createWatcher(packages, root, opts)

  watcher.on('change', handler)
  watcher.on('add', () => handler)
  watcher.on('delete', () => runner.run())
}

export default run
