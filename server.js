require('./config/init')()

const config = require('./config/config')
const mongoose = require('mongoose')
const chalk = require('chalk')

const db = mongoose.connect(config.db, (err) => {
  if (err) {
    console.error(chalk.red('Could not connect to MongoDB!'))
    console.log(chalk.red(err))
  }
})

const app = require('./config/express')(db)
require('./config/passport')()
app.listen(config.port)

exports = module.exports = app
console.log('puddleJump started on port ' + config.port)
