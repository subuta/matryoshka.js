import { toBuilder, print, format } from 'js-to-builder'
import _ from 'lodash'

import * as types from 'ast-types'
const {namedTypes: n, builders: b} = types

export default () => {
  const code = `
// ${new Date()}
const hoge = 'fuga';
`
  return format(code)
}
