import test from 'ava'
import _ from 'lodash'
import loadConfig from 'lib/utils/config'
import {
  absolutePath
} from 'lib/utils/path'

test.beforeEach((t) => {
})

test.afterEach((t) => {
})

test('should load config from .matrc', async (t) => {
  const config = loadConfig(null, absolutePath('test/fixtures/config/.matrc'))

  t.deepEqual(config, {
    'dest': 'src',
    'generator': 'generators',
    'singleRun': false,
    'snippets': [],
    'root': null,
    'keepConsole': false,
    'clean': false,
    'debug': false
  })
})

test('should load config from mat.config.js', async (t) => {
  const config = loadConfig(null, absolutePath('test/fixtures/config/mat.config.js'))

  t.deepEqual(config, {
    'dest': 'src',
    'generator': 'generators',
    'singleRun': false,
    'snippets': [],
    'root': null,
    'keepConsole': false,
    'clean': false,
    'debug': false
  })
})
