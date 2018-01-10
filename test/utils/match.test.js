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
  const matcher = ignore()

  t.truthy(matcher(['node_modules']))
  t.truthy(matcher(['node_modules/others']))
  t.truthy(matcher(['/node_modules/others']))
  t.truthy(matcher(['/Users/subuta/repo/matryoshka.js/node_modules/others']))
})

test('ignore should ignore .git', async (t) => {
  const matcher = ignore()

  t.truthy(matcher(['.git']))
  t.truthy(matcher(['.git/others']))
  t.truthy(matcher(['/.git/others']))
  t.truthy(matcher(['/Users/subuta/repo/matryoshka.js/.git/others']))
})

// FIXME: saneで渡される時は親から順に来るため、 [!node_modules/@subuta, !node_modules/@subuta/snippets] みたいにする必要がありそう。
test('ignore should ignore node_modules except passed packages', async (t) => {
  const matcher = ignore([
    '@subuta/snippets'
  ])

  t.truthy(matcher(['node_modules/others']))
  t.truthy(matcher(['/node_modules/others']))
  t.truthy(matcher(['/Users/subuta/repo/matryoshka.js/node_modules/others']))
  t.falsy(matcher(['/Users/subuta/repo/matryoshka.js/node_modules']))
  t.falsy(matcher(['/Users/subuta/repo/matryoshka.js/node_modules/@subuta']))
  t.falsy(matcher(['/Users/subuta/repo/matryoshka.js/node_modules/@subuta/snippets']))
  t.falsy(matcher(['/Users/subuta/repo/matryoshka.js/node_modules/@subuta/snippets/redux/Action']))
})

test('ignore should ignore node_modules except passed packages with glob', async (t) => {
  const matcher = ignore([
    'snippet*'
  ])

  t.truthy(matcher(['node_modules/others']))
  t.truthy(matcher(['/node_modules/others']))
  t.truthy(matcher(['/Users/subuta/repo/matryoshka.js/node_modules/others']))
  t.falsy(matcher(['/Users/subuta/repo/matryoshka.js/node_modules']))
  t.falsy(matcher(['/Users/subuta/repo/matryoshka.js/node_modules/@subuta']))
  t.falsy(matcher(['/Users/subuta/repo/matryoshka.js/node_modules/@subuta/snippets']))
  t.falsy(matcher(['/Users/subuta/repo/matryoshka.js/node_modules/@subuta/snippets/redux/Action']))
  t.falsy(matcher(['/Users/subuta/repo/matryoshka.js/node_modules/@subuta/snippet.js']))
  t.falsy(matcher(['/Users/subuta/repo/matryoshka.js/node_modules/@subuta/snippet.js/redux/Action']))
})

test('minimatch tests (for testing glob)', async (t) => {
  t.truthy(minimatch("bar.foo", "*.foo"))
})
