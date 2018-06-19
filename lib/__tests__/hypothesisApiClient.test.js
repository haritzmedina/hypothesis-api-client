/* eslint-env jest */

// const assert = require('assert')

require('dotenv').config()

const jsdom = require('jsdom')
const { JSDOM } = jsdom
const { window } = new JSDOM({url: 'https://hypothes.is/api/'})
global.window = window

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
    hypothesisClient.fetchAnnotation('1iHKEC66Eei-LtsYMN6Glw', (err, annotation) => {
      if (err) {

      } else {
        expect(annotation.id).toBe('1iHKEC66Eei-LtsYMN6Glw')
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
  }, 20000) // Set a higher timeout to give time to respond the multiple calls to Hypothes.is API
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
})
