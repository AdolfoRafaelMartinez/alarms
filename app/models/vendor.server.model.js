var mongoose = require('mongoose')
var Schema   = mongoose.Schema

var VendorSchema = new Schema({
	created: {
		type: Date,
		default: Date.now
	},
	name: {
		type: String,
		trim: true,
		required: 'Vendor name cannot be blank'
	},
	details: {
		type: Schema.Types.Mixed,
		default: ''
	}
})

var APSchema = new Schema({
	created: {
		type: Date,
		default: Date.now
	},
	sku: {
		type: String,
		trim: true,
		required: 'AP SKU cannot be blank'
	},
	vendor: {
		type: String,
		trim: true,
		required: 'AP Vendor cannot be blank'
	},
	description: {
		type: String,
		trim: true,
		default: ''
	},
	category: {
		type: String,
		trim: true,
		default: ''
	}
})

var ControllerSchema = new Schema({
	created: {
		type: Date,
		default: Date.now
	},
	sku: {
		type: String,
		trim: true,
		required: 'Controller SKU cannot be blank'
	},
	vendor: {
		type: String,
		trim: true,
		required: 'Controller Vendor cannot be blank'
	},
	description: {
		type: String,
		trim: true,
		default: ''
	},
	category: {
		type: String,
		trim: true,
		default: ''
	}
})

var MountSchema = new Schema({
	created: {
		type: Date,
		default: Date.now
	},
	sku: {
		type: String,
		trim: true,
		required: 'Mount SKU cannot be blank'
	},
	vendor: {
		type: String,
		trim: true,
		required: 'Mount Vendor cannot be blank'
	},
	description: {
		type: String,
		trim: true,
		default: ''
	},
	category: {
		type: String,
		trim: true,
		default: ''
	}
})

mongoose.model('Vendor', VendorSchema)
mongoose.model('AP', APSchema)
mongoose.model('Controller', ControllerSchema)
mongoose.model('Mount', MountSchema)
