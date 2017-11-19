import test from 'ava'
import sinon from 'sinon'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import globby from 'globby'

const sandbox = sinon.sandbox.create()

import { absolutePath } from 'lib/utils/path'
const proxyquire = require('proxyquire').noCallThru()

test.beforeEach((t) => {
})

test.afterEach((t) => {
  sandbox.reset()
})

test('listFiles should call globby', async (t) => {
  const dummyFiles = [
    'test/generators/index.js',
    'test/generators/nested/hoge.js',
    'test/generators/nested/index.js'
  ]
  const spiedGlobby = sandbox.spy(() => Promise.resolve(dummyFiles))

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'globby': spiedGlobby
  })

  const result = await fs.listFiles(['test/generators/**/*.js', '!**/_*/**'])
  t.deepEqual(result, dummyFiles)

  t.is(spiedGlobby.callCount, 1)
  t.deepEqual(spiedGlobby.firstCall.args[0], ['test/generators/**/*.js', '!**/_*/**'])
})

test('readFile should call fs.readFile', async (t) => {
  const spiedFs = {
    readFile: sandbox.spy((_, __, cb) => cb(undefined, `const hoge = 'fuga'`))
  }

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'fs': spiedFs
  })

  const result = await fs.readFile('hoge.js')
  t.is(result, `const hoge = 'fuga'`)

  t.is(spiedFs.readFile.callCount, 1)

  t.deepEqual(spiedFs.readFile.firstCall.args[0], 'hoge.js')
  t.deepEqual(spiedFs.readFile.firstCall.args[1], {encoding: 'utf8'})
  t.is(typeof spiedFs.readFile.firstCall.args[2], 'function')
})

test('readFile should reject with err if fs.readFile returns error', async (t) => {
  const dummyError = new Error('dummy error')
  const spiedFs = {
    readFile: sandbox.spy((_, __, cb) => cb(dummyError, null))
  }

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'fs': spiedFs
  })

  const result = await t.throws(fs.readFile('hoge.js'))
  t.is(result, dummyError)

  t.is(spiedFs.readFile.callCount, 1)

  t.deepEqual(spiedFs.readFile.firstCall.args[0], 'hoge.js')
  t.deepEqual(spiedFs.readFile.firstCall.args[1], {encoding: 'utf8'})
  t.is(typeof spiedFs.readFile.firstCall.args[2], 'function')
})

test('writeFile should call mkdirp and fs.writeFile', async (t) => {
  const spiedFs = {
    writeFile: sandbox.spy((_, __, ___, cb) => cb(undefined))
  }

  const spiedMkdirp = sandbox.spy((dir, cb) => cb(null))

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'fs': spiedFs,
    'mkdirp': spiedMkdirp
  })

  const result = await fs.writeFile('nested/hoge.js', `const hoge = 'fuga'`)
  t.is(result, true)

  t.is(spiedMkdirp.callCount, 1)
  t.is(spiedFs.writeFile.callCount, 1)

  t.deepEqual(spiedMkdirp.firstCall.args[0], 'nested')
  t.deepEqual(spiedFs.writeFile.firstCall.args[0], 'nested/hoge.js')
  t.deepEqual(spiedFs.writeFile.firstCall.args[1], `const hoge = 'fuga'`)
  t.deepEqual(spiedFs.writeFile.firstCall.args[2], {encoding: 'utf8'})
  t.is(typeof spiedFs.writeFile.firstCall.args[3], 'function')
})

test('writeFile should reject with err if mkdirp returns error', async (t) => {
  const spiedFs = {
    writeFile: sandbox.spy((_, __, ___, cb) => cb(undefined))
  }

  const dummyError = new Error('dummy error')
  const spiedMkdirp = sandbox.spy((dir, cb) => cb(dummyError))

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'fs': spiedFs,
    'mkdirp': spiedMkdirp
  })

  const result = await t.throws(fs.writeFile('nested/hoge.js', `const hoge = 'fuga'`))
  t.is(result, dummyError)

  t.is(spiedMkdirp.callCount, 1)
  t.is(spiedFs.writeFile.callCount, 0)

  t.deepEqual(spiedMkdirp.firstCall.args[0], 'nested')
})

test('writeFile should reject with err if fs.writeFile returns error', async (t) => {
  const spiedFs = {
    writeFile: sandbox.spy((_, __, ___, cb) => cb(dummyError))
  }

  const dummyError = new Error('dummy error')
  const spiedMkdirp = sandbox.spy((dir, cb) => cb(null))

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'fs': spiedFs,
    'mkdirp': spiedMkdirp
  })

  const result = await t.throws(fs.writeFile('nested/hoge.js', `const hoge = 'fuga'`))
  t.is(result, dummyError)

  t.is(spiedMkdirp.callCount, 1)
  t.is(spiedFs.writeFile.callCount, 1)

  t.deepEqual(spiedFs.writeFile.firstCall.args[0], 'nested/hoge.js')
  t.deepEqual(spiedFs.writeFile.firstCall.args[1], `const hoge = 'fuga'`)
  t.deepEqual(spiedFs.writeFile.firstCall.args[2], {encoding: 'utf8'})
  t.is(typeof spiedFs.writeFile.firstCall.args[3], 'function')
})

test('remove should call rimraf', async (t) => {
  const spiedRimRaf = sandbox.spy((pattern, opts, cb) => cb(null))

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'rimraf': spiedRimRaf
  })

  const result = await fs.remove('hoge.js')
  t.deepEqual(result, true)

  t.is(spiedRimRaf.callCount, 1)
  t.deepEqual(spiedRimRaf.firstCall.args[0], 'hoge.js')
})

test('remove should reject with err if rimraf returns error', async (t) => {
  const dummyError = new Error('dummy error')
  const spiedRimRaf = sandbox.spy((pattern, opts, cb) => cb(dummyError))

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'rimraf': spiedRimRaf
  })

  const result = await t.throws(fs.remove('hoge.js'))
  t.deepEqual(result, dummyError)

  t.is(spiedRimRaf.callCount, 1)
  t.deepEqual(spiedRimRaf.firstCall.args[0], 'hoge.js')
})
