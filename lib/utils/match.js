import multimatch from 'multimatch'
import _ from 'lodash'
import process from 'process'
import {
  calculatePathDiff
} from 'lib/utils/path'

export const ignore = (excepts = ['snippet*'], basePath = process.cwd()) => (paths) => {
  const generators = [`**/generators{,/**/{!(*.*),*.js}}`]

  let cwd = process.cwd()
  if (calculatePathDiff(process.cwd(), basePath)) {
    cwd = calculatePathDiff(process.cwd(), basePath)
  }

  const patterns = _.flatten(_.map(_.uniq(excepts), (moduleToInclude) => {
    if (_.includes(moduleToInclude, '/')) {
      moduleToInclude = moduleToInclude.split('/')
    } else {
      moduleToInclude = [moduleToInclude]
    }

    let acc = []
    return _.transform(moduleToInclude, (result, m) => {
      acc.push(m)
      // first include all matches under the module
      result.push(`**/${acc.join('/')}{,/**/{!(*.*),*.js}}`)
      // then exclude all matches under the module's node_modules
      result.push(`!**/${acc.join('/')}/node_modules{,/**/*}`)
    }, [])
  }))

  // ignore empty(not matched)
  return _.isEmpty(multimatch(
    paths,
    _.compact(_.uniq([
      basePath,
      cwd,
      `**/node_modules`,
      ...generators,
      ...patterns,
      '!**/.git{,/**}'
    ])),
    {dot: true}
  ))
}
