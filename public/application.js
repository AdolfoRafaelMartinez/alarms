'use strict';

//Start by defining the main module and adding the module dependencies
angular.module(ApplicationConfiguration.applicationModuleName, ApplicationConfiguration.applicationModuleVendorDependencies);

// Setting HTML5 Location Mode
angular.module(ApplicationConfiguration.applicationModuleName).config(['$locationProvider',
	function($locationProvider) {
		$locationProvider.hashPrefix('!');
	}
]);

//Then define the init function for starting up the application
angular.element(document).ready(function() {
	//Fixing facebook bug with redirect
	if (window.location.hash === '#_=_') window.location.hash = '#!';

	//Then init the app
	angular.bootstrap(document, [ApplicationConfiguration.applicationModuleName]);
});

function stop() {
    createjs.Ticker.removeEventListener("tick", tick);
}

if (document.body) {
    setupEmbed();
} else {
    document.addEventListener("DOMContentLoaded", setupEmbed);
}

function setupEmbed() {
    if (window.top != window) {
        document.body.className += " embedded";
    }
}

var o = window.examples = {};
o.showDistractor = function(id) {
    var div = id ? document.getElementById(id) : document.querySelector("div canvas").parentNode;
    div.className += " loading";
};

o.hideDistractor = function() {
    var div = document.querySelector(".loading");
    div.className = div.className.replace(/\bloading\b/);
};
