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
          var docLeft = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0),
            docTop = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0),
            elementWidth = menuElement.scrollWidth,
            elementHeight = menuElement.scrollHeight;
          var canvas = document.getElementsByTagName('canvas')[0];
          var canvas_parent = canvas.parentElement.parentElement;
          var docWidth = doc.clientWidth + docLeft,
            docHeight = doc.clientHeight + docTop,
            totalWidth = elementWidth + event.pageX,
            totalHeight = elementHeight + event.pageY,
            left = Math.max(event.pageX - docLeft - canvas_parent.offsetLeft + 10, 0),
            top = Math.max(event.pageY - docTop - canvas_parent.offsetTop - canvas.offsetTop, 0);

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
          console.log('closing', menuElement);
          window.gMenu = menuElement;
          menuElement.removeClass('open');
          opened = false;
        }

        this.close = function() {
            close();
        };

        function handleKeyUpEvent(event) {
            if (opened && event.keyCode === 27) {
                console.log('keyUp', event);
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

        function selectMenu(menu) {
            document.getElementById('apMenu').style.display = 'none';
            document.getElementById('wallMenu').style.display = 'none';
            document.getElementById(menu + 'Menu').style.display = 'block';
        }

        this.setup = function() {
            var self = this;
            selectMenu('ap');
            $timeout(function() {
                $(angular.element('canvas')[0]).bind('contextmenu', function(event) {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!self.disabled) {
                    if (menuElement !== null) {
                      close();
                    }
                    menuElement = angular.element(
                        document.getElementById('context_menu')
                    );
                    var element = event.target;
                    if( self.disabled ) return;
                    open(event);
                  }
                });
                $(document).bind('keyup', handleKeyUpEvent);
            }, 0);
        };

        this.switchMenu = function(menu) {
            selectMenu(menu);
        };

    }
]);
