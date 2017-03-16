;(function (window) {
    'use strict';
    var angular = window.angular;

    // constants
    var TEMPLATE_PATH = '/template/spinner/spinner.html';
    var TEMPLATE = '';
    TEMPLATE += '<div class="spinner-content">';
    TEMPLATE +=   '<div class="spinner-container">';
    TEMPLATE +=     '<div class="spinner"></div>';
    TEMPLATE +=   '</div>';
    TEMPLATE +=   '<ng-transclude></ng-transclude>';
    TEMPLATE += '</div>';

    // module
    angular.module('spinner', ['ngAnimate']);

    // directive
    angular.module('spinner').directive('spinner', spinner);
    spinner.$inject = ['$animate'];
    function spinner ($animate) {
        function link (scope, iElement) {
            function statusWatcher (active) {
                $animate[active ? 'addClass' : 'removeClass'](iElement, 'spinner-active');
            }
            scope.$watch('active', statusWatcher);
        }

        return {
            templateUrl: TEMPLATE_PATH,
            scope: {active: '='},
            transclude: true,
            restrict: 'E',
            link: link
        };
    }

    // template
    angular.module('spinner').run(spinnerTemplate);
    spinnerTemplate.$inject = ['$templateCache'];
    function spinnerTemplate ($templateCache) {
        $templateCache.put(TEMPLATE_PATH, TEMPLATE);
    }
}.call(this, window));
