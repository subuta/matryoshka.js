import _ from 'lodash'

import importFresh from 'import-fresh'
import { listFiles } from 'lib/utils/fs'
import { ROOT_PATH, absolutePath } from 'lib/utils/path'

export const requireGlob = async (patterns) => {
  const files = await listFiles(patterns)
  return await _.reduce(files, (result, file) => {
    console.log(`[requireGlob] try to import ${file}`);
    result[file] = importFresh(absolutePath(file))
    return result
  }, {})
}

export default requireGlob
