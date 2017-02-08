'use strict';

const mongoose = require('mongoose');
const uuid     = require('uuid');
const gm       = require('gm');
const fs       = require('fs');
const _        = require('lodash');
const Q        = require('q');
const pug      = require('pug');
const pdf      = require('phantom-html2pdf');
const shortid  = require('shortid');

const errorHandler = require('./errors.server.controller');
const Plan = mongoose.model('Plan');

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
        .then(pic => {
            plan_data.thumb = pic.thumb;
            plan_data.screenshot = pic.file;
            plan = _.extend(plan, plan_data);
            return plan.save(function(err) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                } else {
                    res.json(plan);
                }
            });
        })
        .catch(err => {
            res.status(500).send({
                message: errorHandler.getErrorMessage(err),
                err: err
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
	Plan.find({user: req.user.id, title: new RegExp(req.query.search, 'i')}).limit(200).sort('-created').populate('user', 'displayName').exec(function(err, plans) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			res.json(plans);
		}
	});
};

exports.blueFloorPlan = function(req, res, next) {
	Plan.findById(req.id).populate('user', 'displayName').exec(function(err, plan) {
		if (err) return next(err);
		if (!plan) return next(new Error('Failed to load plan ' + req.id));
		req.plan = plan;
		next();
	});
};

var COVERAGE_POINT_GAP = 20;
var PUDDLE_PATTERN_GRANULARITY = Math.PI/360 *5;
var PUDDLE_POINT_RADIUS = 20;
function defaultAntenaPattern() {
    var pattern = {};
    for (var i=0; i<Math.PI; i+=PUDDLE_PATTERN_GRANULARITY) {
        pattern[i] = {
            s: 5 //Math.random()*5 - 10
        };
    }

    return pattern;
}

/**
 * Calculate signal coverage
 */
exports.coverage = function(req, res) {
    var access_points = req.plan.stage.aps;
    // TEMP
    access_points = req.body.points;
    var ap_strength = 1;
    var walls = req.plan.walls;
    var points = [];
    var r_inc; // granularity
    var p, strength;
    _.each(access_points, function(ap) {
        var r_max = ap.radius * 2; // cut off distance
        r_inc = r_max / 2;
        var antenna_pattern = defaultAntenaPattern();
        var radius;
        points.push([{x: ap.x, y: ap.y, value: 100, radius: ap.radius}]);
        /*
        for (radius = r_inc; radius < r_max; radius += r_inc) {
            var radial_points = [];
            var pstep = Math.asin(COVERAGE_POINT_GAP/radius);
            var closest = 0;
            var loss = 20*Math.log10(5550) + 20*Math.log10(0.000621371 * radius) + 36.6;
            for (p = 0; p <= 2*Math.PI; p+=pstep) {
                closest = Math.round(p/PUDDLE_PATTERN_GRANULARITY);
                strength = ap_strength * antenna_pattern[closest];
                radial_points.push({
                    x: (ap.x + radius * Math.sin(closest)),
                    y: (ap.y + radius * Math.cos(closest)),
                    value: 100 - loss,
                    radius: ap.radius/19
                });
            }
            points.push(radial_points);
        } */
    });

    res.json(points);
};

exports.pdfReport = function(req, res) {
    if (!req.plan.stage.ams) req.plan.stage.ams = [];
    if (!req.plan.details.parts) req.plan.details.parts = [];
    _.each(req.plan.stage.aps, (ap, i) => {
        if (!_.get(ap, 'inventory.name')) _.set(ap, 'inventory.name', `AP${i}`);
    });
    pug.renderFile(`${__dirname}/../pug/sf01.pug`,
        {
            plan: req.plan,
            today: new Date().toUTCString(),
            assetsDir: `${__dirname}/../pug/assets`
        }, (err, result) => {
            let htmlFilename = `${__dirname}/../pug/tmp/${shortid.generate()}.html`;
            let cssFilename = `${__dirname}/../pug/assets/reportv1.css`;
            fs.writeFile(htmlFilename, result, function(err) {
                pdf.convert({
                    html: htmlFilename,
                    dpi: 300,
                    css: cssFilename,
                    paperSize: {
                        format: 'A4',
                        orientation: 'portrait',
                        border: '0',
                        deleteOnAction: false
                    }
                }, function(err, result) {
                    res.send(result.toStream());
                });
            });
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
