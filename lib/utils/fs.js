import fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import globby from 'globby'
import es from 'event-stream'
import _ from 'lodash'
import os from 'os'

import {
  START_PRAGMA,
  END_PRAGMA,
  wrapPragma
} from './mat'

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

export const writeFile = (fileName, data, encoding = 'utf8') => new Promise((resolve, reject) => {
  console.log(`trying to write ${fileName}`)
  mkdirp(path.dirname(fileName), (err) => {
    if (err) return reject(err)
    fs.writeFile(fileName, data, {encoding}, (err) => {
      if (err) return reject(err)
      resolve(true)
    })
  })
})

export const remove = (pattern) => new Promise((resolve, reject) => {
  console.log(`trying to delete ${pattern}`)
  rimraf(pattern, {glob: false}, (err) => {
    if (err) return reject(err)
    resolve(true)
  })
})

// unique fs operation

// the predicate always returns true.
const alwaysTrue = () => true

// seek read file and early close file if predicate returns false.
export const seekFile = (fileName, predicate = alwaysTrue, chunkSize = 256, encoding = 'utf8') => new Promise((resolve, reject) => {
  console.log(`trying to seek ${fileName}`)
  fs.open(fileName, 'r', function (err, fd) {
    let bytesRead = 0

    const toString = (buffer) => buffer.slice(0, bytesRead).toString(encoding).trim()

    const finalize = (err, buffer) => {
      fs.close(fd, function (err) {
        if (err) return reject(err)
        resolve(toString(buffer))
      })
    }

    // return if file not found.
    if (!fd) return reject(new Error(`${fileName} is not found`))
    if (err) return finalize(err)

    fs.fstat(fd, (err, stats) => {
      if (err) return finalize(err)

      let bufferSize = stats.size,
        currentChunkSize = chunkSize,
        buffer = new Buffer(bufferSize)

      const read = function () {
        if ((bytesRead + chunkSize) > bufferSize) {
          currentChunkSize = (bufferSize - bytesRead)
        }

        // if no chunk left.
        if (currentChunkSize <= 0) return finalize(null, buffer)

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
export const readFileByPragma = (fileName, encoding = 'utf8') => new Promise((resolve, reject) => {
  // check data has a START-END pragma
  const checkPragma = (data) => {
    const hasStartPragma = data.indexOf(START_PRAGMA) > -1
    const hasEndPragma = data.indexOf(END_PRAGMA) > -1
    return !(hasStartPragma && hasEndPragma)
  }
  seekFile(fileName, checkPragma, 256, encoding).then((data) => {
    let isRead = false
    data = _.transform(data.split(os.EOL), (chunk, line) => {
      // replace lines between START-END pragma.
      if (line.indexOf(START_PRAGMA) > -1) {
        isRead = true
      } else if (line.indexOf(END_PRAGMA) > -1) {
        isRead = false
        chunk.push(line)
      }
      if (isRead) chunk.push(line)
    }, []).join(os.EOL)
    resolve(data)
  })
})

// updateFile contents.
export const updateFileByPragma = (fileName, data, encoding = 'utf8') => new Promise((resolve, reject) => {
  const readStream = fs.createReadStream(fileName, {encoding})
  const writeStream = fs.createWriteStream(fileName, {encoding})

  let isSkip = false

  readStream
    .pipe(es.split())
    .pipe(es.map((line, cb) => {
      // replace lines between START-END pragma.
      if (line.indexOf(START_PRAGMA) > -1) {
        isSkip = true
        return cb(null, wrapPragma(data))
      } else if (line.indexOf(END_PRAGMA) > -1) {
        isSkip = false
        return cb()
      }

      // return while skip
      if (isSkip) return cb()

      // keep other lines.
      return cb(null, line)
    }))
    .pipe(writeStream)
    .on('error', (err) => reject(err))
    .on('end', () => resolve())
})

export default {
  listFiles,
  readFile,
  writeFile,
  remove,
  seekFile,
  readFileByPragma,
  updateFileByPragma
}
