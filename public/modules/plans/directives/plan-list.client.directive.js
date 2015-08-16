'use strict';

angular.module('plans').directive('planList', [
	function() {
		return {
			templateUrl: 'modules/plans/views/list-plans.template.html',
            transclude: true,
			restrict: 'E',
            controller: 'PlansController',
			link: function postLink(scope, element, attrs) {
			}
		};
	}
]);
