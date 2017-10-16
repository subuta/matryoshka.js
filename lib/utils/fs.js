import fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'

const writeFile = (fileName, data) => new Promise((resolve, reject) => {
  mkdirp(path.dirname(fileName), (err) => {
    if (err) return reject(err)
    fs.writeFile(fileName, data, (err) => {
      if (err) return reject(err)
      resolve(true)
    });
  })
})

export default {
  writeFile
}
