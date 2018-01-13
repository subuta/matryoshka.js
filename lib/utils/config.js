import cosmiconfig from 'cosmiconfig'

import {
  log
} from './log'

const explorer = cosmiconfig('mat', {
  sync: true
})

export default function loadConfig (searchPath = process.cwd(), configPath = null) {
  let config = explorer.load(searchPath, configPath)

  if (config) {
    log('[cosmiconfig] configuration loaded. from = ', config.filepath)
    config = config.config
  }

  return config
}
