import _ from 'lodash'
import hash from 'lib/utils/hash'
import fs from 'lib/utils/fs'
import Promise from 'bluebird'
import { asTree } from 'treeify'
import path from 'path'
import {
  debug
} from './log'

import {
  isChildrenOf,
  mergePaths,
  calculatePathDiff
} from 'lib/utils/path'

// action types
export const WRITE_FILE = 'WRITE_FILE'

export const actionType = {
  WRITE_FILE
}

export const getFileHash = ({fileName, data}) => hash(fileName + data)

export const writeFile = (fileName, data) => {
  return {
    type: WRITE_FILE,
    payload: {
      hash: getFileHash({fileName, data}),
      fileName,
      data
    }
  }
}

export const actions = {
  writeFile
}

export default function createVfs (opts = {}) {
  let pending = []
  let cache = []

  // return currentState as object
  const getState = () => {
    return {
      pending,
      cache
    }
  }

  // pretty print cache state.
  const ls = (showHash = false) => {
    const tree = _.reduce(cache, (result, c) => {
      let value = showHash ? c.hash : ''

      if (c.isUpdated) {
        value = `[updated] ${value}`
      } else if (c.isNew) {
        value = `[new] ${value}`
      }

      result = _.set(result, c.fileName.split(path.sep), value)
      return result
    }, {})
    return asTree(tree, true, false)
  }

  // schedule action
  const schedule = (action) => {
    pending.push(action)
    return action
  }

  const clearCache = () => {
    cache = []
  }

  // read dest files to internal cache to reduce writeFile access.
  const mount = async (dest, clean = false) => {
    // skip if clean = true or already mounted(cache is not empty)
    if (!clean || !_.isEmpty(cache)) return

    // read dest files first to force clean destination directories
    const files = await fs.listFiles([path.join(dest, '**/*.js'), '!**/_*/**'])

    // read old files to cache by simulating writeFile.
    await Promise.map(files, async (file) => {
      const data = await fs.readFile(file)
      schedule(writeFile(file, data))
    })

    // dryRun and readFiles into cache.
    await perform(true)
  }

  // run pending action.
  const perform = async (dryRun = opts.dryRun || false, clean = false) => {
    // keep oldCache
    const oldCache = cache
    // Clear cache for record newly applied changes at this iteration.
    clearCache()

    debug('[debug] oldCache = ', oldCache);

    await Promise.map(pending, async (action) => {
      let result = true
      if (action.type === WRITE_FILE) {
        // update cache by fileName if found (for handling multiple writeFile call for same file at same perform call.)
        const foundIndex = _.findIndex(cache, (c) => c.fileName === action.payload.fileName)
        if (foundIndex > -1) {
          cache.splice(foundIndex, 1) // remove file by name
        }

        const payload = {fileName: action.payload.fileName, hash: action.payload.hash}
        cache.push(payload) // and push file to cache

        // skip iteration if file not changed.
        if (_.some(oldCache, (c) => c.hash === getFileHash(action.payload))) return true

        // treat as update if file already exists in cache.
        let isUpdate = false
        if (_.some(oldCache, (c) => c.fileName === action.payload.fileName)) {
          isUpdate = true
        }

        if (!dryRun) {
          // write changes to file if necessary.
          if (isUpdate) {
            result = await fs.updateFileByPragma(action.payload.fileName, action.payload.data)
            payload['isUpdated'] = true // mark updated
          } else {
            result = await fs.updateFileByPragma(action.payload.fileName, action.payload.data)
            payload['isNew'] = true // mark updated
          }
        }
      }
      return result
    }, {concurrency: 1})

    // mark as done.
    pending = []

    debug('[debug] cache = ', cache);

    const deletedFiles = _.differenceBy(oldCache, cache, 'fileName')

    // remove unused file.
    await Promise.map(deletedFiles, async ({fileName}) => {
      if (!dryRun) {
        return await fs.remove(fileName, clean)
      }
      return await true
    })

    // list deleted directory name.
    const deletedDirs = mergePaths(_.map(deletedFiles, ({fileName}) => path.dirname(fileName)))
    const cachedDirs = mergePaths(_.map(cache, ({fileName}) => path.dirname(fileName)))

    const emptyDeletedDirs = _.compact(_.zipWith(deletedDirs, cachedDirs, (deleted, cached) => {
      if (!deleted || !cached) return // ensure both exists
      // treat as empty if deleted directory satisfy following condition.
      // - has no children of cached folder
      // - is not cached folder (!==)
      if (!isChildrenOf(cached, deleted) && cached !== deleted) {
        return calculatePathDiff(cached, deleted)
      }
    }))

    return await Promise.map(emptyDeletedDirs, async (dir) => {
      if (!dryRun) {
        return await fs.remove(dir, clean)
      }
      return await true
    })
  }

  // expose wrapped actions(like mapDispatchToProps of redux :))
  const wrappedActions = _.reduce(actions, (result, fn, action) => {
    // wrap action by schedule with same arguments
    result[action] = function () {
      return schedule(fn.call(this, ...arguments))
    }
    return result
  }, {})

  return {
    getState,
    schedule,
    mount,
    clearCache,
    perform,
    ls,
    ...wrappedActions
  }
}

