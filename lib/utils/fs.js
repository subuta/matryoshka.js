import fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import globby from 'globby'
import es from 'event-stream'
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

export const updateFile = (fileName, data, encoding = 'utf8') => new Promise((resolve, reject) => {
  const readStream = fs.createReadStream(fileName, {encoding})

  // readStream
  //   .pipe(es.split())
  //   .pipe(es.through(async function (line) {
  //     chunk.push(line)
  //
  //     // chunk毎にcallbackを呼び出す。
  //     const data = chunk.join('\n')
  //
  //     // 一度止める
  //     this.pause()
  //
  //     // callbackの完了を待つ
  //     console.log(data);
  //     // chunk = []
  //
  //     // 再開する
  //     this.resume()
  //
  //     // if (lineNumber % BATCH_SIZE === 0) {
  //     //   chunkNumber++
  //     //
  //     //   // chunk毎にcallbackを呼び出す。
  //     //   const data = chunk.join('\n')
  //     //
  //     //   // 一度止める
  //     //   this.pause()
  //     //
  //     //   // callbackの完了を待つ
  //     //   console.log(data);
  //     //   chunk = []
  //     //
  //     //   // 再開する
  //     //   this.resume()
  //     // }IZEで割り切れたらcallbackを呼ぶ
  //     //
  //   }))
  //   .on('error', (err) => reject(err))
  //   .on('end', function () {
  //     // This may not been called since we are destroying the stream
  //     // the first time 'data' event is received
  //     console.log('All the data in the file has been read')
  //     // chunk毎にcallbackを呼び出す。
  //     const data = chunk.join('\n')
  //     resolve(data)
  //   })

  readStream
    .pipe(es.split())
    .pipe(es.through(async function (line) {
      console.log('at test', line)
      chunk.push(line)
    }))
    .on('error', (err) => reject(err))
    .on('end', function () {
      // This may not been called since we are destroying the stream
      // the first time 'data' event is received
      console.log('All the data in the file has been read')
      // chunk毎にcallbackを呼び出す。
      const data = chunk.join('\n')
      resolve(data)
    }).on('close', function () {
    console.log('closed!!')
  })
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
