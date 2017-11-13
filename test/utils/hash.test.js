import test from 'ava'
import hash from 'lib/utils/hash'
import _ from 'lodash'


test.beforeEach((t) => {
})

test.afterEach((t) => {
})

test('hash must be same for same string', async (t) => {
  const left  = hash('hoge')
  const right  = hash('hoge')
  t.is(left, right)
})

test('hash must be same for same large string', async (t) => {
  const short = `const hoge = 'fugb'`
  const large = _.times(10000, (i) => short).join('\n')

  const left  = hash(large)
  const right  = hash(large)
  t.is(left, right)
})
