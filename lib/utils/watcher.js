import sane from 'sane'
import _ from 'lodash'
import process from 'process'
import {
  ignore
} from 'lib/utils/match'
import {
  debug
} from 'lib/utils/log'
import { calculatePathDiff } from './path'

export default (packages = ['snippet*'], basePath = process.cwd()) => {
  let cwd = process.cwd()
  if (calculatePathDiff(process.cwd(), basePath)) {
    cwd = calculatePathDiff(process.cwd(), basePath)
  }

  const matcher = ignore(packages, basePath)
  return sane(basePath, {
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
      cwd,
      '**/generators{,/**/{!(*.*),*.js}}', // include whole js.
      ..._.map(packages, p => `**/${p}{,/**/*}`) // then include packages inside node_modules
    ]
  })
}
