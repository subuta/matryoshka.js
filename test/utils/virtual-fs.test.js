import test from 'ava'
import _ from 'lodash'
import sinon from 'sinon'
import path from 'path'

const sandbox = sinon.sandbox.create()

import { actionType, actions, getFileHash } from 'lib/utils/virtual-fs'

import { absolutePath } from 'test/helper'
const proxyquire = require('proxyquire').noCallThru()

// replace and trim meta characters
const formatTree = (str) => _.trim(str, ' \n').replace(/[ \t\f\v]/g, '')

test.beforeEach((t) => {
  const dummyFs = {
    writeFile: sandbox.spy()
  }

  const createVfs = proxyquire(absolutePath('lib/utils/virtual-fs'), {
    './fs': dummyFs
  }).default

  const vfs = createVfs()

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: []
  })

  t.context.vfs = vfs
  t.context.dummyFs = dummyFs
})

test.afterEach((t) => {
  sandbox.reset()
})

test('writeFile should put writeFile action as pending', async (t) => {
  const {vfs} = t.context

  vfs.schedule(actions.writeFile('hoge.js', `const hoge = 'fuga'`))

  t.deepEqual(vfs.getState(), {
    pending: [
      {
        type: actionType.WRITE_FILE,
        payload: {
          hash: 'ee28a0715b09a871c859c26235c155d2',
          fileName: 'hoge.js',
          data: `const hoge = 'fuga'`
        }
      }
    ],
    cache: []
  })
})

test('getFileHash should generate hash by fileName + data', async (t) => {
  t.is(getFileHash({fileName: 'hoge.js', data:`const hoge = 'fuga'`}), 'ee28a0715b09a871c859c26235c155d2')
  t.is(getFileHash({fileName: 'hoge.js', data:`const hoge = 'piyo'`}), '85ba8a8c43258c84ee1cb319819733a9')
  t.is(getFileHash({fileName: 'piyo.js', data:`const hoge = 'fuga'`}), 'ede464194cfff0f118944e9e7bf97e9d')
})

test('perform should process pending task', async (t) => {
  const {vfs, dummyFs} = t.context

  const fileName = path.join('sample', 'hoge.js')
  vfs.schedule(actions.writeFile(fileName, `const hoge = 'fuga'`))

  t.deepEqual(vfs.getState(), {
    pending: [
      {
        type: actionType.WRITE_FILE,
        payload: {
          hash: 'a5c2f7399d39c62475b04459f9e3ba9b',
          fileName,
          data: `const hoge = 'fuga'`
        }
      }
    ],
    cache: []
  })

  t.is(dummyFs.writeFile.callCount, 0)
  vfs.perform()

  // should writeFile using fs.
  t.is(dummyFs.writeFile.callCount, 1)
  t.is(dummyFs.writeFile.calledWith(fileName, `const hoge = 'fuga'`), true)

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: 'a5c2f7399d39c62475b04459f9e3ba9b', fileName}
    ]
  })

  t.is(formatTree(vfs.ls()), formatTree(`
  └─ sample
     └─ hoge.js
  `))
})

test('perform should not process duplicated task', async (t) => {
  const {vfs, dummyFs} = t.context

  vfs.schedule(actions.writeFile('hoge.js', `const hoge = 'fuga'`))
  vfs.schedule(actions.writeFile('hoge.js', `const hoge = 'fuga'`))

  t.deepEqual(vfs.getState(), {
    pending: [
      {
        type: actionType.WRITE_FILE,
        payload: {
          hash: 'ee28a0715b09a871c859c26235c155d2',
          fileName: 'hoge.js',
          data: `const hoge = 'fuga'`
        }
      },
      {
        type: actionType.WRITE_FILE,
        payload: {
          hash: 'ee28a0715b09a871c859c26235c155d2',
          fileName: 'hoge.js',
          data: `const hoge = 'fuga'`
        }
      }
    ],
    cache: []
  })

  t.is(dummyFs.writeFile.callCount, 0)

  await vfs.perform()

  // should writeFile using fs.
  t.is(dummyFs.writeFile.callCount, 1)
  t.is(dummyFs.writeFile.calledWith('hoge.js', `const hoge = 'fuga'`), true)

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: 'ee28a0715b09a871c859c26235c155d2', fileName: 'hoge.js'}
    ]
  })
})

test('perform should process data change for same file', async (t) => {
  const {vfs, dummyFs} = t.context

  vfs.schedule(actions.writeFile('hoge.js', `const hoge = 'fuga'`))
  vfs.schedule(actions.writeFile('hoge.js', `const hoge = 'piyo'`))

  t.deepEqual(vfs.getState(), {
    pending: [
      {
        type: actionType.WRITE_FILE,
        payload: {
          hash: 'ee28a0715b09a871c859c26235c155d2',
          fileName: 'hoge.js',
          data: `const hoge = 'fuga'`
        }
      },
      {
        type: actionType.WRITE_FILE,
        payload: {
          hash: '85ba8a8c43258c84ee1cb319819733a9',
          fileName: 'hoge.js',
          data: `const hoge = 'piyo'`
        }
      }
    ],
    cache: []
  })

  t.is(dummyFs.writeFile.callCount, 0)

  await vfs.perform()

  // should writeFile using fs.
  t.is(dummyFs.writeFile.callCount, 2)
  t.is(dummyFs.writeFile.calledWith('hoge.js', `const hoge = 'fuga'`), true)
  t.is(dummyFs.writeFile.calledWith('hoge.js', `const hoge = 'piyo'`), true)

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: '85ba8a8c43258c84ee1cb319819733a9', fileName: 'hoge.js'}
    ]
  })
})
