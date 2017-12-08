import _ from 'lodash'
import os from 'os'

// format template string
export const ft = (str) => {
  if (_.isArray(str)) {
    str = _.first(str)
  }
  return _.compact(_.map(str.split(os.EOL), line => {
    return _.trim(line)
  })).join(os.EOL)
}
