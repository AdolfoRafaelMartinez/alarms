'use strict'

angular.module('plans')
  .controller('infoModalController', ['$scope', 'close', 'info',
    function ($scope, close, info) {
      $scope.info = info
      $scope.close = function (result) {
        close(result, 500)
      }
    }])
