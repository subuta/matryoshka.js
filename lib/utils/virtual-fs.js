import _ from 'lodash'
import hash from 'lib/utils/hash'
import fs from 'lib/utils/fs'
import Promise from 'bluebird'
import icepick from 'icepick'
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

export default function createVfs (opts = {}) {
  let pending = icepick.freeze([])
  let cache = icepick.freeze([])

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
      result = icepick.setIn(result, c.fileName.split(path.sep), c.hash)
      return result
    }, {})
    return asTree(tree, showHash, false)
  }

  // schedule action
  const schedule = (action) => {
    pending = icepick.push(pending, action)
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
  const perform = async (dryRun = opts.dryRun || false) => {
    // keep oldCache
    const oldCache = cache
    // Clear cache for record newly applied changes at this iteration.
    cache = icepick.freeze([])

    // console.log('[debug] oldCache = ', oldCache);

    await Promise.map(pending, async (action) => {
      let result = true
      if (action.type === WRITE_FILE) {
        // update cache by fileName if found (for handling multiple writeFile call for same file at same perform call.)
        const foundIndex = _.findIndex(cache, (c) => c.fileName === action.payload.fileName)
        if (foundIndex > -1) {
          cache = icepick.splice(cache, foundIndex, 1) // remove file by name
        }

        cache = icepick.push(cache, {fileName: action.payload.fileName, hash: action.payload.hash}) // and push file to cache

        // skip iteration if file not changed.
        if (_.some(oldCache, (c) => c.hash === getFileHash(action.payload))) return true

        if (!dryRun) {
          // write changes to file if necessary.
          result = await fs.writeFile(action.payload.fileName, action.payload.data)
        }
      }
      return result
    }, {concurrency: 1})

    // mark as done.
    pending = icepick.freeze([])

    // console.log('[debug] cache = ', cache);

    const deletedFiles = _.differenceBy(oldCache, cache, 'fileName')

    // remove unused file.
    await Promise.map(deletedFiles, async ({fileName}) => {
      if (!dryRun) {
        return await fs.remove(fileName)
      }
      return await true
    })

    // list directoryName.
    const dirs = _.reduce(deletedFiles, (result, {fileName}) => _.uniq([...result, path.dirname(fileName)]), [])

    // the directory that is not used by cached fileName (empty) will deleted.
    // const emptyDirs = _.filter(dirs, (dir) => _.every(cache, ({fileName}) => !_.startsWith(fileName, dir)))
    const emptyDirs = _.filter(dirs, (dir) => _.every(cache, ({fileName}) => path.dirname(fileName) !== dir))

    return await Promise.map(emptyDirs, async (dir) => {
      if (!dryRun) {
        return await fs.remove(`${dir}`)
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

