/* eslint-env jest */

// const assert = require('assert')

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '/../../.env') })

const TOKEN = process.env.HYPOTHESIS_TOKEN
const TEST_GROUP_ID = process.env.HYPOTHESIS_TEST_GROUP_ID

console.log(TOKEN)

const HypothesisClient = require('./../index.js')

const annotationCorpus = {
  group: TEST_GROUP_ID,
  permissions: {
    read: [
      'group:' + TEST_GROUP_ID
    ]
  },
  references: [
  ],
  tags: [
    'test'
  ],
  target: [
    {
      selector:
        [
          {
            exact: 'Haritz Medina',
            prefix: 'mi nombre es ',
            type: 'TextQuoteSelector',
            suffix: ' y este es mi sitio'
          }
        ]
    }
  ],
  text: 'Test',
  uri: 'https://haritzmedina.com'
}

describe('constructor', () => {
  test('createClass', () => {
    const hypothesisClient = new HypothesisClient(TOKEN)
    expect(hypothesisClient).toBeInstanceOf(HypothesisClient)
  })
  test('defineCustomBaseURI', () => {
    const hypothesisClient = new HypothesisClient(TOKEN, { baseURI: 'https://hypothesis.haritzmedina.com' })
    expect(hypothesisClient.baseURI).toBe('https://hypothesis.haritzmedina.com/')
  })
})

describe('annotations', () => {
  test('fetch', (done) => {
    const hypothesisClient = new HypothesisClient(TOKEN)
    hypothesisClient.fetchAnnotation('_qL8PnPFEeiUdn_sGb9hqg', (err, annotation) => {
      if (err) {
        done.fail(err)
      } else {
        expect(annotation.id).toBe('_qL8PnPFEeiUdn_sGb9hqg')
        done()
      }
    })
  })

  test('search500', (done) => {
    const hypothesisClient = new HypothesisClient(TOKEN)
    hypothesisClient.searchAnnotations({
      limit: 500,
      search_after: '2018-10-18T08:10:50+00:00'
    }, (err, annotations) => {
      if (err) {
        done.fail(err)
      } else {
        expect(annotations.length).toBe(500)
        done()
      }
    })
  }, 10000) // Set a higher timeout to give time to respond the multiple calls to Hypothes.is API

  test('search500After', (done) => {
    const hypothesisClient = new HypothesisClient(TOKEN)
    hypothesisClient.searchAnnotationsSequential({
      limit: 500,
      search_after: '2018-10-18T08:10:50+00:00'
    }, (err, annotations) => {
      if (err) {
        done.fail(err)
      } else {
        expect(annotations.length).toBe(500)
        done()
      }
    })
  }, 15000)

  test('searchWithLimitWhereLessAnnotationsAreFound', (done) => {
    const hypothesisClient = new HypothesisClient(TOKEN)
    hypothesisClient.searchAnnotations({
      limit: 5000, // If it call the API for 5000 annotations (instead the only one which match the search criteria) it wouldn't the test due to the timeout of 5000ms
      group: TEST_GROUP_ID,
      tags: 'ThisIsTheOnlyAnnotationWithThisTag'
    }, (err, annotations) => {
      if (err) {
        done.fail(err)
      } else {
        expect(annotations.length).toBe(1)
        done()
      }
    })
  })

  test('createUpdateDeleteAnnotation', (done) => {
    const hypothesisClient = new HypothesisClient(TOKEN)
    // Create the annotation using the annotation corpus
    hypothesisClient.createNewAnnotation(annotationCorpus, (err, annotation) => {
      if (err) {
        // The annotation is not correctly created
        console.error('The annotation is not correctly deleted')
        done.fail(err)
      } else {
        // If annotation exists, update it
        expect(annotation.text).toBe('Test')
        // Change tags of annotation
        annotationCorpus.tags = ['test2']
        hypothesisClient.updateAnnotation(annotation.id, annotationCorpus, (err, annotation) => {
          if (err) {
            done.fail('Annotation is not updated')
          } else {
            if (annotation.tags[0] === 'test2') {
              // Finally delete it
              hypothesisClient.deleteAnnotation(annotation.id, (err, response) => {
                if (err) {
                  // The annotation is not correctly deleted
                  console.error('The annotation is not correctly deleted')
                  done.fail('Annotation is not correctly deleted')
                } else {
                  expect(response.deleted).toBe(true)
                  done()
                }
              })
            } else {
              // The annotation is not correctly updated
              console.error('The annotation is not correctly updated')
              done.fail('Annotation tag is not correctly updated')
            }
          }
        })
      }
    })
  })
  test('deleteAnnotationParamIsAnAnnotation', (done) => {
    const hypothesisClient = new HypothesisClient(TOKEN)
    // Create the annotation using the annotation corpus
    hypothesisClient.createNewAnnotation(annotationCorpus, (err, annotation) => {
      if (err) {
        // The annotation is not correctly created
        console.error('The annotation is not correctly deleted')
        done.fail(err)
      } else {
        hypothesisClient.deleteAnnotation(annotation, (err, response) => {
          if (err) {
            done.fail(err)
          } else {
            expect(response.deleted).toBe(true)
            done()
          }
        })
      }
    })
  })
  test('deleteAnnotationParamIsNotAnAnnotationOrId', (done) => {
    const hypothesisClient = new HypothesisClient(TOKEN)
    hypothesisClient.deleteAnnotation({ rubbish: 'This is not an annotation' }, (err) => {
      expect(err).toBeInstanceOf(Error)
      done()
    })
  })
  test('fetchNewAnnotationNonToken', (done) => {
    const hypothesisClient = new HypothesisClient(null)
    hypothesisClient.fetchAnnotation('', (err) => {
      expect(err).toBeInstanceOf(Error)
      done()
    })
  })
  test('annotationToDeleteDoesNotExist', (done) => {
    const hypothesisClient = new HypothesisClient(TOKEN)
    hypothesisClient.deleteAnnotation('randomId', (err) => {
      expect(err).toBeInstanceOf(Error)
      done()
    })
  })
  test('createNewAnnotationNonToken', (done) => {
    const hypothesisClient = new HypothesisClient(null, { create: { maxNumberOfRetries: 2, intervalForRetriesInSeconds: 1 } })
    hypothesisClient.createNewAnnotation(annotationCorpus, (err) => {
      expect(err).toBeInstanceOf(Error)
      done()
    })
  })
  test('createNewAnnotationsEmptyArray', (done) => {
    const hypothesisClient = new HypothesisClient(TOKEN)
    hypothesisClient.createNewAnnotations([], (err) => {
      expect(err).toBeInstanceOf(Error)
      done()
    })
  })
  test('createNewAnnotationsNonTokenSequential', (done) => {
    const hypothesisClient = new HypothesisClient(null, { create: { maxNumberOfAnnotationsInParallel: 1, maxNumberOfRetries: 0, intervalForRetriesInSeconds: 1 } })
    hypothesisClient.createNewAnnotations([annotationCorpus], (err) => {
      expect(err).toBeInstanceOf(Error)
      done()
    })
  })
  test('createNewAnnotationsNonToken', (done) => {
    const hypothesisClient = new HypothesisClient(null, { create: { maxNumberOfRetries: 0, intervalForRetriesInSeconds: 1 } })
    hypothesisClient.createNewAnnotation([annotationCorpus], (err) => {
      expect(err).toBeInstanceOf(Error)
      done()
    })
  })
  test('createNewAnnotationsParallel5', (done) => {
    const annos = Array(5).fill(annotationCorpus)
    const hypothesisClient = new HypothesisClient(TOKEN)
    hypothesisClient.createNewAnnotations(annos, (err, annotations) => {
      if (err) {
        done.fail(err)
      } else {
        expect(annotations.length).toBe(5)
        // Remove all created annotations
        hypothesisClient.deleteAnnotations(annotations, (err) => {
          if (err) {
            done.fail(err)
          } else {
            done()
          }
        })
      }
    })
  }, 10000)
  test('createNewAnnotationsSeq5', (done) => {
    const annos = Array(5).fill(annotationCorpus)
    const hypothesisClient = new HypothesisClient(TOKEN, { create: { maxNumberOfAnnotationsInParallel: 1 } })
    hypothesisClient.createNewAnnotations(annos, (err, annotations) => {
      if (err) {
        done.fail(err)
      } else {
        expect(annotations.length).toBe(5)
        // Remove all created annotations
        hypothesisClient.deleteAnnotations(annotations, (err) => {
          if (err) {
            done.fail(err)
          } else {
            done()
          }
        })
      }
    })
  }, 10000)
})

