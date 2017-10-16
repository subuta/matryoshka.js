import { toBuilder, print } from 'js-to-builder'
import _ from 'lodash'

import * as types from 'ast-types'
const {namedTypes: n, builders: b} = types

export default (ctx) => {
  const { filePath, fileName, fs } = ctx

  const defs = _.map([['hoge', 'fuga'], ['fuga', 'piyo'], ['piyo', 'hoge']], (pair) => {
    return b.variableDeclaration('const', [
      b.variableDeclarator(
        b.identifier(pair[0]),
        b.literal(pair[1])
      )
    ])
  })

  const data = print([
    b.importDeclaration(
      [
        b.importNamespaceSpecifier(
          b.identifier('types')
        )
      ],
      b.literal('ast-types')
    ),
    b.variableDeclaration('const', [
      b.variableDeclarator(
        b.objectPattern([
          Object.assign(
            b.property(
              'init',
              b.identifier('namedTypes'),
              b.identifier('n')
            ),
            {
              method: false,
              shorthand: false,
              computed: false
            }
          ),
          Object.assign(
            b.property(
              'init',
              b.identifier('builders'),
              b.identifier('b')
            ),
            {
              method: false,
              shorthand: false,
              computed: false
            }
          )
        ]),
        b.identifier('types')
      )
    ]),
    // Mon Oct 16 2017 21:35:23 GMT+0900 (JST)
    ...defs
  ])

  return fs.writeFile(`${filePath}/${fileName}`, data)
}
