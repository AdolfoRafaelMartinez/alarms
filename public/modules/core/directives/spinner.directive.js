'use strict'

angular.module('core').directive('spinner', ['$animate', function ($animate) {
	var TEMPLATE_PATH = '/template/spinner/spinner.html'

	return {
		templateUrl: TEMPLATE_PATH,
		scope: {active: '='},
		transclude: true,
		restrict: 'E',
		link: (scope, iElement) => {
			scope.$watch('active', (active) => {
				$animate[active ? 'addClass' : 'removeClass'](iElement, 'spinner-active')
			})
		}
	}
}])

angular.module('core').run(['$templateCache', function ($templateCache) {
	var TEMPLATE_PATH = '/template/spinner/spinner.html'

	var TEMPLATE = ''
	TEMPLATE += '<div class="spinner-content">'
	TEMPLATE +=   '<div class="spinner-container">'
	TEMPLATE +=     '<div class="spinner"></div>'
	TEMPLATE +=   '</div>'
	TEMPLATE +=   '<ng-transclude></ng-transclude>'
	TEMPLATE += '</div>'

	$templateCache.put(TEMPLATE_PATH, TEMPLATE)
}])
