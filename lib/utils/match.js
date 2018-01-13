import multimatch from 'multimatch'
import _ from 'lodash'
import process from 'process'
import path from 'path'

export const ignore = (excepts = ['snippet*'], basePath = process.cwd()) => (paths) => {
  const generators = [`**/generators{,/**/{!(*.*),*.js}}`]

  let acc = []
  const dirs = _.flatten(_.transform(process.cwd().split(path.sep), (result, dir) => {
    acc.push(dir)
    return result.push(`${acc.join(path.sep)}`)
  }), [])

  const patterns = _.flatten(_.map(_.uniq(excepts), (moduleToInclude) => {
    if (_.includes(moduleToInclude, path.sep)) {
      moduleToInclude = moduleToInclude.split(path.sep)
    } else {
      moduleToInclude = [moduleToInclude]
    }

    let acc = []
    return _.transform(moduleToInclude, (result, m) => {
      acc.push(m)
      // first include all matches under the module
      result.push(`**/${acc.join(path.sep)}{,/**/{!(*.*),*.js}}`)
      // then exclude all matches under the module's node_modules
      result.push(`!**/${acc.join(path.sep)}/node_modules{,/**/*}`)
    }, [])
  }))

  // ignore empty(not matched)
  return _.isEmpty(multimatch(
    paths,
    _.compact(_.uniq([
      ...dirs,
      `**/node_modules`,
      ...generators,
      ...patterns,
      '!**/.git{,/**}'
    ])),
    {dot: true}
  ))
}
