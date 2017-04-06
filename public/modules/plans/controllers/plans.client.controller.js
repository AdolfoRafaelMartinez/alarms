/* global angular, $upload, _ */
'use strict'

angular.module('plans')
	.controller('PlansController', [
		'$scope', '$rootScope', '$state', '$stateParams', '$location', 'Authentication', 'Drawing', '$timeout', '$http', 'Projects', 'Plans', 'Buildings', 'contextMenu', '$q', 'ModalService',
		function ($scope, $rootScope, $state, $stateParams, $location, Authentication, Drawing, $timeout, $http, Projects, Plans, Buildings, contextMenu, $q, ModalService) {
			$scope.authentication = Authentication

			$scope.UNITS_STEP_FEET = 8
			$scope.UNITS_STEP_METERS = 3
			$scope.UNITS_MIN_METERS = 3
			$scope.UNITS_MIN_FEET = Number.parseFloat((Math.round($scope.UNITS_MIN_METERS * 3.28084 * 100) / 100).toFixed(0))
			$scope.UNITS_MAX_METERS = 30
			$scope.UNITS_MAX_FEET = Number.parseFloat((Math.round($scope.UNITS_MAX_METERS * 3.28084 * 100) / 100).toFixed(0))

			var iconset = {
				save: 'save',
				done: 'done',
				loading: 'loop',
				pan: 'open_with',
				ap: 'room',
				wall: 'office'
			}

			$scope.icons = {
				loading: iconset.loading,
				save: iconset.save,
				pan: iconset.pan,
				ap: iconset.ap,
				wall: iconset.wall
			}

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
			}

			$scope.selected = {}
			$scope.state = {}

			$scope.menu = {
				mode: 'plan'
			}
			Drawing.setupMenu($scope.menu)

			$scope.closeMenu = function () {
				contextMenu.close()
				delete $scope.ap
				Drawing.unselectAP()
				$scope.menu.mode = 'plan'
			}

			$scope.planProperties = function () {
				$scope.menu.mode = 'plan'
			}

			$scope.selectWallType = function () {
				Drawing.selectWallType($scope.wall_types[$scope.wall_type])
			}
			$scope.wall_type = 'DW'
			$scope.selectWallType()

			$scope.deleteAP = function () {
				Drawing.deleteSelectedAP()
				$scope.closeMenu()
			}

			$scope.getCurrentAP = function () {
				$scope.ap = Drawing.getCurrentAP()
				console.log('current AP', $scope.ap)
				if ($scope.ap) $scope.menu.mode = 'ap'
			}

			$scope.deleteWall = function () {
				Drawing.deleteSelectedWall()
			}

			$scope.startCalibration = function () {
				Drawing.startCalibration(function () {
					$scope.calibration_done = true
					$scope.$digest()
				})
				$scope.calibration_step = true
				Drawing.toggleOverlaps('off')
				Drawing.toggleRadius('off')
				Drawing.toggleDistances('off')
			}

			$scope.completeCalibration = function (cancel) {
				Drawing.completeCalibration($scope.calibration_distance, cancel)
				$scope.calibration_done = false
				$scope.calibration_step = false
				Drawing.toggleOverlaps($scope.settings.show_overlaps ? 'on' : 'off')
				Drawing.toggleRadius($scope.settings.show_heatmap ? 'off' : 'on')
				Drawing.toggleDistances($scope.settings.show_distances ? 'on' : 'off')
			}

			$scope.changeUnits = function () {
				alert('feature not available in Beta')
				console.log('changeUnits', $scope.settings)
			}

			$scope.updateScale = function () {
				Drawing.scale($scope.settings.scale)
			}

			$scope.toggleDistances = function () {
				Drawing.toggleDistances($scope.settings.show_distances ? 'on' : 'off')
				$scope.settings.show_heatmap = false
				Drawing.heatmap('off')
			}

			$scope.toggleOverlaps = function () {
				Drawing.toggleOverlaps($scope.settings.show_overlaps ? 'on' : 'off')
				$scope.settings.show_heatmap = false
				Drawing.heatmap('off')
				Drawing.toggleRadius('on')
			}

			$scope.toggleHeatmap = function () {
				if ($scope.settings.show_distances) {
					$scope.settings.show_distances = false
					Drawing.toggleDistances('off')
				}
				if ($scope.settings.show_overlaps) {
					$scope.settings.show_overlaps = false
					Drawing.toggleOverlaps('off')
				}
				if (!$scope.settings.show_heatmap) {
					Drawing.heatmap('off')
					$scope.settings.show_overlaps = true
					$scope.settings.show_distances = true
					Drawing.toggleOverlaps()
					Drawing.toggleDistances()
					Drawing.toggleRadius()
				} else {
					Drawing.toggleRadius()
					Drawing.heatmap()
				}
			}

			$scope.updateSignalStrength = function () {
				if ($scope.settings.units === 'ft') {
					$scope.settings.signal_radius_meters = Number.parseFloat((Math.round($scope.settings.signal_radius_feet / 3.28084 * 100) / 100).toFixed(0))
				} else {
					$scope.settings.signal_radius_feet = Number.parseFloat((Math.round($scope.settings.signal_radius_meters * 3.28084 * 100) / 100).toFixed(0))
				}
				$scope.settings.signal_radius = ($scope.settings.units === 'ft') ? $scope.settings.signal_radius_feet : $scope.settings.signal_radius_meters
				Drawing.updateSignalStrength($scope.settings.signal_radius)
			}

			$scope.onFileSelect = function (image) {
				$scope.uploadInProgress = true
				$scope.uploadProgress = 0

				if (angular.isArray(image)) {
					image = image[0]
				}

				$scope.upload = $upload.upload({
					url: '/upload',
					method: 'POST',
					data: {
						type: 'floorplan'
					},
					file: image
				}).progress(function (event) {
					$scope.uploadProgress = Math.floor(event.loaded / event.total)
					$scope.$apply()
					console.log($scope.uploadProgress)
				}).success(function (data, status, headers, config) {
					console.log('Photo uploaded!')
				}).error(function (err) {
					$scope.uploadInProgress = false
					console.log('Error uploading file: ' + err.message || err)
				})
			}

			$scope.getTotalAPs = function () {
				return Drawing.getTotalAPs()
			}

			$scope.togglePlanProperties = function () {
				contextMenu.close()
				$scope.plan_properties = !$scope.plan_properties
			}

			$scope.savePlan = function () {
				var overlaps = $scope.settings.show_overlaps
				var distances = $scope.settings.show_distances
				var deferred = $q.defer()
				var plan = new Plans(_.cloneDeep($scope.plan))
				plan.thumb = Drawing.getThumb()

				Drawing.toggleOverlaps('off')
				Drawing.toggleDistances('off')
				Drawing.toggleRadius('off')
				Drawing.centerStage()

				plan.print = Drawing.getPNG()

				$scope.settings.show_overlaps = overlaps
				$scope.settings.show_distances = distances
				if (overlaps) Drawing.toggleOverlaps('on')
				if (distances) Drawing.toggleDistances('on')
				Drawing.toggleRadius('on')

				plan.title = $scope.flooplan_name
				plan.stage = Drawing.toJSON()
				plan.settings = $scope.settings
				/* TODO: update plan titles in building */

				if (!plan._id) {
					plan.$save(response => {
						$scope.plan = response
						$location.path(`projects/${$scope.bldg._id}/${response._id}`)
						deferred.resolve(response)
					}, errorResponse => {
						$scope.error = errorResponse.data.message
						deferred.reject(errorResponse)
					})
				} else {
					$scope.icons.save = iconset.loading
					plan.$update(response => {
						$scope.icons.save = iconset.done
						$scope.plan = response
						let index = _.findIndex($scope.plans, p => p._id === response._id)
						$scope.plans[index] = response
						$timeout(() => {
							$scope.icons.save = iconset.save
						}, 3000)
						deferred.resolve(response)
					}, errorResponse => {
						$scope.error = errorResponse.data.message
						deferred.reject(errorResponse)
					})
				}

				return deferred.promise
			}

			$scope.new = {}
			$scope.showCreate = (item) => {
				if (!$scope.new[item]) {
					$scope.new[item] = {}
					$scope.selected[item] = null
				}
			}

			$scope.cancelCreate = ($event, item) => {
				$scope.new[item] = null
				$event.stopPropagation()
			}

			$scope.toggleOrphans = function () {
				if (!$scope.show_orphans) {
					$scope.find(true)
				}
				$scope.show_orphans = !$scope.show_orphans
			}

			function addProject (resource) {
				$scope.projects.push(resource)
				$scope.selected.project = resource
				$scope.new.site = { created: new Date() }
			}

			function handleError (error) {
				$scope.error = error.data.message
			}

			$scope.sort = {
				projects: 'title',
				sites: 'title',
				buildings: 'title'
			}

			$scope.selected = {}

			$scope.create = ($event, item) => {
				switch (item) {
					case 'project':
						if (!$scope.new.project.title) break
						var p = new Projects($scope.new.project)
						p.$save(addProject, handleError)
						$scope.sort.projects = '-created'
						break

					case 'site':
						if (!$scope.new.site.name) break
						$scope.selected.site = {
							created: new Date(),
							name: $scope.new.site.name,
							buildings: [],
							new: true
						}
						$scope.selected.project.sites.push($scope.selected.site)
						$scope.sort.sites = '-created'
						$scope.new.building = { created: new Date() }
						$scope.selected.project.$update(project => {
							$scope.selected.site = _.find(project.sites, s => s.new)
							delete $scope.selected.site.new
							updateProject()
						})
						break

					case 'building':
						if (!$scope.new.building.name) break
						$scope.selected.building = {
							created: new Date(),
							name: $scope.new.building.name,
							new: true
						}
						$scope.selected.site.buildings.push($scope.selected.building)
						$scope.sort.buildings = '-created'
						var siteId = $scope.selected.site._id
						$scope.selected.project.$update(project => {
							$scope.selected.site = _.find(project.sites, s => s._id === siteId)
							$scope.selected.building = _.find($scope.selected.site.buildings, b => b.new)
							delete $scope.selected.building.new
							updateProject()
						})
						break
				}
				$scope.new[item] = null
				$event.stopPropagation()
			}

			var planSkeleton = {
				title: 'Untitled',
				created: new Date(),
				details: {
					contacts: [],
					stage: {
						aps: []
					},
					lic: {
						ap: {
							spares: 0
						}
					}
				},
				settings: {
					signal_radius_meters: 10,
					signal_radius_feet: 32,
					scale: 29,
					show_heatmap: false,
					show_overlaps: true,
					show_distances: true,
					signal_radius: 32,
					units: 'ft'
				},
				stage: {
					walls: [],
					aps: [],
					floorplan: '',
					plan: {}
				}
			}

			$scope.newPlan = function () {
				$scope.flooplan_name = ''
				var details = _.clone($scope.plan.details)
				$scope.plan = new Plans(planSkeleton)
				$scope.plan.details = details
				$scope.plan.$save(response => {
					$scope.plan = response
					$scope.plan.title = 'Untitled'
					$scope.building.plans.push({_id: $scope.plan._id, title: $scope.plan.title})
					$scope.project.$update(response => {
						$scope.project = response
					})
					$scope.plans.push($scope.plan)
					$scope.settings = {
						units: 'ft',
						signal_radius: 25,
						show_distances: true,
						show_overlaps: true,
						show_heatmap: false,
						scale: 100
					}

					if ($scope.settings.units === 'ft') $scope.settings.signal_radius_feet = $scope.settings.signal_radius
					if ($scope.settings.units === 'm') $scope.settings.signal_radius_meters = $scope.settings.signal_radius

					Drawing.initBoard($scope.settings.signal_radius)
					Drawing.scale(100)
					$scope.updateSignalStrength()
					$scope.planReady = true
					$scope.bldg = $stateParams.bldgId
				})
			}

			$scope.createPlanAndLoad = function (building) {
				var plan = new Plans(planSkeleton)
				var promises = []
				plan.$save(response => {
					plan.stage._id = response._id
					promises.push(plan.$update())
					if (building) {
						if (!building.plans) building.plans = []
						building.plans.push({
							_id: response._id
						})
						delete building.new
						promises.push($scope.selected.project.$update())
					}
					$q.all(promises).then(() => {
						$location.path(`building/${building._id}`)
					})
				}, errorResponse => {
					$scope.error = errorResponse.data.message
				})
			}

			$scope.remove = function (plan) {
				if (plan) {
					plan.$remove()

					for (var i in $scope.plans) {
						if ($scope.plans[i] === plan) {
							$scope.plans.splice(i, 1)
						}
					}
				} else {
					$scope.plan.$remove(function () {
						$location.path('projects')
					})
				}
			}

			$scope.update = function () {
				var plan = $scope.plan

				plan.$update(function () {
					$location.path(`building/${$scope.bldg._id}/${plan._id}`)
				}, function (errorResponse) {
					$scope.error = errorResponse.data.message
				})
			}

			$scope.updateControls = function (key, val) {
				if ($scope.$$phase) {
					$scope.settings[key] = val
				} else {
					$scope.$apply(function () {
						$scope.settings[key] = val
					})
				}
			}

			$scope.find = function (orphans) {
				$scope.plans = orphans ? Plans.orphans() : Plans.query({search: $scope.search})
			}

			$scope.findProjects = function () {
				$scope.projects = Projects.query({search: $scope.search})
			}

			$scope.findOneProject = function () {
				$scope.project = Projects.get({
					projectId: $stateParams.planId
				}, function () {
					console.log('project loaded')
				})
			}

			$scope.showSettings = function (item) {
				ModalService.showModal({
					templateUrl: 'settingsModal.html',
					controller: 'settingsModalController',
					inputs: { item: item }
				})
					.then(function (modal) {
						modal.element.modal()
						modal.close.then(function (save) {
							if (save) {
								console.log('SAVE')
							}
						})
					})
			}

			$scope.showBuilding = (building) => {
				if (!building.plans) $scope.createPlanAndLoad($scope.selected.building)
				else $location.path(`building/${building._id}`)
			}

			$scope.gotoPlan = (plan) => {
				$location.path(`plans/${plan._id}`)
			}

			$scope.showPlan = (plan) => {
				$scope.plan = plan
				$scope.settings = plan.settings
				$scope.flooplan_name = plan.title
				if (typeof plan.details !== 'object') plan.details = {}
				if (!plan.details.contacts) plan.details.contacts = []
				Drawing.loadPlan(plan._id, plan.stage, $scope.settings.signal_radius, $scope.updateControls)
				$timeout(() => {
					$scope.settings.show_heatmap = false
					Drawing.heatmap('off')
					$scope.settings.show_overlaps = true
					Drawing.toggleOverlaps('on')
					$scope.settings.show_distances = true
					Drawing.toggleDistances('on')
					Drawing.toggleRadius('on')
					$scope.planReady = true
				}, 100)
			}

			function initFloor (bplan) {
				$scope.plans.push(Plans.get({planId: bplan._id}, plan => {
					plan.stage.floorplan = plan.stage.floorplan.replace('http://pj.signalforest.com', '')
					_.set(plan, 'details.project', $scope.project.title)
					_.set(plan, 'details.site', $scope.site.name)
					_.set(plan, 'details.building', $scope.building.name)
					if (!$scope.settings) $scope.showPlan(plan)
				}))
			}

			$scope.getFloorCount = project => {
				if (!_.get(project, 'sites')) return 0
				return _.reduce(project.sites, (count, site) => {
					if (!_.get(site, 'buildings')) return 0
					return count + _.reduce(site.buildings, (count, bldg) => {
						return count + _.size(bldg.plans)
					}, 0)
				}, 0)
			}

			$scope.getBuildingCount = project => {
				if (!_.get(project, 'sites')) return 0
				return _.reduce(project.sites, (count, site) => {
					return count + _.size(site.buildings)
				}, 0)
			}

			$scope.getBuilding = () => {
				if ($stateParams.planID) {
					$scope.plan = Plans.get({planId: $stateParams.planID}, function () {
						$scope.plans = []
						initFloor($scope.plan)
					})
				} else {
					$scope.project = Projects.getByBuilding({
						buildingId: $stateParams.bldgID
					}, function () {
						var building
						_.each($scope.project.sites, s => {
							building = _.find(s.buildings, b => b._id === $stateParams.bldgID)
							if (building) {
								$scope.building = building
								$scope.site = s
							}
						})
						$scope.plans = []
						_.each($scope.building.plans, initFloor)
					})
				}
			}

			$scope.selectTool = function (mode) {
				$scope.mouse_mode = mode
				Drawing.selectTool(mode)
			}

			var newContact = {}
			$scope.addContact = function () {
				$scope.pp_edit.contacts = true
				newContact = {}
				$scope.edit_prop = newContact
			}

			$scope.saveContact = function () {
				if (!$scope.plan.details.contacts) $scope.plan.details.contacts = []
				if (newContact.name) {
					$scope.plan.details.contacts.push(_.clone(newContact))
					newContact = {}
				}
				$scope.savePlanProperties()
			}

			$scope.removeContact = function (index) {
				$scope.plan.details.contacts.splice(index, 1)
				$scope.savePlan()
			}

			$scope.addController = function () {
				$scope.pp_edit.controllers = true
				var newController = {
					lic: {
						ap: {}
					}
				}
				$scope.edit_prop = newController
				if (!$scope.plan.details.controllers) $scope.plan.details.controllers = []
				$scope.plan.details.controllers.push(newController)
			}

			$scope.checkController = function () {
				if (!$scope.plan.details.controllers) {
					$scope.addController()
				} else {
					$scope.savePlanProperties()
				}
			}

			$scope.removeController = function (index) {
				$scope.plan.details.controllers.splice(index, 1)
				$scope.savePlan()
			}

			$scope.pp_edit = {}
			$scope.toggleEdit = function (prop, obj) {
				$scope.pp_edit[prop] = !$scope.pp_edit[prop]
				if (obj) $scope.edit_prop = obj
			}

			$scope.updateLicenses = function () {
				$scope.plan.details.controllers[0].lic.ap.qty = $scope.plan.stage.aps.length
			}

			$scope.savePlanProperties = function () {
				var details = _.omit($scope.plan.details, ['controllers', 'ctrlPresent', 'lic', 'stage'])
				_.each($scope.plans, plan => {
					_.each(details, (obj, key) => {
						plan.details[key] = obj
					})
					plan.$update() // save plans in the same building
				})

				/* TODO: add unique designers to project / site / building */
				$scope.project.details  = _.omit(details, ['project', 'site', 'building', 'address', 'city', 'state', 'zipcode', 'contacts'])
				$scope.site.details     = _.omit(details, ['site', 'building', 'contacts'])
				$scope.building.details = details

				$scope.project.$update(project => {
					$scope.project = project
				})
				$scope.savePlan() // save current plan
				$scope.pp_edit = {}
			}

			$scope.askDeleteFloorplan = function (plan) {
				ModalService.showModal({
					templateUrl: 'deleteModal.html',
					controller: 'deleteModalController',
					inputs: { item: `plan: ${plan.title || 'Floor ' + plan.floor}` }
				})
					.then(function (modal) {
						modal.element.modal()
						modal.close.then(function (answer) {
							if (answer) {
								_.each($scope.project.sites, site => {
									_.each(site.buildings, bldg => {
										_.remove(bldg.plans, p => p._id === plan._id)
									})
								})
								_.remove($scope.plans, p => p._id === plan._id)
								plan.$delete()
								$scope.project.$update(project => {
									$scope.project = project
								})
							}
						})
					})
			}

			$scope.askDeleteProject = function (project) {
				ModalService.showModal({
					templateUrl: 'deleteModal.html',
					controller: 'deleteModalController',
					inputs: { item: `project: ${project.title}` }
				})
					.then(function (modal) {
						modal.element.modal()
						modal.close.then(function (answer) {
							if (answer) {
								$scope.new = {}
								$scope.selected = {}
								project.$delete().then($scope.findProjects)
							}
						})
					})
			}

			$scope.askDeleteSite = function (site) {
				ModalService.showModal({
					templateUrl: 'deleteModal.html',
					controller: 'deleteModalController',
					inputs: { item: `site: ${site.name}` }
				})
					.then(function (modal) {
						modal.element.modal()
						modal.close.then(function (answer) {
							if (answer) {
								$scope.new = {}
								delete $scope.selected.site
								delete $scope.selected.building
								_.remove($scope.selected.project.sites, s => s._id === site._id)
								$scope.selected.project.$update()
							}
						})
					})
			}

			$scope.askDeleteBuilding = function (building, $event) {
				$event.stopPropagation()
				ModalService.showModal({
					templateUrl: 'deleteModal.html',
					controller: 'deleteModalController',
					inputs: { item: `building: ${building.name}` }
				})
					.then(function (modal) {
						modal.element.modal()
						modal.close.then(function (answer) {
							if (answer) {
								$scope.new = {}
								var b = new Buildings(building)
								b.$delete().then(() => {
									delete $scope.selected.building
									_.remove($scope.selected.site.buildings, s => s._id === building._id)
								})
							}
						})
					})
			}

			$scope.selectProject = project => {
				$scope.selected = {project: project}
			}

			$scope.selectSite = site => {
				$scope.selected.site = site
				delete $scope.selected.building
			}

			$scope.report = function () {
				$scope.savePlan().then(() => {
					if ($scope.settings.show_heatmap) {
						$scope.settings.show_heatmap = false
						$scope.toggleHeatmap()
					}
					$timeout(() => {
						window.open(`/buildings/${$scope.building._id}/pdf`, '_blank')
					}, 0)
				})
			}

			function updateProject () {
				$scope.selected.project.$update(project => {
					$scope.selected.site = _.find(project.sites, s => s._id === $scope.selected.site._id)
					$scope.selected.building = _.find($scope.selected.site.buildings, b => b._id === $scope.selected.building._id)
				})
			}

			$scope.onOrphanDrop = function (event, ui) {
				var plan = ui.draggable.scope().plan
				var bldg = $(event.target).scope().bldg
				if (!bldg.plans) bldg.plans = []
				bldg.plans.push({_id: plan._id, floor: plan.title})
				_.remove($scope.plans, p => p._id === plan._id)
				plan.building = bldg._id
				updateProject()
				plan.$update()
			}
		}
	])
