'use strict';

angular.module('core').controller('HomeController', ['$scope', 'Authentication', 'Drawing', '$timeout',
    function($scope, Authentication, Drawing, $timeout) {

        $scope.UNITS_STEP_FEET = 8;
        $scope.UNITS_STEP_METERS = 3;
        $scope.UNITS_MIN_METERS = 3;
        $scope.UNITS_MIN_FEET = Number.parseFloat((Math.round($scope.UNITS_MIN_METERS * 3.28084 * 100) / 100).toFixed(0));
        $scope.UNITS_MAX_METERS = 30;
        $scope.UNITS_MAX_FEET = Number.parseFloat((Math.round($scope.UNITS_MAX_METERS * 3.28084 * 100) / 100).toFixed(0));

        // This provides Authentication context.
        $scope.authentication = Authentication;

        // Only change this, and the rest will follow
        $scope.settings = {
            units: 'ft',
            signal_radius: 30,
            floor_width: 650,
            scale: 100, // percent
            show_distances: true,
            show_overlaps: true
        };

        if ($scope.settings.units == 'ft') $scope.settings.signal_radius_feet = $scope.settings.signal_radius;
        if ($scope.settings.units == 'm') $scope.settings.signal_radius_meters = $scope.settings.signal_radius;

        Drawing.initBoard($scope.settings.floor_width, $scope.settings.scale);

        $scope.addAP = function(evt) {
            Drawing.addAP(evt, $scope.settings.signal_radius);
        };

        $scope.changeUnits = function() {
            console.log('changeUnits', $scope.settings);
        };

        $scope.updateScale = function() {
            Drawing.scale($scope.settings.scale);
        };

        $scope.toggleDistances = function() {
            Drawing.toggleDistances();
        };

        $scope.toggleOverlaps = function() {
            Drawing.toggleOverlaps();
        };

        $scope.updateSignalStrength = function() {
            if ($scope.settings.units == 'ft') {
                $scope.settings.signal_radius_meters = Number.parseFloat((Math.round($scope.settings.signal_radius_feet / 3.28084 * 100) / 100).toFixed(0));
            } else {
                $scope.settings.signal_radius_feet = Number.parseFloat((Math.round($scope.settings.signal_radius_meters * 3.28084 * 100) / 100).toFixed(0));
            }
            $scope.settings.signal_radius = ($scope.settings.units == 'ft') ? $scope.settings.signal_radius_feet : $scope.settings.signal_radius_meters;
            Drawing.updateSignalStrength($scope.settings.signal_radius);
        };

        $scope.onFileSelect = function(image) {
            $scope.uploadInProgress = true;
            $scope.uploadProgress = 0;

            if (angular.isArray(image)) {
                image = image[0];
            }

            $scope.upload = $upload.upload({
                url: '/upload',
                method: 'POST',
                data: {
                    type: 'floorplan'
                },
                file: image
            }).progress(function(event) {
                $scope.uploadProgress = Math.floor(event.loaded / event.total);
                $scope.$apply();
            }).success(function(data, status, headers, config) {
                console.log('Photo uploaded!');
            }).error(function(err) {
                $scope.uploadInProgress = false;
                console.log('Error uploading file: ' + err.message || err);
            });
        };

        $scope.updateSignalStrength();
    }
]);
