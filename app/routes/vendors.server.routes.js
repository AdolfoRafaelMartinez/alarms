const users    = require('../../app/controllers/users.server.controller')
const vendors = require('../../app/controllers/vendors.server.controller')

module.exports = function (app) {
	app.route('/aps')
    .get(users.requiresLogin, vendors.listAps)

	app.route('/mounts')
    .get(users.requiresLogin, vendors.listMounts)

	app.route('/controllers')
    .get(users.requiresLogin, vendors.listControllers)

	app.route('/vendors')
    .get(users.requiresLogin, vendors.list)

	app.route('/vendors/:vendorId')
    .get(users.requiresLogin, vendors.hasAuthorization, vendors.read)

  // Finish by binding the vendor middleware
	app.param('vendorId', vendors.vendorByID)
}
