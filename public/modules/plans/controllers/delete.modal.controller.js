'use strict'

angular.module('plans')
  .controller('deleteModalController', ['$scope', 'close', 'item',
    function ($scope, close, item) {
      $scope.item = item
      $scope.close = function (result) {
        close(result, 500)
      }
    }])
