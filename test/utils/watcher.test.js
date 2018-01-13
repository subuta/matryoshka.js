import test from 'ava'
import _ from 'lodash'
import minimatch from 'minimatch'
import anymatch from 'anymatch'
import { debug } from 'lib/utils/log'
import { absolutePath } from 'lib/utils/path'
import sinon from 'sinon'
import { calculatePathDiff } from '../../lib/utils/path'
import process from "process"

const proxyquire = require('proxyquire').noCallThru()
const sandbox = sinon.sandbox.create()

const cwd = '/Home/repo/matryoshka.js'

test.beforeEach((t) => {
  const process = {
    cwd: sandbox.spy(() => cwd)
  }
  const ignore = proxyquire(absolutePath('lib/utils/match'), {
    process
  }).ignore

  t.context = {
    ignore,
    process
  }
})

test.afterEach((t) => {
  sandbox.reset()
})

const testSane = (opts, relativePath) => {
  const globs = opts.glob || []
  const doIgnore = anymatch(opts.ignored || [])

  let matched = false

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
  const {ignore, process} = t.context

  const packages = ['@subuta/snippets']
  const basePath = '/Home/repo'

  const matcher = ignore(packages, basePath)
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
    glob: _.compact(_.uniq([
      process.cwd(),
      '**/generators{,/**/{!(*.*),*.js}}', // include whole js.
      ..._.map(packages, p => `**/${p}{,/**/*}`) // then include packages inside node_modules
    ]))
  }

  // will ignored =========
  t.falsy(testSane(opts, `${cwd}/node_modules`))
  t.falsy(testSane(opts, `${cwd}/node_modules/hoge.js`))

  // will also ignore non-json files at target dir
  t.falsy(testSane(opts, `${cwd}/generators/hoge.json`))
  t.falsy(testSane(opts, `${cwd}/node_modules/@subuta/snippets/package.json`))
  t.falsy(testSane(opts, `${cwd}/node_modules/@subuta/snippets/README.md`))

  // non node_modules (linked modules)
  t.falsy(testSane(opts, '/Home/repo/@subuta/snippets/redux/README.md'))

  // will watched =========
  t.truthy(testSane(opts, 'generators'))
  t.truthy(testSane(opts, 'generators/hoge.js'))
  t.truthy(testSane(opts, `${cwd}`))
  t.truthy(testSane(opts, `${cwd}/generators`))
  t.truthy(testSane(opts, `${cwd}/generators/hoge`))
  t.truthy(testSane(opts, `${cwd}/generators/hoge.js`))
  t.truthy(testSane(opts, `${cwd}/generators/nested/hoge.js`))
  t.truthy(testSane(opts, `${cwd}/nested/generators/hoge.js`))
  t.truthy(testSane(opts, `${cwd}/nested/generators/hoge`))
  t.truthy(testSane(opts, `${cwd}/nested/generators/nested/hoge.js`))
  t.truthy(testSane(opts, `${cwd}/nested/generators/nested/hoge`))
  t.truthy(testSane(opts, `${cwd}/node_modules/@subuta/snippets/hoge.js`))
  t.truthy(testSane(opts, `${cwd}/node_modules/@subuta/snippets/hoge`))
  t.truthy(testSane(opts, 'node_modules/@subuta/snippets/hoge.js'))
  t.truthy(testSane(opts, 'node_modules/@subuta/snippets/hoge'))
  t.truthy(testSane(opts, '/node_modules/@subuta/snippets/hoge.js'))
  t.truthy(testSane(opts, '/node_modules/@subuta/snippets/hoge'))

  // include directory itself.
  t.truthy(testSane(opts, `${cwd}/generators`))

  // non node_modules (linked modules)
  t.truthy(testSane(opts, '/Home/repo/@subuta/snippets/redux/Action.js'))
})
