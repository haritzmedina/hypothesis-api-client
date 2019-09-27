const HypothesisApiClient = require('hypothesis-api-client')

const hypothesisApiClient = new HypothesisApiClient()

hypothesisApiClient.searchAnnotations({ url: 'https://web.hypothes.is' }, (err, annotations) => {
  if (err) {
    console.error(err)
  } else {
    console.log(annotations)
  }
})
