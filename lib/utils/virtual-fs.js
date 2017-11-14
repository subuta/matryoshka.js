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

  const {
    dryRun = false // skip fs
  } = opts

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

  // run pending action.
  const perform = async () => {
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
    }, { concurrency: 1 })

    // mark as done.
    pending = icepick.freeze([])

    // console.log('[debug] cache = ', cache);

    const deletedFiles = _.differenceBy(oldCache, cache, 'fileName')

    // remove unused file.
    return await Promise.map(deletedFiles, async ({fileName}) => {
      if (!dryRun) {
        return await fs.remove(fileName)
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
    perform,
    ls,
    ...wrappedActions
  }
}

