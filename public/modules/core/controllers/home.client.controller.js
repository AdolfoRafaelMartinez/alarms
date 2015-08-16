'use strict';

angular.module('core').controller('HomeController', ['$scope', 'Authentication', 'Drawing', '$timeout', '$http', 'Plans', '$location',
    function($scope, Authentication, Drawing, $timeout, $http, Plans, $location) {

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
            signal_radius: 25,
            show_distances: true,
            show_overlaps: true
        };

        if ($scope.settings.units == 'ft') $scope.settings.signal_radius_feet = $scope.settings.signal_radius;
        if ($scope.settings.units == 'm') $scope.settings.signal_radius_meters = $scope.settings.signal_radius;

        $scope.addAP = function(evt) {
            if ($scope.calibration_step == 1) {
                Drawing.calibrationLine(evt, 0);
                $scope.calibration_step++;
            } else if ($scope.calibration_step == 2) {
                Drawing.calibrationLine(evt, 1);
                $scope.calibration_done = true;
            } else {
                Drawing.addAP(evt.offsetX, evt.offsetY, $scope.settings.signal_radius);
            }
        };

        $scope.startCalibration = function() {
            $scope.calibration_step = 1;
        }

        $scope.completeCalibration = function() {
            Drawing.completeCalibration($scope.calibration_distance);
            $scope.calibration_done = false;
            $scope.calibration_step = false;
        }

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

        $scope.savePlan = function() {
			var plan = new Plans({
                title: $scope.flooplan_name,
                thumb: Drawing.getThumb(),
                stage: Drawing.toJSON(),
                settings: $scope.settings
			});
			plan.$save(function(response) {
			}, function(errorResponse) {
				$scope.error = errorResponse.data.message;
			});
        };

        loadPlan($location.search().p);

        function loadPlan(id) {
            if (!id) {
                $scope.flooplan_name = '';
                $timeout(function() {
                    Drawing.initBoard($scope.settings.signal_radius);
                    $scope.updateSignalStrength();
                }.bind(Drawing), 100);
                return;
            }
			$scope.plan = Plans.get({
				planId: id
			}, function() {
                $scope.settings = $scope.plan.settings;
                $scope.flooplan_name = $scope.plan.title;
                Drawing.loadPlan($scope.plan.stage, $scope.settings.signal_radius);
            });
        };
    }
]);
