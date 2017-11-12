const _ = require('lodash')
const path = require('path')

module.exports = {
  webpack: (config, options, webpack) => {
    // configuration
    config = _.set(config, 'entry.main', [path.resolve(__dirname, 'lib/index.js')])
    config = _.set(config, 'output.path', path.resolve(__dirname, 'dist'))
    return config
  }
}
