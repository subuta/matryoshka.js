import test from 'ava'

import { absolutePath } from 'lib/utils/path';
const proxyquire = require('proxyquire').noCallThru();

const fs = proxyquire(absolutePath('lib/utils/fs'), {
});

test.beforeEach((t) => {

})

test.afterEach((t) => {

})

test('should list fixture files as expected', async (t) => {
  const result = await fs.listFiles(['test/generators/**/*.js', '!**/_*/**'])
  t.deepEqual(result, [
    'test/generators/index.js',
    'test/generators/nested/hoge.js',
    'test/generators/nested/index.js'
  ])
})
