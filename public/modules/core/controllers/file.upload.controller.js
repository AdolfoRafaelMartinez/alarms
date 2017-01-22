'use strict';

angular.module('core', ['blueimp.fileupload'])
.config([
    '$httpProvider', 'fileUploadProvider',
    function ($httpProvider, fileUploadProvider) {
        delete $httpProvider.defaults.headers.common['X-Requested-With'];
        fileUploadProvider.defaults.redirect = window.location.href.replace(
            /\/[^\/]*$/,
            '/cors/result.html?%s'
        );
        angular.extend(fileUploadProvider.defaults, {
            maxFileSize: 9999000,
            acceptFileTypes: /(\.|\/)(gif|jpe?g|png)$/i,
            autoUpload: true
        });
    }
])
.controller('pjFileUploadController', ['$scope', 'Drawing', '$timeout', '$http', '$filter', '$window',
function($scope, Drawing, $timeout, $http, $filter, $window) {
    const url = '/upload';
    $scope.options = {
        url: url
    };

    $scope.$on('fileuploaddone', function(files, data){
        var url = data._response.result.files[0].url;
        $timeout(function() {
            Drawing.addFloorPlan(url.replace('/Library/WebServer/projects/puddle/public', ''));
        }, 400);
    });

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
])
.controller('FileDestroyController', [
    '$scope', '$http',
    function ($scope, $http) {
        var file = $scope.file,
        state;
        if (file.url) {
            file.$state = function () {
                return state;
            };
            file.$destroy = function () {
                state = 'pending';
                return $http({
                    url: file.deleteUrl,
                    method: file.deleteType
                }).then(
                    function () {
                        state = 'resolved';
                        $scope.clear(file);
                    },
                    function () {
                        state = 'rejected';
                    }
                );
            };
        } else if (!file.$cancel && !file._index) {
            file.$cancel = function () {
                $scope.clear(file);
            };
        }
    }
]);
