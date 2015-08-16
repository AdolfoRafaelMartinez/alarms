'use strict';

angular.module('plans').directive('planControls', [
	function() {
		return {
			templateUrl: 'modules/plans/views/controls.template.html',
            transclude: true,
			restrict: 'A',
            controller: 'PlansController',
			link: function postLink(scope, element, attrs) {
			}
		};
	}
]);
