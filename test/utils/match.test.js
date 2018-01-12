import test from 'ava'
import {
  ignore
} from 'lib/utils/match'
import _ from 'lodash'
import minimatch from 'minimatch'

test.beforeEach((t) => {
})

test.afterEach((t) => {
})

test('ignore should ignore node_modules', async (t) => {
  const matcher = ignore([], '/Home/repo/matryoshka.js')

  t.truthy(matcher(['node_modules/others']))
  t.truthy(matcher(['/node_modules/others']))
  t.truthy(matcher(['/Home/repo/matryoshka.js/node_modules/others']))

  t.falsy(matcher(['node_modules']))
})

test('ignore should ignore .git', async (t) => {
  const matcher = ignore([], '/Home/repo/matryoshka.js')

  t.truthy(matcher(['.git']))
  t.truthy(matcher(['.git/others']))
  t.truthy(matcher(['/.git/others']))
  t.truthy(matcher(['/Home/repo/matryoshka.js/.git']))
  t.truthy(matcher(['/Home/repo/matryoshka.js/.git/others']))
})

test('ignore should ignore non-js files', async (t) => {
  const matcher = ignore(['snippet*'], '/Home/repo/matryoshka.js')

  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/snippets/README.md']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/snippets']))
})

test('ignore should ignore node_modules except passed packages', async (t) => {
  const matcher = ignore([
    '@subuta/snippets'
  ], '/Home/repo/matryoshka.js')

  t.truthy(matcher(['node_modules/others']))
  t.truthy(matcher(['/node_modules/others']))
  t.truthy(matcher(['/Home/repo/matryoshka.js/node_modules/others']))

  // ignore snippets under the git.
  t.truthy(matcher(['/Home/repo/matryoshka.js/.git/node_modules/@subuta/snippets']))

  t.falsy(matcher(['/Home/repo/matryoshka.js']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/@subuta']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/@subuta/snippets']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/@subuta/snippets/redux/Action']))
})

test('ignore should ignore node_modules except passed packages with glob', async (t) => {
  const matcher = ignore(['snippet*'], '/Home/repo/matryoshka.js')

  t.truthy(matcher(['node_modules/others']))
  t.truthy(matcher(['/node_modules/others']))
  t.truthy(matcher(['/Home/repo/matryoshka.js/node_modules/others']))
  t.truthy(matcher(['/Home/repo/matryoshka.js/node_modules/@subuta']))

  t.falsy(matcher(['/Home/repo/matryoshka.js']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/snippets']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/snippets/redux/Action']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/snippet.js']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/snippet.js/redux/Action']))
})

test('minimatch tests (for testing glob)', async (t) => {
  t.truthy(minimatch("bar.foo", "*.foo"))
})
