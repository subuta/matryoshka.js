import sane from 'sane'
import _ from 'lodash'
import process from 'process'
import {
  ignore
} from 'lib/utils/match'
import {
  debug
} from 'lib/utils/log'

export default (packages = ['snippet*'], basePath = process.cwd(), opts = {}) => {
  const matcher = ignore(packages, basePath)
  return sane(basePath, {
    watchman: opts.watchman || false,
    ignored: [
      (filename) => {
        if (matcher(filename)) {
          return true
        }
        debug('[tracked by sane] filename = ', filename)
        return false
      }
    ],
    glob: _.compact(_.uniq([
      process.cwd(),
      '**/generators{,/**/{!(*.*),*.js}}', // include whole js.
      ..._.map(packages, p => `**/${p}{,/**/*}`) // then include packages inside node_modules
    ]))
  })
}
