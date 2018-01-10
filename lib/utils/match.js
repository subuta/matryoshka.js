import multimatch from 'multimatch'
import _ from 'lodash'

const matched = (result) => !_.isEmpty(result)

export const ignore = (excepts = []) => (paths) => {
  const patterns = _.map(_.uniq(excepts), (moduleToInclude) => (
    `!**/${moduleToInclude}{,/**/*}`
  ))
  // return matched(bool)
  return matched(multimatch(
    paths,
    ['**/node_modules{,/**}', '**/.git{,/**}', ...patterns],
    { dot: true }
  ))
}
