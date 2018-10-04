/* eslint-env jest */

// const assert = require('assert')

require('dotenv').config()

const TOKEN = process.env.HYPOTHESIS_TOKEN
const TEST_GROUP_ID = process.env.HYPOTHESIS_TEST_GROUP_ID

const HypothesisClient = require('./../index.js')

describe('hypothesisApiClient', () => {
  test('create class', () => {
    let hypothesisClient = new HypothesisClient(TOKEN)
    expect(hypothesisClient).toBeInstanceOf(HypothesisClient)
  })
  test('fetch', (done) => {
    let hypothesisClient = new HypothesisClient(TOKEN)
    hypothesisClient.fetchAnnotation('_qL8PnPFEeiUdn_sGb9hqg', (err, annotation) => {
      if (err) {

      } else {
        expect(annotation.id).toBe('_qL8PnPFEeiUdn_sGb9hqg')
        done()
      }
    })
  })
  test('listOfGroups', (done) => {
    let hypothesisClient = new HypothesisClient(TOKEN)
    hypothesisClient.getListOfGroups({}, (err, listOfGroups) => {
      if (err) {

      } else {
        expect(Array.isArray(listOfGroups)).toBe(true)
        done()
      }
    })
  })
  test('search500', (done) => {
    let hypothesisClient = new HypothesisClient(TOKEN)
    hypothesisClient.searchAnnotations({
      limit: 500
    }, (err, annotations) => {
      if (err) {

      } else {
        expect(annotations.length).toBe(500)
        done()
      }
    })
  }, 10000) // Set a higher timeout to give time to respond the multiple calls to Hypothes.is API
  test('searchWithLimitWhereLessAnnotationsAreFound', (done) => {
    let hypothesisClient = new HypothesisClient(TOKEN)
    hypothesisClient.searchAnnotations({
      limit: 5000, // If it call the API for 5000 annotations (instead the only one which match the search criteria) it wouldn't the test due to the timeout of 5000ms
      group: TEST_GROUP_ID,
      tags: 'ThisIsTheOnlyAnnotationWithThisTag'
    }, (err, annotations) => {
      if (err) {

      } else {
        expect(annotations.length).toBe(1)
        done()
      }
    })
  })
  test('createAndRemoveGroup', (done) => {
    let hypothesisClient = new HypothesisClient(TOKEN)
    let name = 'HypothesisGroupTest'
    hypothesisClient.createNewGroup({
      name: name
    }, (err, group) => {
      if (err) {

      } else {
        expect(group.name).toBe(name)
        hypothesisClient.removeAMemberFromAGroup({ id: group.id }, (err) => {
          expect(err).toBe(null)
          done()
        })
      }
    })
  })
  test('createUpdateDeleteAnnotation', (done) => {
    let hypothesisClient = new HypothesisClient(TOKEN)
    let annotationCorpus = {
      'group': TEST_GROUP_ID,
      'permissions': {
        'read': [
          'group:' + TEST_GROUP_ID
        ]
      },
      'references': [
      ],
      'tags': [
        'test'
      ],
      'target': [
        {
          'selector':
            [
              {
                'exact': 'Haritz Medina',
                'prefix': 'mi nombre es ',
                'type': 'TextQuoteSelector',
                'suffix': ' y este es mi sitio'
              }
            ]
        }
      ],
      'text': 'Test',
      'uri': 'https://haritzmedina.com'
    }
    // Create the annotation using the annotation corpus
    hypothesisClient.createNewAnnotation(annotationCorpus, (err, annotation) => {
      if (err) {
        // The annotation is not correctly created
        console.error('The annotation is not correctly deleted')
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
  test('getUserProfile', (done) => {
    let hypothesisClient = new HypothesisClient(TOKEN)
    hypothesisClient.getUserProfile((err, profile) => {
      if (err) {
        done.fail(err)
      } else {
        expect(profile.userid).toBe('acct:abwa@hypothes.is')
        done()
      }
    })
  })
})
