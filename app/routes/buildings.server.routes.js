'use strict'
const users = require('../../app/controllers/users.server.controller')
const buildings = require('../../app/controllers/buildings.server.controller')

module.exports = function (app) {
  app.route('/buildings')
    .get(users.requiresLogin, buildings.list)

  app.route('/buildings/:buildingId')
    .delete(users.requiresLogin, buildings.hasAuthorization, buildings.delete)

  // Finish by binding the project middleware
  app.param('buildingId', buildings.buildingByID)
}
