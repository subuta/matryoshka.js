export default (ctx) => {
  const { filePath, fileName, fs } = ctx
  console.log('Components index.');
  return fs.writeFile(`${filePath}/${fileName}`, '//Components index file')
}
