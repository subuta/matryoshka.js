import fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import globby from 'globby'
import es from 'event-stream'

export const listFiles = (patterns) => {
  return globby(patterns)
}

export const readFile = (fileName, encoding = 'utf8') => new Promise((resolve, reject) => {
  fs.readFile(fileName, {encoding}, (err, data) => {
    if (err) return reject(err)
    resolve(data)
  })
})

export const readFileStream = (fileName, encoding = 'utf8') => new Promise((resolve, reject) => {
  const readStream = fs.createReadStream(fileName, {encoding})

  let chunk = []

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
    .on('data', function (line) {
      chunk.push(line)
    })
    .on('error', (err) => reject(err))
    .on('end', function () {
      // This may not been called since we are destroying the stream
      // the first time 'data' event is received
      console.log('All the data in the file has been read')
      // chunk毎にcallbackを呼び出す。
      const data = chunk.join('\n')
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

export default {
  listFiles,
  readFile,
  writeFile,
  remove
}
