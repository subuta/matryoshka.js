import requireGlob from 'require-glob'
import _ from 'lodash'

import path from 'path'
import fs from './lib/utils/fs'

import watcher from './lib/watcher'

// destination directory
const DEST_DIR = path.resolve(__dirname, 'webapp')

const generateFile = () => {
  requireGlob(['generators/**/*.js']).then((modules) => {
    const promise = Promise.all(_.map(modules, (fn, fileName) => {
      return fs.writeFile(path.resolve(DEST_DIR, `${fileName}.js`), fn())
    }))
    promise.then(() => {
      console.log('done generate code.', new Date())
    })
  })
}

generateFile()

watcher.on('change', function (filepath, root, stat) {
  console.log('file changed', filepath)
  generateFile()
})
