'use strict'

angular.module('plans').factory('Signal', ['$resource',
  function ($resource) {
    return $resource('signal/:planId', {
      planId: '@_id'
    })
  }
])
