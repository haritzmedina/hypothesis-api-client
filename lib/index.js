const _ = require('lodash')
const axios = require('axios')

const Config = require('./Config')

/**
 * Hypothesis client class
 */
class HypothesisClient {
  /**
   * Create a hypothesis client
   * @param token The token to query hypothes.is API
   * @param config Configuration parameters for the client. See Config.js for an example.
   */
  constructor (token, config) {
    if (token) {
      this.token = token
    }
    this.config = _.assign(Config, config)
    try {
      this.baseURI = (new URL(config.baseURI)).href
    } catch (e) {
      this.baseURI = 'https://hypothes.is/api'
    }
  }

  /**
   * Giving an annotation data, it is created in Hypothes.is
   * @param data Annotation {@link https://h.readthedocs.io/en/latest/api-reference/#operation/createAnnotation body schema}
   * @param callback Function to execute after annotation creation
   */
  createNewAnnotation (data, callback) {
    const url = this.baseURI + '/annotations'
    let retryCount = 0
    const retryLimit = this.config.create.maxNumberOfRetries
    const settings = {
      async: true,
      crossDomain: true,
      url: url,
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + this.token,
        'content-type': 'application/json',
        'cache-control': 'no-cache'
      },
      data: JSON.stringify(data)
    }
    const apiCall = () => {
      axios(settings).then((response) => {
        if (!_.isUndefined(response)) {
          if (_.isFunction(callback)) {
            callback(null, response.data)
          }
        }
      }, () => {
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
      })
    }
    apiCall()
  }

  /**
   * Creates in hypothes.is server sequentially a given list of annotations
   * @param annotations A list of annotation bodies
   * @param callback Function to execute after annotations are created
   * @return progress Holds progress of creating process, current and max values in number of pending annotations to finish.
   */
  createNewAnnotationsSequential (annotations, callback) {
    const createdAnnotations = []
    const progress = { current: 0, max: annotations.length }
    // Create promise handler
    const runPromiseToCreateAnnotation = (d) => {
      return new Promise((resolve, reject) => {
        this.createNewAnnotation(d, (err, annotation) => {
          if (err) {
            reject(err)
          } else {
            createdAnnotations.push(annotation)
            resolve()
          }
        })
      })
    }
    const promiseChain = annotations.reduce(
      (chain, d, index) => {
        return chain.then(() => {
          progress.current = index // Update progress current value
          return runPromiseToCreateAnnotation(d)
        })
      }, Promise.resolve()
    )
    promiseChain.then(() => {
      progress.current = annotations.length
      if (_.isFunction(callback)) {
        callback(null, createdAnnotations)
      }
    }, (err) => {
      if (_.isFunction(callback)) {
        callback(err)
      }
    })
  }

  /**
   * Create a list of annotations in parallel
   * @param annotations A list of annotation bodies
   * @param callback Function to execute after annotations are created
   */
  createNewAnnotationsParallel (annotations, callback) {
    const promises = []
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
    Promise.all(promises).then((responses) => {
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
              if (_.isFunction(callback)) {
                callback(new Error('Error while trying to ensure that the annotations are created'))
              }
            } else {
              const nonCreatedAnnotations = _.differenceWith(responses, searchedAnnotations, (anno1, anno2) => { return anno1.id === anno2.id })
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
    }, (errors) => {
      if (_.isFunction(callback)) {
        callback(new Error('Some annotations cannot be created'))
      }
    })
  }

  /**
   * Given an array of annotations creates them in the hypothes.is server
   * @param annotations
   * @param callback
   */
  createNewAnnotations (annotations, callback) {
    if (_.isArray(annotations) && !_.isEmpty(annotations)) {
      if (annotations.length > this.config.create.maxNumberOfAnnotationsInParallel) {
        return this.createNewAnnotationsSequential(annotations, callback)
      } else {
        this.createNewAnnotationsParallel(annotations, callback)
      }
    } else {
      if (_.isFunction(callback)) {
        callback(new Error('Annotations object is not an array or is empty.'))
      }
    }
  }

  /**
   * Returns users profile
   * @param callback
   */
  getUserProfile (callback) {
    const url = this.baseURI + '/profile'
    const settings = {
      async: true,
      crossDomain: true,
      url: url,
      method: 'GET',
      headers: {
        authorization: 'Bearer ' + this.token,
        'cache-control': 'no-cache'
      }
    }
    axios(settings).then((response) => {
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
    }, () => {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to retrieve user profile.'))
      }
    })
  }

  /**
   * Fetches an annotation by id
   * @param id
   * @param callback
   */
  fetchAnnotation (id, callback) {
    const headers = {
      'cache-control': 'no-cache'
    }
    if (this.token) {
      headers.authorization = 'Bearer ' + this.token
    }
    const settings = {
      async: true,
      crossDomain: true,
      url: '/annotations/' + id,
      baseURL: this.baseURI,
      method: 'GET',
      headers: headers
    }
    axios(settings).then((response) => {
      if (!_.isUndefined(response) && _.isFunction(callback) && response.status === 200) {
        callback(null, response.data)
      }
    }, () => {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to retrieve annotation with id ' + id))
      }
    })
  }

  /**
   * Updates the annotation with
   * @param id
   * @param data
   * @param callback
   */
  updateAnnotation (id, data, callback) {
    const url = this.baseURI + '/annotations/' + id
    const settings = {
      async: true,
      crossDomain: true,
      url: url,
      method: 'PATCH',
      responseType: 'json',
      headers: {
        authorization: 'Bearer ' + this.token,
        'cache-control': 'no-cache'
      },
      data: JSON.stringify(data)
    }
    axios(settings).then((response) => {
      if (!_.isUndefined(response) && _.isFunction(callback) && response.status === 200) {
        callback(null, response.data)
      }
    }, () => {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to update annotation with id ' + id))
      }
    })
  }

  /**
   * Given an annotation or annotation id string, it deletes from Hypothes.is
   * @param annotation
   * @param callback
   */
  deleteAnnotation (annotation, callback) {
    let id = null
    if (_.isString(annotation)) {
      id = annotation
    } else if (_.has(annotation, 'id')) {
      id = annotation.id
    } else {
      if (_.isFunction(callback)) {
        callback(new Error('This is not an annotation or an annotation ID.'))
      }
      return
    }
    const url = this.baseURI + '/annotations/' + id
    const settings = {
      async: true,
      crossDomain: true,
      url: url,
      method: 'DELETE',
      headers: {
        authorization: 'Bearer ' + this.token,
        'cache-control': 'no-cache'
      }
    }
    axios(settings).then((response) => {
      if (!_.isUndefined(response) && _.isFunction(callback) && response.status === 200) {
        callback(null, response.data)
      }
    }, () => {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to delete annotation with id ' + id))
      }
    })
  }

  /**
   * Given a list of annotations or annotation ids, they are deleted in Hypothes.is
   * @param annotations a list of annotations or list of strings with each id
   * @param callback
   */
  deleteAnnotations (annotations, callback) {
    // Check and parse annotations to a list of ids (if it is not yet)
    let toDeleteAnnotations = []
    if (_.every(annotations, (annotation) => { return annotation.id })) {
      toDeleteAnnotations = _.map(annotations, 'id')
    } else if (_.every(annotations, String)) {
      toDeleteAnnotations = annotations
    }
    // Create promises to delete all the annotations
    const promises = []
    for (let i = 0; i < toDeleteAnnotations.length; i++) {
      promises.push(new Promise((resolve, reject) => {
        this.deleteAnnotation(toDeleteAnnotations[i], (err, response) => {
          if (err) {
            reject(new Error('Unable to delete annotation id: ' + toDeleteAnnotations.id))
          } else {
            resolve(response)
          }
        })
        return true
      }))
    }
    // When all the annotations are deleted
    Promise.all(promises).then((responses) => {
      if (_.isFunction(callback)) {
        callback(null, responses)
      }
    }, () => {
      // TODO List of rejected annotations
      if (_.isFunction(callback)) {
        callback(new Error('Unable to delete some annotations: '))
      }
    })
  }

  /**
   * Search bulk annotations sequentially using search_after instead of offset
   * @param data
   * @param callback
   * @return {{current: number, max: number}} Holds progress of searching process, current and max values in number of queries pending to finish the search.
   */
  searchAnnotationsSequential (data, callback) {
    if (_.isFunction(callback)) {
      const progress = { current: 0, max: 0 }
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
          annotations = HypothesisClient.orderAnnotations(annotations, data.order, data.sort)
          if (response.total === response.rows.length) { // If already retrieved results are all, no required to do more calls
            callback(null, response.rows)
          } else {
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
            const runPromiseToSearchAnnotations = (d) => {
              return new Promise((resolve, reject) => {
                setTimeout(() => {
                  // Get searchAfter date
                  let retrievedLatestElementDate = null
                  if (data.order === 'asc') {
                    // Get first element in array
                    const latest = annotations[0]
                    retrievedLatestElementDate = latest[d.sort]
                  } else {
                    // Get latest element in array
                    const latest = annotations[annotations.length - 1]
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
            const promisesData = Array(numberOfCalls).fill(data)

            // Set progress max value
            progress.max = promisesData.length

            const promiseChain = promisesData.reduce(
              (chain, d, index) => {
                if (index === promisesData.length - 1) {
                  d = _.clone(d)
                  d.limit = limit % 200
                }
                return chain.then(() => {
                  progress.current = index // Update progress current value
                  return runPromiseToSearchAnnotations(d)
                })
              }, Promise.resolve()
            )
            promiseChain.then(() => {
              progress.current = promisesData.length
              callback(null, annotations)
            })
          }
        }
      })
      return progress
    } else {
      console.error('Callback is not defined')
    }
  }

  /**
   * Given a list of annotations, it ordered them by sort and in desc or asc order
   * @param annotations
   * @param order
   * @param sort
   * @return {Array}
   */
  static orderAnnotations (annotations, order = 'desc', sort = 'updated') {
    // Only created or updated allowed: See: https://h.readthedocs.io/en/latest/api-reference/#operation/search
    if (sort !== 'updated' || sort !== 'created') {
      sort = 'updated'
    }
    return _.orderBy(annotations, [sort], order)
  }

  /**
   * Search annotations
   * @param data
   * @param callback
   */
  searchAnnotations (data, callback) {
    let annotations = []
    this.searchBunchAnnotations(data, 0, (err, response) => {
      if (err) {
        console.error('Unable to retrieve annotations from Hypothes.is')
        if (_.isFunction(callback)) {
          callback(new Error('Unable to retrieve annotations from Hypothes.is. Check internet connection and permissions.'))
        }
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
          const promises = []
          for (let i = annotations.length; i < total; i += 200) {
            const iterationData = Object.assign({}, data)
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
          Promise.all(promises).then(() => {
            if (_.isFunction(callback)) {
              callback(null, annotations)
            }
          }, () => {
            if (_.isFunction(callback)) {
              callback(new Error('Unable to retrieve annotations'))
            }
          })
        }
      }
    })
  }

  searchBunchAnnotations (data, offset, callback) {
    const url = this.baseURI + '/search'
    const headers = {
      'cache-control': 'no-cache'
    }
    if (this.token) {
      headers.authorization = 'Bearer ' + this.token
    }
    if (!_.isNumber(data.limit)) {
      data.limit = 200 // TODO
    }
    const limit = data.limit
    if (data.limit > 200) { // Fixing data limit that is send to hypothes.is server
      data.limit = 200
    }
    data.offset = offset
    // Set retries manager
    let retryCount = 0
    const retryLimit = this.config.search.maxNumberOfRetries
    const settings = {
      async: true,
      crossDomain: true,
      url: url,
      method: 'GET',
      headers: headers,
      params: data
    }
    const apiCall = () => {
      axios(settings).then((response) => {
        data.limit = limit
        if (_.isFunction(callback)) {
          callback(null, response.data)
        }
      }, () => {
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
      })
    }
    apiCall()
  }

  /**
   * Get list of groups for current user
   * @param data
   * @param callback
   */
  getListOfGroups (data, callback) {
    const url = this.baseURI + '/groups'
    const headers = {
      'cache-control': 'no-cache'
    }
    if (this.token) {
      headers.authorization = 'Bearer ' + this.token
    }
    const settings = {
      crossDomain: true,
      url: url,
      method: 'GET',
      headers: headers,
      data: data
    }
    axios(settings).then((response) => {
      if (!_.isUndefined(response) && _.isFunction(callback) && response.status === 200) {
        callback(null, response.data)
      }
    }, () => {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to retrieve list of groups'))
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
      if (_.isFunction(callback)) {
        callback(new Error('Data must be an object'))
      }
    } else if (!_.isString(this.token)) {
      if (_.isFunction(callback)) {
        callback(new Error('To create a Hypothes.is group it is required a developerAPIKey'))
      }
    } else if (!_.has(data, ['name'])) {
      if (_.isFunction(callback)) {
        callback(new Error('A group must have a name'))
      }
    } else {
      const url = this.baseURI + '/groups'
      const headers = {
        'cache-control': 'no-cache',
        'content-type': 'application/json'
      }
      headers.authorization = 'Bearer ' + this.token
      const settings = {
        async: true,
        crossDomain: true,
        url: url,
        method: 'POST',
        headers: headers,
        data: JSON.stringify(data)
      }
      axios(settings).then((response) => {
        if (!_.isUndefined(response) && _.isFunction(callback) && response.status === 200) {
          callback(null, response.data)
        }
      }, () => {
        if (_.isFunction(callback)) {
          callback(new Error('Unable to create the hypothes.is group'))
        }
      })
    }
  }

  /**
   * Update a group metadata: name, description or id (only for Authorities). Check: https://h.readthedocs.io/en/latest/api-reference/#tag/groups/paths/~1groups~1{id}/patch
   * @param groupId
   * @param data
   * @param callback
   */
  updateGroup (groupId, data, callback) {
    if (!_.isObject(data)) {
      if (_.isFunction(callback)) {
        callback(new Error('Data must be an object'))
      }
    } else if (!_.isString(groupId)) {
      if (_.isFunction(callback)) {
        callback(new Error('Group id must be a string'))
      }
    } else if (!_.isString(this.token)) {
      if (_.isFunction(callback)) {
        callback(new Error('To update a Hypothes.is group it is required a developerAPIKey'))
      }
    } else {
      const url = this.baseURI + '/groups/' + groupId
      const headers = {
        'cache-control': 'no-cache',
        'content-type': 'application/json'
      }
      headers.authorization = 'Bearer ' + this.token
      const settings = {
        async: true,
        crossDomain: true,
        url: url,
        method: 'PATCH',
        headers: headers,
        data: JSON.stringify(data)
      }
      axios(settings).then((response) => {
        if (!_.isUndefined(response) && _.isFunction(callback) && response.status === 200) {
          callback(null, response.data)
        }
      }, () => {
        if (_.isFunction(callback)) {
          callback(new Error('Unable to update the hypothes.is group ' + groupId))
        }
      })
    }
  }

  /**
   * Retrieve a group data by its ID
   * @param groupId
   * @param callback
   */
  fetchGroup (groupId, callback) {
    if (!_.isString(groupId)) {
      if (_.isFunction(callback)) {
        callback(new Error('Group id must be a string'))
      }
    } else {
      const url = this.baseURI + '/groups/' + groupId
      const headers = {
        'cache-control': 'no-cache',
        'content-type': 'application/json'
      }
      headers.authorization = 'Bearer ' + this.token
      const settings = {
        async: true,
        crossDomain: true,
        url: url,
        method: 'GET',
        headers: headers
      }
      axios(settings).then((response) => {
        if (!_.isUndefined(response) && _.isFunction(callback) && response.status === 200) {
          callback(null, response.data)
        }
      }, () => {
        if (_.isFunction(callback)) {
          callback(new Error('Unable to retrieve the hypothes.is group'))
        }
      })
    }
  }

  /**
   * Remove a member from a Hypothes.is group. Currently only is allowed to remove yourself.
   * @param data
   * @param callback
   */
  removeAMemberFromAGroup (data, callback) {
    if (!_.isObject(data)) {
      if (_.isFunction(callback)) {
        callback(new Error('Data must be an object'))
      }
    } else {
      data.user = 'me' // Currently only is allowed to remove yourself. See: http://h.readthedocs.io/en/latest/api-reference/#operation/deleteGroupMember
      if (_.has(data, ['id'])) {
        const settings = {
          method: 'DELETE',
          url: 'https://hypothes.is/api/groups/' + data.id + '/members/' + data.user,
          headers: {
            Authorization: 'Bearer ' + this.token
          }
        }
        axios(settings).then((response) => {
          if (!_.isUndefined(response) && _.isFunction(callback) && response.status === 204) {
            callback(null)
          }
        }, () => {
          if (_.isFunction(callback)) {
            callback(new Error('Unable to remove member ' + data.user + ' from the group ' + data.id))
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
