'use strict';

var mongoose = require('mongoose'),
    uuid = require('uuid'),
    gm = require('gm'),
    fs = require('fs'),
    errorHandler = require('./errors.server.controller'),
    Plan = mongoose.model('Plan'),
    _ = require('lodash'),
    Q = require('q');


function saveThumb(thumb) {
    var base64Data = thumb.replace(/^data:image\/png;base64,/, '');
    var guid = uuid.v4();
    var filename = guid + '.png';
    var thumbname = guid + '-thumb.jpg';
    var path = __dirname + '/../../public/uploads/';
    var deferred = Q.defer();
    fs.writeFile(path + filename, base64Data, 'base64', function(err) {
        if (err) {
            console.log('error filename', err);
            deferred.reject('Error: Failed to write image to file.');
        }
        gm(path + filename).thumb(150, 100, path + thumbname, function(err) {
            if (err) {
                console.log('error thumb', err);
                deferred.reject('Error: Failed to create plan thumbnail.');
            }
            deferred.resolve({
                file: filename,
                thumb: thumbname
            });
        });
    });

    return deferred.promise;
}


/**
 * Create a plan
 */
exports.create = function(req, res) {
    var plan_data = req.body;

    saveThumb(req.body.thumb)
        .then(function(pic) {
            plan_data.thumb = pic.thumb;
            var plan = new Plan(plan_data);
            plan.user = req.user;
            return plan;
        })
        .then(function(plan) {
            plan.save(function(err) {
                if (err) {
                    throw Error(errorHandler.getErrorMessage(err));
                } else {
                    return res.json(plan);
                }
            });
        })
        .catch(function(err) {
            return res.status(400).json(err);
        })
        .done();

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

    var plan_data = req.body;
    saveThumb(req.body.thumb)
        .then(function(pic) {
            plan_data.thumb = pic.thumb;
            plan_data.screenshot = pic.file;
            plan = _.extend(plan, plan_data);
            console.log('PLAN', pic, plan);
        })
        .then(function() {
            plan.save(function(err) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                } else {
                    res.json(plan);
                }
            });
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
	Plan.find({user: req.user.id}).sort('-created').populate('user', 'displayName').exec(function(err, plans) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			res.json(plans);
		}
	});
};

var PUDDLE_PATTERN_GRANULARITY = 10;
var PUDDLE_POINT_RADIUS = 20;
function defaultAntenaPattern() {
    var pattern = [];
    for (var i=0; i<360; i+=PUDDLE_PATTERN_GRANULARITY) pattern.push(Math.random()*5 - 10);

    return pattern;
};

/**
 * Calculate signal coverage
 */
exports.coverage = function(req, res) {
    var access_points = req.plan.stage.aps;
    // TEMP
    access_points = req.body.points;
    var walls = req.plan.walls;
    var points = [];
    var r_max = 400; // cut off distance
    var r_inc= 25; // granularity
    _.each(access_points, function(ap) {
        var antenna_pattern = defaultAntenaPattern();
        var radius;
        points.push([{x: ap.x, y: ap.y, value: 100, radius: ap.radius/3}]);
        for (radius = r_inc; radius < r_max; radius += r_inc) {
            var radial_points = [];
            var loss;
            var g = 0;
            _.each(antenna_pattern, function(strength) {
                loss = 20*Math.log10(5550) + 20*Math.log10(0.000621371 * radius / req.plan.stage.plan.stage_ppm) + 36.6;
                radial_points.push({x: ap.x + radius * Math.sin(g), y: ap.y + radius * Math.cos(g), value: 100 - loss, radius: ap.radius/3});
                g += PUDDLE_PATTERN_GRANULARITY;
            });
            points.push(radial_points);
        }
    });

    res.json(points);
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

