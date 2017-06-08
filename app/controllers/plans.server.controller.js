const mongoose = require('mongoose')
const fs       = require('fs')
const _        = require('lodash')
const Q        = require('q')
const shortid  = require('shortid')

const errorHandler = require('./errors.server.controller')
const Plan = mongoose.model('Plan')
const ObjectID = require('mongodb').ObjectID

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
  console.log('init find one', req.plan)
  res.json(req.plan)
}

/**
 * Plan
 */
exports.planByID = function (req, res, next, id) {
  const plansCollection = global.mongodb.collection('plans')
  plansCollection.findOne({_id: ObjectID(id)})
    .then(plan => {
      req.plan = plan
      next()
    })
    .catch(err => {
      throw new Error('Could not find plan with id' + req.id);
    })
}

/**
 * Update a plan
 */
exports.update = function (req, res) {
  const plansCollection = global.mongodb.collection('plans')
  const plan = req.plan
  var plan_data = req.body
  saveImages(req.body.print, req.body.thumb, req.body._id)
    .then(pics => {
      if (pics) {
        plan.thumb = pics.thumb + '?v=' + shortid.generate()
        plan.print = pics.print
      }
      plan.settings = plan_data.settings
      plan.stage = plan_data.stage
      plan.title = plan_data.title
      plan.floor = plan_data.floor
      plan.details = plan_data.details
      return plansCollection.findOneAndReplace({_id: plan._id}, plan, {returnNewDocument: true})
        .then(p => {
          res.json(p.value)
        })
    })
    .catch(err => {
      console.dir(err)
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

/**
 * Plan authorization middleware
 */
exports.hasAuthorization = function (req, res, next) {
	if (req.plan.user.toString() !== req.user._id.toString()) {
		return res.status(403).send({
			message: 'User is not authorized'
		})
	}
	next()
}
