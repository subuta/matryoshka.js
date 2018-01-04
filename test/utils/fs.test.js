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

test('rename should call fs.rename', async (t) => {
  const spiedFs = {
    rename: sandbox.spy((_, __, cb) => cb(undefined, true))
  }

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'fs': spiedFs
  })

  const result = await fs.rename('hoge.js', 'fuga.js')
  t.is(result, true)

  t.is(spiedFs.rename.callCount, 1)

  t.deepEqual(spiedFs.rename.firstCall.args[0], 'hoge.js')
  t.deepEqual(spiedFs.rename.firstCall.args[1], 'fuga.js')
  t.is(typeof spiedFs.rename.firstCall.args[2], 'function')
})

test.serial('updateFileByPragma should update complex file.', async (t) => {
  const rawFs = require('fs')

  const dummyWriteStream = new PassThrough()

  const data = ft`
    const {hoge} = ctx.request.body
    
    // hogehoge
    let params = {}
    
    /* mat Before create [start] */
    /* mat Before create [end] */
    
    let response = await Hoge.query()
      .insert({
        ...hoge,
        ...params
      })
      .eager('')
      
    /* mat After create [start] */
    /* mat After create [end] */
  
    ctx.body = response
  `

  let spiedFs = {
    open: sandbox.spy(rawFs.open),
    fstat: sandbox.spy(rawFs.fstat),
    read: sandbox.spy(rawFs.read),
    close: sandbox.spy(rawFs.close),
    createReadStream: sandbox.spy(rawFs.createReadStream),
    createWriteStream: sandbox.spy(() => dummyWriteStream),
    rename: sandbox.spy((_, __, cb) => cb(null))
  }

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'fs': spiedFs
  })

  let chunk = []
  dummyWriteStream.on('data', (line) => chunk.push(line.toString('utf-8')))

  await fs.updateFileByPragma('test/fixtures/generated/complex.js', data)
  const writeFileResult = chunk.join('\n')

  t.is(spiedFs.createReadStream.callCount, 0)
  t.is(spiedFs.open.callCount, 2)
  t.is(spiedFs.read.callCount, 3)
  t.is(spiedFs.createWriteStream.callCount, 1)
  t.is(spiedFs.rename.callCount, 1)

  t.deepEqual(spiedFs.open.firstCall.args[0], 'test/fixtures/generated/complex.js')
  t.deepEqual(spiedFs.open.secondCall.args[0], 'test/fixtures/generated/complex.js')

  t.deepEqual(spiedFs.createWriteStream.firstCall.args[0], 'test/fixtures/generated/.complex.js.tmp')
  t.deepEqual(spiedFs.createWriteStream.firstCall.args[1], {encoding: 'utf8'})

  // then rename .tmp to originalFile.
  t.deepEqual(spiedFs.rename.firstCall.args[0], 'test/fixtures/generated/.complex.js.tmp')
  t.deepEqual(spiedFs.rename.firstCall.args[1], 'test/fixtures/generated/complex.js')

  const expected = ft`
    const {hoge} = ctx.request.body
    
    // hogehoge
    let params = {}
    
    /* mat Before create [start] */
    const ext = path.extname(name)
    const id = uuid()
    const tmpFileName = \`\$\{id\}\$\{ext\}\`
    const result = await getSignedUrl(tmpFileName, attachment.type)
    /* mat Before create [end] */
    
    let response = await Hoge.query()
      .insert({
        ...hoge,
        ...params
      })
      .eager('')
      
    /* mat After create [start] */
    response = {
      result,
      attachment: response
    }
    /* mat After create [end] */
      
    ctx.body = response
  `

  t.is(ft([writeFileResult]), expected)
})

