import helper from './_helper'

export default (ctx) => {
  const { filePath, fileName, fs } = ctx
  return fs.writeFile(`${filePath}/${fileName}`, `console.log('generated file, helper.default = ${helper}');`)
}
