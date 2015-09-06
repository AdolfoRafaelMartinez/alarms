'use strict';

/*globals _ */

// Context Menu service on HTML5 canvas
angular.module('core').service('contextMenu', ['$timeout',
	function($timeout) {
        var opened = false;
        this.disabled = false;
        var menuElement = angular.element(document.getElementById('context_menu'));
        var doc;
        var ap;

        function open(event) {
          menuElement.addClass('open');

          var doc = $(document)[0].documentElement;
          var docLeft = (window.pageXOffset || doc.scrollLeft) -
              (doc.clientLeft || 0),
            docTop = (window.pageYOffset || doc.scrollTop) -
              (doc.clientTop || 0),
            elementWidth = menuElement.scrollWidth,
            elementHeight = menuElement.scrollHeight;
          var docWidth = doc.clientWidth + docLeft,
            docHeight = doc.clientHeight + docTop,
            totalWidth = elementWidth + event.pageX,
            totalHeight = elementHeight + event.pageY,
            left = Math.max(event.pageX - docLeft, 0),
            top = Math.max(event.pageY - docTop, 0);

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
          menuElement.removeClass('open');
          opened = false;
        }

        this.close = function() {
            close();
        };

        function handleKeyUpEvent(event) {
          if (!this.disabled && opened && event.keyCode === 27) {
              close();
          }
        }

        this.handleClickEvent = function(event, ap) {
          if (!this.disabled && opened && event.button !== 2) {
              close();
          } else {
              event.preventDefault();
              event.stopPropagation();
              open(event);
          }
        };

        this.setup = function() {
            $timeout(function() {
                $(angular.element('canvas')[0]).bind('contextmenu', function(event) {
                  if (!this.disabled) {
                    if (menuElement !== null) {
                      close();
                    }
                    menuElement = angular.element(
                        document.getElementById('context_menu')
                    );
                    var element = event.target;

                    event.preventDefault();
                    event.stopPropagation();
                    open(event);
                  }
                });
                $(document).bind('keyup', handleKeyUpEvent);
            }, 0);
        };
    }
]);
