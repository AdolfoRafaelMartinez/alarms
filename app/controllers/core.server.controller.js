exports.index = function (req, res) {
	res.render('index', {
		user: req.user || null,
		request: req
	})
}
exports.terms = function(req, res) {
    res.render('terms', {
    })
}
exports.privacy = function(req, res) {
    res.render('privacy', {
    })
}
