require('babel-register') // include babel-register for dynamic import.

import path from 'path'
import importFresh from 'import-fresh'

import createRunner from 'lib/runner'
import watcher from 'lib/utils/watcher'
import { absolutePath } from 'lib/utils/path'

// export createRunner for non-CLI usage.
export { createRunner }

// will called from dist/mat.js with opts.
const run = async (opts = {}) => {
  const {
    dest = 'src',
    generator = 'generators',
    singleRun = false, // watch by default.
    clean = false // disable clean by default.
  } = opts

  // if it's called from module bundler(require/import)
  if (module.parent) return

  const runner = createRunner({dest, generator, clean})
  await runner.run()

  // skip watcher on singleRun
  if (singleRun) return process.exit(0)

  watcher.on('change', async function (filepath, root, stat) {
    // import changed file once for refresh cache.
    await importFresh(absolutePath(path.join(generator, filepath)))
    await runner.run()
  })
}

export default run
