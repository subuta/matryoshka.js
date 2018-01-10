import test from 'ava'
import _ from 'lodash'
import minimatch from 'minimatch'
import anymatch from 'anymatch'
import {
  ignore
} from 'lib/utils/match'
import { debug } from '../../lib/utils/log'

test.beforeEach((t) => {
})

test.afterEach((t) => {
})

const testSane = (opts, relativePath) => {
  const globs = opts.glob || []
  const doIgnore = anymatch(opts.ignored || [])

  let matched = false

  for (let i = 0; i < globs.length; i++) {
    if (minimatch(relativePath, globs[i]) && !doIgnore(relativePath)) {
      matched = true
      break
    }
  }

  return matched
}

// https://github.com/amasad/sane/blob/master/src/common.js#L56
test('matcher tests (for testing glob)', async (t) => {
  const packages = ['@subuta/snippets']

  const matcher = ignore(packages)
  const opts = {
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
      '**/generators/**/*.js', // include whole js.
      ..._.map(packages, p => `**/node_modules/${p}/**`)
    ]
  }

  t.truthy(testSane(opts, 'generators/hoge.js'))
  t.truthy(testSane(opts, '/Users/subuta/repo/matryoshka.js/generators/hoge.js'))
  t.falsy(testSane(opts, '/Users/subuta/repo/matryoshka.js/node_modules/hoge.js'))
  t.truthy(testSane(opts, '/Users/subuta/repo/matryoshka.js/node_modules/@subuta/snippets/hoge.js'))
  t.truthy(testSane(opts, 'node_modules/@subuta/snippets/hoge.js'))
})
