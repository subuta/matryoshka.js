import fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import globby from 'globby'

const listFiles = (patterns) => {
  return globby(patterns)
}

const writeFile = (fileName, data) => new Promise((resolve, reject) => {
  console.log(`trying to write ${fileName}`)
  mkdirp(path.dirname(fileName), (err) => {
    if (err) return reject(err)
    fs.writeFile(fileName, data, (err) => {
      if (err) return reject(err)
      resolve(true)
    });
  })
})

const remove = (pattern) => new Promise((resolve, reject) => {
  console.log(`trying to delete ${pattern}`)
  rimraf(pattern, (err) => {
    if (err) return reject(err)
    resolve(true)
  })
})

export default {
  listFiles,
  writeFile,
  remove
}
