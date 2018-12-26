const _ = require('lodash')
const axios = require('axios')

const Config = require('./Config')

class HypothesisClient {
  constructor (token, config) {
    if (token) {
      this.token = token
    }
    this.config = _.assign(Config, config)
    this.baseURI = 'https://hypothes.is/api'
  }

  createNewAnnotation (data, callback) {
    let url = this.baseURI + '/annotations'
    let retryCount = 0
    let retryLimit = this.config.create.maxNumberOfRetries
    let settings = {
      'async': true,
      'crossDomain': true,
      'url': url,
      'method': 'POST',
      'headers': {
        'authorization': 'Bearer ' + this.token,
        'content-type': 'application/json',
        'cache-control': 'no-cache'
      },
      data: JSON.stringify(data)
    }
    let apiCall = () => {
      axios(settings).catch(() => {
        retryCount++
        if (retryCount <= retryLimit) {
          setTimeout(() => {
            apiCall()
          }, this.config.create.intervalForRetriesInSeconds * 1000)
        } else {
          if (_.isFunction(callback)) {
            callback(new Error('Unable to create annotation after ' + retryLimit + ' retries.'), [])
          }
        }
      }).then((response) => {
        if (!_.isUndefined(response)) {
          callback(null, response.data)
        }
      })
    }
    apiCall()
  }

  createNewAnnotations (annotations, callback) {
    if (_.isArray(annotations) && !_.isEmpty(annotations)) {
      let promises = []
      for (let i = 0; i < annotations.length; i++) {
        promises.push(new Promise((resolve, reject) => {
          this.createNewAnnotation(annotations[i], (err, response) => {
            if (err) {
              reject(err)
            } else {
              resolve(response)
            }
          })
          return true
        }))
      }
      Promise.all(promises).catch(() => {
        callback(new Error('Some annotations cannot be created'))
      }).then((responses) => {
        if (responses.length === annotations.length) {
          // Wait for 1 second to give time to Hypothesis server to create all the annotations well
          setTimeout(() => {
            // Sometimes the responses can be okay, but not all the annotations are really created (the API doesn't work really well)
            // To ensure that all annotations are created, we must search for them and compare, if not all of them are created, try it again
            this.searchAnnotations({
              user: responses[0].user,
              order: 'desc',
              group: annotations[0].group,
              limit: annotations.length
            }, (err, searchedAnnotations) => {
              if (err) {
                console.error('Error while trying to ensure that the annotations are created')
                callback(new Error('Error while trying to ensure that the annotations are created'))
              } else {
                let nonCreatedAnnotations = _.differenceWith(responses, searchedAnnotations, (anno1, anno2) => { return anno1.id === anno2.id })
                if (nonCreatedAnnotations.length > 0) {
                  console.debug('Some annotations are falsely created, trying again to create them correctly')
                  this.createNewAnnotations(nonCreatedAnnotations, (err, tryResponses) => {
                    if (err) {
                      if (_.isFunction(callback)) {
                        callback(new Error('Some annotations cannot be created'))
                      }
                    } else {
                      if (_.isFunction(callback)) {
                        callback(null, _.concat(responses, tryResponses))
                      }
                    }
                  })
                } else {
                  if (_.isFunction(callback)) {
                    callback(null, responses)
                  }
                }
              }
            })
          }, 1000)
        } else {
          if (_.isFunction(callback)) {
            callback(new Error('Some annotations cannot be created'))
          }
        }
      })
    } else {
      if (_.isFunction(callback)) {
        callback(new Error('Annotations array is empty.'))
      }
    }
  }

  getUserProfile (callback) {
    let url = this.baseURI + '/profile'
    let settings = {
      'async': true,
      'crossDomain': true,
      'url': url,
      'method': 'GET',
      'headers': {
        'authorization': 'Bearer ' + this.token,
        'cache-control': 'no-cache'
      }
    }
    axios(settings).catch(() => {
      callback(new Error('Unable to retrieve user profile.'))
    }).then((response) => {
      if (_.isFunction(callback)) {
        if (!_.isUndefined(response)) {
          if (response.status === 200 && response.data) {
            if (response.data.userid === null) {
              callback(new Error('Unable to retrieve user profile.'))
            } else {
              callback(null, response.data)
            }
          } else {
            callback(new Error('Unable to retrieve user profile.'))
          }
        } else {
          callback(new Error('Unable to retrieve user profile.'))
        }
      }
    })
  }

