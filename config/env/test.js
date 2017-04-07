'use strict'

module.exports = {
	db: 'mongodb://localhost/puddlejump-test',
	port: 3001,
	app: {
		title: 'puddleJump - Test Environment'
	},
	assets: {
		lib: {
			css: [
				'public/lib/bootstrap/dist/css/bootstrap.css',
				'public/lib/bootstrap/dist/css/bootstrap-theme.css',
				'public/lib/angular-material/angular-material.css',
				'public/lib/jQueryFileUpload/css/style.css',
				'public/lib/blueimp-file-upload/css/jquery.fileupload.css',
				'public/lib/blueimp-file-upload/css/jquery.fileupload-ui.css',
				'public/lib/lobipanel/dist/css/lobipanel.min.css'
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
				'public/lib/angular-ui-router/release/angular-ui-router.js',
				'public/lib/angular-ui-utils/ui-utils.js',
				'public/lib/angular-bootstrap/ui-bootstrap-tpls.js',
				'public/lib/easeljs/lib/easeljs-NEXT.combined.js',
				'public/lib/caman/dist/caman.full.min.js',

				'public/lib/angular-dragdrop/src/angular-dragdrop.min.js',
				'public/lib/angular-modal-service/dst/angular-modal-service.min.js',

				'public/lib/blueimp-file-upload/js/vendor/jquery.ui.widget.js',
				'public/lib/blueimp-load-image/js/load-image.all.min.js',
				'public/lib/blueimp-canvas-to-blob/js/canvas-to-blob.min.js',
				'public/lib/blueimp-file-upload/js/jquery.fileupload.js',
				'public/lib/blueimp-file-upload/js/jquery.fileupload-process.js',
				'public/lib/blueimp-file-upload/js/jquery.fileupload-image.js',
				'public/lib/blueimp-file-upload/js/jquery.fileupload-validate.js',
				'public/lib/blueimp-file-upload/js/jquery.fileupload-angular.js',

				'public/lib/lobipanel/dist/js/lobipanel.min.js'
			]
		},
		css: 'public/dist/application.min.css',
		js: 'public/dist/application.min.js'
	},
	facebook: {
		clientID: process.env.FACEBOOK_ID || 'APP_ID',
		clientSecret: process.env.FACEBOOK_SECRET || 'APP_SECRET',
		callbackURL: '/auth/facebook/callback'
	},
	twitter: {
		clientID: process.env.TWITTER_KEY || 'CONSUMER_KEY',
		clientSecret: process.env.TWITTER_SECRET || 'CONSUMER_SECRET',
		callbackURL: '/auth/twitter/callback'
	},
	google: {
		clientID: process.env.GOOGLE_ID || 'APP_ID',
		clientSecret: process.env.GOOGLE_SECRET || 'APP_SECRET',
		callbackURL: '/auth/google/callback'
	},
	linkedin: {
		clientID: process.env.LINKEDIN_ID || 'APP_ID',
		clientSecret: process.env.LINKEDIN_SECRET || 'APP_SECRET',
		callbackURL: '/auth/linkedin/callback'
	},
	github: {
		clientID: process.env.GITHUB_ID || 'APP_ID',
		clientSecret: process.env.GITHUB_SECRET || 'APP_SECRET',
		callbackURL: '/auth/github/callback'
	},
	mailer: {
		from: process.env.MAILER_FROM || 'MAILER_FROM',
		options: {
			service: process.env.MAILER_SERVICE_PROVIDER || 'MAILER_SERVICE_PROVIDER',
			auth: {
				user: process.env.MAILER_EMAIL_ID || 'MAILER_EMAIL_ID',
				pass: process.env.MAILER_PASSWORD || 'MAILER_PASSWORD'
			}
		}
	}
}
