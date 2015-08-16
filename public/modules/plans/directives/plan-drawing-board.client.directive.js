'use strict';

angular.module('plans').directive('planDrawingBoard', [
	function() {
		return {
			templateUrl: 'modules/plans/views/drawing-board.template.html',
            transclude: true,
			restrict: 'A',
            controller: 'PlansController',
			link: function postLink(scope, element, attrs) {
			}
		};
	}
]);
