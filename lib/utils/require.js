import _ from 'lodash'
import {
  debug
} from './log'

import importFresh from 'import-fresh'
import { absolutePath } from 'lib/utils/path'

export const requireGlob = async (files) => _.reduce(files, (result, file) => {
  debug(`[requireGlob] try to import ${file}`)
  result[file] = importFresh(absolutePath(file))
  return result
}, {})

export const parseDependencies = (dependencies, module, parents = []) => {
  _.transform(dependencies, (result, md, m) => {
    if (!_.includes(md, module)) return
    if (_.includes(parents, m)) return
    result.push(module)
    parseDependencies(dependencies, m, result)
    result.push(m)
  }, parents)
  return _.uniq(parents)
}

export default requireGlob
