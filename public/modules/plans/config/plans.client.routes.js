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
      .state('plan', {
        url: '/plans/:planID',
        templateUrl: 'modules/plans/views/view-plan.client.view.html'
      })
      .state('building', {
        url: '/building/:bldgID',
        templateUrl: 'modules/plans/views/view-plan.client.view.html'
      })
      .state('listPlansSiteSelect', {
        url: '/:projectName/:siteName',
        templateUrl: 'modules/plans/views/list-plans.client.view.html'
      })
      .state('listPlansProjectSelect', {
        url: '/:projectName',
        templateUrl: 'modules/plans/views/list-plans.client.view.html'
      })
  }
])
