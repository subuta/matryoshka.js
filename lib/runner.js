import _ from 'lodash'

import requireGlob from 'lib/utils/require'
import createVfs from 'lib/utils/virtual-fs'
import path from 'path'
import Promise from 'bluebird'

const isNode = typeof window === 'undefined'

export default function createRunner (opts = {}) {
  // generator directory path from project root.
  const generator = opts.generator || 'generators'
  const dest = opts.dest || 'src'

  const {
    dryRun = false, // skip fs
    include = [path.join(generator, '**/*.js'), '!**/_*/**']
  } = opts

  // force dryRun on browser env.
  const vfs = createVfs({dryRun: isNode ? dryRun : true})


  const run = async () => {
    console.log('[start] matryoshka.js runner');
    const generators = await requireGlob(include) // require matched modules.
    const promises = _.map(generators, async (fn, modulePath) => {
      let filePath = modulePath.replace(generator, '') // get relative path of file
      let destFilePath = path.join(dest, filePath)
      console.log(`[start] generation of ${destFilePath}`);

      // Shared context of generator Function.
      const ctx = {
        filePath: path.dirname(destFilePath),
        fileName: path.basename(destFilePath),
        moduleName: path.basename(destFilePath, '.js'),
        fs: {
          writeFile: vfs.writeFile
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

      console.log(`[end] generation of ${destFilePath}`);
      return result
    })

    await Promise.map(promises, (promise) => promise, {concurrency: 1})
    await vfs.perform()
    console.log('[end] matryoshka.js runner');
  }

  return {
    run,
    ls: vfs.ls
  }
}
