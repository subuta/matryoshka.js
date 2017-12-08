import helper from './_helper'

export default (ctx) => {
  const { filePath, fileName, fs } = ctx
  return fs.writeFile(`${filePath}/${fileName}`, `dssconsole.log('generated file, helper.default = ${helper}');`)
}
