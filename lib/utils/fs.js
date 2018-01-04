import fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import globby from 'globby'
import { Readable, PassThrough } from 'stream'
import es from 'event-stream'
import _ from 'lodash'
import os from 'os'

import {
  matchPragma,
  createPragma,
  START_PRAGMA,
  END_PRAGMA
} from './mat'

const createReadStreamFromString = (str) => {
  const stream = new Readable()
  stream.push(str)
  stream.push(null)
  return stream
}
// standard fs operation

export const listFiles = (patterns) => {
  return globby(patterns)
}

export const readFile = (fileName, encoding = 'utf8') => new Promise((resolve, reject) => {
  fs.readFile(fileName, {encoding}, (err, data) => {
    if (err) return reject(err)
    resolve(data)
  })
})

// override by default.
export const rename = (oldPath, newPath) => new Promise((resolve, reject) => {
  fs.rename(oldPath, newPath, (err) => {
    if (err) return reject(err)
    resolve(true)
  })
})

export const writeFile = (fileName, data, encoding = 'utf8') => new Promise((resolve, reject) => {
  console.log(`trying to write ${fileName}`)

  // create directory first.
  mkdir(path.dirname(fileName), true).then(() => {
    fs.writeFile(fileName, data, {encoding}, (err) => {
      if (err) return reject(err)
      resolve(true)
    })
  }).catch(reject)
})

export const mkdir = (dirname, force = false) => new Promise((resolve, reject) => {
  // console.log(`trying to make directory(force = ${force}) ${dirname}`)

  // if not force then use ordinal `rmdir`
  if (!force) {
    return fs.mkdir(dirname, (err) => {
      if (err) return reject(err)
      resolve(true)
    })
  }

  // otherwise try `mkdir -p`
  mkdirp(dirname, (err) => {
    if (err) return reject(err)
    resolve(true)
  })
})

export const remove = (fileName, force = false) => new Promise((resolve, reject) => {
  console.log(`trying to delete(force = ${force}) ${fileName}`)

  // if not force then use ordinal `rmdir`
  if (!force) {
    const isFile = path.extname(fileName) !== ''
    const fn = isFile ? fs.unlink : fs.rmdir
    return fn(fileName, (err, data) => {
      if (err && (err.code !== 'ENOTEMPTY')) return reject(err)
      resolve(data)
    })
  }

  // otherwise try `rm -rf`
  rimraf(fileName, {glob: false}, (err) => {
    if (err) return reject(err)
    resolve(true)
  })
})

// unique fs operation

// the predicate always returns true.
const alwaysTrue = () => true

// seek read file and early close file if predicate returns false.
export const seekFile = (fileName, predicate = alwaysTrue, chunkSize = 256, encoding = 'utf8', offset = 0) => new Promise((resolve, reject) => {
  console.log(`trying to seek ${fileName}`)
  fs.open(fileName, 'r', function (err, fd) {
    let bytesRead = offset || 0
    let currentChunkSize = chunkSize

    const toString = (buffer) => buffer.slice(0, bytesRead).toString(encoding).trim()

    const finalize = (err, buffer) => {
      if (err) return reject(err)
      const pos = _.max([bytesRead - currentChunkSize, 0])
      fs.close(fd, function (err) {
        if (err) return reject(err)
        resolve({
          pos,
          data: toString(buffer)
        })
      })
    }

    // return if file not found.
    if (!fd) {
      const error = new Error(`${fileName} is not found`)
      error.code = 'ENOENT'
      return reject(error)
    }

    if (err) return finalize(err)

    fs.fstat(fd, (err, stats) => {
      if (err) return finalize(err)

      let bufferSize = stats.size
      let buffer = new Buffer(bufferSize)

      const read = function () {
        if ((bytesRead + chunkSize) > bufferSize) {
          currentChunkSize = (bufferSize - bytesRead)
        }

        // if no chunk left.
        if (currentChunkSize <= 0) return finalize(null, toString(buffer))

        fs.read(fd, buffer, bytesRead, currentChunkSize, bytesRead, (err) => {
          if (err) return finalize(err)

          bytesRead += currentChunkSize
          const data = toString(buffer)

          // abort seeking if predicate returns falsy value.
          if (!predicate(data)) return finalize(null, data)
          read()
        })
      }
      read()
    })
  })
})

// seek read file and early close file if predicate returns false.
export const readFileByPragma = (fileName, encoding = 'utf8', offset = 0, name = '') => new Promise((resolve, reject) => {
  const hasPragma = (str, label) => str.indexOf(createPragma(name, label)) > -1

  // check data has a START-END pragma
  const checkPragma = (data) => !(hasPragma(data, 'start') && hasPragma(data, 'end'))

  seekFile(fileName, checkPragma, 256, encoding, offset).then(({data, pos}) => {
    let isRead = false
    let isDone = false

    data = _.transform(data.split(os.EOL), (chunk, line) => {
      if (isDone) return
      // extract lines between START-END pragma.
      if (hasPragma(line, 'start')) {
        isRead = true
      } else if (isRead && hasPragma(line, 'end')) {
        isRead = false
        isDone = true
        chunk.push(line)
      }
      if (isRead) chunk.push(line)
    }, []).join(os.EOL)

    resolve({
      pos,
      data
    })
  }).catch(reject)
})

// updateFile contents.
export const updateFileByPragma = async (fileName, data, encoding = 'utf8') => {
  const tmpFileName = path.join(path.dirname(fileName), `.${path.basename(fileName)}.tmp`)

  // read from source and write to tmpFile
  await new Promise(async (resolve, reject) => {
    const dataStream = createReadStreamFromString(data)

    // create directory first.
    await mkdir(path.dirname(tmpFileName), true)

    // then create write stream.
    const writeStream = fs.createWriteStream(tmpFileName, {encoding})

    let isSkip = false
    let offset = 0
    let isFileNotExists = false

    dataStream
      .pipe(es.split(/(\r?\n)/))
      .pipe(es.through(function (line) {
        // pass-through data if file not exists.
        if (isFileNotExists) {
          return this.emit('data', line)
        }

        // replace lines between START-END pragma.
        if (line.match(START_PRAGMA)) {
          isSkip = true

          this.pause()
          readFileByPragma(fileName, encoding, offset, matchPragma(line)).then(({data, pos}) => {
            offset = pos

            // reset offset if data not found.
            if (_.isEmpty(data)) {
              offset = 0
            }

            this.emit('data', data)
            this.resume()
          }).catch((err) => {
            if (err.code === 'ENOENT') {
              isSkip = false
              isFileNotExists = true
              this.emit('data', line) // write skipped line.
              this.resume()
              return
            }
            return reject(err)
          })
        } else if (line.match(END_PRAGMA)) {
          isSkip = false
          return this.emit('data', '')
        }

        // return while skip
        if (isSkip) return this.emit('data', '')

        // keep other lines.
        this.emit('data', line)
      }))
      .pipe(writeStream)
      .on('error', (err) => reject(err))
      .on('end', () => resolve())
      .on('close', () => resolve())
  })

  // then rename tmpFile to fileName
  await rename(tmpFileName, fileName)
}

export default {
  listFiles,
  readFile,
  writeFile,
  mkdir,
  remove,
  rename,
  seekFile,
  readFileByPragma,
  updateFileByPragma
}
