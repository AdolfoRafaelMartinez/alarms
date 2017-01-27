'use strict';

/*globals _ */

// Context Menu service on HTML5 canvas
angular.module('core').service('contextMenu', ['$timeout',
	function($timeout) {
        var opened = false;
        this.disabled = false;
        var menuElement;
        var doc;
        var ap;
		var minWidth, minHeight;
		var top, left;

		function open(event) {
			menuElement.addClass('open');

			var doc = $(document)[0].documentElement;
			var docLeft = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
			var docTop = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
			var elementWidth = menuElement.scrollWidth;
			var elementHeight = menuElement.scrollHeight;
			var canvas = document.getElementsByTagName('canvas')[0];
			var canvas_parent = canvas.parentElement.parentElement;
			var docWidth = doc.clientWidth + docLeft;
			var docHeight = doc.clientHeight + docTop;
			var totalWidth = elementWidth + event.pageX;
			var totalHeight = elementHeight + event.pageY;

			top = Math.max(event.pageY - docTop - canvas_parent.offsetTop - canvas.offsetTop, 0);
			left = Math.max(event.pageX - docLeft - canvas_parent.offsetLeft + 10, 0);

			if (totalWidth > docWidth) {
				left = left - (totalWidth - docWidth);
			}

			if (totalHeight > docHeight) {
				var marginBottom = $scope.marginBottom || 0;
				top = top - (totalHeight - docHeight) - marginBottom;
			}

			menuElement.css('top', top + 'px');
			menuElement.css('left', left + 'px');
			opened = true;
		}

        function close() {
			if (menuElement) {
				window.gMenu = menuElement;
				menuElement.removeClass('open');
				opened = false;
			}
        }

        this.close = function() {
            close();
        };

		function panelize() {
			$timeout(() => {
				let panel = $('#context_menu');
				if (!minWidth) {
					minWidth = panel.width();
					minHeight = panel.height();
				}
				panel.draggable();
				panel.resizable({minWidth: minWidth, minHeight: minHeight});
			}, 100);
		}

        function handleKeyUpEvent(event) {
            if (opened && event.keyCode === 27) {
				// ESCAPE
                close();
            }
        }

        this.handleClickEvent = function(event, ap) {
          if( this.disabled ) {
              event.preventDefault();
              event.stopPropagation();
              return;
          }
          if (opened && event.button !== 2) {
              close();
          } else {
              event.preventDefault();
              event.stopPropagation();
              open(event);
          }
        };

        this.setup = function(menu) {
            this.menu = menu;
			$timeout(() => {
				$(angular.element('canvas')[0]).bind('contextmenu', function(event) {
					event.preventDefault();
					event.stopPropagation();
					if (!this.disabled) {
						if (menuElement !== null) {
							close();
						}
						menuElement = angular.element(
							document.getElementById('context_menu')
						);
						var element = event.target;
						if( this.disabled ) return;
						open(event);
					}
					panelize();
				});
				$(document).bind('keyup', handleKeyUpEvent);
			}, 0);
        };

        this.switchMenu = function(mode) {
			this.menu.mode = mode;
        };

    }
]);