test.serial('updateFileByPragma should ignore pragma if not found in generated file.', async (t) => {
  const rawFs = require('fs')

  const dummyWriteStream = new PassThrough()

  const data = ft`
    const fuga = 'hoge'
        
    /* mat CUSTOM LOGIC [start] */
    console.log('piyo');
    /* mat CUSTOM LOGIC [end] */
    
    const piyo = 'hoge'
    
    /* mat CUSTOM LOGIC 2 [start] */
    console.log('piyo');
    /* mat CUSTOM LOGIC 2 [end] */
    
    const hoge = 'piyo'
  `

  let spiedFs = {
    open: sandbox.spy(rawFs.open),
    fstat: sandbox.spy(rawFs.fstat),
    read: sandbox.spy(rawFs.read),
    close: sandbox.spy(rawFs.close),
    createReadStream: sandbox.spy(rawFs.createReadStream),
    createWriteStream: sandbox.spy(() => dummyWriteStream),
    rename: sandbox.spy((_, __, cb) => cb(null))
  }

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'fs': spiedFs
  })

  let chunk = []
  dummyWriteStream.on('data', (line) => chunk.push(line.toString('utf-8')))

  await fs.updateFileByPragma('test/fixtures/generated/pragma.js', data)
  const writeFileResult = chunk.join('\n')

  t.is(spiedFs.createReadStream.callCount, 0)
  t.is(spiedFs.open.callCount, 2)
  t.is(spiedFs.read.callCount, 2)
  t.is(spiedFs.createWriteStream.callCount, 1)
  t.is(spiedFs.rename.callCount, 1)

  t.deepEqual(spiedFs.open.firstCall.args[0], 'test/fixtures/generated/pragma.js')
  t.deepEqual(spiedFs.open.secondCall.args[0], 'test/fixtures/generated/pragma.js')

  t.deepEqual(spiedFs.createWriteStream.firstCall.args[0], 'test/fixtures/generated/.pragma.js.tmp')
  t.deepEqual(spiedFs.createWriteStream.firstCall.args[1], {encoding: 'utf8'})

  // then rename .tmp to originalFile.
  t.deepEqual(spiedFs.rename.firstCall.args[0], 'test/fixtures/generated/.pragma.js.tmp')
  t.deepEqual(spiedFs.rename.firstCall.args[1], 'test/fixtures/generated/pragma.js')

  const expected = ft`
    const fuga = 'hoge'
    
    const piyo = 'hoge'
    
    /* mat CUSTOM LOGIC 2 [start] */
    console.log('fuga');
    /* mat CUSTOM LOGIC 2 [end] */
    
    const hoge = 'piyo'
  `

  t.is(ft([writeFileResult]), expected)
})

