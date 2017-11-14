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
    const oldCache = cache
    cache = icepick.freeze([])

    await Promise.map(pending, async (action) => {
      let result = true
      if (action.type === WRITE_FILE) {
        // skip duplicated changes
        if (_.some(cache, (c) => c.hash === getFileHash(action.payload))) return true

        if (!dryRun) {
          result = await fs.writeFile(action.payload.fileName, action.payload.data)
        }

        // update cache with processed file
        const foundIndex = _.findIndex(cache, (c) => c.fileName === action.payload.fileName)
        if (foundIndex > -1) {
          cache = icepick.splice(cache, foundIndex, 1) // remove file by name
        }
        cache = icepick.push(cache, {fileName: action.payload.fileName, hash: action.payload.hash}) // and push file to cache
      }
      return result
    }, { concurrency: 1 })

    pending = icepick.freeze([])

    // remove unused file.
    return await Promise.map(_.difference(oldCache, cache), async ({fileName}) => {
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

