require("babel-register") // include babel-register for dynamic import.

import createRunner from 'lib/runner'
import watcher from 'lib/utils/watcher'
import { remove } from 'lib/utils/fs'

// call runner.run immediately if it's called from node.js cli.
(async () => {
  // if it's called from module(require/import)
  if (module.parent) return

  // remove dest dir at start.
  const dest = 'src'
  await remove(dest)

  const runner = createRunner({ dest })
  await runner.run()
  console.log(runner.ls());

  watcher.on('change', async function (filepath, root, stat) {
    console.log('file changed', filepath)
    await runner.run()
    console.log(runner.ls());
  })
})()

export default createRunner
