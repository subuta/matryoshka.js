require('babel-register') // include babel-register for dynamic import.

import path from 'path'
import importFresh from 'import-fresh'

import createRunner from 'lib/runner'
import watcher from 'lib/utils/watcher'
import { absolutePath } from 'lib/utils/path'

// call runner.run immediately if it's called from node.js cli.
(async () => {
  // if it's called from module(require/import)
  if (module.parent) return

  const dest = 'src'
  const generator = 'generators'

  // await remove(dest)

  const runner = createRunner({dest, generator})
  await runner.run()

  watcher.on('change', async function (filepath, root, stat) {
    // import changed file once for refresh cache.
    await importFresh(absolutePath(path.join(generator, filepath)))
    await runner.run()
  })
})()

export default createRunner
