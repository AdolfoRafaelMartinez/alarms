'use strict'

angular.module('plans').factory('Plans', ['$resource',
	function ($resource) {
		return $resource('plans/:planId', {
			planId: '@_id'
		}, {
			update: {
				method: 'PUT'
			},
			orphans: {
				method: 'GET',
				url: 'orphan-plans',
				isArray: true
			}
		})
	}
])
