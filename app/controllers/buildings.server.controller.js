'use strict'

const mongoose = require('mongoose')
const _ = require('lodash')
const Project = mongoose.model('Project')
const Plan = mongoose.model('Plan')

exports.buildingByID = function (req, res, next, id) {
  Project.find({'sites.buildings._id': id})
    .populate('user', 'displayName')
    .exec(function (err, project) {
      if (err) return next(err)
      if (!project) return next(new Error('Failed to load building ' + id))
      _.each(project.sites, site => {
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
  var building = req.building
  _.each(building.plans, plan => {
    Plan.update({_id: mongoose.Types.ObjectId(plan._id)}, {$unset: {building: true}})
  })
  res.status(202)
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
