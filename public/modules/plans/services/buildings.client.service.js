'use strict'

// Projects service used for communicating with the projects REST endpoints
angular.module('plans').factory('Buildings', ['$resource',
	function ($resource) {
		return $resource('buildings/:buildingId', {
				buildingId: '@_id'
			}, {
				update: {
					method: 'PUT'
				}
			})
	}
])