  fetchAnnotation (id, callback) {
    let headers = {
      'cache-control': 'no-cache'
    }
    if (this.token) {
      headers['authorization'] = 'Bearer ' + this.token
    }
    let settings = {
      'async': true,
      'crossDomain': true,
      'url': '/annotations/' + id,
      'baseURL': this.baseURI,
      'method': 'GET',
      'headers': headers
    }
    axios(settings).catch(() => {
      callback(new Error('Unable to retrieve annotation with id ' + id))
    }).then((response) => {
      if (_.isFunction(callback)) {
        if (!_.isUndefined(response)) {
          if (response.status === 200) {
            callback(null, response.data)
          } else {
            callback(new Error('Unable to retrieve annotation with id ' + id + '. HTTP error: ' + response.status))
          }
        } else {
          callback(new Error('Unable to retrieve annotation with id ' + id + '.'))
        }
      }
    })
  }

  updateAnnotation (id, data, callback) {
    let url = this.baseURI + '/annotations/' + id
    let settings = {
      'async': true,
      'crossDomain': true,
      'url': url,
      'method': 'PATCH',
      'responseType': 'json',
      'headers': {
        'authorization': 'Bearer ' + this.token,
        'cache-control': 'no-cache'
      },
      'data': JSON.stringify(data)
    }
    axios(settings).catch(() => {
      callback(new Error('Unable to update annotation with id ' + id))
    }).then((response) => {
      if (!_.isUndefined(response)) {
        if (response.status === 200) {
          callback(null, response.data)
        } else {
          callback(new Error('Unable to update annotation with id ' + id + '. HTTP error: ' + response.status))
        }
      } else {
        callback(new Error('Unable to update annotation with id ' + id + '.'))
      }
    })
  }

  deleteAnnotation (id, callback) {
    let url = this.baseURI + '/annotations/' + id
    let settings = {
      'async': true,
      'crossDomain': true,
      'url': url,
      'method': 'DELETE',
      'headers': {
        'authorization': 'Bearer ' + this.token,
        'cache-control': 'no-cache'
      }
    }
    axios(settings).catch(() => {
      callback(new Error('Unable to update annotation with id ' + id))
    }).then((response) => {
      if (!_.isUndefined(response)) {
        if (response.status === 200) {
          callback(null, response.data)
        } else {
          callback(new Error('Unable to delete annotation with id ' + id + '. HTTP error: ' + response.status))
        }
      } else {
        callback(new Error('Unable to delete annotation with id ' + id + '.'))
      }
    })
  }

