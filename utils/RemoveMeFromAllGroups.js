require('dotenv').config({ path: './utils/.env' })

const HypothesisClient = require('../lib/index')

const TOKEN = process.env.HYPOTHESIS_TOKEN

const hypothesisClient = new HypothesisClient(TOKEN)

hypothesisClient.getListOfGroups({}, (err, groups) => {
  if (err) {
    console.error(err)
  } else {
    console.log(groups)
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].id !== '__world__') {
        hypothesisClient.removeAMemberFromAGroup({ id: groups[i].id }, () => {
          console.log('Removed from ' + groups[i].name)
        })
      }
    }
  }
})
