import _ from 'lodash'
import hash from 'lib/utils/hash'
import fs from 'lib/utils/fs'
import Promise from 'bluebird'
import { asTree } from 'treeify'
import path from 'path'

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

// detect file is children of anotherDir
export const isChildrenOf = (fileName, anotherDir) => {
  if (fileName === anotherDir) return false // if both is same.
  const dir = path.dirname(fileName)
  return _.startsWith(dir, anotherDir)
}

// calculate most parent dir of difference
export const calculatePathDiff = (baseDir, anotherDir) => {
  if (baseDir === anotherDir) return ''
  let basePaths = baseDir.split(path.sep)
  let anotherPaths = anotherDir.split(path.sep)

  // swap paths if basePaths is deeper than anotherPaths.
  if (basePaths.length > anotherPaths.length) {
    [basePaths, anotherPaths] = [anotherPaths, basePaths]
  }

  // compare path and push
  let intersection = _.intersection(basePaths, anotherPaths)

  if (anotherPaths[intersection.length]) {
    intersection = [...intersection, anotherPaths[intersection.length]]
  }

  return intersection.join(path.sep)
}

// merge nested paths
export const mergePaths = (paths) => {
  // sortBy longer path
  const sortedPaths =  _.sortedUniq(_.sortBy(paths, (path) => path.length)).reverse()
  // then combine paths by startsWith.
  return _.uniqWith(sortedPaths, (p, ap) => _.startsWith(ap, p))
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

  // read dest files to internal cache to reduce writeFile access.
  const mount = async (dest) => {
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
    cache = []

    // console.log('[debug] oldCache = ', oldCache);

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
            result = await fs.writeFile(action.payload.fileName, action.payload.data)
            payload['isNew'] = true // mark updated
          }
        }
      }
      return result
    }, {concurrency: 1})

    // mark as done.
    pending = []

    // console.log('[debug] cache = ', cache);

    const deletedFiles = _.differenceBy(oldCache, cache, 'fileName')

    // remove unused file.
    await Promise.map(deletedFiles, async ({fileName}) => {
      if (!dryRun) {
        return await fs.remove(fileName)
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
    perform,
    ls,
    ...wrappedActions
  }
}

