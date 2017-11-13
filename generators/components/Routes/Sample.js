import _ from 'lodash'

export default (ctx) => {
  const { filePath, fileName, fs } = ctx
  return Promise.all(_.map(['Hoge.js', 'Hoge2.js'], (fileName) => {
    return fs.writeFile(`${filePath}/${fileName}`, '//Routes sample index file...')
  }))
}
