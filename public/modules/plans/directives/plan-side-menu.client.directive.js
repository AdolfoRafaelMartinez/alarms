'use strict';

angular.module('plans').directive('planSideMenu', [
	function() {
		return {
			templateUrl: 'modules/plans/views/side-menu.template.html',
            transclude: true,
			restrict: 'A',
            controller: 'PlansController',
			link: function postLink(scope, element, attrs) {
			}
		};
	}
]);
