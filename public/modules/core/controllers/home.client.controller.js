'use strict';


angular.module('core').controller('HomeController', ['$scope', 'Authentication', 'Drawing', '$timeout',
	function($scope, Authentication, Drawing, $timeout) {

		// This provides Authentication context.
		$scope.authentication = Authentication;
        Drawing.initBoard();

        $scope.addAP = function(evt) {
            Drawing.addAP(evt);
        };
	}
]);
