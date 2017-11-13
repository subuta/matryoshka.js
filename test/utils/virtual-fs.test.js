import test from 'ava'
import _ from 'lodash'
import sinon from 'sinon'
import path from 'path'

const sandbox = sinon.sandbox.create()

import { actionType, actions, getFileHash } from 'lib/utils/virtual-fs'

import { absolutePath } from 'lib/utils/path'
const proxyquire = require('proxyquire').noCallThru()

// replace and trim meta characters
const formatTree = (str) => _.trim(str, ' \n').replace(/[ \t\f\v]/g, '')

test.beforeEach((t) => {
  const dummyFs = {
    writeFile: sandbox.spy(),
    remove: sandbox.spy()
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
  t.context.createVfs = createVfs
  t.context.dummyFs = dummyFs
})

test.afterEach((t) => {
  sandbox.reset()
})

test('writeFile should put writeFile action as pending', async (t) => {
  const {vfs} = t.context

  const writeFileAction = actions.writeFile('hoge.js', `const hoge = 'fuga'`)
  t.deepEqual(writeFileAction, {
    type: actionType.WRITE_FILE,
    payload: {
      hash: 'ee28a0715b09a871c859c26235c155d2',
      fileName: 'hoge.js',
      data: `const hoge = 'fuga'`
    }
  })

  vfs.schedule(writeFileAction)

  t.deepEqual(vfs.getState(), {
    pending: [
      writeFileAction
    ],
    cache: []
  })
})

test('vfs should expose wrapped writeFile action also', async (t) => {
  const {vfs} = t.context

  vfs.writeFile('hoge.js', `const hoge = 'fuga'`)

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
  t.is(getFileHash({fileName: 'hoge.js', data: `const hoge = 'fuga'`}), 'ee28a0715b09a871c859c26235c155d2')
  t.is(getFileHash({fileName: 'hoge.js', data: `const hoge = 'piyo'`}), '85ba8a8c43258c84ee1cb319819733a9')
  t.is(getFileHash({fileName: 'piyo.js', data: `const hoge = 'fuga'`}), 'ede464194cfff0f118944e9e7bf97e9d')
})

test('perform should process pending task', async (t) => {
  const {vfs, dummyFs} = t.context

  const fileName = path.join('sample', 'hoge.js')
  vfs.writeFile(fileName, `const hoge = 'fuga'`)

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

  t.is(formatTree(vfs.ls(true)), formatTree(`
  └─ sample
     └─ hoge.js: a5c2f7399d39c62475b04459f9e3ba9b
  `))
})

test.only('perform should process multiple pending task', async (t) => {
  const {vfs, dummyFs} = t.context

  vfs.writeFile('sample/hoge.js', `const hoge = 'fuga'`)
  vfs.writeFile('sample/hoge2.js', `const hoge = 'fuga'`)
  vfs.writeFile('index.js', `const hoge = 'fuga'`)

  t.deepEqual(vfs.getState(), {
    pending: [{
      type: 'WRITE_FILE',
      payload: {
        hash: 'a5c2f7399d39c62475b04459f9e3ba9b',
        fileName: 'sample/hoge.js',
        data: 'const hoge = \'fuga\''
      }
    },
      {
        type: 'WRITE_FILE',
        payload: {
          hash: '0f9943aff79890e09d337d027f2679df',
          fileName: 'sample/hoge2.js',
          data: 'const hoge = \'fuga\''
        }
      },
      {
        type: 'WRITE_FILE',
        payload: {
          hash: '58d4674d9c53bee8725c01efb9d5ac65',
          fileName: 'index.js',
          data: 'const hoge = \'fuga\''
        }
      }],
    cache: []
  })

  t.is(dummyFs.writeFile.callCount, 0)
  vfs.perform()

  // should writeFile using fs.
  t.is(dummyFs.writeFile.callCount, 3)
  t.is(dummyFs.writeFile.calledWith('sample/hoge.js', `const hoge = 'fuga'`), true)
  t.is(dummyFs.writeFile.calledWith('sample/hoge2.js', `const hoge = 'fuga'`), true)
  t.is(dummyFs.writeFile.calledWith('index.js', `const hoge = 'fuga'`), true)

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: '58d4674d9c53bee8725c01efb9d5ac65', fileName: 'index.js'},
      {hash: 'a5c2f7399d39c62475b04459f9e3ba9b', fileName: 'sample/hoge.js'},
      {hash: '0f9943aff79890e09d337d027f2679df', fileName: 'sample/hoge2.js'}
    ]
  })

  t.is(formatTree(vfs.ls(true)), formatTree(`
  └─ sample
     └─ hoge.js: a5c2f7399d39c62475b04459f9e3ba9b
  `))
})

test('perform should not process pending task when dryRun = true', async (t) => {
  const {dummyFs, createVfs} = t.context

  const vfs = createVfs({dryRun: true})

  vfs.writeFile('hoge.js', `const hoge = 'fuga'`)

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

  t.is(dummyFs.writeFile.callCount, 0)

  vfs.perform()

  // should not writeFile using fs.
  t.is(dummyFs.writeFile.callCount, 0)

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: 'ee28a0715b09a871c859c26235c155d2', fileName: 'hoge.js'}
    ]
  })
})

test('perform should not process duplicated task', async (t) => {
  const {vfs, dummyFs} = t.context

  vfs.writeFile('hoge.js', `const hoge = 'fuga'`)
  vfs.writeFile('hoge.js', `const hoge = 'fuga'`)

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

  vfs.writeFile('hoge.js', `const hoge = 'fuga'`)
  vfs.writeFile('hoge.js', `const hoge = 'piyo'`)

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

test('perform should delete extra file on second perform call', async (t) => {
  const {vfs, dummyFs} = t.context

  vfs.writeFile('hoge.js', `const hoge = 'fuga'`)

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

  vfs.writeFile('fuga.js', `const hoge = 'piyo'`)

  await vfs.perform()

  t.is(dummyFs.writeFile.callCount, 2)
  t.is(dummyFs.writeFile.calledWith('fuga.js', `const hoge = 'piyo'`), true)

  t.is(dummyFs.remove.callCount, 1)
  t.is(dummyFs.remove.calledWith('hoge.js'), true)

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: '5fb1ec611d7bff099ef0465f385e23d3', fileName: 'fuga.js'}
    ]
  })
})
