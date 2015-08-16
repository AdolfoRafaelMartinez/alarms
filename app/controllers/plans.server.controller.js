'use strict'

var mongoose = require('mongoose'),
    uuid = require('uuid'),
    gm = require('gm'),
    fs = require('fs'),
    errorHandler = require('./errors.server.controller'),
    Plan = mongoose.model('Plan'),
    _ = require('lodash');

/**
 * Create a plan
 */
exports.create = function(req, res) {
    var base64Data = req.body.thumb.replace(/^data:image\/png;base64,/, '');
    var guid = uuid.v4();
    var filename = guid + '.png';
    var thumb = guid + '-thumb.jpg';
    var path = __dirname + '/../../public/uploads/';
    console.log(__dirname);
    fs.writeFile(path + filename, base64Data, 'base64', function(err) {
        if (err) {
            console.log('error filename', err);
            return res.json('Error: Failed to write image to file.');
        }
        gm(path + filename).thumb(150, 100, path + thumb, function(err) {
            if (err) {
                console.log('error thumb', err);
                return res.json('Error: Failed to create plan thumbnail.');
            }
        });
    });

    var plan_data = req.body;
    plan_data.thumb = thumb;
	var plan = new Plan(plan_data);
	plan.user = req.user;

	plan.save(function(err) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			return res.json(plan);
		}
	});
};

/**
 * Show the current plan
 */
exports.read = function(req, res) {
	res.json(req.plan);
};

/**
 * Plan
 */
exports.planByID = function(req, res, next, id) {
	Plan.findById(id).populate('user', 'displayName').exec(function(err, plan) {
		if (err) return next(err);
		if (!plan) return next(new Error('Failed to load plan ' + id));
		req.plan = plan;
		next();
	});
};

/**
 * Update a plan
 */
exports.update = function(req, res) {
	var plan = req.plan;

	plan = _.extend(plan, req.body);

	plan.save(function(err) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			res.json(plan);
		}
	});
};

/**
 * Delete an plan
 */
exports.delete = function(req, res) {
	var plan = req.plan;

	plan.remove(function(err) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			res.json(plan);
		}
	});
};

/**
 * List of Plans
 */
exports.list = function(req, res) {
	Plan.find().sort('-created').populate('user', 'displayName').exec(function(err, plans) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			res.json(plans);
		}
	});
};

/**
 * Plan authorization middleware
 */
exports.hasAuthorization = function(req, res, next) {
	if (req.plan.user.id !== req.user.id) {
		return res.status(403).send({
			message: 'User is not authorized'
		});
	}
	next();
};
