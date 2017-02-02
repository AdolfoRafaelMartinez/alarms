'use strict';

angular.module('plans')
    .controller('PlansController',
    ['$scope', '$rootScope', '$state', '$stateParams', '$location',
        'Authentication', 'Drawing', '$timeout', '$http', 'Plans', 'contextMenu',
    function($scope, $rootScope, $state, $stateParams, $location,
        Authentication, Drawing, $timeout, $http, Plans, contextMenu) {

		$scope.authentication = Authentication;

        $scope.UNITS_STEP_FEET = 8;
        $scope.UNITS_STEP_METERS = 3;
        $scope.UNITS_MIN_METERS = 3;
        $scope.UNITS_MIN_FEET = Number.parseFloat((Math.round($scope.UNITS_MIN_METERS * 3.28084 * 100) / 100).toFixed(0));
        $scope.UNITS_MAX_METERS = 30;
        $scope.UNITS_MAX_FEET = Number.parseFloat((Math.round($scope.UNITS_MAX_METERS * 3.28084 * 100) / 100).toFixed(0));

        var iconset = {
            save: 'save',
            done: 'done',
            loading: 'loop',
            pan: 'open_with',
            ap: 'room',
            wall: 'office'
        };

        $scope.icons = {
            loading: iconset.loading,
            save: iconset.save,
            pan: iconset.pan,
            ap: iconset.ap,
            wall: iconset.wall
        };

        $scope.wall_types = {
            DW: {
                desc: 'dry wall',
                color: '#48cccd',
                width: 8,
                dash: [20, 10]
                },
            BR: {
                desc: 'brick',
                color: '#e66c2c',
                width: 16,
                dash: [20, 10]
                },
            ML: {
                desc: 'metal',
                color: '#bfcfec',
                width: 8,
                dash: [10, 4]
                },
            WD: {
                desc: 'wood',
                color: '#ee9a4d',
                width: 8,
                dash: [20, 10]
                }
        };

        $scope.menu = {
            mode: 'ap'
        };
        Drawing.setupMenu($scope.menu);

        $scope.closeMenu = function() {
            contextMenu.close();
        };

        $scope.planProperties = function() {
            $scope.menu.mode = 'plan';
        };

        $scope.selectWallType = function() {
            Drawing.selectWallType($scope.wall_types[$scope.wall_type]);
        };
        $scope.wall_type = 'DW';
        $scope.selectWallType();

        $scope.deleteAP = function() {
            Drawing.deleteSelectedAP();
        };

        $scope.getCurrentAP = function() {
            $scope.ap = Drawing.getCurrentAP();
        };

        $scope.deleteWall = function() {
            Drawing.deleteSelectedWall();
        };

        $scope.startCalibration = function() {
            Drawing.startCalibration(function() {
                $scope.calibration_done = true;
                $scope.$digest();
            });
            $scope.calibration_step = true;
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
            $scope.settings.show_heatmap = false;
            Drawing.heatmap('off');
        };

        $scope.toggleOverlaps = function() {
            Drawing.toggleOverlaps();
            $scope.settings.show_heatmap = false;
            Drawing.heatmap('off');
        };

        $scope.toggleHeatmap = function() {
            if ($scope.settings.show_distances) {
                $scope.settings.show_distances = false;
                Drawing.toggleDistances('off');
            }
            if ($scope.settings.show_overlaps) {
                $scope.settings.show_overlaps = false;
                Drawing.toggleOverlaps('off');
            }
            if (!$scope.settings.show_heatmap) {
                Drawing.heatmap('off');
                $scope.settings.show_overlaps = true;
                $scope.settings.show_distances = true;
                Drawing.toggleOverlaps();
                Drawing.toggleDistances();
                Drawing.toggleRadius();
            } else {
                Drawing.toggleRadius();
                Drawing.heatmap();
            }
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
                console.log($scope.uploadProgress);
            }).success(function(data, status, headers, config) {
                console.log('Photo uploaded!');
            }).error(function(err) {
                $scope.uploadInProgress = false;
                console.log('Error uploading file: ' + err.message || err);
            });
        };

        $scope.getTotalAPs = function() {
            return Drawing.getTotalAPs();
        };

        $scope.savePlan = function() {
            $scope.plan.title = $scope.flooplan_name;
            $scope.plan.thumb = Drawing.getThumb();
            $scope.plan.stage = Drawing.toJSON();
            $scope.plan.settings = $scope.settings;

            if (!$scope.plan._id) {
                $scope.plan.$save(function(response) {
                    $location.path('plans/' + response._id);
                }, function(errorResponse) {
                    $scope.error = errorResponse.data.message;
                });
            } else {
                $scope.icons.save = iconset.loading;
                $scope.plan.$update(function(response) {
                    $scope.icons.save = iconset.done;
                    $timeout(function() {
                        $scope.icons.save = iconset.save;
                    }, 3000);
                }, function(errorResponse) {
                    $scope.error = errorResponse.data.message;
                });
            }
        };

        $scope.newPlan = function() {
            $scope.flooplan_name = '';
            $scope.plan = new Plans({
                title: 'Untitled',
                details: {
                    contacts: []
                }
            });
            $timeout(function() {
                $scope.settings = {
                    units: 'ft',
                    signal_radius: 25,
                    show_distances: true,
                    show_overlaps: true,
                    show_heatmap: false,
                    scale: 100
                };

                if ($scope.settings.units === 'ft') $scope.settings.signal_radius_feet = $scope.settings.signal_radius;
                if ($scope.settings.units === 'm') $scope.settings.signal_radius_meters = $scope.settings.signal_radius;

                Drawing.initBoard($scope.settings.signal_radius);
                Drawing.scale(100);
                $scope.updateSignalStrength();
                $scope.planReady = true;
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

        $scope.updateControls = function(key, val) {
            if ($scope.$$phase) {
                $scope.settings[key] = val;
            } else {
                $scope.$apply(function() {
                    $scope.settings[key] = val;
                });
            }
        };

		$scope.find = function() {
			$scope.plans = Plans.query({search: $scope.search});
		};

		$scope.findOne = function() {
			$scope.plan = Plans.get({
				planId: $stateParams.planId
			}, function() {
                $scope.settings = $scope.plan.settings;
                $scope.flooplan_name = $scope.plan.title;
                if (typeof $scope.plan.details !== 'object') $scope.plan.details = {};
                if (!$scope.plan.details.contacts) $scope.plan.details.contacts = [];
                Drawing.loadPlan($stateParams.planId, $scope.plan.stage, $scope.settings.signal_radius, $scope.updateControls);
                $timeout(() => {
                    $scope.planReady = true;
                }, 1100);
            });
		};

        $scope.selectTool = function(mode) {
            $scope.mouse_mode = mode;
            Drawing.selectTool(mode);
        };

        $scope.addContact = function() {
            $scope.pp_edit.contacts = true;
            var newContact = {};
            $scope.edit_prop = newContact;
            if (!$scope.plan.details.contacts) $scope.plan.details.contacts = [];
            $scope.plan.details.contacts.push(newContact);
        };

        $scope.removeContact = function(index) {
            $scope.plan.details.contacts.splice(index, 1);
            $scope.savePlan();
        };

        $scope.addController = function() {
            $scope.pp_edit.controllers = true;
            var newController = {};
            $scope.edit_prop = newController;
            if (!$scope.plan.details.controllers) $scope.plan.details.controllers = [];
            $scope.plan.details.controllers.push(newController);
        };

        $scope.removeController = function(index) {
            $scope.plan.details.controllers.splice(index, 1);
            $scope.savePlan();
        };

        $scope.addLicense = function() {
            $scope.pp_edit.licenses = true;
            var newLicense = {};
            $scope.edit_prop = newLicense;
            if (!$scope.plan.details.licenses) $scope.plan.details.licenses = [];
            $scope.plan.details.licenses.push(newLicense);
        };

        $scope.removeLicense = function(index) {
            $scope.plan.details.licenses.splice(index, 1);
            $scope.savePlan();
        };

        $scope.pp_edit = {};
        $scope.toggleEdit = function(prop, obj) {
            $scope.pp_edit[prop] = !$scope.pp_edit[prop];
            if (obj) $scope.edit_prop = obj;
        };

        $scope.savePlanProperties = function() {
            $scope.savePlan();
            $scope.pp_edit = {};
        };
	}
]);
