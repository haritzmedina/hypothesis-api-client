const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '\\.env') })
const HypothesisClient = require('../lib/index')

const TOKEN = process.env.HYPOTHESIS_TOKEN

const hypothesisClient = new HypothesisClient(TOKEN)

hypothesisClient.searchAnnotations({
  group: '<groupName>',
  url: '<some_url>'
}, (err, annotations) => {
  if (err) {
    console.error(err.message)
  } else {
    annotations.forEach((annotation) => {
      annotation.group = '__world__'
      annotation.permissions.read = ['group:__world__']
      hypothesisClient.createNewAnnotation(annotation, (err) => {
        console.error(err)
      })
    })
  }
})
