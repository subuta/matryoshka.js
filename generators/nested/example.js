import Promise from 'bluebird'

export default (ctx) => {
  const {filePath, fileName, fs} = ctx
  return Promise.map(['hoge', 'fuga'], (str) => {
    return fs.writeFile(`${filePath}/${str}.js`, `const hoge = '${str}'`)
  })
}
