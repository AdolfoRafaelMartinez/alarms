const mongoose = require('mongoose')
const fs       = require('fs')
const _        = require('lodash')
const Q        = require('q')
const shortid  = require('shortid')

const errorHandler = require('./errors.server.controller')
const Plan = mongoose.model('Plan')

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
