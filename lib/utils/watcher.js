import sane from 'sane'
import _ from 'lodash'
import process from 'process'
import {
  ignore
} from 'lib/utils/match'
import {
  debug
} from 'lib/utils/log'

export default (packages = [], ignore = _.noop) => {
  const matcher = ignore(packages)
  return sane(process.cwd(), {
    ignored: [
      (filename) => {
        if (matcher(filename)) {
          return true
        }
        debug('[tracked by sane] filename = ', filename)
        return false
      }
    ],
    glob: [
      '**/generators/**/*.js$', // include whole js.
      ..._.map(packages, p => `**/node_modules/${p}/**`) // then include packages inside node_modules
    ]
  })
}
