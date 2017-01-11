'use strict';

/*globals _ */
function ColorLuminance(hex, lum) {

	// validate hex string
	hex = String(hex).replace(/[^0-9a-f]/gi, '');
	if (hex.length < 6) {
		hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
	}
	lum = lum || 0;

	// convert to decimal and change luminosity
	var rgb = '#', c, i;
	for (i = 0; i < 3; i++) {
		c = parseInt(hex.substr(i*2,2), 16);
		c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
		rgb += ('00'+c).substr(c.length);
	}

	return rgb;
}

// Drawing service on HTML5 canvas
angular.module('core').service('Drawing', ['contextMenu', '$q', '$http', '$timeout', 'Heatmap',
function(contextMenu, $q, $http, $timeout, Heatmap) {
	var canvas, stage, layers, current_layer, distances, coverage, floorplan;

	var mouseTarget; // the display object currently under the mouse, or being dragged
	var dragStarted; // indicates whether we are currently in a drag operation
	var mouse_mode = 'ap';
	var ap_clicked;
	var wall_clicked;
	var mouse_last_position;
	var mouse_last_click;
	var calibration_step;
	var current_wall;
	var update = true;
	var is_dragging = false;
	var selectedAP;
	var selectedWall;
	var plan = {
		stage_scale: 100,
		stage: {
			x: 0,
			y: 0,
			regX: 0,
			regY: 0
		},
		ap_index: 1,
		stage_ppm: 300,
		radius: 0,
		real_radius: 0,
		floor_width: 0,
		floor_width_px: 0
	};

	var show_overlaps = true;
	var show_distances = true;
	var canvasMarginW = 80;
	var canvasMarginH = 40;

	var AP_CIRCLE_STROKE_RGB = '#888';
	var AP_CIRCLE_RGBA = 'rgba(180, 220, 255, 0.6)';
	var AP_CIRCLE_RGBA_OPAQUE = 'rgba(200, 200, 255, 0.2)';
	var AP_TEXT_RGB = '#fff';
	var AP_BUBBLE_RGB = '#000';
	var DISTANCE_STROKE_RGB = '#444';
	var DISTANCE_TEXT_RGB = '#aaa';
	var DISTANCE_BUBBLE_RGB = '#fff';
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

	var addWallHandlers = function(wall, index) {
		function mousedown(evt) {
			if (evt.nativeEvent.button === 2) {
				selectedWall = wall;
				contextMenu.switchMenu('wall');
				return;
			}
			evt.stopPropagation();
			evt.preventDefault();
		}

		function mouseup(evt) {
			wall_clicked = false;
		}

		wall.on('mousedown', mousedown);
		wall.on('touchstart', mousedown);
		wall.on('mouseup', mouseup);
		wall.on('pressup', mouseup);
		wall.on('touchend', mouseup);

		wall.on('rollover', function(evt) {
			if (mouse_mode !== 'wall') return;
			if (this.graphics) {
				var color = new ColorLuminance(wall.wall_type.color, 0.2);
				this.graphics.clear().setStrokeStyle(wall.wall_type.width).setStrokeDash(wall.wall_type.dash).beginStroke(color).moveTo(wall.p_corners[index-1].x, wall.p_corners[index-1].y);
				this.graphics.lineTo(wall.p_corners[index].x, wall.p_corners[index].y).endStroke();
				update = true;
			}
		});

		wall.on('rollout', function(evt) {
			if (mouse_mode !== 'wall') return;
			if (this.graphics) {
				this.graphics.clear().setStrokeStyle(wall.wall_type.width).setStrokeDash(wall.wall_type.dash).beginStroke(wall.wall_type.color).moveTo(wall.p_corners[index-1].x, wall.p_corners[index-1].y);
				this.graphics.lineTo(wall.p_corners[index].x, wall.p_corners[index].y).endStroke();
				update = true;
			}
		});

	};


	function getNewName() {
		return _.uniqueId();
	}

	function getDistance(ap_start, ap_end) {
		return Math.sqrt(
			Math.pow(ap_start.realx - ap_end.realx, 2) +
			Math.pow(ap_start.realy - ap_end.realy, 2)
		);
	}

	function drawDistanceObject(obj) {
		obj.pdistance = getDistance(obj.ap_start, obj.ap_end);
		if (obj.pdistance < DISTANCE_CUT_OFF) {
			obj.graphics.clear().setStrokeStyle(1).beginStroke(DISTANCE_STROKE_RGB)
			.moveTo(obj.p_start.x, obj.p_start.y)
			.lineTo(obj.p_end.x, obj.p_end.y);
			obj.ptext.text = obj.pdistance.toFixed(2) + ' ft';
			obj.pbubble.scaleX = obj.pbubble.scaleY = 100/plan.stage_scale;
			obj.ptext.scaleX = obj.ptext.scaleY = 100/plan.stage_scale;
			obj.ptext.x = obj.p_start.x + (obj.p_end.x - obj.p_start.x) /2;
			obj.ptext.y = obj.p_start.y + (obj.p_end.y - obj.p_start.y) /2;
			obj.pbubble.x = obj.ptext.x;
			obj.pbubble.y = obj.ptext.y;
			obj.ptext.visible = true;
			obj.pbubble.visible = true;
		} else {
			obj.ptext.visible = false;
			obj.pbubble.visible = false;
			obj.graphics.clear();
			obj.ptext.text = '';
		}
	}

	function addBubble(text, color) {
		var bubble = new createjs.Shape();
		var textBounds = text.getBounds();
		bubble.graphics.beginFill(color).drawRoundRect(0, 0, textBounds.width + 10, textBounds.height + 10, 5, 5);
		bubble.x = text.x;
		bubble.y = text.y;
		bubble.scaleX = bubble.scaleY = text.scaleX;
		bubble.name = 'bubble';
		text.regX = textBounds.width / 2;
		bubble.regX = text.regX + 5;
		bubble.regY = 3 + textBounds.height;

		return bubble;
	}

	var addDistances = function(ap) {
		var children, i, d, m, layers_length = layers.length;
		var fontsize = 12;
		for (i=0; i<layers_length; i++) {
			if (layers[i].layer_type !== 'ap') continue;
			ap.distances = [];
			/*jshint -W083 */
			_.each(layers[i].children, function(ap2) {
				if (ap !== ap2) {
					m = new createjs.Shape();
					d = getDistance(ap2, ap);
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

					var text = new createjs.Text(d.toFixed(2) + ' ft', fontsize + 'px Arial', DISTANCE_TEXT_RGB);
					text.x = m.p_start.x + (m.p_end.x - m.p_start.x) /2 - 10;
					text.y = m.p_start.y + (m.p_end.y - m.p_start.y) /2 - 10;
					text.textBaseline = 'alphabetic';
					text.name = 'value';
					text.scaleX = text.scaleY = 100/plan.stage_scale;
					m.ptext = text;

					var bubble = addBubble(text, DISTANCE_BUBBLE_RGB);
					m.pbubble = bubble;
					distances.addChild(bubble);
					distances.addChild(text);

					if (d > DISTANCE_CUT_OFF) {
						text.visible = false;
						bubble.visible = false;
					}
				}
			});
		}
	};

	this.addWall = function(x, y) {
		if (current_wall) {
			this.addWallSegment(x, y);
		} else {
			current_wall = new createjs.Shape();
			current_wall.graphics.setStrokeStyle(this.wall_type.width).setStrokeDash(this.wall_type.dash).beginStroke(this.wall_type.color).moveTo(x, y);
			current_wall.wall_type = this.wall_type;
			if (current_wall.p_corners === undefined) current_wall.p_corners = [];
			current_wall.p_corners.push({x: x, y: y});
			layers[1].addChild(current_wall);
			addWallHandlers.call(this, current_wall, current_wall.p_corners.length);
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

	var addHandlers = function(ap) {
		var names;

		function mousedown(evt) {
			if (evt.nativeEvent.button === 2) {
				selectedAP = ap;
				contextMenu.switchMenu('ap');
				return;
			}
			if (mouse_mode !== 'ap') return;
			ap_clicked = true;
			evt.stopPropagation();
			evt.preventDefault();
			/* jshint validthis: true */
			this.offset = {
				x: this.x - evt.stageX * 100 / plan.stage_scale,
				y: this.y - evt.stageY * 100 / plan.stage_scale
			};
			this.parent.addChild(this);
			/* jshint validthis: false */
			names = [];
			for (var i=0; i<ap.distances.length; i++) names.push(distances.getChildByName(ap.distances[i].name));
		}

		function mousemove(evt) {
			if (evt.nativeEvent.button === 2) return;
			if (mouse_mode !== 'ap') return;
			ap.x = evt.stageX * 100 / plan.stage_scale + ap.offset.x;
			ap.y = evt.stageY * 100 / plan.stage_scale + ap.offset.y;
			var i, l = names.length;

			var mperpx = 1 / plan.stage_ppm;
			ap.realx = mperpx * ap.x;
			ap.realy = mperpx * ap.y;

			for (i=0; i<l; i++) {
				if (!names[i]) continue;
				if (ap === names[i].ap_start) {
					names[i].p_start.x = ap.x;
					names[i].p_start.y = ap.y;
				} else {
					names[i].p_end.x = ap.x;
					names[i].p_end.y = ap.y;
				}
				drawDistanceObject(names[i], names[i].p_start, names[i].p_end);
			}

			drawIntersections(ap);
			is_dragging = true;
			update = true;
		}

		function mouseup(evt) {
			ap_clicked = false;
		}

		ap.on('mousedown', mousedown);
		ap.on('touchstart', mousedown);
		ap.on('pressmove', mousemove);
		ap.on('mousemove', mousemove);
		ap.on('touchmove', mousemove);
		ap.on('mouseup', mouseup);
		ap.on('pressup', mouseup);
		ap.on('touchend', mouseup);

		ap.on('rollover', function(evt) {
			if (mouse_mode !== 'ap') return;
			if (this.children[0].graphics) {
				this.children[0].graphics.clear().setStrokeStyle(1).beginFill(AP_CIRCLE_RGBA_OPAQUE).beginStroke(AP_CIRCLE_STROKE_RGB).drawCircle(0, 0, plan.radius);
				update = true;
			}
		});

		ap.on('rollout', function(evt) {
			if (mouse_mode !== 'ap') return;
			if (this.children[0].graphics) {
				this.children[0].graphics.clear().setStrokeStyle(1).beginFill(AP_CIRCLE_RGBA).beginStroke(AP_CIRCLE_STROKE_RGB).drawCircle(0, 0, plan.radius);
				update = true;
			}
		});
	};

	this.touchEnd = function(e) {
		contextMenu.disabled = false;
		if (e.button !== 2 && !is_dragging) {
			if (mouse_last_click.x === e.x && mouse_last_click.y === e.y) {
				var x = (e.x - stage.x - canvas.offsetParent.offsetLeft - canvasMarginW) * 100 / plan.stage_scale;
				var y = (e.y - stage.y - canvas.offsetParent.offsetTop - canvasMarginH/2) * 100 / plan.stage_scale;
				if (mouse_mode === 'wall') {
					contextMenu.disabled = true;
					this.addWall(x, y);
				} else {
					if (calibration_step === 1) {
						calibration_step++;
						this.calibrationLine(x, y, 0);
					} else if (calibration_step === 2) {
						this.calibrationLine(x, y, 1);
						this.calibrationDone();
					} else {
						this.addAP(x, y, plan.real_radius);
					}
				}
				update = true;
			}
		} else if (e.button === 2) {
			current_wall = false;
		}
		is_dragging = false;
		mouse_last_click = false;
	};

	this.mouseWheelEvent = function(e) {
		e = window.event || e;
		e.preventDefault();
		e.stopPropagation();
		var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))) * 1.02;
		if (delta <= 0) delta = 0.98;
		var mousex = e.x - $(canvas)[0].offsetParent.offsetLeft - canvasMarginH/2;
		var mousey = e.y - $(canvas)[0].offsetParent.offsetTop - canvasMarginH/2;
		var new_scale = delta * plan.stage_scale;
		if (new_scale <= 200) {
			stage.x = mousex - delta *(mousex - stage.x);
			stage.y = mousey - delta *(mousey - stage.y);
			this.scale(delta * plan.stage_scale);
		}

		return false;
	};

	this.initBoard = function(r) {
		mouse_mode = 'ap';
		plan.radius = r;
		plan.real_radius = r;
		plan.ap_index = 1;
		DISTANCE_CUT_OFF = r * 2;
		canvas = document.getElementsByTagName('canvas')[0];
		canvas.width = canvas.parentElement.clientWidth - canvasMarginW;
		canvas.height = canvas.parentElement.clientHeight - canvasMarginH;
		canvas.style.width = (canvas.parentElement.clientWidth - canvasMarginW) + 'px';
		stage = new createjs.Stage(canvas);
		createjs.Touch.enable(stage);
		if (!plan || !plan.floor_width) {
			plan.floor_width = 200; // m or ft
			plan.floor_width_px = canvas.width;
		}
		plan.stage_ppm = plan.floor_width_px / plan.floor_width;

		// enable touch interactions if supported on the current device:
		createjs.Touch.enable(stage);

		// enabled mouse over / out events
		stage.enableMouseOver(10);
		addListeners(canvas, this);
		stage.mouseMoveOutside = true; // keep tracking the mouse even when it leaves the canvas

		// add default layers
		layers = [new createjs.Container()];
		layers[0].layer_type = 'ap';
		layers[1] = new createjs.Container();
		layers[1].layer_type = 'walls';
		coverage = new createjs.Container();
		coverage.layer_type = 'coverage';
		current_layer = 0;
		floorplan = new createjs.Container();
		floorplan.layer_type = 'background';
		distances = new createjs.Container();
		distances.layer_type = 'distances';
		stage.addChild(floorplan);
		stage.addChild(layers[0]);
		stage.addChild(layers[1]);
		stage.addChild(distances);
		stage.addChild(coverage);

		createjs.Ticker.addEventListener('tick', tick);
		contextMenu.setup();
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
			this.calibration_line.graphics.setStrokeStyle(4).beginStroke('#000').moveTo(x, y);
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

	this.addWallSegment = function(x, y) {
		current_wall.graphics.lineTo(x, y).endStroke();
		current_wall.p_corners.push({x: x, y: y});
		current_wall = new createjs.Shape();
		current_wall.graphics.setStrokeStyle(this.wall_type.width).setStrokeDash(this.wall_type.dash).beginStroke(this.wall_type.color).moveTo(x, y);
		if (current_wall.p_corners === undefined) current_wall.p_corners = [];
		current_wall.p_corners.push({x: x, y: y});
		current_wall.wall_type = this.wall_type;
		layers[1].addChild(current_wall);
		addWallHandlers.call(this, current_wall, current_wall.p_corners.length);
	};

	this.cancelWall = function() {
		if (current_wall) current_wall.graphics.endStroke();
		current_wall = false;
	};

	this.getTotalAPs = function() {
		var totalAPs = 0;
		if (typeof layers === 'undefined') return 0;
		for (var i=0; i<layers.length; i++) {
			if (layers[i].layer_type !== 'ap') continue;
			totalAPs += layers[i].children ? layers[i].children.length : 0;
		}

		return totalAPs;
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
							hash.graphics.beginFill(hash_color).arc(0, 0, plan.radius -1, leftside * Math.PI + alpha - beta, leftside * Math.PI + alpha + beta - 1/plan.radius);
							hash.graphics.beginFill(hash_color).arc(c.x - ap.x, c.y - ap.y, plan.radius -1, rightside * Math.PI + alpha - beta, rightside * Math.PI + alpha + beta - 1/plan.radius);
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

		var text = new createjs.Text('AP ' + plan.ap_index++, '12px Arial', AP_TEXT_RGB);
		text.scaleX = text.scaleY = 100 / plan.stage_scale;
		text.textBaseline = 'alphabetic';

		var bubble = addBubble(text, AP_BUBBLE_RGB);
		ap.pbubble = bubble;
		container.addChild(bubble);
		container.addChild(text);

		addDistances.call(this, container);
		drawIntersections(container);

		update = true;
		$timeout(this.getTotalAPs, 0);
	};

	this.reIndexAPs = function() {
		var ap_index = 1;
		for (var i=0; i<layers.length; i++) {
			if (layers[i].layer_type !== 'ap') continue;
			_.map(layers[i].children, ap => ap.children[4].text = `AP ${ap_index++}`);
		}
		plan.ap_index = ap_index;
	}

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
		var lchild, ap2;
		for (i=0; i<layers.length; i++) {
			if (layers[i].layer_type !== 'ap') continue;
			for (lchild=0; lchild < layers[i].children.length; lchild++) {
				ap2 = layers[i].children[lchild];
				for (j=ap2.distances.length -1; j>=0; j--) {
					for (k=selected_distances_length -1; k>=0; k--) {
						if (ap2.distances[j] && selectedAP.distances[k]) {
							if (ap2.distances[j].name === selectedAP.distances[k].name) {
								ap2.distances.splice(j, 1);
							}
						}
					}
				}
			}
		}
		layers[current_layer].removeChild(selectedAP);
		this.toggleOverlaps();
		update = true;
		this.toggleOverlaps();
		this.reIndexAPs();
	};

	this.deleteSelectedWall = function() {
		if (!selectedWall) return;
		contextMenu.close();
		layers[1].removeChild(selectedWall);
		update = true;
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
			this.toggleOverlaps();
			this.toggleOverlaps();

			update = true;
		}
	};

	this.toggleDistances = function(off) {
		show_distances = !show_distances;
		if (off === 'off') show_distances = false;
		distances.visible = show_distances;
		update = true;
	};

	/**
	* Overlaps are added as child for the AP container itself;
	* the overlaps container is shown behind the main AP circle container
	*/
	this.toggleOverlaps = function(off) {
		show_overlaps = !show_overlaps;
		if (off === 'off') show_overlaps = false;
		_.each(stage.children, function(child) {
			if (child.layer_type === 'ap') {
				for (var i=0; i<child.children.length; i++) {
					drawIntersections(child.children[i]);
				}
			}
		});
		update = true;
	};

	this.scale = function(percent) {
		if (!percent) return;
		plan.stage_scale = percent;
		if (this.updateControls) this.updateControls('scale', Math.round(plan.stage_scale));
		plan.stage_ppm = plan.floor_width_px / plan.floor_width;
		stage.setTransform(stage.x, stage.y, percent/100, percent/100).update();
		for (var i=0; i<distances.children.length; i++) {
			if (~_.indexOf(['bubble', 'value'], distances.children[i].name)) {
				distances.children[i].scaleX = distances.children[i].scaleY = 100/plan.stage_scale;
			}
		}
		_.each(stage.children, function(child) {
			if (child.layer_type === 'ap') {
				for (var i=0; i<child.children.length; i++) {
					child.children[i].children[3].scaleX = child.children[i].children[3].scaleY = 100 / plan.stage_scale;
					child.children[i].children[4].scaleX = child.children[i].children[4].scaleY = 100 / plan.stage_scale;
				}
			}
		});
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
			floorplan.removeAllChildren();
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
			aps: [],
			walls: []
		};

		var children, i, d, m, layers_length = layers.length;
		for (i=0; i<layers_length; i++) {
			if (layers[i].layer_type === 'ap') {
				/*jshint -W083 */
				_.each(layers[i].children, function(ap) {
					json.aps.push({
						name: ap.name,
						x: ap.x,
						y: ap.y
					});
				});
			} else if (layers[i].layer_type === 'walls') {
				/*jshint -W083 */
				_.each(layers[i].children, function(wall) {
					json.walls.push({
						wall_type: wall.wall_type,
						p_corners: wall.p_corners
					});
				});
			}
		}

		return json;
	};

	this.getThumb = function() {
		return stage.toDataURL();
	};

	this.loadPlan = function(plan_id, data, signal_radius, updateControls) {
		this.updateControls = updateControls;
		$timeout(function() {
			plan = data.plan;
			plan._id = plan_id;
			var stage_scale = plan.stage.stage_scale;
			this.initBoard(signal_radius);
			this.scale(100);
			if (data.floorplan) {
				this.addFloorPlan(data.floorplan)
				.then(function() {
					if (data.plan && data.plan.stage_scale) this.scale(stage_scale);
				}.bind(this));
				this.toggleOverlaps();
				update = true;
				$timeout(this.toggleOverlaps, 0);
			}

			stage.x = data.plan.stage.x;
			stage.y = data.plan.stage.y;
			stage.regX = data.plan.stage.regX;
			stage.regY = data.plan.stage.regY;

			_.each(data.aps, function(ap) {
				this.addAP(ap.x, ap.y, signal_radius);
			}.bind(this));
			this.reIndexAPs();
			this.updateSignalStrength(signal_radius);
			_.each(data.walls, function(wall) {
				current_wall = false;
				this.wall_type = wall.wall_type;
				_.each(wall.p_corners, function(segment) {
					this.addWall(segment.x, segment.y);
				}.bind(this));
			}.bind(this));
			$timeout(function() {
				this.updateSignalStrength(signal_radius);
			}.bind(this), 1000);
		}.bind(this), 100);

	};

	function drawHeatmap(data) {
		var layers_length = layers.length;
		var points = [];

		for (var i=0; i<layers_length; i++) {
			if (layers[i].layer_type !== 'ap') continue;
			layers[i].visible = false;
			/*jshint -W083 */
			_.each(layers[i].children, function(ap2) {
				points.push({
					x: ap2.x,
					y: ap2.y,
					value: 100,
					radius: plan.radius
				});
			});

			/* TODO: add a mouse over event with a tooltip showing signal strength at any point on the map
			* use getValueAt({ x: 12, y: 12 });
			*/
		}

		$http.post('/plans/' + plan._id + '/coverage', {points: points, ppm: plan.stage_ppm})
		.success(function(response) {
			var bitheat = new createjs.Bitmap(response);
			bitheat.x = 0;
			bitheat.y = 0;
			coverage.addChild(bitheat);
			update = true;
		});

	}

	this.heatmap = function(off) {
		if (off) {
			coverage.removeAllChildren();
			var layers_length = layers.length;
			for (var i=0; i<layers_length; i++)
			{
				if (layers[i].layer_type !== 'ap') continue;
				layers[i].visible = true;
			}
			return;
		}
		drawHeatmap();
	};

	this.selectTool = function(mode) {
		mouse_mode = mode;
		this.cancelWall(); // todo: do the same for other actions, like nav away
		contextMenu.switchMenu(mode);
	};

	this.selectWallType = function(wall) {
		this.cancelWall();
		this.wall_type = wall;
	};

	Heatmap.setup({
		colors: {
			'100': [48, 110, 255],
			'75': [110, 255, 48],
			'65': [255, 255, 0],
			'0': [255, 255, 255]
		}
	});
}
]);
