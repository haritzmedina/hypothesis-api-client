# hypothesis-api-client [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url]
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

The client currently supports the following methods.

### Annotations
* [createNewAnnotation](http://h.readthedocs.io/en/latest/api-reference/#operation/createAnnotation)(annotation, callback)
* createNewAnnotations(annotationsArray, callback)
* [fetchAnnotation](http://h.readthedocs.io/en/latest/api-reference/#operation/fetchAnnotation)(id, callback)
* [updateAnnotation](http://h.readthedocs.io/en/latest/api-reference/#operation/updateAnnotation)(id, annotation, callback)
* [deleteAnnotation](http://h.readthedocs.io/en/latest/api-reference/#operation/deleteAnnotation)(id, callback)
* [searchAnnotations](http://h.readthedocs.io/en/latest/api-reference/#operation/search)(data, callback)
* searchBunchAnnotations(data, offset, callback)

### Groups
* [getListOfGroups](https://h.readthedocs.io/en/latest/api-reference/#operation/listGroups)(data, callback)
* [removeAMemberFromAGroup](http://h.readthedocs.io/en/latest/api-reference/#operation/deleteGroupMember)(groupId, user, callback)
* [createHypothesisGroup](https://hypothes.is/groups/new)(groupName, callback)

### Users
* [getUserProfile](http://h.readthedocs.io/en/latest/api-reference/#section/Hypothesis-API-Reference)(callback)


## License

GPL-3.0 © [Haritz Medina](https://haritzmedina.com)


[npm-image]: https://badge.fury.io/js/hypothesis-api-client.svg
[npm-url]: https://npmjs.org/package/hypothesis-api-client
[travis-image]: https://travis-ci.org/haritzmedina/hypothesis-api-client.svg?branch=master
[travis-url]: https://travis-ci.org/haritzmedina/hypothesis-api-client
[daviddm-image]: https://david-dm.org/haritzmedina/hypothesis-api-client.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/haritzmedina/hypothesis-api-client
[coveralls-image]: https://coveralls.io/repos/haritzmedina/hypothesis-api-client/badge.svg
[coveralls-url]: https://coveralls.io/r/haritzmedina/hypothesis-api-client
