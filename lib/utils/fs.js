import fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import globby from 'globby'
import es from 'event-stream'
import os from 'os'
import {
  START_PRAGMA,
  END_PRAGMA
} from './mat'

export const listFiles = (patterns) => {
  return globby(patterns)
}

export const readFile = (fileName, encoding = 'utf8') => new Promise((resolve, reject) => {
  fs.readFile(fileName, {encoding}, (err, data) => {
    if (err) return reject(err)
    resolve(data)
  })
})

// updateFile contents.
export const updateFile = (fileName, data, encoding = 'utf8') => new Promise((resolve, reject) => {
  const readStream = fs.createReadStream(fileName, {encoding})
  const writeStream = fs.createWriteStream(fileName, {encoding})

  let isSkip = false

  readStream
    .pipe(es.split())
    .pipe(es.map((line, cb) => {
      // replace lines between START-END pragma.
      if (line.indexOf(START_PRAGMA) > -1) {
        isSkip = true
        return cb(null, `${START_PRAGMA}${os.EOL}${data}${os.EOL}${END_PRAGMA}${os.EOL}`)
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

// the predicate always returns true.
const alwaysTrue = () => true

// seek read file and early close file if predicate returns false.
export const seekFile = (fileName, predicate = alwaysTrue, chunkSize = 512, encoding = 'utf8') => new Promise((resolve, reject) => {
  console.log(`trying to seek ${fileName}`)
  fs.open(fileName, 'r', function (err, fd) {
    const finalize = (err, buffer) => {
      fs.close(fd, function (err) {
        if (err) return reject(err)
        resolve(buffer.toString(encoding))
      })
    }

    // return if file not found.
    if (!fd) return reject(new Error(`${fileName} is not found`))
    if (err) return finalize(err)

    fs.fstat(fd, (err, stats) => {
      if (err) return finalize(err)

      let bufferSize = stats.size,
        buffer = new Buffer(bufferSize),
        bytesRead = 0

      const read = function () {
        if ((bytesRead + chunkSize) > bufferSize) {
          chunkSize = (bufferSize - bytesRead)
        }

        // if no chunk left.
        if (chunkSize <= 0) return finalize(null, buffer)

        fs.read(fd, buffer, bytesRead, chunkSize, bytesRead, (err) => {
          if (err) return finalize(err)
          const data = buffer.slice(0, bytesRead).toString(encoding).trim()

          // abort seeking if predicate returns falsy value.
          if (!predicate(data)) return finalize(null, buffer)

          bytesRead += chunkSize
          read()
        })
      }
      read()
    })
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

export default {
  listFiles,
  readFile,
  writeFile,
  remove
}
