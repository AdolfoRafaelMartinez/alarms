'use strict'

// Setting up route
angular.module('plans').config(['$stateProvider',
  function ($stateProvider) {
    // Plans state routing
    $stateProvider
      .state('listPlans', {
        url: '/plans',
        templateUrl: 'modules/plans/views/list-plans.client.view.html'
      })
      .state('building', {
        url: '/building/:bldgID',
        templateUrl: 'modules/plans/views/view-plan.client.view.html'
      })
  }
])
