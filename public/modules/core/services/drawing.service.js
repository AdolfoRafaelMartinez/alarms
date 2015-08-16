'use strict';

//Menu service used for managing  menus
angular.module('core').service('Drawing', [
	function() {
        var canvas, stage, layers, current_layer, distances, floorplan;

        var mouseTarget; // the display object currently under the mouse, or being dragged
        var dragStarted; // indicates whether we are currently in a drag operation
        var update = true;
        var is_dragging = false;
        var floor_width;
        var floor_width_px;
        var plan = {
            stage_scale: 100,
            ap_index: 0,
            stage_ppm: 300,
            radius: 0,
            real_radius: 0
        };

        var show_overlaps = true;
        var show_distances = true;

        var AP_CIRCLE_STROKE_RGB = '#888';
        var AP_CIRCLE_RGBA = 'rgba(180, 220, 255, 0.1)';
        var AP_CIRCLE_RGBA_OPAQUE = 'rgba(200, 200, 255, 0.2)';
        var DISTANCE_STROKE_RGB = '#ccc';
        var DISTANCE_TEXT_RGB = '#888';
        var DISTANCE_CUT_OFF = 60;
        var HASH_COLOR = [
            { overlap: 21, color: '#FF0000' },
            { overlap: 14, color: '#00FF00' },
            { overlap: 0,  color: '#F7FE2E' }
 ];

        var tick = function(event) {
            // this set makes it so the stage only re-renders when an event handler indicates a change has happened.
            if (update) {
                update = false; // only update once
                stage.update(event);
            }
        };

        var addHandlers = function(ap) {
            var names;

            ap.on('mousedown', function(evt) {
                this.parent.addChild(this);
                names = [];
                this.offset = {
                    x: this.x - evt.stageX * 100 / plan.stage_scale,
                    y: this.y - evt.stageY * 100 / plan.stage_scale
                };
                for (var i=0; i<ap.distances.length; i++) names.push(distances.getChildByName(ap.distances[i].name));
            });

            ap.on('pressmove', function(evt) {
                ap.x = evt.stageX * 100 / plan.stage_scale + ap.offset.x;
                ap.y = evt.stageY * 100 / plan.stage_scale + ap.offset.y;
                var i, l = names.length;

                var mperpx = 1 / plan.stage_ppm;
                ap.realx = mperpx * ap.x * plan.stage_scale / 100;
                ap.realy = mperpx * ap.y * plan.stage_scale / 100;

                for (i=0; i<l; i++) {
                    if (ap == names[i].ap_start) {
                        names[i].p_start.x = ap.x;
                        names[i].p_start.y = ap.y;
                    } else {
                        names[i].p_end.x = ap.x;
                        names[i].p_end.y = ap.y;
                    }
                    names[i].pdistance  = Math.sqrt(
                                            Math.pow(names[i].ap_start.realx - names[i].ap_end.realx, 2) +
                                            Math.pow(names[i].ap_start.realy - names[i].ap_end.realy, 2)
                    );
                    if (names[i].pdistance < DISTANCE_CUT_OFF) {
                        names[i].graphics.clear().setStrokeStyle(1).beginStroke(DISTANCE_STROKE_RGB)
                            .moveTo(names[i].p_start.x, names[i].p_start.y)
                            .lineTo(names[i].p_end.x, names[i].p_end.y);
                        names[i].ptext.text = names[i].pdistance.toFixed(2) + ' ft';
                        names[i].ptext.x    = names[i].p_start.x + (names[i].p_end.x - names[i].p_start.x) /2;
                        names[i].ptext.y    = names[i].p_start.y + (names[i].p_end.y - names[i].p_start.y) /2;
                    } else {
                        names[i].graphics.clear();
                        names[i].ptext.text = '';
                    }
                }

                drawIntersections(ap);
                is_dragging = true;
                update = true;
            });

            ap.on('rollover', function(evt) {
                if (this.children[0].graphics) {
                    this.children[0].graphics.clear().setStrokeStyle(1).beginFill(AP_CIRCLE_RGBA_OPAQUE).beginStroke(AP_CIRCLE_STROKE_RGB).drawCircle(0, 0, plan.radius);
                    update = true;
                }
            });

            ap.on('rollout', function(evt) {
                if (this.children[0].graphics) {
                    this.children[0].graphics.clear().setStrokeStyle(1).beginFill(AP_CIRCLE_RGBA).beginStroke(AP_CIRCLE_STROKE_RGB).drawCircle(0, 0, plan.radius);
                    update = true;
                }
            });
        };

        function getNewName() {
            return _.uniqueId();
        };

        var addDistances = function(ap) {
            var children, i, d, m, layers_length = layers.length;
            for (i=0; i<layers_length; i++) {
                ap.distances = [];
                _.each(layers[i].children, function(ap2) {
                    if (ap != ap2) {
                        m = new createjs.Shape();
                        d = Math.sqrt(Math.pow(ap2.realx - ap.realx, 2) + Math.pow(ap2.realy - ap.realy, 2));
                        if (d < DISTANCE_CUT_OFF) {
                            m.graphics.setStrokeStyle(1).beginStroke(DISTANCE_STROKE_RGB).moveTo(ap.x, ap.y).lineTo(ap2.x, ap2.y);
                        }
                        m.name = getNewName();
                        m.p_start   = {x: ap.x, y: ap.y};
                        m.ap_start  = ap;
                        m.p_end     = {x: ap2.x, y: ap2.y};
                        m.ap_end    = ap2;
                        m.pdistance = d;
                        ap.distances.push(m);
                        ap2.distances.push(m);
                        distances.addChild(m);

                        var text = new createjs.Text(d.toFixed(2) + ' ft', "12px Arial", "#888888");
                        if (d > DISTANCE_CUT_OFF) {
                            text.text = '';
                        }
                        text.x = m.p_start.x + (m.p_end.x - m.p_start.x) /2 - 10;;
                        text.y = m.p_start.y + (m.p_end.y - m.p_start.y) /2 - 10;
                        text.textBaseline = "alphabetic";
                        m.ptext = text;
                        distances.addChild(text);
                    }
                });
            }
        };

        this.touchStart = function(e) {
            // this.addAP(e);
        };

        this.touchMove = function(e) {
            // console.log(e);
        };

        this.touchEnd = function(e) {
            // console.log(e);
        };

        this.mouseWheelEvent = function(e) {
            e.preventDefault();
            e.stopPropagation();
            var e = window.event || e;
            var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))) * 1.02;
            if (delta < 0) delta = 0.98;
            this.scale(delta * plan.stage_scale);

            return false;
        };

        this.initBoard = function(r) {
            plan.radius = r;
            plan.real_radius = r;
            DISTANCE_CUT_OFF = r * 2;
            canvas = document.getElementsByTagName('canvas')[0];
            canvas.width = canvas.parentElement.clientWidth - 40;
            canvas.height = canvas.parentElement.clientHeight - 40;
            canvas.style.width = (canvas.parentElement.clientWidth - 40) + 'px';
            stage = new createjs.Stage(canvas);
            floor_width = 200; // m or ft
            floor_width_px = canvas.width;
            plan.stage_ppm = canvas.width / floor_width;

            // enable touch interactions if supported on the current device:
            createjs.Touch.enable(stage);

            // enabled mouse over / out events
            stage.enableMouseOver(10);
            addListeners(canvas, this);
            stage.mouseMoveOutside = true; // keep tracking the mouse even when it leaves the canvas

            // add default layers
            layers = [new createjs.Container()];
            layers[0].layer_type = 'ap';
            current_layer = 0;
            floorplan = new createjs.Container();
            floorplan.layer_type = 'background';
            distances = new createjs.Container();
            distances.layer_type = 'distances';
            stage.addChild(floorplan);
            stage.addChild(layers[0]);
            stage.addChild(distances);

            createjs.Ticker.addEventListener('tick', tick);
        };

        var drawIntersections = function(ap, processing) {
            var c, d, r2, i, j, rsq, overlap, apb, alpha, beta, color;
            var hash_color, leftside, rightside;
            var intersections = [];
            _.each(stage.children, function(child) {
                if (child.layer_type == 'ap') {
                    for (i=0; i<child.children.length; i++) {
                        if (child.children[i] != ap) {
                            c = child.children[i];
                            d = Math.sqrt(Math.pow(c.x - ap.x, 2) + Math.pow(c.y - ap.y, 2));
                            if (d < plan.radius *2) {
                                r2 = 2 * plan.radius;
                                rsq = Math.pow(plan.radius, 2);
                                overlap = ((2 * rsq * Math.acos(d/r2) - d/2 * Math.sqrt(4*rsq - d*d)) / (2 * rsq * Math.acos(0)) * 100).toFixed(0);

                                var text = new createjs.Text('' + overlap + '%', "12px Arial", DISTANCE_TEXT_RGB);
                                alpha = Math.atan((ap.y - c.y)/(ap.x - c.x));
                                beta  = Math.acos(Math.sqrt(Math.pow(ap.x - c.x, 2) + Math.pow(ap.y - c.y, 2)) / 2 /plan.radius);
                                apb = alpha + beta;
                                text.x = plan.radius * Math.cos(apb);
                                text.y = plan.radius * Math.sin(apb);
                                text.textBaseline = "alphabetic";
                                // ap.addChild(text);

                                leftside = 0;
                                if (ap.x >= c.x) leftside = 1;
                                rightside = 1 - leftside;
                                for (color=0; color < HASH_COLOR.length; color++) {
                                    if (overlap > HASH_COLOR[color].overlap) {
                                        hash_color = HASH_COLOR[color].color;
                                        break;
                                    }
                                }

                                var hash = new createjs.Shape();
                                hash.puddleShape = 'hash';
                                hash.graphics.beginFill(hash_color).arc(0, 0, plan.radius, leftside * Math.PI + alpha - beta, leftside * Math.PI + alpha + beta + 0.01);
                                hash.graphics.beginFill(hash_color).arc(c.x - ap.x, c.y - ap.y, plan.radius, rightside * Math.PI + alpha - beta, rightside * Math.PI + alpha + beta + 0.01);
                                intersections.push(hash);

                                // update the intersections on the adjacent AP as well
                                if (!processing) drawIntersections(c, true);
                            }
                        }
                    }
                }
            });

            for (j=0; j<ap.children.length; j++) {
                ap.overlaps.removeAllChildren();
            }
            if (show_overlaps) {
                for (j=0; j<intersections.length; j++) {
                    ap.overlaps.addChild(intersections[j]);
                }
            }
        };

        this.calibrationLine = function(evt, end) {
            var x = evt.offsetX * 100 / plan.stage_scale;
            var y = evt.offsetY * 100 / plan.stage_scale;
            if (end) {
                this.calibration_line.graphics.lineTo(x, y);
                this.calibration_line.p_end = {x: x, y: y};
                update = true;
            } else {
                this.calibration_line = new createjs.Shape();
                this.calibration_line.graphics.setStrokeStyle(1).beginStroke(DISTANCE_STROKE_RGB).moveTo(x, y);
                this.calibration_line.p_start = {x: x, y: y};
                stage.addChild(this.calibration_line);
            }
        }

        this.completeCalibration = function(distance) {
            stage.removeChild(this.calibration_line);
            update = true;
            var c = this.calibration_line;
            var d = Math.sqrt(Math.pow(c.p_start.x - c.p_end.x, 2) + Math.pow(c.p_start.y - c.p_end.y, 2));
            plan.stage_ppm = d / distance;
            floor_width = floor_width_px / plan.stage_ppm;
            this.updateSignalStrength(plan.real_radius);
        }

        this.addAP = function(x, y, signal_radius) {
            if (is_dragging) {
                is_dragging = false;
                return;
            }

            var circle = new createjs.Shape();
            var ap = new createjs.Shape();
            var container = new createjs.Container();
            var mperpx = 1 / plan.stage_ppm;
            addHandlers.call(this, container);
            layers[current_layer].addChild(container);

            container.scaleX = container.scaleY = container.scale = 1;
            container.x = x * 100 / plan.stage_scale;
            container.y = y * 100 / plan.stage_scale;
            container.realx = mperpx * container.x;
            container.realy = mperpx * container.y;

            var overlaps = new createjs.Container();
            container.addChild(overlaps);
            container.overlaps = overlaps;

            circle.id = _.uniqueId();
            circle.graphics.setStrokeStyle(1).beginFill(AP_CIRCLE_RGBA).beginStroke(AP_CIRCLE_STROKE_RGB).drawCircle(0, 0, plan.radius);
            circle.puddleShape = 'signal';
            circle.regX = circle.regY = 0;
            circle.scaleX = circle.scaleY = circle.scale = 1;
            circle.cursor = 'pointer';
            container.addChild(circle);

            ap.graphics.beginFill('Blue').drawRect(-5, -5, 10, 10);
            ap.puddleShape = 'ap';
            ap.regX = ap.regY = 0;
            ap.scaleX = ap.scaleY = ap.scale = 1;
            ap.cursor = 'pointer';
            ap.overlaps = overlaps;
            container.addChild(ap);

            var text = new createjs.Text('AP ' + plan.ap_index++, "12px Arial", DISTANCE_TEXT_RGB);
            text.x = -15;
            text.y = -10;
            text.textBaseline = "alphabetic";
            container.addChild(text);

            addDistances.call(this, container);
            drawIntersections(container);

            update = true;
        };

        this.updateSignalStrength = function(signal_radius) {
            DISTANCE_CUT_OFF = signal_radius * 2;
            plan.real_radius = signal_radius;
            if (stage) {
                plan.radius = signal_radius * plan.stage_ppm; // in pixels
                _.each(stage.children, function(child) {
                    if (child.layer_type == 'ap') {
                        for (var i=0; i<child.children.length; i++) {
                            for (var j=0; j<child.children[i].children.length; j++) {
                                if (child.children[i].children[j].puddleShape == 'signal') {
                                    child.children[i].children[j].graphics.clear().setStrokeStyle(1).beginFill(AP_CIRCLE_RGBA).beginStroke(AP_CIRCLE_STROKE_RGB).drawCircle(0, 0, plan.radius);
                                }
                            }
                        }
                    }
                });

                update = true;
            }
        };

        this.toggleDistances = function() {
            show_distances = !show_distances;
            distances.visible = show_distances;
            update = true;
        };

        /**
         * Overlaps are added as child for the AP container itself;
         * the overlaps container is shown behind the main AP circle container
         */
        this.toggleOverlaps = function() {
            show_overlaps = !show_overlaps;
            _.each(stage.children, function(child) {
                if (child.layer_type == 'ap') {
                    for (var i=0; i<child.children.length; i++) {
                        drawIntersections(child.children[i]);
                    }
                }
            });
            update = true;
        };

        this.scale = function(percent) {
            plan.stage_scale = percent;
            plan.stage_ppm = percent / 100 * floor_width_px / floor_width;
            stage.setTransform(0, 0, percent/100, percent/100).update();
        };

        this.addFloorPlan = function(url) {
            var self = this;
            var img = new Image();
            img.src = url.replace('public/', '');
            img.onload = function(event) {
                var t = event.target;
                var f = new createjs.Bitmap(t);
                f.x = 0;
                f.y = 0;
                f.regX = 0;
                f.regY = 0;
                floor_width_px = this.width;
                var scaleX = canvas.width / this.width;
                var scaleY = canvas.height / this.height;
                if (scaleX > scaleY) {
                    self.scale(scaleY*100);
                } else {
                    self.scale(scaleX*100);
                }
                floorplan.addChild(f);
                update = true;
            };
        };

        this.toJSON = function() {
            var json = {
                plan: plan,
                floorplan: floorplan.children[0] ? floorplan.children[0].image.src : '',
                aps: []
            };

            var children, i, d, m, layers_length = layers.length;
            for (i=0; i<layers_length; i++) {
                _.each(layers[i].children, function(ap) {
                    json.aps.push({
                        name: ap.name,
                        x: ap.x,
                        y: ap.y
                    });
                });
            }

            return json;
        }

        this.getThumb = function() {
            return stage.toDataURL();
        };

        this.loadPlan = function(data, signal_radius) {
            this.initBoard(signal_radius);
            this.scale(100);
            this.updateSignalStrength(signal_radius);
            this.addFloorPlan(data.floorplan);
            this.plan = data.plan;
            _.each(data.aps, function(ap) {
                this.addAP(ap.x, ap.y, signal_radius);
            }.bind(this));
            if (data.plan && data.plan.stage_scale) this.scale(data.plan.stage_scale);
        }
    }
]);

function addListeners(canvas, drawing) {
    canvas.addEventListener('mousewheel', drawing.mouseWheelEvent.bind(drawing), false);
    canvas.addEventListener('DOMMouseScroll', drawing.mouseWheelEvent.bind(drawing), false);
    canvas.addEventListener('MozMousePixelScroll', drawing.mouseWheelEvent.bind(drawing), false);
    canvas.addEventListener('touchstart', drawing.touchStart.bind(drawing), false);
    canvas.addEventListener('touchmove', drawing.touchMove.bind(drawing), false);
    canvas.addEventListener('touchend', drawing.touchEnd.bind(drawing), false);
}
