'use strict'

const mongoose = require('mongoose')
const _ = require('lodash')
const Project = mongoose.model('Project')
const Plan = mongoose.model('Plan')

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
      if (b._id === building._id) {
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
