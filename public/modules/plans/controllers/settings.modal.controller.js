'use strict'

angular.module('plans')
	.controller('settingsModalController', ['$scope', 'close', 'item', 'type', 'ModalService', 'Vendors', 'APs', 'Mounts', 'Controllers',
		function ($scope, close, item, type, ModalService, Vendors, APs, Mounts, Controllers) {
			$scope.type = type
			$scope.item = _.cloneDeep(item)
			$scope.original = item

			$scope.sma = {
				details: true,
				contacts: false,
				wifi: false
			}

			$scope.pp_edit = {}
			$scope.edit = function (prop, obj) {
				$scope.pp_edit = {}
				$scope.pp_edit[prop] = true
				console.log($scope.pp_edit)
				if (obj) $scope.edit_prop = obj
			}

			$scope.cancel = function() {
				$scope.pp_edit = {}
				$scope.edit_prop = {}
				$scope.item = _.cloneDeep($scope.original)
			}

			$scope.getItem = function() {
				return $scope.item
			}

			var newContact = {}
			$scope.addContact = function ($event) {
				$event.stopPropagation()
				$scope.sma.contacts = true
				$scope.pp_edit.contacts = true
				newContact = {}
				$scope.edit_prop = newContact
			}

			$scope.saveContact = function () {
				if (typeof $scope.item.details !== 'object') $scope.item.details = {}
				if (!$scope.item.details.contacts) $scope.item.details.contacts = []
				if (newContact.name) {
					$scope.item.details.contacts.push(_.clone(newContact))
					newContact = {}
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

			$scope.save = function () {
				$scope.pp_edit = {}
				_.each($scope.item, (p, k) => $scope.original[k] = p)
			}

			$scope.getAPs         = search => APs.query({search: search}).$promise
			$scope.getControllers = search => Controllers.query({search: search}).$promise
			$scope.getMounts      = search => Mounts.query({search: search}).$promise
			$scope.vendors        = Vendors.query()
		}])
