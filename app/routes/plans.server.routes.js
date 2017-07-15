const users  = require('../controllers/users.server.controller')
const plans  = require('../controllers/plans.server.controller')
const signal = require('../controllers/signal.server.controller')

module.exports = function (app) {
	app.route('/plans')
        .get(users.requiresLogin, plans.list)
        .post(users.requiresLogin, plans.create)

	app.route('/orphan-plans')
        .get(users.requiresLogin, plans.orphans)

	app.route('/plans/:planId/coverage')
        .post(users.requiresLogin, plans.hasAuthorization, signal.generate)

	app.route('/plans/:planId')
        .get(users.requiresLogin, plans.hasAuthorization, plans.read)
        .put(users.requiresLogin, plans.hasAuthorization, plans.update)
        .delete(users.requiresLogin, plans.hasAuthorization, plans.delete)

	// Finish by binding the plan middleware
	app.param('planId', plans.planByID)
}
