const mongoose = require('mongoose')
const Schema = mongoose.Schema

const SignalSchema = new Schema({
  created: {
    type: Date,
    default: Date.now
  },
  blocks: {
    type: Schema.Types.Mixed
  },
  plan: {
    type: Schema.ObjectId,
    ref: 'Plan'
  }
})

mongoose.model('Signal', SignalSchema)
