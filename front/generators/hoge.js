import { build, snippets as s } from 'bld.js'
import Action from '@subuta/snippets/lib/redux/Action'

export default (ctx) => {
  const {filePath, fileName, fs} = ctx
  return fs.writeFile(`${filePath}/${fileName}`, build`
    ${Action()}
  `)
}
