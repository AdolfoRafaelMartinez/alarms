'use strict';

//Menu service used for managing  menus
angular.module('core').service('Drawing', [
   '$timeout',

	function($timeout) {
        var canvas, stage, container;

        var mouseTarget; // the display object currently under the mouse, or being dragged
        var dragStarted; // indicates whether we are currently in a drag operation
        var offset;
        var update = true;
        var is_dragging = false;

        var tick = function(event) {
            // this set makes it so the stage only re-renders when an event handler indicates a change has happened.
            if (update) {
                update = false; // only update once
                stage.update(event);
            }
        };

        var addHandlers = function(object) {
                object.on('mousedown', function(evt) {
                    this.parent.addChild(this);
                    this.offset = {
                        x: this.x - evt.stageX,
                        y: this.y - evt.stageY
                    };
                });

                object.on('pressmove', function(evt) {
                    this.x = evt.stageX + this.offset.x;
                    this.y = evt.stageY + this.offset.y;
                    is_dragging = true;
                    // indicate that the stage should be updated on the next tick:
                    update = true;
                });

                object.on('rollover', function(evt) {
                    this.graphics.clear().beginFill('#cdf').drawCircle(0, 0, 50);
                    update = true;
                });

                object.on('rollout', function(evt) {
                    this.graphics.clear().beginFill('DeepSkyBlue').drawCircle(0, 0, 50);
                    update = true;
                });
            };


        this.initBoard = function() {
            $timeout(function() {
                canvas = document.getElementsByTagName('canvas')[0];
                console.log(canvas.parentElement.clientWidth);
                canvas.width = canvas.parentElement.clientWidth - 40;
                canvas.height = canvas.parentElement.clientHeight - 40;
                canvas.style.width = (canvas.parentElement.clientWidth - 40) + 'px';
                stage = new createjs.Stage(canvas);

                // enable touch interactions if supported on the current device:
                createjs.Touch.enable(stage);

                // enabled mouse over / out events
                stage.enableMouseOver(10);
                stage.mouseMoveOutside = true; // keep tracking the mouse even when it leaves the canvas

                container = new createjs.Container();
                stage.addChild(container);

                createjs.Ticker.addEventListener('tick', tick);
            }, 100);
        };

        this.addAP = function(evt) {
            if (is_dragging) {
                is_dragging = false;
                return;
            }

            var circle = new createjs.Shape();
            circle.graphics.beginFill('DeepSkyBlue').drawCircle(0, 0, 50);
            circle.x = evt.offsetX;
            circle.y = evt.offsetY;
            circle.regX = circle.regY = 0;
            circle.scaleX = circle.scaleY = circle.scale = 1;
            circle.cursor = 'pointer';

            addHandlers.call(this, circle);
            container.addChild(circle);
            update = true;
        };
    }
]);
