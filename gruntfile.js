const _ = require('lodash')

const FILE_REPLACEMENTS = {
	'drawing-board': '画板',
	'side-menu': '献立',
	'controls': '制御群',
	'list-plans': '畳列',
	'plans-list': '畳列',
	'list-projects': '企画列',
	'projects-list': '企画列',
	'view-plan': '畳ご覧',
	'edit-plan': '畳編集',
	'create-plan': '畳作成',
	'orphan-plans': '企画なし畳',
	'buildings': '建物',
	'coverage': '分散',
	'plans': '畳',
	'plan': '畳件',
	'projects': '企画',
	'.client.view': '。客。景',
	'.template': '。型'
}

var HTML_REPLACEMENTS = [
	[/(ng-[^"]*"[^"]*)projects([^"]*")/g, '$1企画$2'],
	[/(ng-[^"]*"[^"]*)project([^"]*")/g, '$1企画件$2'],
	[/(ng-[^"]*"[^"]*)plans([^"]*")/g, '$1畳$2'],
	[/(ng-[^"]*"[^"]*)plan([^"]*")/g, '$1畳件$2'],
	['.client.view', '。客。景'],
	['plan-list', '畳リスト']
]

var CSS_REPLACEMENTS = [
]

var JS_REPLACEMENTS = [
	['overlap', '重複'],
	['Buildings', '建物'],
	['Plans', '畳'],
	['Projects', '企画'],
	['buildingId', '建物イド'],
	['planId', '畳イド'],
	['projectId', '企画イド']
]

const COMMON_JS_HTML_REPLACEMENTS = [
	['planSideMenu', '畳献立'],
	['plan-side-menu', '畳献立'],
	['planDrawingBoard', '畳画板'],
	['plan-drawing-board', '畳画板'],
	['planList', '畳リスト'],
	['plan-list', '畳リスト'],
	['plansControls', '畳操作'],
	['plan-controls', '畳操作'],
	['selectWallType', '壁種類を選択'],
	['select-wall-type', '壁種類を選択'],
	['cancelWall', '壁キャンセル'],
	['cancel-wall', '壁キャンセル'],
	['changeUnits', '単位変化'],
	['change-units', '単位変化'],
	['ngRightClick', '右コリック'],
	['ng-right-click', '右コリック'],
	['contextMenu', '脈献立'],
	['context-menu', '脈献立'],
	['focusMe', '入力開始'],
	['focus-me', '入力開始'],

	['showBuilding', '建物見せて'],
	['showSite', 'サイト見せて'],
	['addContact', '新規連絡先'],
	['removeContact', '連絡先消去'],
	['addController', '新規制御'],
	['checkController', '制御有無'],
	['removeController', '制御消去'],
	['updateLicenses', '免許更新'],
	['selectProject', '企画選択'],
	['selectSite', 'サイト選択'],
	['selectBuilding', '建物選択'],
	['selectTool', '家具選択'],
	['switchMenu', '献立スウィッチ'],

	['Drawing', '絵'],
	['PlansController', '畳制御'],
	['findProjects', '企画検索'],
	['updateSignalStrength', 'シグナル力更新'],
	['reIndexAPs', 'エピ索引'],
	['getCurrentAP', '選択されたエピ'],
	['getTotalAPs', 'エピを数えて'],
	['deleteSelectedAP', '選択されたエピ消去'],
	['deleteSelectedWall', '選択された壁消去'],
	['updateControls', '制御更新'],
	['addFloorPlan', '畳加'],
	['centerStage', '舞台を中心'],
	['getThumb', 'サムネ作り'],
	['toggleOverlaps', '重複変化'],
	['toggleDistances', '距離変化'],
	['toggleRadius', '半径変化'],
	['toggleHeatmap', '力の地図を変化'],
	['startCalibration', '校正開始'],
	['completeCalibration', '校正完了'],
	['updateScale', '規模更新'],
	['newPlan', '新しい畳'],
	['createPlanAndLoad', '新しく畳開始'],
	['findOneProject', '企画一枚'],
	['askDeleteProject', '企画消去しようか'],
	['askDeleteSite', 'サイト消去しようか'],
	['askDeleteBuilding', '建物消去しようか']
]

HTML_REPLACEMENTS = HTML_REPLACEMENTS.concat(COMMON_JS_HTML_REPLACEMENTS)
JS_REPLACEMENTS = JS_REPLACEMENTS.concat(COMMON_JS_HTML_REPLACEMENTS)
JS_REPLACEMENTS = JS_REPLACEMENTS.concat(_.map(FILE_REPLACEMENTS, (val, key) => [key.replace(/\//g, '\\/'), val]))

function replaceType (src) {
	if (
		/public\/modules\/.*.html$/.test(src) ||
		/app\/views\/.*html$/.test(src)
	) {
		return 'html'
	} else if (
		/public\/dist\/application.min.css/.test(src)
	) {
		return 'css'
	} else if (
		/public\/dist\/application.min.js/.test(src) ||
		/app\/.*.js$/.test(src)
	) {
		return 'minjs'
	} else {
		return 'unknown'
	}
}

function processContent (content, src) {
	if (replaceType(src) === 'minjs') {
		_.each(JS_REPLACEMENTS, r => {
			console.log('Replacing ', new RegExp(r[0].replace(/\./g, '\\.'), 'g'), ` with ${r[1]} in ${src}`)
			content = content.replace(new RegExp(r[0].replace(/\./g, '\\.'), 'g'), r[1])
		})
	} else if (replaceType(src) === 'css') {
		_.each(CSS_REPLACEMENTS, r => {
			content = content.replace(r[0], r[1])
		})
	} else if (replaceType(src) === 'html') {
		_.each(HTML_REPLACEMENTS, r => {
			content = content.replace(r[0], r[1])
		})
	}

	return content
}

function japaneseFiles (src) {
	let path = src
	_.each(FILE_REPLACEMENTS, (r, key) => {
		path = path.replace(key, r)
	})

	return path
}

function renameFile (dest, src) {
	if (/public\/modules/.test(src) ||
		/app\/routes/.test(src) ||
		/app\/controllers/.test(src) ||
		/app\/views/.test(src)
	) {
		return dest + japaneseFiles(src)
	}

	return dest + src
}

module.exports = function (grunt) {
	// Unified Watch Object
	var watchFiles = {
		serverViews: ['app/views/**/*.*'],
		serverJS: ['gruntfile.js', 'server.js', 'config/**/*.js', 'app/**/*.js'],
		clientViews: ['public/modules/**/views/**/*.html'],
		clientJS: ['public/js/*.js', 'public/modules/**/*.js'],
		clientCSS: ['public/modules/**/*.css'],
		mochaTests: ['app/tests/**/*.js']
	}

	// Project Configuration
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		watch: {
			serverViews: {
				files: watchFiles.serverViews,
				options: {
					livereload: true
				}
			},
			serverJS: {
				files: watchFiles.serverJS,
				tasks: ['jshint'],
				options: {
					livereload: true
				}
			},
			clientViews: {
				files: watchFiles.clientViews,
				options: {
					livereload: true
				}
			},
			clientJS: {
				files: watchFiles.clientJS,
				tasks: ['jshint'],
				options: {
					livereload: true
				}
			},
			clientCSS: {
				files: watchFiles.clientCSS,
				tasks: ['csslint'],
				options: {
					livereload: true
				}
			}
		},
		jshint: {
			all: {
				src: watchFiles.clientJS.concat(watchFiles.serverJS),
				options: {
					jshintrc: true
				}
			}
		},
		csslint: {
			options: {
				csslintrc: '.csslintrc'
			},
			all: {
				src: watchFiles.clientCSS
			}
		},
		uglify: {
			production: {
				options: {
					mangle: true
				},
				src: [
					'public/config.js',
					'public/application.js',
					'public/modules/*/*module.js',
					'public/modules/*/config/*.js',
					'public/modules/*/directives/*.js',
					'public/modules/*/services/*.js',
					'public/modules/*/controllers/*.js'
				],
				dest: 'public/dist/application.min.js'
			}
		},
		copy: {
			production: {
				files: [{
					expand: true,
					dest: 'dist/',
					src: [
						'public/lib/**/*',
						'public/dist/*',
						'app/**/*',
						'public/modules/**/*.html',
						'public/modules/**/*.jpg',
						'public/modules/**/*.png',
						'public/application.js',
						'public/config.js',
						'config/**/*',
						'server.js',
						'node_modules'
					]
				}]
			},
			ja: {
				files: [{
					expand: true,
					dest: 'dist/',
					src: [
						'public/lib/**/*',
						'public/dist/*',
						'app/**/*',
						'public/modules/**/*.html',
						'public/modules/**/*.jpg',
						'public/modules/**/*.png',
						'public/application.js',
						'public/config.js',
						'config/**/*',
						'server.js',
						'package.json'
					],
					rename: renameFile
				}],

				options: {
					process: processContent
				}
			}
		},
		cssmin: {
			combine: {
				files: {
					'public/dist/application.min.css': '<%= applicationCSSFiles %>'
				}
			}
		},
		nodemon: {
			dev: {
				script: 'server.js',
				options: {
					nodeArgs: [],
					ext: 'js,html',
					watch: watchFiles.serverViews.concat(watchFiles.serverJS)
				}
			}
		},
		'node-inspector': {
			custom: {
				options: {
					'web-port': 1337,
					'web-host': 'localhost',
					'debug-port': 5858,
					'save-live-edit': true,
					'no-preload': true,
					'stack-trace-limit': 50,
					'hidden': []
				}
			}
		},
		concurrent: {
			default: ['nodemon', 'watch'],
			debug: ['nodemon', 'watch'],
			options: {
				logConcurrentOutput: true,
				limit: 10
			}
		},
		env: {
			test: {
				NODE_ENV: 'test'
			},
			secure: {
				NODE_ENV: 'secure'
			}
		},
		mochaTest: {
			src: watchFiles.mochaTests,
			options: {
				reporter: 'spec',
				require: 'server.js'
			}
		},
		karma: {
			unit: {
				configFile: 'karma.conf.js'
			}
		},
		clean: {
			production: ['dist']
		}
	})

	// Load NPM tasks
	require('load-grunt-tasks')(grunt)

	// Making grunt default to force in order not to break the project.
	grunt.option('force', true)

	// A Task for loading the configuration object
	grunt.task.registerTask('loadConfig', 'Task that loads the config into a grunt option.', function () {
		require('./config/init')()
		var config = require('./config/config')

		grunt.config.set('applicationJavaScriptFiles', config.assets.js)
		grunt.config.set('applicationCSSFiles', config.assets.css)
	})

	grunt.registerTask('default', ['lint', 'concurrent:default'])

	grunt.registerTask('debug', ['lint', 'concurrent:debug'])

	grunt.registerTask('secure', ['env:secure', 'lint', 'concurrent:default'])

	grunt.registerTask('lint2', ['jshint', 'csslint'])
	grunt.registerTask('lint', [])

	grunt.registerTask('build', ['clean', 'lint', 'loadConfig', 'uglify', 'cssmin', 'copy:production'])

	grunt.registerTask('ja', ['clean', 'lint', 'loadConfig', 'uglify', 'cssmin', 'copy:ja'])

	grunt.registerTask('test', ['env:test', 'mochaTest', 'karma:unit'])
}
