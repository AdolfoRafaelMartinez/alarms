'use strict';

// Configuring the Articles module
angular.module('articles').run(['Menus',
	function(Menus) {
		// Set top bar menu items
		Menus.addMenuItem('topbar', 'Plans', 'articles', 'dropdown', '/articles(/create)?');
		Menus.addSubMenuItem('topbar', 'articles', 'List Plans', 'articles');
		Menus.addSubMenuItem('topbar', 'articles', 'New Plan', 'articles/create');
	}
]);
