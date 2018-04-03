const core       = require('../../app/controllers/core.server.controller')
const uuid       = require('uuid')
const multiparty = require('multiparty')
const fs         = require('fs')
const path       = require('path')

module.exports = function (app) {
	app.route('/').get(core.index)

	app.route('/privacy.html').get(core.privacy)
	app.route('/terms.html').get(core.terms)

  app.delete('/projects/:projectId/files', function(req, res) {
    console.log('deleting', path.join('./../../public/usermedia/', req.params.projectId, req.query.file))
    fs.unlinkSync(path.join(__dirname, './../../public/usermedia/', req.params.projectId, req.query.file))
    res.send('Deleted')
  })

	app.post('/upload', function (req, res) {
		var form = new multiparty.Form()
		form.parse(req, function (err, fields, files) {
			Object.keys(files).forEach(function (key) {
				var file = files[key][0]
				var extension = file.path.substring(file.path.lastIndexOf('.'))
				var filename = fields.project ? file.originalFilename : uuid.v4() + extension
        var relativePath = fields.project ? '/usermedia/' + fields.project : '/uploads/'
				var destPath = path.join(__dirname, './../../public/' + relativePath)
        try {
          fs.accessSync(destPath, fs.constants.R_OK)
        } catch(err) {
          fs.mkdir(destPath)
        }
        var fullFilePath = path.join(destPath, filename)

				var is = fs.createReadStream(file.path)
				var os = fs.createWriteStream(fullFilePath)

				if (is.pipe(os)) {
					fs.unlink(file.path, function (err) { // To unlink the file from temp path after copy
						if (err) {
							console.log(err)
						}
					})

					res.json({
						files: [{
							deleteType: 'DELETE',
							deleteUrl: relativePath + filename,
							thumbnailUrl: relativePath + filename,
							url: relativePath + filename,
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