describe('groups', () => {
  test('listOfGroups', (done) => {
    const hypothesisClient = new HypothesisClient(TOKEN)
    hypothesisClient.getListOfGroups({}, (err, listOfGroups) => {
      if (err) {
        done.fail(err)
      } else {
        expect(Array.isArray(listOfGroups)).toBe(true)
        done()
      }
    })
  })
  test('createAndRemoveGroup', (done) => {
    const hypothesisClient = new HypothesisClient(TOKEN)
    const name = 'HypothesisGroupTest'
    hypothesisClient.createNewGroup({
      name: name
    }, (err, group) => {
      if (err) {
        done.fail(err)
      } else {
        expect(group.name).toBe(name)
        hypothesisClient.removeAMemberFromAGroup({ id: group.id }, (err) => {
          expect(err).toBe(null)
          done()
        })
      }
    })
  })
  test('createUpdateFetchDeleteGroup', (done) => {
    const hypothesisClient = new HypothesisClient(TOKEN)
    const name = 'HypothesisGroupTest'
    const newName = 'HypothesisGroupNewName'
    // Create hypothesis group
    hypothesisClient.createNewGroup({
      name: name
    }, (err, group) => {
      if (err) {
        done.fail(err)
      } else {
        expect(group.name).toBe(name)
        // Update hypothesis group name
        hypothesisClient.updateGroup(group.id, { name: newName }, (err, group) => {
          if (err) {
            done.fail(err)
          } else {
            expect(group.name).toBe(newName)
            // Fetch the group
            hypothesisClient.fetchGroup(group.id, (err, group) => {
              if (err) {
                done.fail(err)
              } else {
                expect(group.name).toBe(newName)
                // Remove the group
                hypothesisClient.removeAMemberFromAGroup({ id: group.id }, (err) => {
                  expect(err).toBe(null)
                  done()
                })
              }
            })
          }
        })
      }
    })
  })
})

describe('user', () => {
  test('getUserProfile', (done) => {
    const hypothesisClient = new HypothesisClient(TOKEN)
    hypothesisClient.getUserProfile((err, profile) => {
      if (err) {
        done.fail(err)
      } else {
        expect(profile.userid).toBe('acct:abwa@hypothes.is')
        done()
      }
    })
  })
  test('getUserProfileNonToken', (done) => {
    const hypothesisClient = new HypothesisClient()
    hypothesisClient.getUserProfile((err) => {
      expect(err).toBeInstanceOf(Error)
      done()
    })
  })
})
