'use strict';

//Plans service used for communicating with the plans REST endpoints
angular.module('plans').factory('Plans', ['$resource',
	function($resource) {
		return $resource('plans/:planId', {
			planId: '@_id'
		}, {
			update: {
				method: 'PUT'
			}
		});
	}
]);
