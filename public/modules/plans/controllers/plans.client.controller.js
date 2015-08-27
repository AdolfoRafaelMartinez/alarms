'use strict';

angular.module('plans').controller('PlansController', ['$scope', '$rootScope', '$state', '$stateParams', '$location', 'Authentication', 'Drawing', '$timeout', '$http', 'Plans',
    function($scope, $rootScope, $state, $stateParams, $location, Authentication, Drawing, $timeout, $http, Plans) {

		$scope.authentication = Authentication;

        $scope.UNITS_STEP_FEET = 8;
        $scope.UNITS_STEP_METERS = 3;
        $scope.UNITS_MIN_METERS = 3;
        $scope.UNITS_MIN_FEET = Number.parseFloat((Math.round($scope.UNITS_MIN_METERS * 3.28084 * 100) / 100).toFixed(0));
        $scope.UNITS_MAX_METERS = 30;
        $scope.UNITS_MAX_FEET = Number.parseFloat((Math.round($scope.UNITS_MAX_METERS * 3.28084 * 100) / 100).toFixed(0));

        $scope.addAP = function(evt) {
            if ($scope.calibration_step === 1) {
                Drawing.calibrationLine(evt, 0);
                $scope.calibration_step++;
            } else if ($scope.calibration_step === 2) {
                Drawing.calibrationLine(evt, 1);
                $scope.calibration_done = true;
            } else {
                Drawing.addAP(evt.offsetX, evt.offsetY, $scope.settings.signal_radius);
            }
        };

        $scope.startCalibration = function() {
            $scope.calibration_step = 1;
        };

        $scope.completeCalibration = function() {
            Drawing.completeCalibration($scope.calibration_distance);
            $scope.calibration_done = false;
            $scope.calibration_step = false;
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
            if ($scope.settings.units === 'ft') {
                $scope.settings.signal_radius_meters = Number.parseFloat((Math.round($scope.settings.signal_radius_feet / 3.28084 * 100) / 100).toFixed(0));
            } else {
                $scope.settings.signal_radius_feet = Number.parseFloat((Math.round($scope.settings.signal_radius_meters * 3.28084 * 100) / 100).toFixed(0));
            }
            $scope.settings.signal_radius = ($scope.settings.units === 'ft') ? $scope.settings.signal_radius_feet : $scope.settings.signal_radius_meters;
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
            $scope.plan.title = $scope.flooplan_name;
            $scope.plan.thumb = Drawing.getThumb();
            $scope.plan.stage = Drawing.toJSON();
            $scope.plan.settings = $scope.settings;

			$scope.plan.$update(function(response) {
			}, function(errorResponse) {
				$scope.error = errorResponse.data.message;
			});
        };

        $scope.newPlan = function() {
            $scope.flooplan_name = '';
            $scope.plan = new Plans({
                title: 'Untitled'
            });
            $timeout(function() {
                $scope.settings = {
                    units: 'ft',
                    signal_radius: 25,
                    show_distances: true,
                    show_overlaps: true
                };

                if ($scope.settings.units === 'ft') $scope.settings.signal_radius_feet = $scope.settings.signal_radius;
                if ($scope.settings.units === 'm') $scope.settings.signal_radius_meters = $scope.settings.signal_radius;

                Drawing.initBoard($scope.settings.signal_radius);
                Drawing.scale(100);
                $scope.updateSignalStrength();
            }.bind(Drawing), 200);
        };

		$scope.create = function() {
			var plan = new Plans({
				title: this.title,
				content: this.content
			});
			plan.$save(function(response) {
				$location.path('plans/' + response._id);

				$scope.title = '';
				$scope.content = '';
			}, function(errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};

		$scope.remove = function(plan) {
			if (plan) {
				plan.$remove();

				for (var i in $scope.plans) {
					if ($scope.plans[i] === plan) {
						$scope.plans.splice(i, 1);
					}
				}
			} else {
				$scope.plan.$remove(function() {
					$location.path('plans');
				});
			}
		};

		$scope.update = function() {
			var plan = $scope.plan;

			plan.$update(function() {
				$location.path('plans/' + plan._id);
			}, function(errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};

		$scope.find = function() {
			$scope.plans = Plans.query();
		};

		$scope.findOne = function() {
			$scope.plan = Plans.get({
				planId: $stateParams.planId
			}, function() {
                $scope.settings = $scope.plan.settings;
                $scope.flooplan_name = $scope.plan.title;
                Drawing.loadPlan($scope.plan.stage, $scope.settings.signal_radius);
            });
		};
	}
]);
