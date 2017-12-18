import Promise from 'bluebird'
import _ from 'lodash'
import os from 'os'

// format string
export const ft = (str) => {
  return _.map(str.split(os.EOL), line => {
    return _.trim(line)
  }).join(os.EOL).trim(os.EOL)
}

export default (ctx) => {
  const {filePath, fileName, fs} = ctx

  return Promise.map(['hoge', 'fuga'], (str) => {
    return fs.writeFile(`${filePath}/${str}.js`, ft(`
      const hoge = '${str}'
      
      /* mat CUSTOM LOGIC [start] */
      /* mat CUSTOM LOGIC [end] */
      
      const piyo = 'piyo'
    `))
  })
}
