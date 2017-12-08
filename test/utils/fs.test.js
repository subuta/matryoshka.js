import test from 'ava'
import sinon from 'sinon'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import globby from 'globby'
import { Readable, PassThrough } from 'stream'
import es from 'event-stream'
import _ from 'lodash'
import os from 'os'

import { ft } from 'test/helper.js'

const sandbox = sinon.sandbox.create()

import { absolutePath } from 'lib/utils/path'

const proxyquire = require('proxyquire').noCallThru()

const createReadStreamFromString = (str) => {
  const stream = new Readable()
  stream.push(str)
  stream.push(null)
  return stream
}

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

test.serial('updateFileByPragma should update generated file.', async (t) => {
  const dummyWriteStream = new PassThrough()

  const originalFile = ft`
    /* mat start */
    console.log('hoge');
    /* mat end */
    
    console.log('fuga');
  `

  const data = `console.log('piyo');`

  let spiedFs = {
    createReadStream: sandbox.spy(() => createReadStreamFromString(originalFile)),
    createWriteStream: sandbox.spy(() => dummyWriteStream)
  }

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'fs': spiedFs
  })

  let chunk = []
  dummyWriteStream.on('data', (line) => chunk.push(line.toString('utf-8')))

  await fs.updateFileByPragma('test/fixtures/generated/small.js', data)
  const writeFileResult = chunk.join('\n')

  t.is(spiedFs.createReadStream.callCount, 1)
  t.is(spiedFs.createWriteStream.callCount, 1)

  t.deepEqual(spiedFs.createReadStream.firstCall.args[0], 'test/fixtures/generated/small.js')
  t.deepEqual(spiedFs.createReadStream.firstCall.args[1], {encoding: 'utf8'})

  t.deepEqual(spiedFs.createWriteStream.firstCall.args[0], 'test/fixtures/generated/small.js')
  t.deepEqual(spiedFs.createWriteStream.firstCall.args[1], {encoding: 'utf8'})

  const expected = ft`
    /* mat start */
    console.log('piyo');
    /* mat end */
    
    console.log('fuga');
  `

  t.is(ft([writeFileResult]), expected)
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

test.serial('seekFile should returns whole file if predicate omitted', async (t) => {
  const rawFs = require('fs')

  let spiedFs = {
    open: sandbox.spy(rawFs.open),
    fstat: sandbox.spy(rawFs.fstat),
    read: sandbox.spy(rawFs.read),
    close: sandbox.spy(rawFs.close)
  }

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'fs': spiedFs
  })

  const alwaysReturnTrue = () => true
  const result = await fs.seekFile('test/fixtures/generated/large.js', alwaysReturnTrue, 32)
  t.is(result.indexOf('/* mat start */') > -1, true)

  t.is(spiedFs.open.callCount, 1)
  t.is(spiedFs.fstat.callCount, 1)
  t.is(spiedFs.read.callCount, 362)
  t.is(spiedFs.close.callCount, 1)

  t.deepEqual(spiedFs.open.firstCall.args[0], 'test/fixtures/generated/large.js')
  t.deepEqual(spiedFs.open.firstCall.args[1], 'r')
})

test.serial('seekFile should returns same result with readFile', async (t) => {
  const rawFs = require('fs')

  let spiedFs = {
    readFile: sandbox.spy(rawFs.readFile),
    open: sandbox.spy(rawFs.open),
    fstat: sandbox.spy(rawFs.fstat),
    read: sandbox.spy(rawFs.read),
    close: sandbox.spy(rawFs.close)
  }

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'fs': spiedFs
  })

  const result = await fs.seekFile('test/fixtures/generated/small.js')

  t.is(spiedFs.open.callCount, 1)
  t.is(spiedFs.fstat.callCount, 1)
  t.is(spiedFs.read.callCount, 1)
  t.is(spiedFs.close.callCount, 1)

  t.deepEqual(spiedFs.open.firstCall.args[0], 'test/fixtures/generated/small.js')
  t.deepEqual(spiedFs.open.firstCall.args[1], 'r')

  const readFileResult = await fs.readFile('test/fixtures/generated/small.js')
  t.is(result, readFileResult)
})

test.serial('seekFile should not return whole file if predicate returns false', async (t) => {
  const rawFs = require('fs')

  let spiedFs = {
    open: sandbox.spy(rawFs.open),
    fstat: sandbox.spy(rawFs.fstat),
    read: sandbox.spy(rawFs.read),
    close: sandbox.spy(rawFs.close)
  }

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'fs': spiedFs
  })

  const alwaysReturnFalse = () => false
  const result = await fs.seekFile('test/fixtures/generated/large.js', alwaysReturnFalse, 32)
  t.is(result.indexOf('/* mat start */') > -1, true)

  t.is(spiedFs.open.callCount, 1)
  t.is(spiedFs.fstat.callCount, 1)
  t.is(spiedFs.read.callCount, 1)
  t.is(spiedFs.close.callCount, 1)

  t.deepEqual(spiedFs.open.firstCall.args[0], 'test/fixtures/generated/large.js')
  t.deepEqual(spiedFs.open.firstCall.args[1], 'r')
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
