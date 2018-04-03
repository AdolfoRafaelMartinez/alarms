'use strict';

angular.module('plans').factory('Vendors', ['$resource',
	function ($resource) {
		return $resource('vendors/:apId', {
			vendorId: '@_id'
		})
	}
])

angular.module('plans').factory('APs', ['$resource',
	function ($resource) {
		return $resource('aps/:apId', {
			apId: '@_id'
		})
	}
])

angular.module('plans').factory('Mounts', ['$resource',
	function ($resource) {
		return $resource('mounts/:mountId', {
			mountId: '@_id'
		})
	}
])

angular.module('plans').factory('Controllers', ['$resource',
	function ($resource) {
		return $resource('controllers/:controllerId', {
			controllerId: '@_id'
		})
	}
])

angular.module('plans').factory('Files', ['$resource',
	function ($resource) {
    return $resource('projects/:projectId/files', {
			projectId: '@_id'
		})
	}
])
