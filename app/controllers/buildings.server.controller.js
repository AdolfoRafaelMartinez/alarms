const mongoose = require('mongoose')
const _        = require('lodash')
const Project  = mongoose.model('Project')
const Plan     = mongoose.model('Plan')
const pug      = require('pug')
const shortid  = require('shortid')
const fs       = require('fs')
const exec     = require('child_process').exec
const Q        = require('q')

const BLDG_SCHEMA = {
	details: {
		address: '',
		city: '',
		state: '',
		zipcode: '',
		client: {
			logo: '',
			name: ''
		},
		parts: [],
		contacts: [],
		designer: {
			name: '',
			position: ''
		},
		msp: {
			name: '',
			logo: ''
		}
	}
}

const PLAN_SCHEMA = {
	stage: {
		items: []
	},
	details: {
		controllers: [],
		client: {
			name: '',
			logo: ''
		},
		parts: [],
		contacts: [],
		designer: {
			name: '',
			logo: ''
		}
	}
}

function filterSchema (obj, schema) {
	_.map(schema, (def, key) => {
		obj[key] = obj[key] || def
		filterSchema(obj[key], def)
	})
}

exports.buildingByID = function (req, res, next, id) {
	Project.find({'sites.buildings._id': id})
		.populate('user', 'displayName')
		.exec(function (err, projects) {
			if (err) return next(err)
			if (!projects || typeof projects !== 'object' || !projects[0]) return next(new Error('Failed to load building ' + id))
			req.project = projects[0]
			_.each(projects[0].sites, site => {
				let building = _.find(site.buildings, b => b._id === id)
				if (building) req.building = building
			})
			next()
		})
}

/* TODO: implement list buildings per site */
exports.list = function (req, res) {
	res.status(404)
}

exports.delete = function (req, res) {
	/* TODO: create promises and wait for all to complete */
	const building = req.building
	_.each(building.plans, plan => {
		if (plan._id) {
			Plan.findOneAndUpdate({_id: mongoose.Types.ObjectId(plan._id)}, {$unset: {building: true}})
				.exec(err => {
					if (err) {
						throw new Error(`Could not update plans, when deleting building: ${building._id}`)
					}
				})
		}
	})
	_.each(req.project.sites, site => {
		_.each(site.buildings, (b, i) => {
			if (!b || b._id === building._id) {
				site.buildings.splice(i, 1)
			}
		})
	})
	Project.findOneAndUpdate({_id: mongoose.Types.ObjectId(req.project._id)}, {$set: {sites: req.project.sites}})
		.exec((err, results) => {
			if (err) {
				throw new Error(`Could not update project when deleting building ${building._id}`)
			}
			res.status(202).send()
		})
}

exports.update = function (req, res, next) {
	const building = req.building
	_.each(req.project.sites, site => {
		_.each(site.buildings, (b, i) => {
			if (b._id === building._id) {
				site.buildings[i] = req.body
			}
		})
	})
	Project.findOneAndUpdate({_id: mongoose.Types.ObjectId(req.project._id)}, {$set: {sites: req.project.sites}})
		.exec((err, results) => {
			if (err) {
				throw new Error(`Could not update project when updating building ${building._id}`)
			}
			res.status(202).send()
		})
}

exports.pdfReport = function (req, res, next) {
	var plans = []
	var aps = 0
	var ams = 0
	var ctrl = {}
	var lic = {}
	var parts = {}
	let promises = []
	_.each(req.building.plans, bplan => {
		let deferred = Q.defer()
		promises.push(deferred.promise)
		Plan.findById(bplan._id).exec(function (err, plan) {
			if (err) deferred.reject(err)
			if (!plan) deferred.reject(new Error('Failed to load plan ' + bplan._id))

			filterSchema(plan, PLAN_SCHEMA)
			if (!plan.stage.items && plan.stage.aps) plan.stage.items = plan.stage.aps // old plan format

			plan.stage.aps = _.filter(plan.stage.items, i => i.itemType === 'ap')
			plan.stage.ams = _.filter(plan.stage.items, i => i.itemType === 'am')
			aps += plan.stage.aps.length
			ams += plan.stage.ams.length
			if (plan.details.controllers.length) {
				ctrl = plan.details.controllers[0] // TODO: maybe some projects require multiple controllers ?
			}
			if (plan.details.lic) lic = plan.details.lic
			_.each(plan.stage.aps, (ap, i) => {
				if (!ap.name) ap.name = `AM${i + 1}`
				if (ap.sku) {
					if (!parts[ap.sku]) parts[ap.sku] = { qty: 0, desc: '' }
					parts[ap.sku].qty++
				}
			})

			_.each(plan.stage.ams, (am, i) => {
				if (!am.name) am.name = `AM${i + 1}`
				if (am.sku) {
					if (!parts[am.sku]) parts[am.sku] = { qty: 0, desc: '' }
					parts[am.sku].qty++
				}
			})

			plans.push(plan)
			deferred.resolve()
		})
	})

	Q.all(promises)
		.then(() => {
			return
		})
		.then(() => {
			const PUGDIR = `${__dirname}/../pug`
			filterSchema(req.building, BLDG_SCHEMA)
			pug.renderFile(`${PUGDIR}/sf01.pug`,
				{
					plans: plans,
					building: req.building,
					aps: aps,
					ams: ams,
					apms: parseInt(aps) + parseInt(ams),
					ctrl: ctrl,
					lic: lic,
					parts: parts,
					today: new Date().toUTCString().substr(0, 16),
					assetsDir: `${PUGDIR}/assets`
				}, (err, result) => {
					console.dir(err)
					let fileid = shortid.generate()
					let htmlFilename = `${fileid}.html`
					let pdfFilename = `${fileid}.pdf`
					let htmlFullPath = `${PUGDIR}/tmp/${htmlFilename}`
					fs.writeFile(htmlFullPath, result, function (err) {
						if (err) return next(err)
						exec(`cd ${PUGDIR}/tmp && wkhtmltopdf --print-media-type ${htmlFilename} ${pdfFilename}`, function (err, stdout, stderr) {
							if (err) return next(err)
							console.log(`serving PDF ${PUGDIR}/tmp/${pdfFilename}`)
							let file = fs.readFileSync(`${PUGDIR}/tmp/${pdfFilename}`, 'binary')
							res.writeHead(200, {
								'Content-Type': 'application/pdf',
								'Access-Control-Allow-Origin': '*'
							})
							res.write(file, 'binary')
							res.end()
						})
					})
				})
		})
		.catch(err => {
			return next(err)
		})
}

/**
 * Building authorization middleware
 */
exports.hasAuthorization = function (req, res, next) {
	if (req.project.user.id !== req.user.id) {
		return res.status(403).send({
			message: 'User is not authorized'
		})
	}
	next()
}
