'use strict';

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
			],
			js: [
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

                'public/lib/blueimp/JavaScript-Load-Image/js/load-image.all.min.js',
                'public/lib/blueimp/JavaScript-Load-Image/js/lib/jquery.Jcrop.js',
                'public/lib/blueimp/JavaScript-Canvas-To-Blob/js/canvas-to-blob.min.js',

                'public/lib/ngFileUpload/js/uuid.js',
                'public/lib/ngFileUpload/js/xhr_post.js',
                'public/lib/ngFileUpload/js/ng_file_upload.js'
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
};
