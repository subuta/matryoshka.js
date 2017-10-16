import { toBuilder, print, format } from 'js-to-builder'
import _ from 'lodash'

import * as types from 'ast-types'
const {namedTypes: n, builders: b} = types

export default (ctx) => {
  const {filePath, fileName, fs} = ctx
  const data = format(`
  // ${new Date()}
  const hoge = 'fuga';
  `)

  return fs.writeFile(`${filePath}/${fileName}`, data)
}
