const mongoose = require('mongoose')
const gm       = require('gm')
const fs       = require('fs')
const _        = require('lodash')
const Q        = require('q')

const errorHandler = require('./errors.server.controller')
const Project = mongoose.model('Project')

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
			_.each(project.sites, site => {
				if (!site._id) site._id = mongoose.Types.ObjectId().toString()
				_.each(site.buildings, b => {
					if (!b._id) b._id = mongoose.Types.ObjectId().toString()
				})
			})
			return project.save(function (err) {
				if (err) {
					return res.status(400).send({
						message: errorHandler.getErrorMessage(err)
					})
				} else {
					res.json(project)
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
