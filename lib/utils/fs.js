import fs from 'fs'
import path from 'path'

const writeFile = (filePath, data) => new Promise((resolve, reject) => {
  fs.writeFile(filePath, data, (err) => {
    if (err) return reject(err)
    resolve(true)
  });
})

export default {
  writeFile
}
