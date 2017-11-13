import crypto from 'crypto'

export const hash = (str) => {
  return crypto.createHash('md5').update(str).digest('hex')
}

export default hash
