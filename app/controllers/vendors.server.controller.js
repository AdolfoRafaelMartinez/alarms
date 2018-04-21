const mongoose     = require('mongoose')
const errorHandler = require('./errors.server.controller')
const Vendor       = mongoose.model('Vendor')
const AP           = mongoose.model('AP')
const Controller   = mongoose.model('Controller')
const Mount        = mongoose.model('Mount')

exports.read = function (req, res) {
	res.json(req.vendor)
}

exports.vendorByID = function (req, res, next, id) {
	Vendor.findById(id).exec(function (err, vendor) {
		if (err) return next(err)
		if (!vendor) return next(new Error('Failed to load vendor ' + id))
		req.vendor = vendor
		next()
	})
}

exports.list = function (req, res) {
	Vendor.find({name: new RegExp(req.query.search, 'i')}).limit(200).sort('name').exec(function (err, vendors) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			})
		} else {
			res.json(vendors)
		}
	})
}

exports.listAps = function (req, res) {
	AP.find({sku: new RegExp(req.query.search, 'i')}).limit(200).sort('-created').exec(function (err, aps) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			})
		} else {
			res.json(aps)
		}
	})
}

exports.listControllers = function (req, res) {
	Controller.find({sku: new RegExp(req.query.search, 'i')}).limit(200).sort('-created').exec(function (err, controllers) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			})
		} else {
			res.json(controllers)
		}
	})
}

exports.listMounts = function (req, res) {
	Mount.find({sku: new RegExp(req.query.search, 'i')}).limit(200).sort('-created').exec(function (err, mounts) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			})
		} else {
			res.json(mounts)
		}
	})
}

/**
 * Vendor authorization middleware
 */
exports.hasAuthorization = function (req, res, next) {
	if (!req.user.id) {
		return res.status(403).send({
			message: 'User is not authorized'
		})
	}
	next()
}
