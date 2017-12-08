import os from 'os'

export const PRAGMA = 'mat'

// add mat pragma to data.
export const START_PRAGMA = `/* ${PRAGMA} start */`
export const END_PRAGMA = `/* ${PRAGMA} end */`

// add mat pragma to data.
export const wrapPragma = (data) => {
  return `${START_PRAGMA}${os.EOL}${data}${os.EOL}${END_PRAGMA}`
}
