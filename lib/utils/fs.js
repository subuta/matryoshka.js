import fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import globby from 'globby'

export const listFiles = (patterns) => {
  return globby(patterns)
}

export const readFile = (fileName, encoding = 'utf8') => new Promise((resolve, reject) => {
  fs.readFile(fileName, { encoding }, (err, data) => {
    if (err) return reject(err)
    resolve(data)
  });
})

export const writeFile = (fileName, data, encoding = 'utf8') => new Promise((resolve, reject) => {
  console.log(`trying to write ${fileName}`)
  mkdirp(path.dirname(fileName), (err) => {
    if (err) return reject(err)
    fs.writeFile(fileName, data, { encoding }, (err) => {
      if (err) return reject(err)
      resolve(true)
    });
  })
})

export const remove = (pattern) => new Promise((resolve, reject) => {
  console.log(`trying to delete ${pattern}`)
  rimraf(pattern, (err) => {
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
