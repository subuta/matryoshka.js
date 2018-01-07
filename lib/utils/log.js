import debugLib from 'debug'

const TYPES = {
  LOG: 'mat:log',
  DEBUG: 'mat:dbg',
  ERROR: 'mat:err'
}

// export logger for app.
export const log = debugLib(TYPES.LOG)
export const debug = debugLib(TYPES.DEBUG)
export const error = debugLib(TYPES.ERROR)

export const toggleDebug = (bool = true) => {
  if (bool === true) {
    debugLib.enable('mat:*')
  } else if (bool === false) {
    debugLib.enable(`mat:*,-${TYPES.DEBUG}`)
  }
}

// starts with debug log suppressed.
toggleDebug(false)

// clear console (like command+k)
export const clearConsole = () => console.log('\x1Bc')

export default log
