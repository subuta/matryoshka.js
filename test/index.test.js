/* global describe, it */

import index from 'lib'

const assert = require('assert')

describe('index', () => {
  it('should test truth', () => {
    assert(index === 'hoge')
  })
})
