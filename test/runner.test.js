import test from 'ava'
import _ from 'lodash'
import sinon from 'sinon'
import path from 'path'

const sandbox = sinon.sandbox.create()

import { absolutePath } from 'lib/utils/path'
import fs from 'lib/utils/fs'

const proxyquire = require('proxyquire').noCallThru()

// replace and trim meta characters
const formatTree = (str) => _.trim(str, ' \n').replace(/[ \t\f\v]/g, '')

test.beforeEach((t) => {
})

test.afterEach((t) => {
  sandbox.reset()
})

test('should run generator', async (t) => {
  const modules = {
    'test/generators/index.js': sandbox.spy((ctx) => {
      const {fs, filePath, fileName} = ctx
      fs.writeFile(path.join(filePath, fileName), `const hoge = 'fuga'`)
    }),

    'test/generators/nested/hoge.js': sandbox.spy((ctx) => {
      const {fs, filePath, fileName} = ctx
      fs.writeFile(path.join(filePath, fileName), `const fuga = 'piyo'`)
    }),

    'test/generators/nested/index.js': sandbox.spy((ctx) => {
      const {fs, filePath, fileName} = ctx
      fs.writeFile(path.join(filePath, fileName), `const piyo = 'hoge'`)
    })
  }

  const spiedRequireGlobs = sandbox.stub().returns(Promise.resolve(modules))

  const files = {
    'test/src/index.js': `const hoge = 'fuga'`,
    'test/src/nested/hoge.js': `const fuga = 'piyo'`,
    'test/src/nested/index.js': `const piyo = 'hoge'`,
  }

  const spiedFs = {
    listFiles: sandbox.spy(fs.listFiles),
    writeFile: sandbox.spy(),
    readFile: sandbox.spy((file) => new Promise((resolve) => resolve(files[file]))),
    remove: sandbox.spy()
  }

  // pass spied requireGlobs and createVfs mock(with stubbed fs)
  const createRunner = proxyquire(absolutePath('lib/runner'), {
    './utils/require': spiedRequireGlobs,
    './utils/fs': proxyquire(absolutePath('lib/utils/virtual-fs'), {
      './fs': spiedFs
    }),
  })

  const runner = createRunner({
    generator: 'test/generators',
    dest: 'test/src'
  })

  t.is(spiedRequireGlobs.callCount, 0)
  t.is(spiedFs.writeFile.callCount, 0)

  // should call listFiles with dest at createRunner.
  t.is(spiedFs.listFiles.callCount, 0)

  t.is(modules['test/generators/index.js'].callCount, 0)
  t.is(modules['test/generators/nested/hoge.js'].callCount, 0)
  t.is(modules['test/generators/nested/index.js'].callCount, 0)

  await runner.run()

  t.is(spiedFs.listFiles.callCount, 1)
  t.deepEqual(spiedFs.listFiles.firstCall.args, [['test/src/**/*.js', '!**/_*/**']])

  t.is(spiedRequireGlobs.callCount, 1)

  // should skip writeFile for same content.
  t.is(spiedFs.writeFile.callCount, 0)

  t.deepEqual(spiedRequireGlobs.firstCall.args, [[path.join('test/generators', '**/*.js'), '!**/_*/**']])
  t.is(modules['test/generators/index.js'].callCount, 1)
  t.is(modules['test/generators/nested/hoge.js'].callCount, 1)
  t.is(modules['test/generators/nested/index.js'].callCount, 1)

  t.is(formatTree(runner.ls(true)), formatTree(`
  └─test
    └─src
      ├─nested
      │├─hoge.js:e9eb52664ebfa4faff5403bb0feb06e5
      │└─index.js:892bebcef3a9143a362cb22ca527cdd4
    └─index.js:4c28e8a04afe44851f64d88a359b4de1
  `))
})
