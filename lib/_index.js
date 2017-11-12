import requireGlob from 'require-glob'
import _ from 'lodash'

import path from 'path'
import fs from './utils/fs'

import watcher from './utils/watcher'

// destination directory
const GENERATOR_DIR = path.resolve(__dirname, 'generators')
const DEST_DIR = path.resolve(__dirname, 'webapp')

const callModule = (modules, parentFilePath) => {
  const promises = _.flattenDeep(_.map(modules, async (value, key) => {
    const filePath = parentFilePath ? `${parentFilePath}/${key}` : key
    const isModule = _.isPlainObject(value) && !_.isEmpty(value)
    // call children if module has children.
    if (isModule) return callModule(value, filePath)

    const fileName = path.join(DEST_DIR, `${filePath}.js`)

    // Shared context of generator Function.
    const ctx = {
      filePath: path.dirname(fileName),
      fileName: path.basename(fileName),
      moduleName: path.basename(fileName, '.js'),
      fs
    }

    if (_.isFunction(value)) {
      try {
        return await value(ctx)
      } catch (e) {
        console.error('compile error', e);
        return Promise.resolve()
      }
    }

    return fs.writeFile(path.join(DEST_DIR, `${filePath}.js`), value)
  }))
  return Promise.all(promises)
}

const callGenerators = async () => {
  // TODO: virtual-dom的な、ファイルシステムレベルでの差分を判定して削除・追加・更新する機能
  // 現状は全削除して、全追加のみとする。
  // clear previously generated files.
  await fs.remove('webapp/**/*.js')
  requireGlob(['generators/**/*.js', '!**/_*/**']).then((modules) => {
    callModule(modules).then(() => {
      console.log('done generating files, at', new Date())
    })
  })
}

callGenerators()

watcher.on('change', function (filepath, root, stat) {
  // delete cache of changed module.
  // FIXME: performance issue? https://stackoverflow.com/questions/42376161/is-it-possible-to-get-a-different-scope-for-a-required-file/42377173#42377173
  delete require.cache[path.resolve(GENERATOR_DIR, filepath)]
  console.log('file changed', filepath)
  _.delay(() => {
    callGenerators()
  })
})
