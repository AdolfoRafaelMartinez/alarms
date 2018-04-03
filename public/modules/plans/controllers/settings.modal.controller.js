'use strict'

angular.module('plans')
	.controller('settingsModalController', ['$scope', 'close', 'item', 'type', 'ModalService', 'Vendors', 'APs', 'Mounts', 'Controllers', 'Files',
		function ($scope, close, item, type, ModalService, Vendors, APs, Mounts, Controllers, Files) {
			$scope.type = type
			$scope.item = _.cloneDeep(item)
			$scope.original = item

			$scope.pp_edit = {}

			$scope.getItem = function() {
				return $scope.item
			}

			$scope.addContact = function ($event) {
				$event.stopPropagation()
				$scope.pp_edit.contact = 2
				$scope.newContact = {}
			}

			$scope.editContact = function (contact) {
				$scope.pp_edit.contact = true
				$scope.newContact = contact
			}

			$scope.cancelContact = function() {
				$scope.pp_edit.contacts = false
			}

			$scope.saveContact = function () {
				if (typeof $scope.item.details !== 'object') $scope.item.details = {}
				if (!$scope.item.details.contacts) $scope.item.details.contacts = []
				if ($scope.pp_edit.contact === 2) {
					$scope.item.details.contacts.push(_.clone($scope.newContact))
					$scope.newContact = {}
				}
				$scope.save()
				$scope.pp_edit.contacts = false
			}

			$scope.askDeleteContact = function (contactIndex, $event) {
				$event.stopPropagation()
				var contact = $scope.item.details.contacts[contactIndex]

				ModalService.showModal({
					templateUrl: 'deleteModal.html',
					controller: 'deleteModalController',
					inputs: { item: `contact: ${contact.name}` }
				})
					.then(function (modal) {
						modal.element.modal()
						modal.close.then(function (answer) {
							if (answer) {
								$scope.removeContact(contactIndex)
							}
						})
					})
			}

			$scope.removeContact = function (index) {
				$scope.item.details.contacts.splice(index, 1)
				$scope.save()
			}

			$scope.addPersonnel = function ($event) {
				$event.stopPropagation()
				$scope.pp_edit.personnel = 2
				$scope.newPersonnel = {}
			}

			$scope.editPersonnel = function (contact) {
				$scope.pp_edit.personnel = true
				$scope.newPersonnel = contact
			}

			$scope.cancelPersonnel = function() {
				$scope.pp_edit.personnel = false
			}

			$scope.savePersonnel = function () {
				if (typeof $scope.item.details !== 'object') $scope.item.details = {}
				if (!$scope.item.details.personnel) $scope.item.details.personnel = []
				if ($scope.pp_edit.personnel === 2) {
					$scope.item.details.personnel.push(_.clone($scope.newPersonnel))
					$scope.newPersonnel = {}
				}
				$scope.save()
				$scope.pp_edit.personnel = false
			}

			$scope.askDeletePersonnel = function (personnelIndex, $event) {
				$event.stopPropagation()
				var personnel = $scope.item.details.personnel[personnelIndex]

				ModalService.showModal({
					templateUrl: 'deleteModal.html',
					controller: 'deleteModalController',
					inputs: { item: `personnel: ${personnel.name}` }
				})
					.then(function (modal) {
						modal.element.modal()
						modal.close.then(function (answer) {
							if (answer) {
								$scope.removePersonnel(personnelIndex)
							}
						})
					})
			}

			$scope.removePersonnel = function (index) {
				$scope.item.details.personnel.splice(index, 1)
				$scope.save()
			}

			$scope.askDeleteFile = function (file, $event) {
				$event.stopPropagation()

				ModalService.showModal({
					templateUrl: 'deleteModal.html',
					controller: 'deleteModalController',
					inputs: { item: `file: ${file.name}` }
				})
					.then(function (modal) {
						modal.element.modal()
						modal.close.then(function (answer) {
							if (answer) {
								$scope.deleteFile(file)
							}
						})
					})
			}

      $scope.deleteFile = function(file) {
        Files.delete({projectId: $scope.item._id, file: file.name})
        $scope.files = Files.query({projectId: $scope.item._id})
      }

			$scope.save = function (exit) {
				$scope.pp_edit = {}
        _.each($scope.item, (p, k) => $scope.original[k] = p)
        if (exit) setTimeout(() => {
          $('.modal').modal('hide')
        })
			}

      $scope.uploadComplete = function(file) {
        console.log('uploadComplete', file)
        $scope.files = Files.query({projectId: $scope.item._id})
      }

			$scope.getAPs         = search => APs.query({search: search}).$promise
			$scope.getControllers = search => Controllers.query({search: search}).$promise
			$scope.getMounts      = search => Mounts.query({search: search}).$promise
			$scope.vendors        = Vendors.query()
			$scope.files          = Files.query({projectId: $scope.item._id})
		}])
