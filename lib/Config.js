const Config = {
  search: {
    maxNumberOfAnnotations: 10000,
    maxNumberOfRetries: 5,
    intervalForRetriesInSeconds: 10
  },
  create: {
    maxNumberOfRetries: 5,
    intervalForRetriesInSeconds: 10,
    maxNumberOfAnnotationsInParallel: 10
  },
  delete: {
    maxNumberOfRetries: 5,
    intervalForRetriesInSeconds: 10
  }
}

module.exports = Config
