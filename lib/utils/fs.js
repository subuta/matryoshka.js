import fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'

const writeFile = (fileName, data) => new Promise((resolve, reject) => {
  console.log(`trying to generate ${fileName}.js`)
  mkdirp(path.dirname(fileName), (err) => {
    if (err) return reject(err)
    fs.writeFile(fileName, data, (err) => {
      if (err) return reject(err)
      resolve(true)
    });
  })
})

const remove = (pattern) => new Promise((resolve, reject) => {
  rimraf(pattern, (err) => {
    if (err) return reject(err)
    resolve(true)
  })
})

export default {
  writeFile,
  remove
}
