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
  return (getState, schedule) => {
    schedule({
      type: WRITE_FILE,
      payload: {
        hash: getFileHash({fileName, data}),
        fileName,
        data
      }
    })
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
    if (action instanceof Function) {
      action(getState, schedule)
    } else {
      pending = icepick.push(pending, action)
    }
    return action
  }

  // run pending action.
  const perform = () => {
    const oldCache = cache
    const promises = _.map(pending, async (action) => {
      if (action.type === WRITE_FILE) {
        // skip duplicated changes
        if (_.some(cache, (c) => c.hash === getFileHash(action.payload))) return Promise.resolve(true)

        const promise = dryRun ? Promise.resolve: fs.writeFile(action.payload.fileName, action.payload.data)

        // update cache with processed file
        cache = icepick.chain(cache)
          .splice(_.findIndex(cache, (c) => c.fileName === action.payload.fileName), 1) // remove file by name
          .push({fileName: action.payload.fileName, hash: action.payload.hash}) // and push file to cache
          .value()

        return promise
      }
    })

    pending = icepick.freeze([])

    // remove unused file.
    const deleteFilePromises = _.map(_.difference(oldCache, cache), async ({fileName}) => {
      return dryRun ? Promise.resolve: fs.remove(fileName)
    })

    return Promise.all([...promises, ...deleteFilePromises])
  }

  return {
    getState,
    schedule,
    perform,
    ls
  }
}

