const mongoose = require('mongoose')
const fs       = require('fs')
const _        = require('lodash')
const Q        = require('q')
const shortid  = require('shortid')

const errorHandler = require('./errors.server.controller')
const Plan = mongoose.model('Plan')

function saveImages (print, thumb, pid) {
	if (!thumb || !print) return Q.when({pic: 'none.jpg', thumb: 'none.jpg'})
	if (thumb.substr(0, 5) !== 'data:') return Q.when()
	if (print.substr(0, 5) !== 'data:') return Q.when()

	let thumbPromise = Q.defer()
	let printPromise = Q.defer()
	let promises = [ thumbPromise.promise, printPromise.promise ]

	var base64Data = thumb.replace(/^data:image\/png;base64,/, '')
	var thumbname = pid + '-thumb.png'
	var path = __dirname + '/../../public/ss/'
	fs.writeFile(path + thumbname, base64Data, 'base64', function (err) {
		if (err) {
			console.log('error thumbname', err)
			thumbPromise.reject('Error: Failed to write image to file.')
		}
		thumbPromise.resolve(thumbname)
	})

	base64Data = print.replace(/^data:image\/png;base64,/, '')
	var filename = pid + '.png'
	path = __dirname + '/../../public/ss/'
	fs.writeFile(path + filename, base64Data, 'base64', function (err) {
		if (err) {
			console.log('error filename', err)
			printPromise.reject('Error: Failed to write image to file.')
		}
		printPromise.resolve(filename)
	})

	var deferred = Q.defer()

	Q.allSettled(promises).spread((thumb, print) => {
		deferred.resolve({
			thumb: thumb.value,
			print: print.value
		})
	}).done()

	return deferred.promise
}

/**
 * Create a plan
 */
exports.create = function (req, res) {
	var plan_data = req.body

	saveImages(req.body.print, req.body.thumb, req.body._id)
		.then(function (pics) {
			plan_data.thumb = pics.thumb
			plan_data.print = pics.print
			var plan = new Plan(plan_data)
			plan.user = req.user
			return plan
		})
		.then(function (plan) {
			plan.save(function (err) {
				if (err) {
					throw Error(errorHandler.getErrorMessage(err))
				} else {
					return res.json(plan)
				}
			})
		})
		.catch(function (err) {
			return res.status(400).json(err)
		})
		.done()
}

/**
 * Show the current plan
 */
exports.read = function (req, res) {
	res.json(req.plan)
}

/**
 * Plan
 */
exports.planByID = function (req, res, next, id) {
	Plan.findById(id).populate('user', 'displayName').exec(function (err, plan) {
		if (err) return next(err)
		if (!plan) return next(new Error('Failed to load plan ' + id))
		req.plan = plan
		next()
	})
}

/**
 * Update a plan
 */
exports.update = function (req, res) {
	var plan = req.plan

	var plan_data = req.body
	saveImages(req.body.print, req.body.thumb, req.body._id)
		.then(pics => {
			if (pics) {
				plan_data.thumb = pics.thumb + '?v=' + shortid.generate()
				plan_data.print = pics.print
			}
			plan = _.extend(plan, plan_data)
			Plan.findOneAndUpdate({_id: plan._id}, plan).exec(err => {
				if (err) {
					return res.status(400).send({
						message: errorHandler.getErrorMessage(err)
					})
				} else {
					res.json(plan)
				}
			})
		})
		.catch(err => {
			res.status(500).send({
				message: errorHandler.getErrorMessage(err),
				err: err
			})
		})
}

/**
 * Delete an plan
 */
exports.delete = function (req, res) {
	var plan = req.plan

	plan.remove(function (err) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			})
		} else {
			res.json(plan)
		}
	})
}

/**
 * List of Plans
 */
exports.list = function (req, res) {
	Plan.find({user: req.user.id, title: new RegExp(req.query.search, 'i')}).limit(200).sort('-created').populate('user', 'displayName').exec(function (err, plans) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			})
		} else {
			res.json(plans)
		}
	})
}

/**
 * List of Orphan Plans
 */
exports.orphans = function (req, res) {
	Plan.find({user: req.user.id, building: {$exists: false}}).limit(200).sort('-created').populate('user', 'displayName').exec(function (err, plans) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			})
		} else {
			res.json(plans)
		}
	})
}

exports.blueFloorPlan = function (req, res, next) {
	Plan.findById(req.id).populate('user', 'displayName').exec(function (err, plan) {
		if (err) return next(err)
		if (!plan) return next(new Error('Failed to load plan ' + req.id))
		req.plan = plan
		next()
	})
}

var COVERAGE_POINT_GAP = 20
var PUDDLE_PATTERN_GRANULARITY = Math.PI / 360 * 5
var PUDDLE_POINT_RADIUS = 20
function defaultAntenaPattern () {
	var pattern = {}
	for (var i = 0; i < Math.PI; i += PUDDLE_PATTERN_GRANULARITY) {
		pattern[i] = {
			s: 5 // Math.random()*5 - 10
		}
	}

	return pattern
}

/**
 * Calculate signal coverage
 */
exports.heatmap = function (req, res) {
	var access_points = req.plan.stage.aps
	// TEMP
	access_points = req.body.points
	var ap_strength = 1
	var walls = req.plan.walls
	var points = []
	var r_inc // granularity
	var p, strength
	_.each(access_points, function (ap) {
		var r_max = ap.radius * 2 // cut off distance
		r_inc = r_max / 2
		var antenna_pattern = defaultAntenaPattern()
		var radius
		points.push([{x: ap.x, y: ap.y, value: 100, radius: ap.radius}])
		/*
		for (radius = r_inc radius < r_max radius = r_inc) {
			var radial_points = []
			var pstep = Math.asin(COVERAGE_POINT_GAP/radius)
			var closest = 0
			var loss = 20*Math.log10(5550) + 20*Math.log10(0.000621371 * radius) + 36.6
			for (p = 0 p <= 2*Math.PI p+=pstep) {
				closest = Math.round(p/PUDDLE_PATTERN_GRANULARITY)
				strength = ap_strength * antenna_pattern[closest]
				radial_points.push({
					x: (ap.x + radius * Math.sin(closest)),
					y: (ap.y + radius * Math.cos(closest)),
					value: 100 - loss,
					radius: ap.radius/19
				})
			}
			points.push(radial_points)
		} */
	})

	res.json(points)
}

/**
 * Plan authorization middleware
 */
exports.hasAuthorization = function (req, res, next) {
	if (req.plan.user.id !== req.user.id) {
		return res.status(403).send({
			message: 'User is not authorized'
		})
	}
	next()
}
