import helper from './_helper'
import Action from '@subuta/snippets/lib/redux/Action'

export default (ctx) => {
  const { filePath, fileName, fs } = ctx
  return fs.writeFile(`${filePath}/${fileName}`, Action())
}
