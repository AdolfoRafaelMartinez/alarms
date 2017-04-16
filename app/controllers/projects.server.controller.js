const mongoose = require('mongoose')
const gm       = require('gm')
const fs       = require('fs')
const _        = require('lodash')
const Q        = require('q')

const errorHandler = require('./errors.server.controller')
const Project = mongoose.model('Project')
const Plan = mongoose.model('Plan')

function saveThumb (thumb, pid) {
	if (!thumb) return Q.resolve({})
	var base64Data = thumb.replace(/^data:image\/pngbase64,/, '')
	var filename = pid + '.png'
	var thumbname = pid + 'PRJ-thumb.jpg'
	var path = __dirname + '/../../public/uploads/'
	var deferred = Q.defer()
	fs.writeFile(path + filename, base64Data, 'base64', function (err) {
		if (err) {
			console.log('error filename', err)
			deferred.reject('Error: Failed to write image to file.')
		}
		gm(path + filename).thumb(150, 100, path + thumbname, function (err) {
			if (err) {
				console.log('error thumb', err)
				deferred.reject('Error: Failed to create project thumbnail.')
			}
			deferred.resolve({
				file: filename,
				thumb: thumbname
			})
		})
	})

	return deferred.promise
}

/**
 * Create a project
 */
exports.create = function (req, res) {
	var project_data = req.body

	saveThumb(req.body.thumb, req.body._id)
		.then(function (pic) {
			project_data.thumb = pic.thumb
			var project = new Project(project_data)
			project.user = req.user
			return project
		})
		.then(function (project) {
			project.save(function (err) {
				if (err) {
					throw Error(errorHandler.getErrorMessage(err))
				} else {
					return res.json(project)
				}
			})
		})
		.catch(function (err) {
			return res.status(400).json(err)
		})
		.done()
}

/**
 * Show the current project
 */
exports.read = function (req, res) {
	res.json(req.project)
}

/**
 * Project
 */
exports.projectByID = function (req, res, next, id) {
	Project.findById(id).populate('user', 'displayName').exec(function (err, project) {
		if (err) return next(err)
		if (!project) return next(new Error('Failed to load project ' + id))
		req.project = project
		next()
	})
}

/**
 * Update a project
 */
exports.update = function (req, res) {
	var project = req.project

	var project_data = req.body
	saveThumb(req.body.thumb, req.body._id)
		.then(pic => {
			project_data.thumb = pic.thumb
			project_data.screenshot = pic.file
			project = _.extend(project, project_data)
			var promises = []
			_.each(project.sites, site => {
				_.set(site, 'details.project', project.title)
				site.details.client = project.details.client
				if (!_.get(site, 'details.msp.name')) _.set(site, 'details.msp', project.details.msp)
				if (!_.get(site, 'details.designer.name')) _.set(site, 'details.designer', project.details.designer)
				if (!site._id) site._id = mongoose.Types.ObjectId().toString()
				_.each(site.buildings, b => {
					if (!b._id) b._id = mongoose.Types.ObjectId().toString()
				})
				_.each(site.buildings, bldg => {
					_.set(bldg, 'details.project', project.title)
					bldg.details.site = site.name
					bldg.details.client = project.details.client
					if (!_.get(bldg, 'details.msp.name')) _.set(bldg, 'details.msp', project.details.msp)
					if (!_.get(bldg, 'details.designer.name')) _.set(bldg, 'details.designer', project.details.designer)
					_.each(bldg.plans, plan => {
						let deferred = Q.defer()
						promises.push(deferred.promise)
						Plan.findOne({_id: plan._id}, (err, plan) => {
							if (err) {
								return deferred.reject(err)
							}
							_.set(plan, 'details.project', project.title)
							_.set(plan, 'details.site', site.name)
							_.set(plan, 'details.building', bldg.name)
							_.set(plan, 'details.client', project.details.client)
							_.set(plan, 'details.vendor', _.get(bldg, 'details.inventory.vendor'))
							_.set(plan, 'details.aps', _.get(bldg, 'details.inventory.aps'))
							_.set(plan, 'details.ams', _.get(bldg, 'details.inventory.ams'))
							if (!_.get(plan.stage.items)) plan.stage.items = plan.stage.aps
							_.each(plan.stage.items, ap => {
								if (['ap', undefined].includes(ap.itemType)) {
									_.set(ap, 'inventory.vendor', _.get(bldg, 'details.inventory.vendor'))
									_.set(ap, 'inventory.sku', _.get(bldg, 'details.inventory.aps'))
								}
								if (ap.itemType === 'am') {
									_.set(ap, 'inventory.vendor', _.get(bldg, 'details.inventory.vendor'))
									_.set(ap, 'inventory.sku', _.get(bldg, 'details.inventory.ams'))
								}
							})
							Plan.findOneAndUpdate({_id: plan._id}, plan).exec(() => {
								deferred.resolve()
							})
						})
					})
				})
			})
			let deferred = Q.defer()
			promises.push(deferred.promise)
			Project.findOneAndUpdate({_id: project._id}, project).exec(err => {
				if (err) {
					deferred.reject(err)
				} else {
					deferred.resolve()
					res.json(project)
				}
			})
			return Q.all(promises)
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
 * Delete an project
 */
exports.delete = function (req, res) {
	var project = req.project

	project.remove(function (err) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			})
		} else {
			res.json(project)
		}
	})
}

/**
 * List of Projects
 */
exports.list = function (req, res) {
	var query
	if (req.query.buildingId) {
		let search = {
			'sites.buildings._id': req.query.buildingId
		}
		query = Project.findOne(search)
	}
	if (req.query.search) {
		let search = { title: new RegExp(req.query.search, 'i') }
		query = Project.find({user: req.user.id, search}).limit(200).sort('-created')
	}
	if (!query) query = Project.find({user: req.user.id}).limit(200).sort('-created')
	query.populate('user', 'displayName').exec(function (err, projects) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			})
		} else {
			res.json(projects)
		}
	})
}

/**
 * Project authorization middleware
 */
exports.hasAuthorization = function (req, res, next) {
	if (req.project.user.id !== req.user.id) {
		return res.status(403).send({
			message: 'User is not authorized'
		})
	}
	next()
}
