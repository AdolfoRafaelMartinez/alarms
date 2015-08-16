'use strict';
var users = require('../../app/controllers/users.server.controller'),
	plans = require('../../app/controllers/plans.server.controller');

module.exports = function(app) {

	app.route('/plans')
        .get(plans.list)
        .post(users.requiresLogin, plans.create);

	app.route('/plans/:planId')
        .get(plans.read)
        .put(users.requiresLogin, plans.hasAuthorization, plans.update)
        .delete(users.requiresLogin, plans.hasAuthorization, plans.delete);

	// Finish by binding the article middleware
	app.param('planId', plans.planByID);
};
