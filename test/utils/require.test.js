import test from 'ava'
import _ from 'lodash'

import { absolutePath } from 'lib/utils/path'

const proxyquire = require('proxyquire').noCallThru()

const {
  requireGlob,
  parseDependencies
} = proxyquire(absolutePath('lib/utils/require'), {})

test.beforeEach((t) => {

})

test.afterEach((t) => {

})

test('requireGlob should require module using glob pattern', async (t) => {
  const modules = await requireGlob([
    'test/generators/index.js',
    'test/generators/nested/hoge.js',
    'test/generators/nested/index.js'
  ])
  t.deepEqual(_.keys(modules), [
    'test/generators/index.js',
    'test/generators/nested/hoge.js',
    'test/generators/nested/index.js'
  ])
})

// test https://github.com/sindresorhus/import-fresh feature(for file watcher).
test('requireGlob should always require fresh module ', async (t) => {
  const modules = await requireGlob(['test/fixtures/fresh.js'])
  t.deepEqual(_.keys(modules), ['test/fixtures/fresh.js'])

  t.is(modules['test/fixtures/fresh.js'](), 1)
  t.is(modules['test/fixtures/fresh.js'](), 2)

  const modules2 = await requireGlob(['test/fixtures/fresh.js'])
  t.is(modules2['test/fixtures/fresh.js'](), 1)
})

test('parse dependencies of module', async (t) => {
  const dependencies = {
    '_helper.js': [],
    'example.js': ['_helper.js'],
    'nested/_another_nested_hoge.js': [],
    'nested/_hoge.js': ['nested/_nested_hoge.js'],
    'nested/_nested_hoge.js': ['nested/_another_nested_hoge.js'],
    'nested/example.js': ['nested/_hoge.js']
  }

  t.deepEqual(parseDependencies(dependencies, 'nested/_another_nested_hoge.js'), [
    'nested/_another_nested_hoge.js',
    'nested/_nested_hoge.js',
    'nested/_hoge.js',
    'nested/example.js'
  ])
})

test('parse dependencies of module with circular', async (t) => {
  const dependencies = {
    '_helper.js': [],
    'example.js': ['_helper.js'],
    'nested/_another_nested_hoge.js': ['nested/_nested_hoge.js'],
    'nested/_hoge.js': ['nested/_nested_hoge.js'],
    'nested/_nested_hoge.js': ['nested/_another_nested_hoge.js'],
    'nested/example.js': ['nested/_hoge.js']
  }

  t.deepEqual(parseDependencies(dependencies, 'nested/_another_nested_hoge.js'), [
    'nested/_another_nested_hoge.js',
    'nested/_nested_hoge.js',
    'nested/_hoge.js',
    'nested/example.js'
  ])
})
