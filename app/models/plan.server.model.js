const mongoose = require('mongoose')
const Schema = mongoose.Schema

const PlanSchema = new Schema({
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
	floor: {
		type: String
	},
	thumb: {
		type: String,
		default: null
	},
	print: {
		type: String,
		default: null
	},
	stage: {
		type: Schema.Types.Mixed,
		default: ''
	},
	building: {
		type: String
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
})

mongoose.model('Plan', PlanSchema)