test.serial('updateFileByPragma should create file if target file does not exists.', async (t) => {
  const rawFs = require('fs')

  const dummyWriteStream = new PassThrough()

  const data = ft`
    const fuga = 'hoge'
        
    /* mat CUSTOM LOGIC [start] */
    console.log('piyo');
    /* mat CUSTOM LOGIC [end] */
    
    const piyo = 'hoge'
    
    /* mat CUSTOM LOGIC 2 [start] */
    console.log('piyo');
    /* mat CUSTOM LOGIC 2 [end] */
    
    const hoge = 'piyo'
  `

  let spiedFs = {
    open: sandbox.spy(rawFs.open),
    fstat: sandbox.spy(rawFs.fstat),
    read: sandbox.spy(rawFs.read),
    close: sandbox.spy(rawFs.close),
    createReadStream: sandbox.spy(rawFs.createReadStream),
    createWriteStream: sandbox.spy(() => dummyWriteStream),
    rename: sandbox.spy((_, __, cb) => cb(null)),
    writeFile: sandbox.spy((_, __, ___, cb) => cb(undefined))
  }

  const spiedRimRaf = sandbox.spy((pattern, opts, cb) => cb(null))

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'fs': spiedFs,
    'rimraf': spiedRimRaf
  })

  let chunk = []
  dummyWriteStream.on('data', (line) => chunk.push(line.toString('utf-8')))

  await fs.updateFileByPragma('test/fixtures/generated/not-exists.js', data)
  const writeFileResult = chunk.join('\n')

  t.is(spiedFs.createReadStream.callCount, 0)
  t.is(spiedFs.open.callCount, 1)
  t.is(spiedFs.read.callCount, 0)
  t.is(spiedFs.createWriteStream.callCount, 1)
  t.is(spiedFs.rename.callCount, 0)
  t.is(spiedRimRaf.callCount, 1)

  t.deepEqual(spiedFs.open.firstCall.args[0], 'test/fixtures/generated/not-exists.js')

  t.deepEqual(spiedFs.createWriteStream.firstCall.args[0], 'test/fixtures/generated/.not-exists.js.tmp')
  t.deepEqual(spiedFs.createWriteStream.firstCall.args[1], {encoding: 'utf8'})

  // remove .tmp file.
  t.deepEqual(spiedRimRaf.firstCall.args[0], 'test/fixtures/generated/.not-exists.js.tmp')

  // then try writeFile.
  t.deepEqual(spiedFs.writeFile.firstCall.args[0], 'test/fixtures/generated/not-exists.js')

  const expected = ft`
    const fuga = 'hoge'
    
    /* mat CUSTOM LOGIC [start] */
    console.log('piyo');
    /* mat CUSTOM LOGIC [end] */
    
    const piyo = 'hoge'
    
    /* mat CUSTOM LOGIC 2 [start] */
    console.log('piyo');
    /* mat CUSTOM LOGIC 2 [end] */
    
    const hoge = 'piyo'
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
  const {data} = await fs.seekFile('test/fixtures/generated/large.js', alwaysReturnTrue, 32)
  t.is(data.indexOf('/* mat CUSTOM LOGIC [start] */') > -1, true)

  t.is(spiedFs.open.callCount, 1)
  t.is(spiedFs.fstat.callCount, 1)
  t.is(spiedFs.read.callCount, 363)
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

  const {data} = await fs.seekFile('test/fixtures/generated/small.js')

  t.is(spiedFs.open.callCount, 1)
  t.is(spiedFs.fstat.callCount, 1)
  t.is(spiedFs.read.callCount, 1)
  t.is(spiedFs.close.callCount, 1)

  t.deepEqual(spiedFs.open.firstCall.args[0], 'test/fixtures/generated/small.js')
  t.deepEqual(spiedFs.open.firstCall.args[1], 'r')

  const readFileResult = await fs.readFile('test/fixtures/generated/small.js')
  t.is(ft(data), ft(readFileResult))
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
  const {data} = await fs.seekFile('test/fixtures/generated/large.js', alwaysReturnFalse, 32)
  t.is(data.indexOf('/* mat CUSTOM LOGIC [start] */') > -1, true)

  t.is(spiedFs.open.callCount, 1)
  t.is(spiedFs.fstat.callCount, 1)
  t.is(spiedFs.read.callCount, 1)
  t.is(spiedFs.close.callCount, 1)

  t.deepEqual(spiedFs.open.firstCall.args[0], 'test/fixtures/generated/large.js')
  t.deepEqual(spiedFs.open.firstCall.args[1], 'r')
})

test.serial('readFileByPragma should extract file content between START-END pragma', async (t) => {
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

  const result = await fs.readFileByPragma('test/fixtures/generated/large.js', 'utf8', 0, 'CUSTOM LOGIC')

  t.is(spiedFs.open.callCount, 1)
  t.is(spiedFs.fstat.callCount, 1)
  t.is(spiedFs.read.callCount, 1)
  t.is(spiedFs.close.callCount, 1)

  t.deepEqual(spiedFs.open.firstCall.args[0], 'test/fixtures/generated/large.js')
  t.deepEqual(spiedFs.open.firstCall.args[1], 'r')

  t.is(result.data, ft`
    /* mat CUSTOM LOGIC [start] */
    console.log('hoge');
    /* mat CUSTOM LOGIC [end] */
  `)
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

test('remove with force should call rimraf', async (t) => {
  const spiedRimRaf = sandbox.spy((pattern, opts, cb) => cb(null))

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'rimraf': spiedRimRaf
  })

  const result = await fs.remove('hoge.js', true)
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

  const result = await t.throws(fs.remove('hoge.js', true))
  t.deepEqual(result, dummyError)

  t.is(spiedRimRaf.callCount, 1)
  t.deepEqual(spiedRimRaf.firstCall.args[0], 'hoge.js')
})

test('remove folder without force should call fs.rmdir', async (t) => {
  const spied = sandbox.spy((pattern, cb) => cb(null, true))

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'fs': {
      rmdir: spied
    }
  })

  const result = await fs.remove('hoge')
  t.deepEqual(result, true)

  t.is(spied.callCount, 1)
  t.deepEqual(spied.firstCall.args[0], 'hoge')
})

test('remove file without force should reject with err if rmdir returns error', async (t) => {
  const dummyError = new Error('dummy error')
  const spied = sandbox.spy((pattern, cb) => cb(dummyError))

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'fs': {
      rmdir: spied
    }
  })

  const result = await t.throws(fs.remove('hoge'))
  t.deepEqual(result, dummyError)

  t.is(spied.callCount, 1)
  t.deepEqual(spied.firstCall.args[0], 'hoge')
})

test('remove folder without force should call fs.unlink', async (t) => {
  const spied = sandbox.spy((pattern, cb) => cb(null, true))

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'fs': {
      unlink: spied
    }
  })

  const result = await fs.remove('hoge.js')
  t.deepEqual(result, true)

  t.is(spied.callCount, 1)
  t.deepEqual(spied.firstCall.args[0], 'hoge.js')
})

test('remove file without force should reject with err if unlink returns error', async (t) => {
  const dummyError = new Error('dummy error')
  const spied = sandbox.spy((pattern, cb) => cb(dummyError))

  const fs = proxyquire(absolutePath('lib/utils/fs'), {
    'fs': {
      unlink: spied
    }
  })

  const result = await t.throws(fs.remove('hoge.js'))
  t.deepEqual(result, dummyError)

  t.is(spied.callCount, 1)
  t.deepEqual(spied.firstCall.args[0], 'hoge.js')
})
