import test from 'ava'
import _ from 'lodash'
import sinon from 'sinon'
import path from 'path'
import { isChildrenOf, calculatePathDiff, mergePaths } from 'lib/utils/virtual-fs'

const sandbox = sinon.sandbox.create()

import { actionType, actions, getFileHash } from 'lib/utils/virtual-fs'

import { absolutePath } from 'lib/utils/path'

const proxyquire = require('proxyquire').noCallThru()

// replace and trim meta characters
const formatTree = (str) => _.trim(str, ' \n').replace(/[ \t\f\v]/g, '')

test.beforeEach((t) => {
  const dummyFs = {
    writeFile: sandbox.spy(),
    updateFileByPragma: sandbox.spy(),
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

test('isChildrenOf should detect nested directory as expected', async (t) => {
  t.is(isChildrenOf('first/nested.js', 'first'), true)

  // should also work for dir vs dir comparison.
  t.is(isChildrenOf('first/nested', 'first'), true)

  // treat as not children if same.
  t.is(isChildrenOf('.', '.'), false)

  // rename operation
  t.is(isChildrenOf('first/nested.js', 'first/nested2'), false)
  t.is(isChildrenOf('first/nested2.js', 'first/nested'), false)

  t.is(isChildrenOf('first/nested/deepNested', 'first/nested'), true)
  t.is(isChildrenOf('first/nested', 'first/nested/deepNested'), false)
})

test('calculatePathDiff should detect path difference', async (t) => {
  t.is(calculatePathDiff('first/nested', 'first/nested'), '')
  t.is(calculatePathDiff('first/nested', 'first/nested2'), 'first/nested2')
  t.is(calculatePathDiff('first/nested2', 'first/nested'), 'first/nested')
  t.is(calculatePathDiff('first', 'first/nested/deepNested'), 'first/nested')
  t.is(calculatePathDiff('first/nested/deepNested', 'first'), 'first/nested')
})

test('mergePaths should merge nested paths', async (t) => {
  t.deepEqual(mergePaths([]), [])
  t.deepEqual(mergePaths(['first', 'first/nested/deepNested']), ['first/nested/deepNested'])
  t.deepEqual(mergePaths(['first/nested/deepNested', 'first']), ['first/nested/deepNested'])
  t.deepEqual(mergePaths(['first', 'another']), ['another', 'first'])
  t.deepEqual(mergePaths(['another', 'first']), ['another', 'first'])
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

  t.is(dummyFs.updateFileByPragma.callCount, 0)
  await vfs.perform()

  // should writeFile using fs.
  t.is(dummyFs.updateFileByPragma.callCount, 1)
  t.is(dummyFs.updateFileByPragma.calledWith(fileName, `const hoge = 'fuga'`), true)

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: 'a5c2f7399d39c62475b04459f9e3ba9b', fileName, isNew: true}
    ]
  })

  t.is(formatTree(vfs.ls(true)), formatTree(`
  └─ sample
     └─ hoge.js: [new]a5c2f7399d39c62475b04459f9e3ba9b
  `))
})

