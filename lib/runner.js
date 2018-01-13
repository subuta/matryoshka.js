import _ from 'lodash'

import path from 'path'
import Promise from 'bluebird'
import chalk from 'chalk'
import os from 'os'
import requireGlob from 'lib/utils/require'
import createVfs from 'lib/utils/virtual-fs'
import {
  log,
  debug,
  error,
  clearConsole
} from 'lib/utils/log'

import { listFiles } from './utils/fs'

const isNode = typeof window === 'undefined'
const EOL = os ? os.EOL : '\n'

// decorate tree output
const decorateTree = (tree) => {
  return _.map(tree.split(EOL), (line) => {
    return line.replace(/(^.*\[\S+\].*$)/g, chalk.red('$1'))
  }).join(EOL)
}

export default function createRunner (opts = {}) {
  // generator directory path from project root.
  const generator = opts.generator || 'generators'
  const dest = opts.dest || 'src'
  const clean = opts.clean || false
  let keepConsole = opts.keepConsole || false

  let include = [path.join(generator, '**/*.js'), '!**/_*/**']

  const {
    dryRun = false // skip fs
  } = opts

  // force dryRun on browser env.
  const vfs = createVfs({dryRun: isNode ? dryRun : true})

  // Force clear cache onError for keep old files.
  const onError = function (e) {
    vfs.clearCache()
    error(chalk.bold.red('[ERROR] matryoshka.js runner'))
    error(chalk.bold.red(e.stack + EOL))
  }

  const run = async () => {
    if (!keepConsole) {
      clearConsole()
    }

    log('[START] matryoshka.js runner')

    await vfs.mount(dest, clean)

    const files = await listFiles(include).catch(onError)
    const generators = await requireGlob(files).catch(onError) // require matched modules.
    const promises = _.map(generators, async (fn, modulePath) => {
      let filePath = modulePath.replace(generator, '') // get relative path of file
      let destFilePath = path.join(dest, filePath)

      // if add module-exports is not loaded.
      if (fn.default) {
        fn = fn.default
      }

      debug(`[start] generation of ${destFilePath}`)

      // Shared context of generator Function.
      const ctx = {
        filePath: path.dirname(destFilePath),
        fileName: path.basename(destFilePath),
        moduleName: path.basename(destFilePath, '.js'),
        fs: {
          // writeFile: vfs.writeFile
          writeFile: (fileName, data) => vfs.writeFile(fileName, data),
        }
      }

      let result = true
      if (_.isFunction(fn)) {
        result = await fn(ctx)
      } else {
        result = await vfs.writeFile(destFilePath, fn)
      }

      debug(`[end] generation of ${destFilePath}`)
      return result
    })

    await Promise.all(promises).catch(onError)
    await vfs.perform(false, clean)

    log('===========================')
    log(decorateTree(vfs.ls()))
    log('===========================')

    log('[END] matryoshka.js runner')

    return files
  }

  return {
    run,
    ls: vfs.ls
  }
}
