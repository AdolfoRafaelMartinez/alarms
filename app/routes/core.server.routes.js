const core       = require('../../app/controllers/core.server.controller')
const uuid       = require('uuid')
const multiparty = require('multiparty')
const fs         = require('fs')
const path       = require('path')

module.exports = function (app) {
	app.route('/').get(core.index)

	app.post('/upload', function (req, res) {
		var form = new multiparty.Form()
		form.parse(req, function (err, fields, files) {
			Object.keys(files).forEach(function (key) {
				var file = files[key][0]
				var extension = file.path.substring(file.path.lastIndexOf('.'))
				var filename = uuid.v4() + extension
				var destPath = path.join(__dirname, './../../public/uploads/' + filename)

				var is = fs.createReadStream(file.path)
				var os = fs.createWriteStream(destPath)

				if (is.pipe(os)) {
					fs.unlink(file.path, function (err) { // To unlink the file from temp path after copy
						if (err) {
							console.log(err)
						}
					})

					res.json({
						files: [{
							deleteType: 'DELETE',
							deleteUrl: '/uploads/' + filename,
							thumbnailUrl: '/uploads/' + filename,
							url: '/uploads/' + filename,
							name: filename
						}]
					})
				} else {
					return res.json('Error: File not uploaded')
				}
			})
		})
	})
}
