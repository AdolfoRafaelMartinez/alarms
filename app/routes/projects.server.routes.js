'use strict';
var users = require('../../app/controllers/users.server.controller'),
	projects = require('../../app/controllers/projects.server.controller');

module.exports = function(app) {

	app.route('/projects')
        .get (users.requiresLogin, projects.list)
        .post(users.requiresLogin, projects.create);

	app.route('/projects/:projectId')
        .get   (users.requiresLogin, projects.hasAuthorization, projects.read)
        .put   (users.requiresLogin, projects.hasAuthorization, projects.update)
        .delete(users.requiresLogin, projects.hasAuthorization, projects.delete);

	// Finish by binding the project middleware
	app.param('projectId', projects.projectByID);
};
