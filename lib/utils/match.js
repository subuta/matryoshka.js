import multimatch from 'multimatch'
import _ from 'lodash'
import process from 'process'

export const ignore = (excepts = ['snippet*'], basePath = process.cwd()) => (paths) => {
  const generators = [`${basePath}/**/generators{,/**/*}`]

  const patterns = _.flatten(_.map(_.uniq(excepts), (moduleToInclude) => {
    if (_.includes(moduleToInclude, '/')) {
      moduleToInclude = moduleToInclude.split('/')
    } else {
      moduleToInclude = [moduleToInclude]
    }

    let acc = []
    return _.transform(moduleToInclude, (result, m) => {
      acc.push(m)
      result.push(`**/node_modules/${acc.join('/')}{,/**/*}`)
    }, [])
  }))

  // ignore empty(not matched)
  return _.isEmpty(multimatch(
    paths,
    [
      ...generators,
      basePath,
      `**/node_modules`,
      ...patterns,
      '!**/.git{,/**}'
    ],
    {dot: true}
  ))
}