  /**
   * Search bulk annotations sequentially using search_after instead of offset
   * @param data
   * @param callback
   */
  searchAnnotationsSequential (data, callback) {
    if (_.isFunction(callback)) {
      let annotations = []
      // Set max number if not set a data limit (this will return all the annotations, not only the first 200
      if (!_.isInteger(data.limit)) {
        data.limit = Number.MAX_SAFE_INTEGER
      }
      // Set sort method: only allowed created and updated
      if (data.sort !== 'updated' || data.sort !== 'created') {
        data.sort = 'updated'
      }
      this.searchBunchAnnotations(data, 0, (err, response) => {
        if (err) {
          console.error('Unable to retrieve annotations from Hypothes.is')
          callback(new Error('Unable to retrieve annotations from Hypothes.is. Check internet connection and permissions.'))
        } else {
          // Concat first time done annotations
          annotations = annotations.concat(response.rows)
          annotations = this.orderAnnotations(annotations, data.order, data.sort)
          if (response.total === response.rows.length) { // If already retrieved results are all, no required to do more calls
            if (_.isFunction(callback)) {
              callback(null, response.rows)
            }
          } else {
            console.log(response.total)
            // Calculate number of calls for the chain
            let limit = data.limit
            if (data.limit > response.total) {
              limit = response.total
            }
            let numberOfCalls = Math.floor(limit / 200)
            if (limit % 200 === 0) {
              numberOfCalls -= 1 // Remove the first call that it is already done
            }

            // Create promise handler
            let runPromiseToSearchAnnotations = (d) => {
              return new Promise((resolve, reject) => {
                setTimeout(() => {
                  // Get searchAfter date
                  let retrievedLatestElementDate = null
                  if (data.order === 'asc') {
                    // Get first element in array
                    let latest = annotations[0]
                    retrievedLatestElementDate = latest[d.sort]
                  } else {
                    // Get latest element in array
                    let latest = annotations[annotations.length - 1]
                    retrievedLatestElementDate = latest[d.sort] // Get latest date
                  }
                  d.search_after = retrievedLatestElementDate
                  this.searchBunchAnnotations(d, 0, (err, response) => {
                    if (err) {
                      reject(err)
                    } else {
                      annotations = annotations.concat(response.rows)
                      annotations = HypothesisClient.orderAnnotations(annotations, d.order, d.sort)
                      resolve()
                    }
                  })
                }, 1000)
              })
            }

            // Create search chain
            let promisesData = Array(numberOfCalls).fill(data)

            let promiseChain = promisesData.reduce(
              (chain, d, index) => {
                if (index === promisesData.length - 1) {
                  d = _.clone(d)
                  d.limit = limit % 200
                }
                return chain.then(() => {
                  return runPromiseToSearchAnnotations(d)
                })
              }, Promise.resolve()
            )
            promiseChain.then(() => {
              if (_.isFunction(callback)) {
                callback(null, annotations)
              }
            })
          }
        }
      })
    } else {
      console.error('Callback is not defined')
    }
  }

  static orderAnnotations (annotations, order = 'desc', sort = 'updated') {
    // Only created or updated allowed: See: https://h.readthedocs.io/en/latest/api-reference/#operation/search
    if (sort !== 'updated' || sort !== 'created') {
      sort = 'updated'
    }
    return _.orderBy(annotations, [sort], order)
  }

  searchAnnotations (data, callback) {
    let annotations = []
    this.searchBunchAnnotations(data, 0, (err, response) => {
      if (err) {
        console.error('Unable to retrieve annotations from Hypothes.is')
        callback(new Error('Unable to retrieve annotations from Hypothes.is. Check internet connection and permissions.'))
      } else {
        // Concat first time done annotations
        annotations = annotations.concat(response.rows)
        if (response.total === response.rows.length) { // If already retrieved results are all, no required to do more calls
          if (_.isFunction(callback)) {
            callback(null, response.rows)
          }
        } else {
          // Set maximum of queries
          let total = 20 // Default limit per call
          if (data.limit > response.total) {
            total = response.total
          } else {
            total = data.limit
          }
          if (total > this.config.search.maxNumberOfAnnotations) {
            total = this.config.search.maxNumberOfAnnotations // Limit the number of results
          }
          if (total > 5000) {
            console.warn('You are retrieving more than 5000 annotations, it will take a long time or maybe it will not work as expected.')
          }
          // Retrieve the rest of annotations
          let promises = []
          for (let i = annotations.length; i < total; i += 200) {
            let iterationData = Object.assign({}, data)
            if (total < i + 200) {
              iterationData.limit = total % 200
            } else {
              iterationData.limit = 200
            }
            // Create a promise for each request to do
            promises.push(new Promise((resolve, reject) => {
              this.searchBunchAnnotations(iterationData, i, (err, response) => {
                if (err) {
                  reject(new Error(err)) // TODO Manage error
                } else {
                  annotations = annotations.concat(response.rows)
                  resolve()
                }
              })
            }))
          }
          // Execute all the promises
          Promise.all(promises).catch(() => {
            if (_.isFunction(callback)) {
              callback(new Error('Unable to retrieve annotations'))
            }
          }).then(() => {
            if (_.isFunction(callback)) {
              callback(null, annotations)
            }
          })
        }
      }
    })
  }

