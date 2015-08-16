'use strict';

// Configuring the Plans module
angular.module('plans').run(['Menus',
	function(Menus) {
		// Set top bar menu items
		Menus.addMenuItem('topbar', 'Plans', 'plans', 'dropdown', '/plans(/create)?');
		Menus.addSubMenuItem('topbar', 'plans', 'List Plans', 'plans');
		Menus.addSubMenuItem('topbar', 'plans', 'New Plan', 'plans/create');
	}
]);
