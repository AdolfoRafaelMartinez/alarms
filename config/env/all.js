'use strict'

module.exports = {
	app: {
		title: 'puddleJump',
		description: 'Wireless Spread Configuration Utility',
		keywords: 'Wireless, Access Point Configuration'
	},
	port: process.env.PORT || 3000,
	templateEngine: 'swig',
	sessionSecret: 'ousskwHyno',
	sessionCollection: 'sessions',
	assets: {
		lib: {
			css: [
				'public/lib/bootstrap/dist/css/bootstrap.css',
				'public/lib/bootstrap/dist/css/bootstrap-theme.css',
				'public/lib/angular-material/angular-material.css',
				'public/lib/angular-ui-select/select.min.css',
				'public/lib/jQueryFileUpload/css/style.css',
				'public/lib/blueimp-file-upload/css/jquery.fileupload.css',
				'public/lib/blueimp-file-upload/css/jquery.fileupload-ui.css'
			],
			js: [
				'public/lib/bootstrap/dist/js/bootstrap.min.js',
				'public/lib/angular/angular.js',
				'public/lib/angular-resource/angular-resource.js',
				'public/lib/angular-cookies/angular-cookies.js',
				'public/lib/angular-animate/angular-animate.js',
				'public/lib/angular-touch/angular-touch.js',
				'public/lib/angular-aria/angular-aria.js',
				'public/lib/angular-material/angular-material.js',
				'public/lib/angular-sanitize/angular-sanitize.js',
				'public/lib/angular-ui-select/dist/select.min.js',
				'public/lib/angular-ui-router/release/angular-ui-router.js',
				'public/lib/angular-ui-utils/ui-utils.js',
				'public/lib/angular-bootstrap/ui-bootstrap-tpls.js',
				'public/lib/easeljs/lib/easeljs-NEXT.combined.js',

				'public/lib/angular-dragdrop/src/angular-dragdrop.js',
				'public/lib/angular-modal-service/dst/angular-modal-service.js',

				'public/lib/blueimp-file-upload/js/vendor/jquery.ui.widget.js',
				'public/lib/blueimp-load-image/js/load-image.all.min.js',
				'public/lib/blueimp-canvas-to-blob/js/canvas-to-blob.min.js',
				'public/lib/blueimp-file-upload/js/jquery.fileupload.js',
				'public/lib/blueimp-file-upload/js/jquery.fileupload-process.js',
				'public/lib/blueimp-file-upload/js/jquery.fileupload-image.js',
				'public/lib/blueimp-file-upload/js/jquery.fileupload-validate.js',
				'public/lib/blueimp-file-upload/js/jquery.fileupload-angular.js'
			]
		},
		css: [
			'public/modules/**/css/*.css'
		],
		js: [
			'public/config.js',
			'public/application.js',
			'public/modules/*/*.js',
			'public/modules/*/*[!tests]*/*.js'
		],
		tests: [
			'public/lib/angular-mocks/angular-mocks.js',
			'public/modules/*/tests/*.js'
		]
	}
}
