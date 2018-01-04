// Custom logic template
export const createPragma = (name, label) => `/* mat ${name} [${label.toLowerCase()}] */`

export const matchPragma = (str) => {
  const match = str.match(PRAGMA_REGEX)
  if (!match) return ''
  return match[1]
}

export const PRAGMA_REGEX = /\/\* mat (.+) \[\S+\] \*\//
export const START_PRAGMA = /\/\* mat (.+) \[start\] \*\//
export const END_PRAGMA = /\/\* mat (.+) \[end\] \*\//
