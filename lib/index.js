const MAX_NUMBER_OF_ANNOTATIONS_TO_SEARCH = 5000
const MAX_NUMBER_OF_CALL_RETRIES = 5

const _ = require('lodash')
let $
if (typeof window === 'undefined') {
  $ = require('jquery')(global.window)
} else {
  $ = require('jquery')
}

class HypothesisClient {
  constructor (token) {
    if (token) {
      this.token = token
    }
    this.baseURI = 'https://hypothes.is/api'
  }

  createNewAnnotation (data, callback) {
    let url = this.baseURI + '/annotations'
    let settings = {
      'async': true,
      'crossDomain': true,
      'url': url,
      'method': 'POST',
      'retryCount': 0,
      'retryLimit': MAX_NUMBER_OF_CALL_RETRIES,
      'headers': {
        'authorization': 'Bearer ' + this.token,
        'content-type': 'application/json',
        'cache-control': 'no-cache'
      },
      'error': function () {
        this.retryCount++
        if (this.retryCount <= this.retryLimit) {
          // TODO Wait for some seconds and try again
          $.ajax(this)
        } else {
          if (_.isFunction(callback)) {
            callback(new Error('Unable to create annotation after ' + this.retryLimit + 'retries.'), [])
          }
        }
      },
      processData: false,
      data: JSON.stringify(data)
    }

    $.ajax(settings).done((response) => {
      callback(null, response)
    })
  }

  createNewAnnotations (annotations, callback) {
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
    Promise.all(promises).catch((reasons) => {
      callback(new Error('Some annotations cannot be created'))
    }).then((responses) => {
      if (responses.length === annotations.length) {
        // Wait for 1 second to give time to Hypothesis server to create all the annotations well
        setTimeout(() => {
          // Sometimes the responses can be okay, but not all the annotations are created really (the API doesn't work really well)
          // To ensure that all annotations are created, we must search them and compare, if not all of them are created, try it again
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
    $.ajax(settings).done((response) => {
      callback(null, response)
    })
  }

  fetchAnnotation (id, callback) {
    let url = this.baseURI + '/annotations/' + id
    let headers = {
      'cache-control': 'no-cache'
    }
    if (this.token) {
      headers['authorization'] = 'Bearer ' + this.token
    }
    let settings = {
      'async': true,
      'crossDomain': true,
      'url': url,
      'method': 'GET',
      'headers': headers
    }
    $.ajax(settings).done((response) => {
      callback(null, response)
    }).fail(() => {
      callback(new Error('Unable to retrieve annotation with id ' + id))
    })
  }

  updateAnnotation (id, data, callback) {
    let url = this.baseURI + '/annotations/' + id
    let settings = {
      'async': true,
      'crossDomain': true,
      'url': url,
      'method': 'PATCH',
      'contentType': 'application/json',
      'headers': {
        'authorization': 'Bearer ' + this.token,
        'cache-control': 'no-cache'
      },
      'data': JSON.stringify(data)
    }
    $.ajax(settings).done((response) => {
      callback(null, response)
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
    $.ajax(settings).done((response) => {
      callback(null, response)
    })
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
          if (total > MAX_NUMBER_OF_ANNOTATIONS_TO_SEARCH) {
            total = MAX_NUMBER_OF_ANNOTATIONS_TO_SEARCH // Limit the number of results
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
          Promise.all(promises).catch((reasons) => {
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
    let settings = {
      'async': true,
      'crossDomain': true,
      'url': url,
      'method': 'GET',
      'headers': headers,
      'data': data,
      'retryCount': 0,
      'retryLimit': MAX_NUMBER_OF_CALL_RETRIES,
      'created': Date.now(),
      'success': (response) => {
        data.limit = limit
        if (_.isFunction(callback)) {
          callback(null, response)
        }
      },
      'error': function () {
        this.retryCount++
        if (this.retryCount <= this.retryLimit) {
          $.ajax(this)
        } else {
          data.limit = limit
          if (_.isFunction(callback)) {
            callback(new Error(), [])
          }
        }
      }
    }
    $.ajax(settings)
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
      'async': true,
      'crossDomain': true,
      'url': url,
      'method': 'GET',
      'headers': headers,
      'data': data,
      'success': (response) => {
        if (_.isFunction(callback)) {
          callback(null, response)
        }
      },
      'error': () => {
        callback(new Error('Unable to retrieve list of groups'))
      }
    }
    $.ajax(settings)
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
        'data': JSON.stringify(data),
        'success': (response) => {
          console.log('Success')
          if (_.isFunction(callback)) {
            callback(null, response)
          }
        },
        'error': (response) => {
          callback(new Error('Unable to create the hypothes.is group'))
        }
      }
      $.ajax(settings)
    }
  }

  removeAMemberFromAGroup (data, callback) {
    if (!_.isObject(data)) {
      callback(new Error('Data must be an object'))
    } else {
      data.user = 'me' // Currently only is allowed to remove yourself. See: http://h.readthedocs.io/en/latest/api-reference/#operation/deleteGroupMember
      console.log(data)
      if (_.has(data, ['id'])) {
        let settings = {
          method: 'DELETE',
          url: 'https://hypothes.is/api/groups/' + data.id + '/members/' + data.user,
          headers: {
            'Authorization': 'Bearer ' + this.token
          },
          'success': () => {
            if (_.isFunction(callback)) {
              callback(null)
            }
          },
          'error': (responseError) => {
            console.log(responseError)
            callback(new Error('Unable to remove member ' + data.user + ' from the group ' + data.id))
          }
        }
        $.ajax(settings)
      } else {
        callback(new Error('Data must have an id'))
      }
    }
  }
}

module.exports = HypothesisClient
