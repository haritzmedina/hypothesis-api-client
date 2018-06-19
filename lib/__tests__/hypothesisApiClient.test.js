/* eslint-env jest */

// const assert = require('assert')

require('dotenv').config()

const jsdom = require('jsdom')
const { JSDOM } = jsdom
const { window } = new JSDOM({url: 'https://hypothes.is/api/'})
global.window = window

const TOKEN = process.env.HYPOTHESIS_TOKEN

const HypothesisClient = require('./../index.js')

describe('hypothesisApiClient', () => {
  it('create class', () => {
    let hypothesisClient = new HypothesisClient(TOKEN)
    expect(hypothesisClient).toBeInstanceOf(HypothesisClient)
  })
  it('search', (done) => {
    let hypothesisClient = new HypothesisClient(TOKEN)
    hypothesisClient.fetchAnnotation('1iHKEC66Eei-LtsYMN6Glw', (err, annotation) => {
      if (err) {

      } else {
        expect(annotation.id).toBe('1iHKEC66Eei-LtsYMN6Glw')
        done()
      }
    })
  })
  it('listOfGroups', (done) => {
    let hypothesisClient = new HypothesisClient(TOKEN)
    hypothesisClient.getListOfGroups({}, (err, listOfGroups) => {
      if (err) {

      } else {
        expect(Array.isArray(listOfGroups)).toBe(true)
        done()
      }
    })
  })
})
