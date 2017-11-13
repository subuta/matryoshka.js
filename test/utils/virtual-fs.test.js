import test from 'ava'
import crypto from 'crypto'
import _ from 'lodash'

import { actionType, actions } from 'lib/utils/virtual-fs'

import { absolutePath } from 'test/helper';
const proxyquire = require('proxyquire').noCallThru();

test.beforeEach((t) => {
  const createVfs = proxyquire(absolutePath('lib/utils/virtual-fs'), {}).default;
  const vfs = createVfs()
  t.deepEqual(vfs.getState(), {
    pending: []
  })

  t.context.vfs = vfs
})

test.afterEach((t) => {

})

test('writeFile should append writeFile action', async (t) => {
  const { vfs } = t.context

  vfs.dispatch(actions.writeFile('hoge.js', `const hoge = 'fuga'`))

  t.deepEqual(vfs.getState(), {
    pending: [
      {
        type: actionType.WRITE_FILE,
        payload: {
          fileName: 'hoge.js',
          data: `const hoge = 'fuga'`
        }
      }
    ]
  })
})
