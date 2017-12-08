import test from 'ava'
import _ from 'lodash'

import { absolutePath } from 'lib/utils/path'
const proxyquire = require('proxyquire').noCallThru()

const { requireGlob } = proxyquire(absolutePath('lib/utils/require'), {})

test.beforeEach((t) => {

})

test.afterEach((t) => {

})

test('requireGlob should require module using glob pattern', async (t) => {
  const modules = await requireGlob(['test/generators/**/*.js', '!**/_*/**'])
  t.deepEqual(_.keys(modules), [
    'test/generators/index.js',
    'test/generators/nested/hoge.js',
    'test/generators/nested/index.js'
  ])
})

// test https://github.com/sindresorhus/import-fresh feature(for file watcher).
test('requireGlob should always require fresh module ', async (t) => {
  const modules = await requireGlob(['test/fixtures/*.js'])
  t.deepEqual(_.keys(modules), ['test/fixtures/fresh.js'])

  t.is(modules['test/fixtures/fresh.js'](), 1)
  t.is(modules['test/fixtures/fresh.js'](), 2)

  const modules2 = await requireGlob(['test/fixtures/*.js'])
  t.is(modules2['test/fixtures/fresh.js'](), 1)
})
