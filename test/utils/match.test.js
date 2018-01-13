import test from 'ava'
import _ from 'lodash'
import minimatch from 'minimatch'
import { absolutePath } from 'lib/utils/path'
import sinon from 'sinon'

const proxyquire = require('proxyquire').noCallThru()
const sandbox = sinon.sandbox.create()

const cwd = '/Home/repo/matryoshka.js'

test.beforeEach((t) => {
  const ignore = proxyquire(absolutePath('lib/utils/match'), {
    'process': {
      cwd: sandbox.spy(() => cwd)
    }
  }).ignore

  t.context = {
    ignore
  }
})

test.afterEach((t) => {
  sandbox.reset()
})

test('ignore should ignore node_modules', async (t) => {
  const {ignore} = t.context
  const matcher = ignore()

  t.truthy(matcher(['node_modules/others']))
  t.truthy(matcher(['/node_modules/others']))
  t.truthy(matcher([`${cwd}/node_modules/others`]))

  t.falsy(matcher(['node_modules']))
})

test('ignore should use passed basePath', async (t) => {
  const {ignore} = t.context

  const basePath = '/Home/repo'
  const matcher = ignore(['snippet*'], basePath)

  t.truthy(matcher([`${cwd}/node_modules/others`]))
  t.truthy(matcher([`${cwd}/node_modules/snippets/README.md`]))

  t.falsy(matcher([cwd]))
  t.falsy(matcher([basePath]))
  t.falsy(matcher(['node_modules']))
  t.falsy(matcher([`${cwd}/node_modules/snippets`]))
  t.falsy(matcher([`${cwd}/node_modules/snippets/README.js`]))
})

test('ignore should ignore .git', async (t) => {
  const {ignore} = t.context
  const matcher = ignore()

  t.truthy(matcher(['.git']))
  t.truthy(matcher(['.git/others']))
  t.truthy(matcher(['/.git/others']))
  t.truthy(matcher([`${cwd}/.git`]))
  t.truthy(matcher([`${cwd}/.git/others`]))
})

test('ignore should ignore non-js files', async (t) => {
  const {ignore} = t.context
  const matcher = ignore()

  // will ignored
  t.truthy(matcher([`${cwd}/node_modules/snippets/README.md`]))
  t.truthy(matcher([`${cwd}/node_modules/snippets/package.json`]))
  t.truthy(matcher([`${cwd}/generators/README.md`]))
  t.truthy(matcher([`${cwd}/generators/package.json`]))

  // will not ignored
  t.falsy(matcher([`${cwd}/node_modules/snippets`]))
  t.falsy(matcher([`${cwd}/node_modules/snippets/README.js`]))
  t.falsy(matcher([`${cwd}/generators`]))
  t.falsy(matcher([`${cwd}/generators/README.js`]))
})

test('ignore should ignore node_modules except passed packages', async (t) => {
  const {ignore} = t.context
  const matcher = ignore([
    '@subuta/snippets'
  ])

  t.truthy(matcher(['node_modules/others']))
  t.truthy(matcher(['/node_modules/others']))
  t.truthy(matcher([`${cwd}/node_modules/others`]))

  // ignore snippets under the git.
  t.truthy(matcher([`${cwd}/.git/node_modules/@subuta/snippets`]))

  // ignore files under the excepts's node_modules
  t.truthy(matcher([`${cwd}/node_modules/@subuta/snippets/node_modules`]))
  t.truthy(matcher([`${cwd}/node_modules/@subuta/snippets/node_modules/hoge.js`]))
  t.truthy(matcher([`${cwd}/node_modules/@subuta/snippets/node_modules/nested/hoge.js`]))
  t.truthy(matcher([`${cwd}/@subuta/snippets/node_modules`]))
  t.truthy(matcher([`${cwd}/@subuta/snippets/node_modules/hoge.js`]))
  t.truthy(matcher([`${cwd}/@subuta/snippets/node_modules/nested/hoge.js`]))

  // will watched.
  t.falsy(matcher(['/Home/repo/matryoshka.js']))
  t.falsy(matcher([`${cwd}/node_modules`]))
  t.falsy(matcher([`${cwd}/node_modules/@subuta`]))
  t.falsy(matcher([`${cwd}/node_modules/@subuta/snippets`]))
  t.falsy(matcher([`${cwd}/node_modules/@subuta/snippets/redux/Action.js`]))
  t.falsy(matcher([`${cwd}/node_modules/@subuta/snippets/redux/Action`]))
  t.falsy(matcher([`${cwd}/@subuta`]))
  t.falsy(matcher([`${cwd}/@subuta/snippets`]))
  t.falsy(matcher([`${cwd}/@subuta/snippets/redux/Action.js`]))
  t.falsy(matcher([`${cwd}/@subuta/snippets/redux/Action`]))
})

test('ignore should not ignore generators files', async (t) => {
  const {ignore} = t.context
  const matcher = ignore()

  // will not ignored
  t.falsy(matcher([`${cwd}/generators`]))
  t.falsy(matcher([`${cwd}/generators/nested`]))
  t.falsy(matcher([`${cwd}/generators/nested/hoge.js`]))
  t.falsy(matcher([`${cwd}/generators/README.js`]))

  t.falsy(matcher(['generators']))
  t.falsy(matcher(['generators/nested']))
  t.falsy(matcher(['generators/nested/hoge.js']))
  t.falsy(matcher(['generators/README.js']))
})

test('ignore should ignore node_modules except passed packages with glob', async (t) => {
  const {ignore} = t.context
  const matcher = ignore()

  t.truthy(matcher(['node_modules/others']))
  t.truthy(matcher(['/node_modules/others']))
  t.truthy(matcher([`${cwd}/node_modules/others`]))
  t.truthy(matcher([`${cwd}/node_modules/@subuta`]))

  t.falsy(matcher(['/Home/repo/matryoshka.js']))
  t.falsy(matcher([`${cwd}/node_modules`]))
  t.falsy(matcher([`${cwd}/node_modules/snippet.js`]))
  t.falsy(matcher([`${cwd}/node_modules/snippet.js/redux/Action.js`]))
  t.falsy(matcher([`${cwd}/node_modules/snippet.js/redux/Action`]))
  t.falsy(matcher([`${cwd}/node_modules/snippet.js`]))
  t.falsy(matcher([`${cwd}/node_modules/snippet.js/redux/Action.js`]))
  t.falsy(matcher([`${cwd}/node_modules/snippet.js/redux/Action`]))

  // ignore node_modules under the `excepts`

  t.truthy(matcher([`${cwd}/node_modules/snippet.js/node_modules/redux/Action.js`]))
  t.truthy(matcher([`${cwd}/node_modules/snippet.js/node_modules/redux/Action`]))
  t.truthy(matcher([`${cwd}/node_modules/snippet.js/node_modules/`]))
  t.truthy(matcher([`${cwd}/node_modules/snippet.js/node_modules/redux/Action.js`]))
  t.truthy(matcher([`${cwd}/node_modules/snippet.js/node_modules/redux/Action`]))
})

test('minimatch tests (for testing glob)', async (t) => {
  t.truthy(minimatch('bar.foo', '*.foo'))
})
