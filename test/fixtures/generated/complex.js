const {attachment} = ctx.request.body

// abce
let params = {}

/* mat Before create [start] */
const ext = path.extname(name)
const id = uuid()
const tmpFileName = `${id}${ext}`
const result = await getSignedUrl(tmpFileName, attachment.type)
/* mat Before create [end] */

let response = await Attachment.query()
  .insert({
    ...attachment,
    ...params
  })
  .eager('')

/* mat After create [start] */
response = {
  result,
  attachment: response
}
/* mat After create [end] */

ctx.body = response
