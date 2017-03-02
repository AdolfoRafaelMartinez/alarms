/**
 * Module dependencies.
 */
var mongoose = require('mongoose')
var Schema = mongoose.Schema

/**
 * Article Schema
 */
var ProjectSchema = new Schema({
  created: {
    type: Date,
    default: Date.now
  },
  title: {
    type: String,
    default: 'new project',
    trim: true,
    required: 'Title cannot be blank'
  },
  thumb: {
    type: String,
    default: null
  },
  sites: {
    type: [Schema.Types.Mixed],
    default: []
  },
  details: {
    type: Schema.Types.Mixed,
    default: ''
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User'
  }
})

mongoose.model('Project', ProjectSchema)
