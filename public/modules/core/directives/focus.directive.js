'use strict'

angular.module('core').directive('focusMe', ['$timeout', function ($timeout) {
  return {
    scope: { trigger: '@focusMe' },
    link: (scope, element) => {
      scope.$watch('trigger', value => {
        if (value) {
          $timeout(() => {
            element[0].focus()
          })
        }
      })
    }
  }
}])
