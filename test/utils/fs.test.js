import test from 'ava'

import { absolutePath } from 'test/helper';
const proxyquire = require('proxyquire').noCallThru();

const fs = proxyquire(absolutePath('lib/utils/fs'), {
});

test.beforeEach((t) => {

})

test.afterEach((t) => {

})

test('should list fixture files as expected', async (t) => {
  const result = await fs.listFiles(['test/fixtures/**/*.js', '!**/_*/**'])
  t.deepEqual(result, ['test/fixtures/index.js'])
})
