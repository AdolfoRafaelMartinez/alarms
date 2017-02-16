'use strict';

angular.module('plans').directive('ngRightClick', ['$parse',
    function($parse) {
        return function(scope, element, attrs) {
            var fn = $parse(attrs.ngRightClick);
            element.bind('contextmenu', function(event) {
                event.preventDefault();
                scope.$apply(function() {
                    fn(scope, {$event:event});
                });
            });
        };
    }]);
