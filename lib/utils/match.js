import multimatch from 'multimatch'
import _ from 'lodash'
import process from 'process'

export const ignore = (excepts = ['snippet*'], basePath = process.cwd()) => (paths) => {
  const generators = [`**/generators{,/**/{!(*.*),*.js}}`]

  const patterns = _.flatten(_.map(_.uniq(excepts), (moduleToInclude) => {
    if (_.includes(moduleToInclude, '/')) {
      moduleToInclude = moduleToInclude.split('/')
    } else {
      moduleToInclude = [moduleToInclude]
    }

    let acc = []
    return _.transform(moduleToInclude, (result, m) => {
      acc.push(m)
      result.push(`**/${acc.join('/')}{,/**/{!(*.*),*.js}}`)
    }, [])
  }))

  // ignore empty(not matched)
  return _.isEmpty(multimatch(
    paths,
    [
      ...generators,
      basePath,
      ...patterns,
      `**/node_modules`,
      '!**/.git{,/**}'
    ],
    {dot: true}
  ))
}
