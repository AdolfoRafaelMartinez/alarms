'use strict';

angular.module('core').controller('FileUploadController', ['$scope', 'Drawing',
    function($scope, Drawing) {
        $scope.progress = function(percentDone) {
            console.log("progress: " + percentDone + "%");
        };

        $scope.done = function(files, data) {
            console.log("data: " + JSON.stringify(data));
            Drawing.addFloorPlan(data.replace('/Library/WebServer/projects/puddle/public', ''));
        };

        $scope.getData = function(files) {
            return {
                msg: "from the client",
                date: new Date()
            };
        };

        $scope.error = function(files, type, msg) {
            console.log("Upload error: " + msg);
            console.log("Error type:" + type);
            writeFiles(files);
        }

    }
]);
