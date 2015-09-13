'use strict';

angular.module('core').controller('FileUploadController', ['$scope', 'Drawing', '$timeout',
    function($scope, Drawing, $timeout) {
        $scope.progress = function(percentDone) {
            $scope.num = percentDone;
            console.log('progress: ' + percentDone + '%');
        };

        $scope.done = function(files, data) {
            $timeout(function() {
                Drawing.addFloorPlan(data.replace('/Library/WebServer/projects/puddle/public', ''));
            }, 400);
        };

        $scope.doneFinal = function(files, data) {
            $timeout(function() {
                Drawing.addFloorPlan(data.replace('/Library/WebServer/projects/puddle/public', ''));
            }, 400);
        };

        $scope.getData = function(files) {
            return {
                msg: 'from the client',
                date: new Date()
            };
        };

        $scope.error = function(files, type, msg) {
            // writeFiles(files);
        };

    }
]);
