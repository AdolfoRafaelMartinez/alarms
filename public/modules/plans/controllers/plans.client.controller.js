/* global angular, $upload, _ */

/* eslint quotes: 0 */
/* eslint semi: 0 */
/* eslint no-var: 0 */
/* eslint camelcase: 0 */
/* eslint brace-style: 0 */
/* eslint curly: 0 */
/* eslint arrow-parens: 0 */
/* eslint no-multi-spaces: 0 */

'use strict'

angular.module('plans')
  .controller('PlansController', [
    '$scope', '$rootScope', '$state', '$stateParams', '$location', 'Authentication', 'Drawing', '$timeout', '$http', 'Projects', 'Plans', 'Buildings', 'Signal', 'contextMenu', '$q', 'ModalService', 'Controllers',
    function ($scope, $rootScope, $state, $stateParams, $location, Authentication, Drawing, $timeout, $http, Projects, Plans, Buildings, Signal, contextMenu, $q, ModalService, Controllers) {
      const AP_NODE_TYPE  = 0;
      const AM_NODE_TYPE  = 1;
      const IDF_NODE_TYPE = 2;
      $scope.isActive = [];
      $scope.isActive[AP_NODE_TYPE]  = true;
      $scope.isActive[AM_NODE_TYPE]  = true;
      $scope.isActive[IDF_NODE_TYPE] = true;

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

      $scope.sma = {
        details: true,
        plan: true,
        tools: true,
        reporting: true
      }

      $scope.closeMenu = function () {
        contextMenu.close()
        delete $scope.selectedItem
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

      $scope.deleteSelectedItem = function () {
        Drawing.deleteSelectedItem()
        $scope.closeMenu()
      }

      $scope.getCurrentAP = function () {
        $scope.selectedItem = Drawing.getCurrentItem()
        $scope.menu.mode = $scope.selectedItem ? $scope.selectedItem.itemType : 'plan'
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

      $scope.browseUpload = function() {
        $("#fileupload input").click()
      }

      $scope.uploadProgress = function(percentDone, floorplan) {
        if ($scope.$$phase) {
          updateProgress(percentDone, floorplan)
        } else {
          $scope.$apply(function () {
            updateProgress(percentDone, floorplan)
          })
        }
        function updateProgress(percent, floorplan) {
          $scope.percentDone = percentDone / 2
          if (floorplan) {
            $scope.plan.stage.floorplan = floorplan
          }
        }
      }

      $scope.getTotalAPs = function () {
        return Drawing.getItemCount('ap')
      }

      $scope.getTotalAMs = function () {
        return Drawing.getItemCount('am')
      }

      $scope.getTotalIDFs = function () {
        return Drawing.getItemCount('idf')
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
        $scope.planReady = false;
        plan.thumb = Drawing.getThumb()
        console.log('savePlan current', plan)

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
            $scope.planReady = true;
          }, errorResponse => {
            $scope.error = errorResponse.data.message
            $scope.planReady = true;
            deferred.reject(errorResponse)
          })
        } else {
          $scope.icons.save = iconset.loading
          plan.$update(response => {
            $scope.icons.save = iconset.done
            $scope.plan = response
            let index = _.findIndex($scope.plans, p => p._id === response._id)
            $scope.plans[index] = response
            $scope.planReady = true;
            $timeout(() => {
              $scope.icons.save = iconset.save
            }, 3000)
            deferred.resolve(response)
          }, errorResponse => {
            console.log(errorResponse)
            $scope.error = errorResponse.data.message
            $scope.planReady = true;
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
        $event.stopPropagation()
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
            updateProject()
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
            updateProject()
            break
        }
        $scope.new[item] = null
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
          $scope.building.plans.push({ _id: $scope.plan._id, title: $scope.plan.title })
          var b = new Buildings($scope.building)
          b.$update()
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
        if (!building) {
          console.log("No building provided")
          return
        }
        var plan = new Plans(planSkeleton)
        var project = $scope.selected.project
        var site = _.find(project.sites, s => s._id === $scope.selected.site._id)
        var bldg = _.find(site.buildings, b => b._id === building._id)
        _.set(plan, 'details.project', project.title)
        _.set(plan, 'details.site', site.name)
        _.set(plan, 'details.building', bldg.name)
        _.set(plan, 'details.client', project.details.client)
        _.set(plan, 'details.contacts', _.get(bldg, 'details.contacts'))
        _.set(plan, 'details.vendor', _.get(bldg, 'details.inventory.vendor'))
        _.each(plan.stage.items, ap => {
          if (['ap', 'am', undefined].includes(ap.itemType)) {
            _.set(ap, 'inventory.vendor', _.get(bldg, 'details.inventory.vendor'))
            _.set(ap, 'inventory.sku', _.get(bldg, 'details.inventory.aps'))
          }
        })

        plan.$save(response => {
          if (!bldg.plans) bldg.plans = []
          bldg.plans.push({
            _id: response._id
          })
          updateProject().then(() => {
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
        $scope.settings[key] = val
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

      $scope.showSettings = function (type, item, $event) {
        $event.stopPropagation()
        switch (type) {
          case 'project':
            $scope.selectProject(item)
            break

          case 'site':
            item = $scope.selectSite(item)
            break

          case 'bldg':
            item = $scope.selectBuilding(item)
            break
        }
        ModalService.showModal({
          templateUrl: 'modules/plans/views/settings.modal.html',
          controller: 'settingsModalController',
          inputs: { item: item, type: type }
        })
          .then(function (modal) {
            modal.element.modal()
            modal.element.on('hidden.bs.modal', () => {
              if (type === 'site') {
                _.each($scope.selected.project.sites, (s, i) => {
                  if (s._id === item._id) $scope.selected.project.sites[i] = modal.scope.getItem()
                })
              } else if (type === 'building') {
                _.each($scope.selected.site.buildings, (b, i) => {
                  if (b._id === item._id) $scope.selected.site.buildings[i] = modal.scope.getItem()
                })
              }
              updateProject()
            })
          })
      }

      $scope.showBuilding = (building) => {
        if (!building.plans) $scope.createPlanAndLoad(building)
        else $location.path(`building/${building._id}`)
      }

      $scope.gotoPlan = (plan) => {
        $location.path(`plans/${plan._id}`)
      }

      function updateWifiDetails (plan) {
        if (plan.details.controller) {
          if (!_.get(plan, 'details.controllers[0]')) $scope.addController(false, plan)
          plan.details.controllers[0].country = plan.details.country
          plan.details.controllers[0].sku = plan.details.controller
        }
        if (!plan.stage.items) plan.stage.items = plan.stage.aps
        _.each(plan.stage.items, item => {
          if (!item.sku) {
            if (item.itemType === 'ap') item.sku = plan.details.aps
            if (item.itemType === 'am') item.sku = plan.details.ams
            item.vendor = plan.details.vendor
          }
        })
      }

      $scope.checkSaveCurrent = function() {
        if (!$scope.dirty) return $q.when()
        return ModalService.showModal({
          templateUrl: 'saveModal.html',
          controller: 'deleteModalController',
          inputs: { item: 1 }
        })
          .then(function (modal) {
            modal.element.modal()
            return modal.close.then(answer => {
              if (answer) {
                return $scope.savePlan()
              }
              return $q.when()
            })
              .then(() => {
                $scope.dirty = false
              })
          })
      }

      $scope.setDirty = () => {
        $scope.dirty = true
      }

      $scope.showPlan = (plan) => {
        $scope.checkSaveCurrent()
          .then(() => {
            $scope.plan = plan
            $scope.settings = plan.settings
            $scope.flooplan_name = plan.title
            if (typeof plan.details !== 'object') plan.details = {}
            if (!plan.details.contacts) plan.details.contacts = []
            updateWifiDetails(plan)
            Drawing.loadPlan(plan, $scope.settings.signal_radius, $scope.updateControls, $scope.uploadProgress, $scope.setDirty)
            $timeout(() => {
              $scope.settings.show_heatmap = false
              Drawing.heatmap('off')
              $scope.settings.show_overlaps = true
              Drawing.toggleOverlaps('on')
              $scope.settings.show_distances = true
              Drawing.toggleDistances('on')
              Drawing.toggleRadius('on')
              $scope.planReady = true
              if ($scope.percentDone === 1) $scope.percentDone = 0
            }, 0)
          })
      }

      function initFloor (bplan) {
        $scope.plans.push(Plans.get({planId: bplan._id}, plan => {
          plan.stage.floorplan = plan.stage.floorplan.replace('http://pj.signalforest.com', '')
          _.set(plan, 'details.project', $scope.project.title)
          _.set(plan, 'details.site', $scope.site.name)
          _.set(plan, 'details.building', $scope.building.name)
          _.set(plan, 'details.contacts', _.get($scope.building, 'details.contacts'))
          updateWifiDetails(plan)
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
        $scope.percentDone = 1
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

      $scope.mouse_mode = 'ap'
      $scope.selectTool = function (mode) {
        $scope.isActive[AP_NODE_TYPE]  = true;
        $scope.isActive[AM_NODE_TYPE]  = true;
        $scope.isActive[IDF_NODE_TYPE] = true;
        var view_code = 7
        Drawing.selectView(view_code);
        $scope.mouse_mode = mode
        Drawing.selectTool(mode)
      }  

      $scope.selectView = function (view_node_type) {
        switch(view_node_type) {
          case 'ap':
            $scope.isActive[AP_NODE_TYPE]  = !$scope.isActive[AP_NODE_TYPE];
            break;
          case 'am':
            $scope.isActive[AM_NODE_TYPE]  = !$scope.isActive[AM_NODE_TYPE];
            break;
          case 'idf':
            $scope.isActive[IDF_NODE_TYPE] = !$scope.isActive[IDF_NODE_TYPE];
            break;
        }
        var view_code = 0; 
        for(var i = 0; i < 3; i++){
          var bit = $scope.isActive[i] ? 1 : 0;
          view_code = view_code + bit * Math.pow(2, i);
        }
        Drawing.selectView(view_code); 
      }

      var newContact = {}
      $scope.addContact = function () {
        $scope.pp_edit.contacts = true
        newContact = {}
        $scope.edit_prop = newContact
      }

      /* Only called from the plan view */
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
        $scope.savePlanProperties()
      }

      $scope.addController = function (edit, plan) {
        if (!plan) plan = $scope.plan
        if (edit) $scope.pp_edit.controllers = true
        var newController = {
          lic: {
            ap: {}
          },
          country: plan.details.country,
          sku: plan.details.controller
        }
        $scope.edit_prop = newController
        if (!plan.details.controllers) plan.details.controllers = []
        plan.details.controllers.push(newController)
        plan.details.controllers = _.filter(plan.details.controllers)
      }

      $scope.checkController = function () {
        if (!$scope.plan.details.controllers) {
          $scope.addController(true)
        } else {
          $scope.savePlanProperties()
        }
      }

      $scope.removeController = function (index) {
        $scope.plan.details.controllers.splice(index, 1)
        $scope.savePlanProperties()
      }

      $scope.pp_edit = {}
      $scope.toggleEdit = function (prop, obj) {
        $scope.pp_edit[prop] = !$scope.pp_edit[prop]
        if (obj) $scope.edit_prop = obj
      }

      $scope.updateLicenses = function () {
        $scope.plan.details.controllers[0].lic.ap.qty = $scope.plan.stage.items ? _.filter($scope.plan.stage.items, i => i.itemType === 'ap').length : 0
      }

      $scope.toggleMDF = function () {
        Drawing.setupIDF($scope.selectedItem)
      }

      $scope.saveSelectedItem = function () {
        $scope.closeMenu()
      }

      $scope.savePlanProperties = function () {
        var details = _.omit($scope.plan.details, ['controllers', 'ctrlPresent', 'lic', 'stage'])
        _.each($scope.plans, plan => {
          _.each(details, (obj, key) => {
            plan.details[key] = obj
          })
          console.log('save plan properties', plan.details, plan.stage)
          plan.$update() // save plans in the same building
        })

        /* TODO: add unique designers to project / site / building */
        $scope.project.details  = _.defaults($scope.project.details, _.omit(details, ['project', 'site', 'building', 'address', 'city', 'state', 'zipcode', 'contacts']))
        $scope.site.details     = _.defaults($scope.site.details, _.omit(details, ['site', 'building', 'contacts']))
        $scope.building.details = _.defaults($scope.building.details, details)
        var b = new Buildings($scope.building)
        b.$update()

        // $scope.savePlan() // save current plan
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
                updateProject()
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
                updateProject()
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
        $scope.sort.sites = 'name'
      }

      $scope.selectSite = site => {
        $scope.selected.site = _.find($scope.selected.project.sites, s => s._id === site._id)
        $scope.sort.buildings = 'name'
        delete $scope.selected.building
        return $scope.selected.site
      }

      $scope.selectBuilding = bldg => {
        $scope.selected.building = _.find(_.get($scope.selected, 'site.buildings'), b => b._id === bldg._id)
        return $scope.selected.building
      }

      $scope.report = function () {
        if (!_.get($scope.building, 'details.client.name') ||
          !_.get($scope.building, 'details.msp.name') ||
          !_.get($scope.building, 'details.inventory.vendor') ||
          !_.get($scope.building, 'details.address') ||
          !_.get($scope.building, 'details.city')) {

          /* TODO: modal not showing, probably because of a different scope
                console.log('showing modal')
                ModalService.showModal({
                    templateUrl: 'infoModal.html',
                    controller: 'infoModalController',
                    inputs: { info: 'Please fill out all the details of the building (client, MSP, address, vendor, etc' }
                })
                */
          alert('Please fill out all the details of the building (client, MSP, address, vendor, etc')
        } else {
          $scope.savePlan().then(() => {
            if ($scope.settings.show_heatmap) {
              $scope.settings.show_heatmap = false
              $scope.toggleHeatmap()
            }
            $timeout(() => {
              window.open(`/buildings/${$scope.building._id}/pdf`, '_blank')
            }, 1000)
          })
        }
      }

      function render3d(signal) {
        var container, stats;
        var camera, scene, renderer, particles, geometry, materials = [], parameters, i, h, color, size;
        var mouseX = 0, mouseY = 0;

        let drawing = document.getElementsByClassName('drawing')[0]
        var windowHalfX = drawing.clientWidth / 2;
        var windowHalfY = drawing.clientHeight / 2;

        init();
        animate();

        function init() {
          container = document.createElement( 'div' );
          container.style.position = 'absolute'
          container.style.top = 0
          container.style.left = 0
          container.style.right = 0
          container.style.zIndex = 4
          container.width = drawing.clientWidth
          container.height = drawing.clientHeight
          container.style.width = drawing.clientWidth
          container.style.height = drawing.clientHeight
          drawing.appendChild( container );

          camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 3000 );
          camera.position.z = 1000;
          scene = new THREE.Scene();
          // scene.fog = new THREE.FogExp2( 0x000000, 0.0007 );

          let group = new THREE.Group()
          scene.add( group )

          var grid = new THREE.Points( new THREE.PlaneBufferGeometry( 15000, 15000, 64, 64 ), new THREE.PointsMaterial( { color: 0xff0000, size: 10 } ) );
          grid.position.y = -400;
          grid.rotation.x = - Math.PI / 2;
          group.add( grid );

          geometry = new THREE.Geometry();
          for ( i = 0; i < signal.blocks.length; i ++ ) {
            var block = signal.blocks[i]
            var vertex = new THREE.Vector3()
            vertex.x = 4*block[0] - 1600
            vertex.z = 4*block[1] - 1200
            vertex.y = -390
            geometry.vertices.push( vertex );
          }
          parameters = [
            [ [1, 1, 0.5], 5 ]
          ];
          for ( i = 0; i < parameters.length; i ++ ) {
            color = parameters[i][0];
            size  = parameters[i][1];
            materials[i] = new THREE.PointsMaterial( { size: size } );
            particles = new THREE.Points( geometry, materials[i] );
            scene.add( particles );
          }
          renderer = new THREE.WebGLRenderer();
          renderer.setPixelRatio( window.devicePixelRatio );
          renderer.setSize( container.width, container.height );
          renderer.domElement.style.margin = 0
          container.appendChild( renderer.domElement );
          renderer.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
          renderer.domElement.addEventListener( 'mousewheel', onDocumentMouseWheel, false );
        }

        function animate() {
          requestAnimationFrame( animate );
          render();
        }

        function render() {
          var time = Date.now() * 0.00005;
          camera.position.x += ( mouseX - camera.position.x ) * 0.05;
          camera.position.y += ( - mouseY - camera.position.y ) * 0.05;
          camera.lookAt( scene.position );
          /*
           for ( i = 0; i < scene.children.length; i ++ ) {
            var object = scene.children[ i ];
            if ( object instanceof THREE.Points ) {
              object.rotation.y = time * ( i < 4 ? i + 1 : - ( i + 1 ) );
            }
          } */
          renderer.render( scene, camera );
        }

        function onDocumentMouseMove( event ) {
          mouseX = event.clientX - windowHalfX;
          mouseY = event.clientY - windowHalfY;
        }

        function onDocumentMouseWheel( e ) {
          e.preventDefault()
          e.stopPropagation()
          let delta = (e.wheelDelta || -e.detail) * 10
          camera.position.z += delta
        }
      }

      $scope.signal = function () {
        $scope.plan.$signal()
          .then(() => {
            return Signal.get({planId: $scope.plan._id}).$promise
          })
          .then(render3d)
      }

      $scope.getControllers = search => Controllers.query({search: search}).$promise

      function updateProject () {
        var deferred = $q.defer()
        if ($scope.selected && $scope.selected.project) $scope.selected.project.$update(refreshProject)
        else $scope.project.$update(refreshProject)

        function refreshProject(project) {
          var newsite = _.get(project, 'details.newsite') || _.get($scope.selected, 'site._id')
          var newbldg = _.get(project, 'details.newbldg') || _.get($scope.selected, 'building._id')
          if (_.get(project, 'details.newsite')) delete project.details.newsite
          if (_.get(project, 'details.newbldg')) delete project.details.newbldg
          $scope.project = project
          if ($scope.selected) {
            $scope.selected.project = project
            _.each($scope.projects, (p, i) => {
              if (p._id === project.id) $scope.projects[i] = project
            })
            $scope.selected.site = _.find(project.sites, s => s._id === newsite)
            $scope.selected.building = _.find(_.get($scope.selected, 'site.buildings'), b => b._id === newbldg)
          }

          deferred.resolve()
        }

        return deferred.promise
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