  searchBunchAnnotations (data, offset, callback) {
    let url = this.baseURI + '/search'
    let headers = {
      'cache-control': 'no-cache'
    }
    if (this.token) {
      headers['authorization'] = 'Bearer ' + this.token
    }
    if (!_.isNumber(data.limit)) {
      data.limit = 200 // TODO
    }
    let limit = data.limit
    if (data.limit > 200) { // Fixing data limit that is send to hypothes.is server
      data.limit = 200
    }
    data.offset = offset
    // Set retries manager
    let retryCount = 0
    let retryLimit = this.config.search.maxNumberOfRetries
    let settings = {
      'async': true,
      'crossDomain': true,
      'url': url,
      'method': 'GET',
      'headers': headers,
      'params': data
    }
    let apiCall = () => {
      axios(settings).catch(() => {
        retryCount++
        if (retryCount <= retryLimit) {
          window.setTimeout(() => {
            apiCall()
          }, this.config.search.intervalForRetriesInSeconds * 1000)
        } else {
          data.limit = limit
          if (_.isFunction(callback)) {
            callback(new Error(), [])
          }
        }
      }).then((response) => {
        data.limit = limit
        if (_.isFunction(callback)) {
          callback(null, response.data)
        }
      })
    }
    apiCall()
  }

  getListOfGroups (data, callback) {
    let url = this.baseURI + '/groups'
    let headers = {
      'cache-control': 'no-cache'
    }
    if (this.token) {
      headers['authorization'] = 'Bearer ' + this.token
    }
    let settings = {
      'crossDomain': true,
      'url': url,
      'method': 'GET',
      'headers': headers,
      'data': data
    }
    axios(settings).catch(() => {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to retrieve list of groups'))
      }
    }).then((response) => {
      if (_.isFunction(callback) && !_.isUndefined(response)) {
        if (response.status === 200) {
          callback(null, response.data)
        } else {
          callback(new Error('Unable to retrieve list of groups'))
        }
      }
    })
  }

  /**
   * Create a new, private group for the currently-authenticated user.
   * @param data Check the body request schema in https://h.readthedocs.io/en/latest/api-reference/#operation/createGroup
   * @param callback
   */
  createNewGroup (data, callback) {
    if (!_.isObject(data)) {
      callback(new Error('Data must be an object'))
    } else if (!_.isString(this.token)) {
      callback(new Error('To create a Hypothes.is group it is required a developerAPIKey'))
    } else if (!_.has(data, ['name'])) {
      callback(new Error('A group must have a name'))
    } else {
      let url = this.baseURI + '/groups'
      let headers = {
        'cache-control': 'no-cache',
        'content-type': 'application/json'
      }
      headers['authorization'] = 'Bearer ' + this.token
      let settings = {
        'async': true,
        'crossDomain': true,
        'url': url,
        'method': 'POST',
        'headers': headers,
        'data': JSON.stringify(data)
      }
      axios(settings).catch(() => {
        callback(new Error('Unable to create the hypothes.is group'))
      }).then((response) => {
        if (_.isFunction(callback) && !_.isUndefined(response)) {
          if (response.status === 200) {
            callback(null, response.data)
          } else {
            callback(new Error('Unable to create the hypothes.is group'))
          }
        }
      })
    }
  }

  removeAMemberFromAGroup (data, callback) {
    if (!_.isObject(data)) {
      if (_.isFunction(callback)) {
        callback(new Error('Data must be an object'))
      }
    } else {
      data.user = 'me' // Currently only is allowed to remove yourself. See: http://h.readthedocs.io/en/latest/api-reference/#operation/deleteGroupMember
      if (_.has(data, ['id'])) {
        let settings = {
          method: 'DELETE',
          url: 'https://hypothes.is/api/groups/' + data.id + '/members/' + data.user,
          headers: {
            'Authorization': 'Bearer ' + this.token
          }
        }
        axios(settings).catch(() => {
          if (_.isFunction(callback)) {
            callback(new Error('Unable to remove member ' + data.user + ' from the group ' + data.id))
          }
        }).then(() => {
          if (_.isFunction(callback)) {
            callback(null)
          }
        })
      } else {
        if (_.isFunction(callback)) {
          callback(new Error('Data must have an id'))
        }
      }
    }
  }
}

module.exports = HypothesisClient
