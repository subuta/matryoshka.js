import requireGlob from 'require-glob'
import _ from 'lodash'

import path from 'path'
import fs from './lib/utils/fs'

import watcher from './lib/watcher'

// destination directory
const GENERATOR_DIR = path.resolve(__dirname, 'generators')
const DEST_DIR = path.resolve(__dirname, 'webapp')

const callModule = (modules, parentFilePath) => {
  const promises = _.flattenDeep(_.map(modules, (value, key) => {
    const filePath = parentFilePath ? `${parentFilePath}/${key}` : key
    const isModule = _.isPlainObject(value) && !_.isEmpty(value)
    // call children if module has children.
    if (isModule) return callModule(value, filePath)

    let data = ''
    if (_.isFunction(value)) {
      data = value()
    } else {
      data = value
    }

    console.log(`trying to generate ${filePath}.js`);
    console.log('data =', data);
    return fs.writeFile(path.join(DEST_DIR, `${filePath}.js`), data)
  }))
  return Promise.all(promises)
}

const callGenerators = () => {
  requireGlob(['generators/**/*.js']).then((modules) => {
    callModule(modules).then(() => {
      console.log('done generating files, at', new Date());
    })
  })
}

callGenerators()

watcher.on('change', function (filepath, root, stat) {
  // delete cache of changed module.
  // FIXME: https://stackoverflow.com/questions/42376161/is-it-possible-to-get-a-different-scope-for-a-required-file/42377173#42377173
  delete require.cache[path.resolve(GENERATOR_DIR, filepath)]
  console.log('file changed', filepath)
  _.delay(() => {
    callGenerators()
  });
})
