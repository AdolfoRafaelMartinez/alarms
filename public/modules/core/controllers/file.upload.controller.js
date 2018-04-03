'use strict';

angular.module('core')
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
.controller('pjFileUploadController', ['$scope', '$attrs', 'Drawing', '$timeout', '$http', '$filter', '$window',
function($scope, $attrs, Drawing, $timeout, $http, $filter, $window) {
  const url = '/upload';
  $scope.options = {
    url: url
  };
	$scope.percentDone = 0;

  $scope.$on('fileuploaddone', function(files, data){
    var url = data._response.result.files[0].url;
    $timeout(function() {
      if (Drawing.uploadProgress) {
        Drawing.uploadProgress($scope.percentDone);
        Drawing.addFloorPlan(url, true);
      }
      if ($scope.uploadComplete) {
        $scope.uploadComplete(url)
      }
    }, 0);
  });

	$scope.$on('fileuploadprogress', function(e, data) {
		$scope.percentDone = 100 * data.loaded / data.total
		if (Drawing.uploadProgress) Drawing.uploadProgress($scope.percentDone);
	});

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
