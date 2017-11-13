import _ from 'lodash'
import hash from 'lib/utils/hash'

// action types
export const WRITE_FILE = 'WRITE_FILE'

export const actionType = {
  WRITE_FILE
}

export const writeFile = (fileName, data) => {
  return (getState, dispatch) => {
    dispatch({
      type: WRITE_FILE,
      payload: {
        fileName,
        data
      }
    })
  }
}

export const actions = {
  writeFile
}

export default function createVfs () {
  let pending = []

  // return currentState as object
  const getState = () => {
    return {
      pending
    }
  }

  const dispatch = (action) => {
    if (action instanceof Function) {
      action(getState, dispatch)
    } else {
      pending = [...pending, action]
    }
    return action
  }

  return {
    getState,
    dispatch
  }
}

