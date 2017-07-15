const users  = require('../controllers/users.server.controller')
const plans  = require('../controllers/plans.server.controller')
const signal = require('../controllers/signal.server.controller')

module.exports = function (app) {
	app.route('/signal/:planId')
        .get(users.requiresLogin, plans.hasAuthorization, signal.read)

	// Finish by binding the plan middleware
	app.param('planId', signal.signalByPlanID)
}
