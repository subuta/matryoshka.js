export default (ctx) => {
  const { filePath, fileName, fs } = ctx
  return fs.writeFile(`${filePath}/${fileName}`, 'loooo')
}
