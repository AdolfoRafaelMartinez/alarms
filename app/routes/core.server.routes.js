'use strict';
var users = require('../../app/controllers/users.server.controller'),
    core = require('../../app/controllers/core.server.controller'),
    uuid = require('uuid'), // https://github.com/defunctzombie/node-uuid
    multiparty = require('multiparty'), // https://github.com/andrewrk/node-multiparty
    fs = require('fs'),
    path = require('path');

module.exports = function(app) {
    // Root routing

    app.route('/').get(core.index);

    app.post('/upload', function(req, res) {
        var form = new multiparty.Form();
        form.parse(req, function(err, fields, files) {
            Object.keys(files).forEach(function(key) {
                var file = files[key][0];
                var contentType = file.headers['content-type'];
                var extension = file.path.substring(file.path.lastIndexOf('.'));
                var filename = uuid.v4() + extension;
                var destPath = path.join(__dirname, './../../public/uploads/' + filename);

                var headers = {
                    'x-amz-acl': 'public-read',
                    'Content-Length': file.size,
                    'Content-Type': contentType
                };

                var is = fs.createReadStream(file.path);
                var os = fs.createWriteStream(destPath);

                if (is.pipe(os)) {

                    fs.unlink(file.path, function(err) { //To unlink the file from temp path after copy
                        if (err) {
                            console.log(err);
                        }
                    });

                    res.json('/uploads/' + filename);

                } else {
                    return res.json('Error: File not uploaded');
                }
            });

        });
    });
};
