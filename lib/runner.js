import _ from 'lodash'

import requireGlob from 'lib/utils/require'
import createVfs from 'lib/utils/virtual-fs'
import path from 'path'
import Promise from 'bluebird'
import chalk from 'chalk'
import os from 'os'

import { wrapPragma } from 'lib/utils/mat'
import { listFiles } from './utils/fs'

const isNode = typeof window === 'undefined'

// decorate tree output
const decorateTree = (tree) => {
  return _.map(tree.split(os.EOL), (line) => {
    return line.replace(/(^.*\[\S+\].*$)/g, chalk`{red $1}`)
  }).join(os.EOL)
}

// clear console (like command+k)
const clearConsole = (keepConsole = false) => {
  if (keepConsole) return
  console.log('\x1Bc')
}

export default function createRunner (opts = {}) {
  // generator directory path from project root.
  const generator = opts.generator || 'generators'
  const dest = opts.dest || 'src'
  const clean = opts.clean || false
  const debug = opts.debug || false
  let keepConsole = opts.keepConsole || false

  // force keepConsole to true if debug.
  if (debug) {
    console.log('debug = ', debug);
    keepConsole = true
  }

  let include = [path.join(generator, '**/*.js'), '!**/_*/**']

  const {
    dryRun = false // skip fs
  } = opts

  // force dryRun on browser env.
  const vfs = createVfs({dryRun: isNode ? dryRun : true})

  const run = async () => {
    clearConsole(keepConsole)
    console.log(chalk`{bgGreenBright.rgb(255,255,255)  START } {green matryoshka.js runner}`)

    await vfs.mount(dest, clean)

    const files = await listFiles(include)
    const generators = await requireGlob(files) // require matched modules.
    const promises = _.map(generators, async (fn, modulePath) => {
      let filePath = modulePath.replace(generator, '') // get relative path of file
      let destFilePath = path.join(dest, filePath)

      // if add module-exports is not loaded.
      if (fn.default) {
        fn = fn.default
      }

      console.log(`[start] generation of ${destFilePath}`)

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
        try {
          result = await fn(ctx)
        } catch (e) {
          console.error('compile error', e)
        }
      } else {
        result = await vfs.writeFile(destFilePath, fn)
      }

      console.log(`[end] generation of ${destFilePath}`)
      return result
    })

    await Promise.all(promises)
    await vfs.perform(false, clean)

    console.log('===========================')
    console.log(decorateTree(vfs.ls()))
    console.log('===========================')

    console.log(chalk`{bgGreenBright.rgb(255,255,255)  END } {green matryoshka.js runner}`)

    return files
  }

  return {
    run,
    ls: vfs.ls
  }
}
