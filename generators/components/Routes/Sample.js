import _ from 'lodash'

export default (ctx) => {
  const { filePath, fileName, fs } = ctx
  console.log('Routes sample index.');
  return Promise.all(_.map(['Hoge.js', 'Fuga.js'], (fileName) => {
    return fs.writeFile(`${filePath}/${fileName}`, '//Routes sample index file...')
  }))
}
