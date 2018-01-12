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

  // will ignored
  t.truthy(matcher(['/Home/repo/matryoshka.js/node_modules/snippets/README.md']))
  t.truthy(matcher(['/Home/repo/matryoshka.js/node_modules/snippets/package.json']))
  t.truthy(matcher(['/Home/repo/matryoshka.js/generators/README.md']))
  t.truthy(matcher(['/Home/repo/matryoshka.js/generators/package.json']))

  // will not ignored
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/snippets']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/snippets/README.js']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/generators']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/generators/README.js']))
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

  // ignore node_modules under the `excepts`
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/@subuta/snippets/node_modules']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/@subuta/snippets/node_modules/hoge.js']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/@subuta/snippets/node_modules/nested/hoge.js']))

  // `excepts` under the node_modules
  t.falsy(matcher(['/Home/repo/matryoshka.js']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/@subuta']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/@subuta/snippets']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/@subuta/snippets/redux/Action.js']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/@subuta/snippets/redux/Action']))

  // `excepts` not under the node_modules
  t.falsy(matcher(['/Home/repo/matryoshka.js/@subuta']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/@subuta/snippets']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/@subuta/snippets/redux/Action.js']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/@subuta/snippets/redux/Action']))

  // ignore node_modules under the `excepts`
  t.truthy(matcher(['/Home/repo/matryoshka.js/@subuta/snippets/node_modules']))
  t.truthy(matcher(['/Home/repo/matryoshka.js/@subuta/snippets/node_modules/hoge.js']))
  t.truthy(matcher(['/Home/repo/matryoshka.js/@subuta/snippets/node_modules/nested/hoge.js']))
})

test('ignore should not ignore generators files', async (t) => {
  const matcher = ignore(['snippet*'], '/Home/repo/matryoshka.js')

  // will not ignored
  t.falsy(matcher(['/Home/repo/matryoshka.js/generators']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/generators/nested']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/generators/nested/hoge.js']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/generators/README.js']))

  t.falsy(matcher(['generators']))
  t.falsy(matcher(['generators/nested']))
  t.falsy(matcher(['generators/nested/hoge.js']))
  t.falsy(matcher(['generators/README.js']))
})

test('ignore should ignore node_modules except passed packages with glob', async (t) => {
  const matcher = ignore(['snippet*'], '/Home/repo/matryoshka.js')

  t.truthy(matcher(['node_modules/others']))
  t.truthy(matcher(['/node_modules/others']))
  t.truthy(matcher(['/Home/repo/matryoshka.js/node_modules/others']))
  t.truthy(matcher(['/Home/repo/matryoshka.js/node_modules/@subuta']))

  t.falsy(matcher(['/Home/repo/matryoshka.js']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/snippet.js']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/snippet.js/redux/Action.js']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/snippet.js/redux/Action']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/snippet.js']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/snippet.js/redux/Action.js']))
  t.falsy(matcher(['/Home/repo/matryoshka.js/node_modules/snippet.js/redux/Action']))

  // ignore node_modules under the `excepts`

  t.truthy(matcher(['/Home/repo/matryoshka.js/node_modules/snippet.js/node_modules/redux/Action.js']))
  t.truthy(matcher(['/Home/repo/matryoshka.js/node_modules/snippet.js/node_modules/redux/Action']))
  t.truthy(matcher(['/Home/repo/matryoshka.js/node_modules/snippet.js/node_modules/']))
  t.truthy(matcher(['/Home/repo/matryoshka.js/node_modules/snippet.js/node_modules/redux/Action.js']))
  t.truthy(matcher(['/Home/repo/matryoshka.js/node_modules/snippet.js/node_modules/redux/Action']))
})

test('minimatch tests (for testing glob)', async (t) => {
  t.truthy(minimatch("bar.foo", "*.foo"))
})
