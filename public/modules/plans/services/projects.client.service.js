'use strict'

// Projects service used for communicating with the projects REST endpoints
angular.module('plans').factory('Projects', ['$resource',
  function ($resource) {
    return $resource('projects/:projectId', {
      projectId: '@_id'
    }, {
      update: {
        method: 'PUT'
      },
      getByBuilding: {
        method: 'GET',
        params: {
          buildingId: '@buildingId'
        }
      }
    })
  }
])
