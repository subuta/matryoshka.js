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

  console.log(relativePath);
  for (let i = 0; i < globs.length; i++) {
    if (minimatch(relativePath, globs[i], {dot: true}) && !doIgnore(relativePath)) {
      matched = true
      break
    }
  }

  return matched
}

// https://github.com/amasad/sane/blob/master/src/common.js#L56
test('matcher tests (for testing glob)', async (t) => {
  const packages = ['@subuta/snippets']

  const matcher = ignore(packages, '/Home/repo/matryoshka.js')
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
      '**/generators/**/*{,.js}', // include whole js.
      ..._.map(packages, p => `**/node_modules/${p}/**`)
    ]
  }

  // will ignored
  t.falsy(testSane(opts, '/Home/repo/matryoshka.js'))
  t.falsy(testSane(opts, '/Home/repo/matryoshka.js/node_modules'))
  t.falsy(testSane(opts, '/Home/repo/matryoshka.js/node_modules/hoge.js'))
  t.falsy(testSane(opts, 'generators'))
  t.falsy(testSane(opts, 'generators/hoge.js'))

  // will also ignore non-json files at target dir.
  t.falsy(testSane(opts, '/Home/repo/matryoshka.js/generators/hoge.json'))
  t.falsy(testSane(opts, '/Home/repo/matryoshka.js/node_modules/@subuta/snippets/package.json'))
  t.falsy(testSane(opts, '/Home/repo/matryoshka.js/node_modules/@subuta/snippets/README.md'))

  // ignore directory itself.
  t.falsy(testSane(opts, '/Home/repo/matryoshka.js/generators'))

  // will watched
  t.truthy(testSane(opts, '/Home/repo/matryoshka.js/generators/hoge.js'))
  t.truthy(testSane(opts, '/Home/repo/matryoshka.js/generators/hoge'))
  t.truthy(testSane(opts, '/Home/repo/matryoshka.js/generators/nested/hoge.js'))
  t.truthy(testSane(opts, '/Home/repo/matryoshka.js/nested/generators/hoge.js'))
  t.truthy(testSane(opts, '/Home/repo/matryoshka.js/nested/generators/hoge'))
  t.truthy(testSane(opts, '/Home/repo/matryoshka.js/nested/generators/nested/hoge.js'))
  t.truthy(testSane(opts, '/Home/repo/matryoshka.js/nested/generators/nested/hoge'))
  t.truthy(testSane(opts, '/Home/repo/matryoshka.js/node_modules/@subuta/snippets/hoge.js'))
  t.truthy(testSane(opts, '/Home/repo/matryoshka.js/node_modules/@subuta/snippets/hoge'))
  t.truthy(testSane(opts, 'node_modules/@subuta/snippets/hoge.js'))
  t.truthy(testSane(opts, 'node_modules/@subuta/snippets/hoge'))
  t.truthy(testSane(opts, '/node_modules/@subuta/snippets/hoge.js'))
  t.truthy(testSane(opts, '/node_modules/@subuta/snippets/hoge'))
})
