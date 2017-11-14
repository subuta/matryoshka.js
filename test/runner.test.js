import test from 'ava'
import _ from 'lodash'
import sinon from 'sinon'
import path from 'path'

const sandbox = sinon.sandbox.create()

import { absolutePath } from 'lib/utils/path'

const proxyquire = require('proxyquire').noCallThru()

// replace and trim meta characters
const formatTree = (str) => _.trim(str, ' \n').replace(/[ \t\f\v]/g, '')

test.beforeEach((t) => {
})

test.afterEach((t) => {
  sandbox.reset()
})

test('should run generator', async (t) => {
  const dummyModules = {
    'test/generators/index.js': sandbox.spy((ctx) => {
      const { fs, filePath, fileName } = ctx
      fs.writeFile(path.join(filePath, fileName), `const hoge = 'fuga'`)
    })
  }

  const dummyRequireGlobs = sandbox.stub().returns(dummyModules)

  const createRunner = proxyquire(absolutePath('lib/runner'), {
    './utils/require': dummyRequireGlobs
  })

  const runner = createRunner({
    generator: 'test/generators',
    dest: 'test/src',
    dryRun: true
  })

  t.is(dummyRequireGlobs.callCount, 0)
  t.is(dummyModules['test/generators/index.js'].callCount, 0)

  await runner.run()

  t.is(dummyRequireGlobs.callCount, 1)
  t.deepEqual(dummyRequireGlobs.firstCall.args, [[path.join('test/generators', '**/*.js'), '!**/_*/**']])
  t.is(dummyModules['test/generators/index.js'].callCount, 1)

  t.is(formatTree(runner.ls(true)), formatTree(`
  └─ test
  └─ src
     └─ index.js: 4c28e8a04afe44851f64d88a359b4de1
  `))
})