test('perform should process multiple pending task', async (t) => {
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

  t.is(dummyFs.updateFileByPragma.callCount, 0)
  await vfs.perform()

  // should writeFile using fs.
  t.is(dummyFs.updateFileByPragma.callCount, 3)
  t.is(dummyFs.updateFileByPragma.calledWith('sample/hoge.js', `const hoge = 'fuga'`), true)
  t.is(dummyFs.updateFileByPragma.calledWith('sample/hoge2.js', `const hoge = 'fuga'`), true)
  t.is(dummyFs.updateFileByPragma.calledWith('index.js', `const hoge = 'fuga'`), true)

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {
        fileName: 'sample/hoge.js',
        hash: 'a5c2f7399d39c62475b04459f9e3ba9b',
        isNew: true
      },
      {
        fileName: 'index.js',
        hash: '58d4674d9c53bee8725c01efb9d5ac65',
        isNew: true
      },
      {
        fileName: 'sample/hoge2.js',
        hash: '0f9943aff79890e09d337d027f2679df',
        isNew: true
      }
    ]
  })

  t.is(formatTree(vfs.ls(true)), formatTree(`
  ├─sample
  │├─hoge.js:[new]a5c2f7399d39c62475b04459f9e3ba9b
  │└─hoge2.js:[new]0f9943aff79890e09d337d027f2679df
  └─index.js:[new]58d4674d9c53bee8725c01efb9d5ac65
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

  t.is(dummyFs.updateFileByPragma.callCount, 0)

  await vfs.perform()

  // should not writeFile using fs.
  t.is(dummyFs.updateFileByPragma.callCount, 0)

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

  t.is(dummyFs.updateFileByPragma.callCount, 0)

  await vfs.perform()

  // should writeFile using fs.
  t.is(dummyFs.updateFileByPragma.callCount, 2)
  t.is(dummyFs.updateFileByPragma.calledWith('hoge.js', `const hoge = 'fuga'`), true)
  t.is(dummyFs.updateFileByPragma.calledWith('hoge.js', `const hoge = 'fuga'`), true)

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: 'ee28a0715b09a871c859c26235c155d2', fileName: 'hoge.js', isNew: true}
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

  t.is(dummyFs.updateFileByPragma.callCount, 0)

  await vfs.perform()

  // should writeFile using fs.
  t.is(dummyFs.updateFileByPragma.callCount, 2)
  t.is(dummyFs.updateFileByPragma.calledWith('hoge.js', `const hoge = 'fuga'`), true)
  t.is(dummyFs.updateFileByPragma.calledWith('hoge.js', `const hoge = 'piyo'`), true)

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: '85ba8a8c43258c84ee1cb319819733a9', fileName: 'hoge.js', isNew: true}
    ]
  })
})

test.serial('perform should process file update for same file', async (t) => {
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

  t.is(dummyFs.updateFileByPragma.callCount, 0)

  await vfs.perform()

  t.is(dummyFs.updateFileByPragma.callCount, 1)
  t.is(dummyFs.updateFileByPragma.calledWith('hoge.js', `const hoge = 'fuga'`), true)

  vfs.writeFile('hoge.js', `const hoge = 'piyo'`)

  t.deepEqual(vfs.getState(), {
    pending: [
      {
        type: actionType.WRITE_FILE,
        payload: {
          hash: '85ba8a8c43258c84ee1cb319819733a9',
          fileName: 'hoge.js',
          data: `const hoge = 'piyo'`
        }
      }
    ],
    cache: [
      {
        fileName: 'hoge.js',
        hash: 'ee28a0715b09a871c859c26235c155d2',
        isNew: true
      }
    ]
  })

  await vfs.perform()

  // should updateFile using fs.
  t.is(dummyFs.updateFileByPragma.callCount, 2)
  t.is(dummyFs.updateFileByPragma.callCount, 2)
  t.is(dummyFs.updateFileByPragma.calledWith('hoge.js', `const hoge = 'piyo'`), true)

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: '85ba8a8c43258c84ee1cb319819733a9', fileName: 'hoge.js', isUpdated: true}
    ]
  })
})

test.serial('perform should delete extra file on second perform call', async (t) => {
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

  t.is(dummyFs.updateFileByPragma.callCount, 0)

  await vfs.perform()

  // should writeFile using fs.
  t.is(dummyFs.updateFileByPragma.callCount, 1)
  t.deepEqual(dummyFs.updateFileByPragma.firstCall.args, ['hoge.js', `const hoge = 'fuga'`])
  t.is(dummyFs.remove.callCount, 0)

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {
        fileName: 'hoge.js',
        hash: 'ee28a0715b09a871c859c26235c155d2',
        isNew: true
      }
    ]
  })

  vfs.writeFile('fuga.js', `const hoge = 'piyo'`)

  await vfs.perform()

  t.is(dummyFs.updateFileByPragma.callCount, 2)
  t.deepEqual(dummyFs.updateFileByPragma.firstCall.args, ['hoge.js', `const hoge = 'fuga'`])
  t.deepEqual(dummyFs.updateFileByPragma.secondCall.args, ['fuga.js', `const hoge = 'piyo'`])

  t.is(dummyFs.remove.callCount, 1)
  t.deepEqual(dummyFs.remove.firstCall.args, ['hoge.js', false])

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: '5fb1ec611d7bff099ef0465f385e23d3', fileName: 'fuga.js', isNew: true}
    ]
  })

  vfs.writeFile('fuga.js', `const hoge = 'piyo'`)

  await vfs.perform()

  t.is(dummyFs.updateFileByPragma.callCount, 2)
  t.deepEqual(dummyFs.updateFileByPragma.firstCall.args, ['hoge.js', `const hoge = 'fuga'`])
  t.deepEqual(dummyFs.updateFileByPragma.secondCall.args, ['fuga.js', `const hoge = 'piyo'`])

  // should not call for fuga.js(because it's not changed while 2 to 3 time call)
  t.is(dummyFs.remove.callCount, 1)
  t.deepEqual(dummyFs.remove.firstCall.args, ['hoge.js', false])

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: '5fb1ec611d7bff099ef0465f385e23d3', fileName: 'fuga.js'}
    ]
  })
})

test.serial('perform should delete extra empty directory on second perform call', async (t) => {
  const {vfs, dummyFs} = t.context

  vfs.writeFile('first/hoge.js', `const hoge = 'fuga'`)

  t.deepEqual(vfs.getState(), {
    pending: [
      {
        type: actionType.WRITE_FILE,
        payload: {
          hash: 'ad847a0fe7336d14d82591d620368c28',
          fileName: 'first/hoge.js',
          data: `const hoge = 'fuga'`
        }
      }
    ],
    cache: []
  })

  t.is(dummyFs.updateFileByPragma.callCount, 0)

  await vfs.perform()

  // should writeFile using fs.
  t.is(dummyFs.updateFileByPragma.callCount, 1)
  t.deepEqual(dummyFs.updateFileByPragma.firstCall.args, ['first/hoge.js', `const hoge = 'fuga'`])
  t.is(dummyFs.remove.callCount, 0)

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: 'ad847a0fe7336d14d82591d620368c28', fileName: 'first/hoge.js', isNew: true}
    ]
  })

  vfs.writeFile('second/hoge.js', `const hoge = 'piyo'`)

  await vfs.perform()

  t.is(dummyFs.updateFileByPragma.callCount, 2)
  t.deepEqual(dummyFs.updateFileByPragma.firstCall.args, ['first/hoge.js', `const hoge = 'fuga'`])
  t.deepEqual(dummyFs.updateFileByPragma.secondCall.args, ['second/hoge.js', `const hoge = 'piyo'`])

  t.is(dummyFs.remove.callCount, 2)
  t.deepEqual(dummyFs.remove.firstCall.args, ['first/hoge.js', false])
  t.deepEqual(dummyFs.remove.secondCall.args, ['first', false])

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: '7ced903cc3f3de872b84322b1ce305b2', fileName: 'second/hoge.js', isNew: true}
    ]
  })

  vfs.writeFile('second/hoge.js', `const hoge = 'piyo'`)

  await vfs.perform()

  t.is(dummyFs.updateFileByPragma.callCount, 2)
  t.deepEqual(dummyFs.updateFileByPragma.firstCall.args, ['first/hoge.js', `const hoge = 'fuga'`])
  t.deepEqual(dummyFs.updateFileByPragma.secondCall.args, ['second/hoge.js', `const hoge = 'piyo'`])

  // should not call for fuga.js(because it's not changed while 2 to 3 time call)
  t.is(dummyFs.remove.callCount, 2)
  t.deepEqual(dummyFs.remove.firstCall.args, ['first/hoge.js', false])
  t.deepEqual(dummyFs.remove.secondCall.args, ['first', false])

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: '7ced903cc3f3de872b84322b1ce305b2', fileName: 'second/hoge.js'}
    ]
  })
})

test.serial('perform should delete extra empty nested directory on second perform call', async (t) => {
  const {vfs, dummyFs} = t.context

  vfs.writeFile('first/nested/hoge.js', `const hoge = 'fuga'`)

  t.deepEqual(vfs.getState(), {
    pending: [
      {
        type: actionType.WRITE_FILE,
        payload: {
          hash: '020ba93c5874ca7e642651a8fa4fbaaf',
          fileName: 'first/nested/hoge.js',
          data: `const hoge = 'fuga'`
        }
      }
    ],
    cache: []
  })

  t.is(dummyFs.updateFileByPragma.callCount, 0)

  await vfs.perform()

  // should writeFile using fs.
  t.is(dummyFs.updateFileByPragma.callCount, 1)
  t.deepEqual(dummyFs.updateFileByPragma.firstCall.args, ['first/nested/hoge.js', `const hoge = 'fuga'`])
  t.is(dummyFs.remove.callCount, 0)

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: '020ba93c5874ca7e642651a8fa4fbaaf', fileName: 'first/nested/hoge.js', isNew: true}
    ]
  })

  vfs.writeFile('first/nested2/fuga.js', `const hoge = 'piyo'`)

  await vfs.perform()

  t.is(dummyFs.updateFileByPragma.callCount, 2)
  t.deepEqual(dummyFs.updateFileByPragma.firstCall.args, ['first/nested/hoge.js', `const hoge = 'fuga'`])
  t.deepEqual(dummyFs.updateFileByPragma.secondCall.args, ['first/nested2/fuga.js', `const hoge = 'piyo'`])

  t.is(dummyFs.remove.callCount, 2)
  t.deepEqual(dummyFs.remove.firstCall.args, ['first/nested/hoge.js', false])
  t.deepEqual(dummyFs.remove.secondCall.args, ['first/nested', false])

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: '8045a8dbcb127b4bd64ab51edec38067', fileName: 'first/nested2/fuga.js', isNew: true}
    ]
  })

  vfs.writeFile('first/nested2/fuga.js', `const hoge = 'piyo'`)

  await vfs.perform()

  t.is(dummyFs.updateFileByPragma.callCount, 2)
  t.deepEqual(dummyFs.updateFileByPragma.firstCall.args, ['first/nested/hoge.js', `const hoge = 'fuga'`])
  t.deepEqual(dummyFs.updateFileByPragma.secondCall.args, ['first/nested2/fuga.js', `const hoge = 'piyo'`])

  // should not call for fuga.js(because it's not changed while 2 to 3 time call)
  t.is(dummyFs.remove.callCount, 2)
  t.deepEqual(dummyFs.remove.firstCall.args, ['first/nested/hoge.js', false])
  t.deepEqual(dummyFs.remove.secondCall.args, ['first/nested', false])

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: '8045a8dbcb127b4bd64ab51edec38067', fileName: 'first/nested2/fuga.js'}
    ]
  })
})

test.serial('perform should delete empty nested directory even if complex operation', async (t) => {
  const {vfs, dummyFs} = t.context

  // 1st iteration
  vfs.writeFile('first/hoge.js', `const hoge = 'piyo'`)
  vfs.writeFile('first/nested/hoge.js', `const hoge = 'fuga'`)

  t.is(dummyFs.updateFileByPragma.callCount, 0)

  await vfs.perform()

  // should writeFile using fs.
  t.is(dummyFs.updateFileByPragma.callCount, 2)
  t.deepEqual(dummyFs.updateFileByPragma.firstCall.args, ['first/hoge.js', `const hoge = 'piyo'`])
  t.deepEqual(dummyFs.updateFileByPragma.secondCall.args, ['first/nested/hoge.js', `const hoge = 'fuga'`])
  t.is(dummyFs.remove.callCount, 0)

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: 'da97c3fe36319faf78c1fa58d48d44ee', fileName: 'first/hoge.js', isNew: true},
      {hash: '020ba93c5874ca7e642651a8fa4fbaaf', fileName: 'first/nested/hoge.js', isNew: true}
    ]
  })

  // 2nd iteration
  vfs.writeFile('first/hoge.js', `const hoge = 'piyo'`)
  vfs.writeFile('first/nested/deepNested/hoge.js', `const hoge = 'piyo'`)

  await vfs.perform()

  t.is(dummyFs.updateFileByPragma.callCount, 3)
  t.deepEqual(dummyFs.updateFileByPragma.thirdCall.args, ['first/nested/deepNested/hoge.js', `const hoge = 'piyo'`])

  t.is(dummyFs.remove.callCount, 1)
  t.deepEqual(dummyFs.remove.firstCall.args, ['first/nested/hoge.js', false])

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: 'da97c3fe36319faf78c1fa58d48d44ee', fileName: 'first/hoge.js'},
      {hash: '207e64b65c5a713a01d1571d3a0f4c64', fileName: 'first/nested/deepNested/hoge.js', isNew: true}
    ]
  })

  // 3rd iteration
  vfs.writeFile('first/another/hoge.js', `const hoge = 'piyo'`)

  await vfs.perform()

  t.is(dummyFs.updateFileByPragma.callCount, 4)
  t.deepEqual(dummyFs.updateFileByPragma.getCall(3).args, ['first/another/hoge.js', `const hoge = 'piyo'`])

  // should not call for fuga.js(because it's not changed while 2 to 3 time call)
  t.is(dummyFs.remove.callCount, 4)
  t.deepEqual(dummyFs.remove.secondCall.args, ['first/hoge.js', false])
  t.deepEqual(dummyFs.remove.thirdCall.args, ['first/nested/deepNested/hoge.js', false])
  t.deepEqual(dummyFs.remove.getCall(3).args, ['first/nested', false])

  t.deepEqual(vfs.getState(), {
    pending: [],
    cache: [
      {hash: 'd8e940c165d3464a303db9a2fd68fdac', fileName: 'first/another/hoge.js', isNew: true}
    ]
  })
})
