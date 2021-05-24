# hypothesis-api-client
[![NPM version][npm-image]][npm-url]
[![build-test](https://github.com/haritzmedina/hypothesis-api-client/actions/workflows/build-test.yml/badge.svg)](https://github.com/haritzmedina/hypothesis-api-client/actions/workflows/build-test.yml)
[![dependencies Status](https://status.david-dm.org/gh/haritzmedina/hypothesis-api-client.svg)](https://david-dm.org/haritzmedina/hypothesis-api-client)
[![Try hypothesis-api-client on RunKit][runkit-image]][runkit-url]
[![Coverage percentage][coveralls-image]][coveralls-url]
> A Hypothes.is API client for browser and server-side

## Installation

```sh
$ npm install --save hypothesis-api-client
```

## Usage

```js
const HypothesisClient = require('hypothesis-api-client');

let hypothesisClient = new HypothesisClient(TOKEN);

hypothesisClient.searchAnnotations({url: 'https://hypothes.is'}, (err, annotations) => {
  console.log(annotations)
})
```

## Methods

The client currently supports the following methods. JSDoc can be found [here](https://haritzmedina.github.io/hypothesis-api-client).

### Annotations
* [createNewAnnotation](http://h.readthedocs.io/en/latest/api-reference/#operation/createAnnotation)(annotation, callback)
* createNewAnnotations(annotationsArray, callback)
* [fetchAnnotation](http://h.readthedocs.io/en/latest/api-reference/#operation/fetchAnnotation)(id, callback)
* [updateAnnotation](http://h.readthedocs.io/en/latest/api-reference/#operation/updateAnnotation)(id, annotation, callback)
* [deleteAnnotation](http://h.readthedocs.io/en/latest/api-reference/#operation/deleteAnnotation)(id, callback)
* deleteAnnotations(annotationsArray, callback)
* [searchAnnotations](http://h.readthedocs.io/en/latest/api-reference/#operation/search)(data, callback): Search up to 10K bulk annotations in parallel (faster). Maybe it will be deprecated. 
* searchBunchAnnotations(data, offset, callback): Search a bunch (up to 200) of annotations giving an offset (up to 9.8K)
* [searchAnnotationsSequential](https://web.hypothes.is/blog/new-search-api-parameter-search_after/): Search over 10K bulk annotations sequentially (slower).

### Groups
* [getListOfGroups](https://h.readthedocs.io/en/latest/api-reference/#operation/listGroups)(data, callback)
* [removeAMemberFromAGroup](http://h.readthedocs.io/en/latest/api-reference/#operation/deleteGroupMember)(groupId, user, callback)
* [createHypothesisGroup](https://h.readthedocs.io/en/latest/api-reference/#operation/createGroup)(data, callback)

### Users
* [getUserProfile](http://h.readthedocs.io/en/latest/api-reference/#section/Hypothesis-API-Reference)(callback)

## License

MIT © [Haritz Medina](https://haritzmedina.com)


[npm-image]: https://badge.fury.io/js/hypothesis-api-client.svg
[npm-url]: https://npmjs.org/package/hypothesis-api-client
[coveralls-image]: https://coveralls.io/repos/haritzmedina/hypothesis-api-client/badge.svg
[coveralls-url]: https://coveralls.io/r/haritzmedina/hypothesis-api-client
[runkit-image]:https://badge.runkitcdn.com/hypothesis-api-client.svg
[runkit-url]: https://npm.runkit.com/hypothesis-api-client
