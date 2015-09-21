'use strict';

/*globals _ */

// Drawing service on HTML5 canvas
angular.module('core').service('Drawing', ['contextMenu', '$q', '$timeout',
	function(contextMenu, $q, $timeout) {
        var canvas, stage, layers, current_layer, distances, floorplan;

        var mouseTarget; // the display object currently under the mouse, or being dragged
        var dragStarted; // indicates whether we are currently in a drag operation
        var mouse_mode = 'ap';
        var ap_clicked;
        var mouse_last_position;
        var mouse_last_click;
        var calibration_step;
        var update = true;
        var is_dragging = false;
        var selectedAP;
        var plan = {
            stage_scale: 100,
            stage: {
                x: 0,
                y: 0,
                regX: 0,
                regY: 0
            },
            ap_index: 0,
            stage_ppm: 300,
            radius: 0,
            real_radius: 0,
            floor_width: 0,
            floor_width_px: 0
        };

        var show_overlaps = true;
        var show_distances = true;

        var AP_CIRCLE_STROKE_RGB = '#888';
        var AP_CIRCLE_RGBA = 'rgba(180, 220, 255, 0.6)';
        var AP_CIRCLE_RGBA_OPAQUE = 'rgba(200, 200, 255, 0.2)';
        var DISTANCE_STROKE_RGB = '#ccc';
        var DISTANCE_TEXT_RGB = '#888';
        var DISTANCE_CUT_OFF = 60;
        var HASH_COLOR = [
            { overlap: 21, color: 'rgba(255, 0, 0, 0.2)' },
            { overlap: 14, color: 'rgba(0, 255, 0, 0.2)' },
            { overlap: 0,  color: 'rgba(240, 255, 40, 0.2)' }
 ];

        var tick = function(event) {
            // this set makes it so the stage only re-renders when an event handler indicates a change has happened.
            if (update) {
                update = false; // only update once
                stage.update(event);
            }
        };

        function addListeners(canvas, drawing) {
            canvas.addEventListener('mousewheel', drawing.mouseWheelEvent.bind(drawing), false);
            canvas.addEventListener('DOMMouseScroll', drawing.mouseWheelEvent.bind(drawing), false);
            canvas.addEventListener('MozMousePixelScroll', drawing.mouseWheelEvent.bind(drawing), false);
            canvas.addEventListener('touchstart', drawing.touchStart.bind(drawing), false);
            canvas.addEventListener('touchmove', drawing.touchMove.bind(drawing), false);
            canvas.addEventListener('touchend', drawing.touchEnd.bind(drawing), false);
            canvas.addEventListener('mousedown', drawing.touchStart.bind(drawing), false);
            canvas.addEventListener('mousemove', drawing.touchMove.bind(drawing), false);
            canvas.addEventListener('mouseup', drawing.touchEnd.bind(drawing), false);
        }

        var addHandlers = function(ap) {
            var names;

            function mousedown(evt) {
                if (mouse_mode !== 'ap') return;
                ap_clicked = true;
                evt.stopPropagation();
                evt.preventDefault();
                if (evt.nativeEvent.button === 2) {
                    selectedAP = ap;
                    return;
                }
                this.parent.addChild(this);
                names = [];
                this.offset = {
                    x: this.x - evt.stageX * 100 / plan.stage_scale,
                    y: this.y - evt.stageY * 100 / plan.stage_scale
                };
                for (var i=0; i<ap.distances.length; i++) names.push(distances.getChildByName(ap.distances[i].name));
            };

            function mousemove(evt) {
                if (mouse_mode !== 'ap') return;
                ap.x = evt.stageX * 100 / plan.stage_scale + ap.offset.x;
                ap.y = evt.stageY * 100 / plan.stage_scale + ap.offset.y;
                var i, l = names.length;

                var mperpx = 1 / plan.stage_ppm;
                ap.realx = mperpx * ap.x * plan.stage_scale / 100;
                ap.realy = mperpx * ap.y * plan.stage_scale / 100;

                for (i=0; i<l; i++) {
                    if (ap === names[i].ap_start) {
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
            };

            function mouseup(evt) {
                ap_clicked = false;
            };

            ap.on('mousedown', mousedown);
            ap.on('touchstart', mousedown);
            ap.on('pressmove', mousemove);
            ap.on('mousemove', mousemove);
            ap.on('touchmove', mousemove);
            ap.on('mouseup', mouseup);
            ap.on('pressup', mouseup);
            ap.on('touchend', mouseup);

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
        }

        var addDistances = function(ap) {
            var children, i, d, m, layers_length = layers.length;
            for (i=0; i<layers_length; i++) {
                ap.distances = [];
                /*jshint -W083 */
                _.each(layers[i].children, function(ap2) {
                    if (ap !== ap2) {
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

                        var text = new createjs.Text(d.toFixed(2) + ' ft', '12px Arial', '#888888');
                        if (d > DISTANCE_CUT_OFF) {
                            text.text = '';
                        }
                        text.x = m.p_start.x + (m.p_end.x - m.p_start.x) /2 - 10;
                        text.y = m.p_start.y + (m.p_end.y - m.p_start.y) /2 - 10;
                        text.textBaseline = 'alphabetic';
                        text.name = m.name;
                        m.ptext = text;
                        distances.addChild(text);
                    }
                });
            }
        };

        this.touchStart = function(e) {
            mouse_last_position = { x: e.x, y: e.y };
            mouse_last_click = { x: e.x, y: e.y };
        };

        this.touchMove = function(e) {
            if (!mouse_last_click) return;
            if (mouse_mode === 'ap' || !ap_clicked) {
                is_dragging = true;
            }
            if (mouse_mode !== 'ap' || !ap_clicked) {
                stage.x += e.x - mouse_last_position.x;
                stage.y += e.y - mouse_last_position.y;
                update = true;
                mouse_last_position = { x: e.x, y: e.y  };
            }
        };

        this.touchEnd = function(e) {
            if (e.button !== 2 && !is_dragging) {
                var x = (e.x - stage.x - canvas.offsetParent.offsetLeft - 20) * 100 / plan.stage_scale;
                var y = (e.y - stage.y - canvas.offsetParent.offsetTop - 20) * 100 / plan.stage_scale;
                if (calibration_step === 1) {
                    calibration_step++;
                    this.calibrationLine(x, y, 0);
                } else if (calibration_step === 2) {
                    this.calibrationLine(x, y, 1);
                    this.calibrationDone();
                } else if (mouse_last_click.x === e.x && mouse_last_click.y === e.y) {
                    this.addAP(x, y, plan.real_radius);
                }
            }
            is_dragging = false;
            mouse_last_click = false;
        };

        this.mouseWheelEvent = function(e) {
            e = window.event || e;
            e.preventDefault();
            e.stopPropagation();
            var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))) * 1.02;
            if (delta < 0) delta = 0.98;
            var mousex = e.x - $(canvas)[0].offsetParent.offsetLeft -20;
            var mousey = e.y - $(canvas)[0].offsetParent.offsetTop -20;
            stage.x = mousex - delta *(mousex - stage.x);
            stage.y = mousey - delta *(mousey - stage.y);
            this.scale(delta * plan.stage_scale);

            return false;
        };

        this.initBoard = function(r) {
            mouse_mode = 'ap';
            plan.radius = r;
            plan.real_radius = r;
            DISTANCE_CUT_OFF = r * 2;
            canvas = document.getElementsByTagName('canvas')[0];
            canvas.width = canvas.parentElement.clientWidth - 40;
            canvas.height = canvas.parentElement.clientHeight - 40;
            canvas.style.width = (canvas.parentElement.clientWidth - 40) + 'px';
            stage = new createjs.Stage(canvas);
            if (!plan || !plan.floor_width) {
                plan.floor_width = 200; // m or ft
                plan.floor_width_px = canvas.width;
            }
            plan.stage_ppm = canvas.width / plan.floor_width;

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
            contextMenu.setup();
        };

        var drawIntersections = function(ap, processing) {
            var c, d, r2, i, j, rsq, overlap, apb, alpha, beta, color;
            var hash_color, leftside, rightside;
            var intersections = [];
            _.each(stage.children, function(child) {
                if (child.layer_type === 'ap') {
                    for (i=0; i<child.children.length; i++) {
                        if (child.children[i] !== ap) {
                            c = child.children[i];
                            d = Math.sqrt(Math.pow(c.x - ap.x, 2) + Math.pow(c.y - ap.y, 2));
                            if (d < plan.radius *2) {
                                r2 = 2 * plan.radius;
                                rsq = Math.pow(plan.radius, 2);
                                overlap = ((2 * rsq * Math.acos(d/r2) - d/2 * Math.sqrt(4*rsq - d*d)) / (2 * rsq * Math.acos(0)) * 100).toFixed(0);

                                var text = new createjs.Text('' + overlap + '%', '12px Arial', DISTANCE_TEXT_RGB);
                                alpha = Math.atan((ap.y - c.y)/(ap.x - c.x));
                                beta  = Math.acos(Math.sqrt(Math.pow(ap.x - c.x, 2) + Math.pow(ap.y - c.y, 2)) / 2 /plan.radius);
                                apb = alpha + beta;
                                text.x = plan.radius * Math.cos(apb);
                                text.y = plan.radius * Math.sin(apb);
                                text.textBaseline = 'alphabetic';
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
                                hash.graphics.beginFill(hash_color).arc(0, 0, plan.radius -2, leftside * Math.PI + alpha - beta, leftside * Math.PI + alpha + beta + 0.01);
                                hash.graphics.beginFill(hash_color).arc(c.x - ap.x, c.y - ap.y, plan.radius -2, rightside * Math.PI + alpha - beta, rightside * Math.PI + alpha + beta + 0.01);
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

        this.startCalibration = function(cb) {
            calibration_step = 1;
            this.calibrationDone = cb;
        };

        this.calibrationLine = function(x, y, end) {
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
        };

        this.completeCalibration = function(distance) {
            calibration_step = false;
            stage.removeChild(this.calibration_line);
            var c = this.calibration_line;
            var d = Math.sqrt(Math.pow(c.p_start.x - c.p_end.x, 2) + Math.pow(c.p_start.y - c.p_end.y, 2));
            plan.stage_ppm = d / distance;
            plan.floor_width = plan.floor_width_px / plan.stage_ppm;
            this.updateSignalStrength(plan.real_radius);
        };

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
            container.x = x;
            container.y = y;
            container.realx = mperpx * container.x;
            container.realy = mperpx * container.y;

            var overlaps = new createjs.Container();
            container.overlaps = overlaps;
            overlaps.mouseEnabled = false;

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
            container.addChild(overlaps);

            var text = new createjs.Text('AP ' + plan.ap_index++, '12px Arial', DISTANCE_TEXT_RGB);
            text.x = -15;
            text.y = -10;
            text.textBaseline = 'alphabetic';
            container.addChild(text);

            addDistances.call(this, container);
            drawIntersections(container);

            update = true;
        };

        this.deleteSelectedAP = function() {
            if (!selectedAP) return;
            contextMenu.close();
            var i, j, k;
            var selected_distances_length = selectedAP.distances.length;
            for (i=distances.children.length-1; i>=0; i--) {
                for (k=selected_distances_length -1; k>=0; k--) {
                    if (selectedAP.distances[k] && distances.children[i].name === selectedAP.distances[k].name) {
                        distances.removeChild(distances.children[i]);
                        break;
                    }
                }
            }
            for (i=0; i<layers.length; i++) {
                _.each(layers[i].children, function(ap2) {
                    for (j=ap2.distances.length -1; j>=0; j--) {
                        for (k=selected_distances_length -1; k>=0; k--) {
                            if (ap2.distances[j] && selectedAP.distances[k]) {
                                if (ap2.distances[j].name === selectedAP.distances[k].name) {
                                    ap2.distances.splice(j, 1);
                                }
                            }
                        }
                    };
                });
            }
            layers[current_layer].removeChild(selectedAP);
            this.toggleOverlaps();
            update = true;
            this.toggleOverlaps();
        };

        this.updateSignalStrength = function(signal_radius) {
            DISTANCE_CUT_OFF = signal_radius * 2;
            if (stage) {
                plan.radius = signal_radius * plan.stage_ppm; // in pixels
                _.each(stage.children, function(child) {
                    if (child.layer_type === 'ap') {
                        for (var i=0; i<child.children.length; i++) {
                            for (var j=0; j<child.children[i].children.length; j++) {
                                if (child.children[i].children[j].puddleShape === 'signal') {
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
                if (child.layer_type === 'ap') {
                    for (var i=0; i<child.children.length; i++) {
                        drawIntersections(child.children[i]);
                    }
                }
            });
            update = true;
        };

        this.stage_scale = 100;

        this.scale = function(percent) {
            plan.stage_scale = this.stage_scale = percent;
            plan.stage_ppm = percent / 100 * plan.floor_width_px / plan.floor_width;
            stage.setTransform(stage.x, stage.y, percent/100, percent/100).update();
        };

        this.addFloorPlan = function(url) {
            var self = this;
            var img = new Image();
            var defer = $q.defer();
            img.src = url.replace('public/', '');
            img.onload = function(event) {
                var t = event.target;
                var f = new createjs.Bitmap(t);
                f.x = 0;
                f.y = 0;
                f.regX = 0;
                f.regY = 0;
                plan.floor_width_px = this.width;
                var scaleX = canvas.width / this.width;
                var scaleY = canvas.height / this.height;
                if (scaleX > scaleY) {
                    self.scale(scaleY*100);
                } else {
                    self.scale(scaleX*100);
                }
                floorplan.addChild(f);
                update = true;
                $timeout(function() {
                    defer.resolve();
                }, 0);
            };

            return defer.promise;
        };

        this.toJSON = function() {
            plan.stage.x = stage.x;
            plan.stage.y = stage.y;
            plan.stage.regX = stage.regX;
            plan.stage.regY = stage.regY;
            var json = {
                plan: plan,
                floorplan: floorplan.children[0] ? floorplan.children[0].image.src : '',
                aps: []
            };

            var children, i, d, m, layers_length = layers.length;
            for (i=0; i<layers_length; i++) {
                /*jshint -W083 */
                _.each(layers[i].children, function(ap) {
                    json.aps.push({
                        name: ap.name,
                        x: ap.x,
                        y: ap.y
                    });
                });
            }

            return json;
        };

        this.getThumb = function() {
            return stage.toDataURL();
        };

        this.loadPlan = function(data, signal_radius) {
            $timeout(function() {
                plan = data.plan;
                this.initBoard(signal_radius);
                this.scale(100);
                if (data.floorplan) {
                    this.addFloorPlan(data.floorplan)
                        .then(function() {
                            if (data.plan && data.plan.stage_scale) this.scale(data.plan.stage_scale);
                        }.bind(this));
                }
                stage.x = data.plan.stage.x;
                stage.y = data.plan.stage.y;
                _.each(data.aps, function(ap) {
                    this.addAP(ap.x, ap.y, signal_radius);
                }.bind(this));
                this.updateSignalStrength(signal_radius);
            }.bind(this), 100);
        };

        this.selectTool = function(mode) {
            mouse_mode = mode;
        };
    }
]);
