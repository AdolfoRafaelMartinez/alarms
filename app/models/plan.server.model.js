'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * Article Schema
 */
var PlanSchema = new Schema({
	created: {
		type: Date,
		default: Date.now
	},
    title: {
        type: String,
        default: 'new plan',
        trim: true,
		required: 'Title cannot be blank'
    },
    thumb: {
        type: String,
        default: null
    },
	stage: {
		type: Schema.Types.Mixed,
		default: ''
	},
    settings: {
        type: Schema.Types.Mixed,
        default: ''
    },
    details: {
        type: Schema.Types.Mixed,
        default: ''
    },
	user: {
		type: Schema.ObjectId,
		ref: 'User'
	}
});

mongoose.model('Plan', PlanSchema);
