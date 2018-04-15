const core       = require('../../app/controllers/core.server.controller')
const uuid       = require('uuid')
const multiparty = require('multiparty')
const fs         = require('fs')
const fx         = require('mkdir-recursive')
const path       = require('path')
const _          = require('lodash')

module.exports = function (app) {
	app.route('/').get(core.index)

	app.route('/privacy.html').get(core.privacy)
	app.route('/terms.html').get(core.terms)

  app.delete('/projects/:projectId/files', function(req, res) {
    let filepath = path.join(__dirname, './../../public/usermedia', req.params.projectId, req.query.siteId, req.query.bldgId, req.query.file)
    console.log('deleting', filepath)
    fs.unlinkSync(filepath)
    res.send('Deleted')
  })

	app.post('/upload', function (req, res) {
		var form = new multiparty.Form()
		form.parse(req, function (err, fields, files) {
      if (!_.get(fields, 'project.0')) return res.error('Please specify project ID')
      let projectId = _.get(fields, 'project.0')
      let siteId = _.get(fields, 'site.0')
      let bldgId = _.get(fields, 'bldg.0')
			Object.keys(files).forEach(function (key) {
				let file = files[key][0]
				let extension = file.path.substring(file.path.lastIndexOf('.'))
				let filename = fields.project ? file.originalFilename : uuid.v4() + extension
        let ppath = path.join('/usermedia/', projectId, siteId, bldgId)
        let relativePath = fields.project ? ppath : '/uploads/'
				let destPath = path.join(__dirname, './../../public/' + relativePath)

        try {
          fs.accessSync(destPath, fs.constants.R_OK)
        } catch(err) {
          fx.mkdirSync(destPath)
        }

        let fullFilePath = path.join(destPath, filename)
				let is = fs.createReadStream(file.path)
				let os = fs.createWriteStream(fullFilePath)

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
