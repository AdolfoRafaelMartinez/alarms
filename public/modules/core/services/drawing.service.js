/* eslint no-mixed-operators: 0 */
/* eslint semi: 0 */
/* eslint arrow-parens: 0 */
/* eslint padding-line-between-statements: 0 */

/* globals _ */
function ColorLuminance (hex, lum) {
	// validate hex string
	hex = String(hex).replace(/[^0-9a-f]/gi, "");
	if (hex.length < 6) {
		hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
	}
	lum = lum || 0;

	// convert to decimal and change luminosity
	let rgb = "#";
    let c;
    let i;
	for (i = 0; i < 3; i++) {
		c = parseInt(hex.substr(i * 2, 2), 16);
		c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
		rgb += (`00${c}`).substr(c.length);
	}

	return rgb;
}

function trimImageWhitespace (canvas, context) {
	const data = context.getImageData(0, 0, canvas.width, canvas.height).data

	const getRBG = (x, y) => Object({
		r: data[(canvas.width * y + x) * 4],
		g: data[(canvas.width * y + x) * 4 + 1],
		b: data[(canvas.width * y + x) * 4 + 2]
	})

	const w = canvas.width -1
	const h = canvas.height -1

	const isWhitePixel = (rgb) => _.every(rgb, val => val === 0)
	const isWhiteLine = (line) => _.every(line, isWhitePixel)
	const getRow = (y) => _.range(0, w).map(x => getRBG(x,y))
	const getCol = (x) => _.range(0, h).map(y => getRBG(x,y))

	const cropTop   = _.findIndex(_.range(0, h),     (y) => !isWhiteLine(getRow(y)))
	const cropBot   = _.findIndex(_.range(h, 0, -1), (y) => !isWhiteLine(getRow(y)))
	const cropLeft  = _.findIndex(_.range(0, w),     (x) => !isWhiteLine(getCol(x)))
	const cropRight = _.findIndex(_.range(w, 0, -1), (x) => !isWhiteLine(getCol(x)))

  return [cropTop, w - cropRight, h - cropBot, cropLeft]
}


// Drawing service on HTML5 canvas
angular.module("core").service("Drawing", ["contextMenu", "$q", "$http", "$timeout", "Heatmap",
	function (contextMenu, $q, $http, $timeout, Heatmap) {
		let canvas, stage, layers, current_layer, distances, coverage, floorplan;

        const self = this; // ugly hack for mouse move

		let mouseTarget; // the display object currently under the mouse, or being dragged
		let dragStarted; // indicates whether we are currently in a drag operation
		let mouse_mode = "ap";
		let mouse_prev_mode = "ap";
		let ap_clicked;
		let wall_clicked;
		let mouse_last_position;
		let mouse_last_click;
		let calibration_step;
		let current_wall;
		let update = true;
		let is_dragging = false;
		let selectedAP = false;
		let selectedWall;
		let plan = {
			stage_scale: 100,
			stage: {
				x: 0,
				y: 0,
				regX: 0,
				regY: 0
			},
			item_index: {
				ap: 1,
				am: 1,
				idf: 1,
				mdf: 1
			},
			stage_ppm: 300,
			radius: 0,
			real_radius: 0,
			floor_width: 0,
			floor_width_px: 0
		};

		const itemTypes = ["ap", "am", "idf", "mdf"];

		let show_overlaps = true;
		let show_distances = true;
		let show_radius = true;
		const canvasMarginW = 80;
		const canvasMarginH = 40;

		const AP_CIRCLE_STROKE_RGB = "#888";
		const AP_CIRCLE_RGBA = "rgba(180, 220, 255, 0.6)";
		const TEXT_RGB = {
			ap: "#fff",
			am: "#fff",
			idf: "#fff",
			mdf: "#fff",
			distance: "#aaa"
		};
		const BUBBLE_RGB = {
			ap: "rgba(0, 0, 100, 0.8)",
			am: "rgba(0, 100, 0, 0.5)",
			idf: "rgba(0, 100, 100, 0.8)",
			mdf: "rgba(100, 0, 0, 0.8)",
			distance: "#fff"
		};
		const BUBBLE_RGBA_TRANSLUCENT = {
			ap: "rgba(200, 200, 255, 0.2)",
			am: "rgba(100, 200, 100, 0.5)",
			idf: "rgba(100, 200, 200, 0.2)",
			mdf: "rgba(200, 100, 100, 0.2)"
		};
		const HASH_COLOR = [
			{ overlap: 21, color: "rgba(255, 0, 0, 0.2)" },
			{ overlap: 14, color: "rgba(0, 255, 0, 0.2)" },
			{ overlap: 0, color: "rgba(240, 255, 40, 0.2)" }
		];

		const DISTANCE_STROKE_RGB = "#444";
		let DISTANCE_CUT_OFF = 60;
		const AM_VISUAL_RADIUS = 60;
		const AM_VISUAL_RADIUS_PRINT = 40;
		const IDF_VISUAL_RADIUS = 30;
		const IDF_VISUAL_RADIUS_PRINT = 20;
		const MDF_VISUAL_RADIUS = 30;
		const MDF_VISUAL_RADIUS_PRINT = 20;

		let originX;
		let originY;

		const tick = function (event) {
			// this set makes it so the stage only re-renders when an event handler indicates a change has happened.
			if (update) {
				update = false; // only update once
				stage.update(event);
			}
		};

		function addListeners (canvas, drawing) {
			canvas.addEventListener("mousewheel", drawing.mouseWheelEvent.bind(drawing), false);
			canvas.addEventListener("DOMMouseScroll", drawing.mouseWheelEvent.bind(drawing), false);
			canvas.addEventListener("MozMousePixelScroll", drawing.mouseWheelEvent.bind(drawing), false);
			canvas.addEventListener("touchstart", drawing.touchStart.bind(drawing), false);
			canvas.addEventListener("touchmove", drawing.touchMove.bind(drawing), false);
			canvas.addEventListener("touchend", drawing.touchEnd.bind(drawing), false);
			canvas.addEventListener("mousedown", drawing.touchStart.bind(drawing), false);
			canvas.addEventListener("mousemove", drawing.touchMove.bind(drawing), false);
			canvas.addEventListener("mouseup", drawing.touchEnd.bind(drawing), false);
		}

		const addWallHandlers = function (wall, index) {
			function mousedown (evt) {
                self.setFloorplanDirty();
				if (evt.nativeEvent.button === 2) {
					selectedWall = wall;
					contextMenu.switchMenu("wall");

					return;
				}
				evt.stopPropagation();
				evt.preventDefault();
			}

			function mouseup (evt) {
				wall_clicked = false;
			}

			wall.on("mousedown", mousedown);
			wall.on("touchstart", mousedown);
			wall.on("mouseup", mouseup);
			wall.on("pressup", mouseup);
			wall.on("touchend", mouseup);

			wall.on("rollover", function (evt) {
				if (mouse_mode !== "wall") { return; }
				if (this.graphics) {
					const color = new ColorLuminance(wall.wall_type.color, 0.2);
					this.graphics.clear().setStrokeStyle(wall.wall_type.width).setStrokeDash(wall.wall_type.dash).beginStroke(color).moveTo(wall.p_corners[index - 1].x, wall.p_corners[index - 1].y);
					this.graphics.lineTo(wall.p_corners[index].x, wall.p_corners[index].y).endStroke();
					update = true;
				}
			});

			wall.on("rollout", function (evt) {
				if (mouse_mode !== "wall") { return; }
				if (this.graphics) {
					this.graphics.clear().setStrokeStyle(wall.wall_type.width).setStrokeDash(wall.wall_type.dash).beginStroke(wall.wall_type.color).moveTo(wall.p_corners[index - 1].x, wall.p_corners[index - 1].y);
					this.graphics.lineTo(wall.p_corners[index].x, wall.p_corners[index].y).endStroke();
					update = true;
				}
			});
		};

		function getNewName () {
			return _.uniqueId();
		}

		function getDistance (ap_start, ap_end) {
			return Math.sqrt(
				Math.pow(ap_start.realx - ap_end.realx, 2) +
				Math.pow(ap_start.realy - ap_end.realy, 2)
			);
		}

		function drawDistanceObject (obj) {
			obj.pdistance = getDistance(obj.ap_start, obj.ap_end);
			if (obj.pdistance < DISTANCE_CUT_OFF) {
				obj.pline.graphics.clear().setStrokeStyle(1).beginStroke(DISTANCE_STROKE_RGB)
					.moveTo(obj.p_start.x, obj.p_start.y)
					.lineTo(obj.p_end.x, obj.p_end.y);
				obj.ptext.text = `${obj.pdistance.toFixed(2)} ft`;
				obj.pbubble.scaleX = obj.pbubble.scaleY = plan.stage_ppm / 4;
				obj.ptext.scaleX = obj.ptext.scaleY = plan.stage_ppm / 4;
				obj.ptext.x = obj.p_start.x + (obj.p_end.x - obj.p_start.x) / 2;
				obj.ptext.y = obj.p_start.y + (obj.p_end.y - obj.p_start.y) / 2;
				obj.pbubble.x = obj.ptext.x;
				obj.pbubble.y = obj.ptext.y;
				obj.ptext.visible = true;
				obj.pbubble.visible = true;
			} else {
				obj.ptext.visible = false;
				obj.pbubble.visible = false;
				obj.pline.graphics.clear();
				obj.ptext.text = "";
			}
		}

		function addBubble (text, itemType) {
			const color = BUBBLE_RGB[itemType];
			const bubble = new createjs.Shape();
			const textBounds = text.getBounds();
			text.regX = textBounds.width / 2;
			text.regY = 0 - textBounds.height / 2 + 2;
			bubble.regX = 0;
			bubble.regY = 0;
			bubble.cursor = "pointer";
			text.cursor = "pointer";
			switch (itemType) {
				case "ap":
					bubble.graphics.beginFill(color).drawRoundRect(10, -25, textBounds.width + 10, textBounds.height + 10, 5, 5);
					text.regX = -15 + textBounds.width / 2;
					text.regY = 8;
					bubble.regX = text.regX + 15;
					bubble.regY = -13 + textBounds.height;
					break;

				case "distance":
					bubble.graphics.beginFill(color).drawRoundRect(0, 0, textBounds.width + 10, textBounds.height + 10, 5, 5);
					text.regX = textBounds.width / 2;
					text.regY = -15;
					bubble.regX = text.regX + 5;
					bubble.regY = -13 + textBounds.height;
					break;

				case "am":
					bubble.graphics.beginFill(color).drawCircle(0, 0, Math.max(textBounds.width, textBounds.height)).endFill();
					bubble.graphics.beginStroke(color).drawCircle(0, 0, AM_VISUAL_RADIUS_PRINT).endStroke();
					bubble.graphics.beginStroke(color).drawCircle(0, 0, AM_VISUAL_RADIUS_PRINT + 10).endStroke();
					break;

				case "idf":
					bubble.graphics.beginFill(color).drawRoundRect(0 - IDF_VISUAL_RADIUS_PRINT, 0 - IDF_VISUAL_RADIUS_PRINT / 2, IDF_VISUAL_RADIUS_PRINT * 2, IDF_VISUAL_RADIUS_PRINT, 2, 2).endFill();
					break;

				case "mdf":
					bubble.graphics.beginFill(color).drawRoundRect(0 - MDF_VISUAL_RADIUS_PRINT, 0 - MDF_VISUAL_RADIUS_PRINT / 2, MDF_VISUAL_RADIUS_PRINT * 2, MDF_VISUAL_RADIUS_PRINT, 10, 10).endFill();
					bubble.graphics.beginStroke(color).drawRoundRect(-4 - MDF_VISUAL_RADIUS_PRINT, -4 - MDF_VISUAL_RADIUS_PRINT / 2, MDF_VISUAL_RADIUS_PRINT * 2 + 8, MDF_VISUAL_RADIUS_PRINT + 8, 5, 5);
					break;
			}

			bubble.x = text.x;
			bubble.y = text.y;
			bubble.scaleX = bubble.scaleY = text.scaleX;
			bubble.name = "bubble";

			return bubble;
		}

		const addDistances = function (ap) {
			let children, i, d, c, m, layers_length = layers.length;
			const fontsize = 12;
			for (i = 0; i < layers_length; i++) {
				if (layers[i].layer_type !== "ap") { continue; }
				ap.distances = [];
				/* jshint -W083 */
				_.each(layers[i].children, (ap2) => {
					if (ap !== ap2) {
						c = new createjs.Container();
						m = new createjs.Shape();
						d = getDistance(ap2, ap);
						if (d < DISTANCE_CUT_OFF) {
							m.graphics.setStrokeStyle(1).beginStroke(DISTANCE_STROKE_RGB).moveTo(ap.x, ap.y).lineTo(ap2.x, ap2.y);
						}
						c.name = getNewName();
						c.p_start = { x: ap.x, y: ap.y };
						c.ap_start = ap;
						c.p_end = { x: ap2.x, y: ap2.y };
						c.ap_end = ap2;
						c.pdistance = d;
						c.pline = m;
						c.addChild(m);
						ap.distances.push(c);
						ap2.distances.push(c);
						distances.addChild(c);

						const text = new createjs.Text(`${d.toFixed(2)} ft`, `${fontsize}px Arial`, TEXT_RGB.distance);
						text.x = c.p_start.x + (c.p_end.x - c.p_start.x) / 2 - 10;
						text.y = c.p_start.y + (c.p_end.y - c.p_start.y) / 2 - 10;
						text.textBaseline = "alphabetic";
						text.name = "value";
						text.scaleX = text.scaleY = plan.stage_ppm / 4;
						c.ptext = text;

						const bubble = addBubble(text, "distance");
						c.pbubble = bubble;
						c.addChild(bubble);
						c.addChild(text);

						if (d > DISTANCE_CUT_OFF) {
							text.visible = false;
							bubble.visible = false;
						}
					}
				});
			}
		};

		this.addWall = function (x, y) {
			if (current_wall) {
				this.addWallSegment(x, y);
			} else {
				current_wall = new createjs.Shape();
				current_wall.graphics.setStrokeStyle(this.wall_type.width).setStrokeDash(this.wall_type.dash).beginStroke(this.wall_type.color).moveTo(x, y);
				current_wall.wall_type = this.wall_type;
				if (current_wall.p_corners === undefined) { current_wall.p_corners = []; }
				current_wall.p_corners.push({ x: x, y: y });
				layers[1].addChild(current_wall);
				addWallHandlers.call(this, current_wall, current_wall.p_corners.length);
			}
		};

		this.touchStart = function (e) {
            self.setFloorplanDirty();
			mouse_last_position = { x: e.x, y: e.y };
			mouse_last_click = { x: e.x, y: e.y };
		};

		this.touchMove = function (e) {
			if (calibration_step == 2) {
				const x = (e.x - stage.x - canvas.offsetParent.offsetLeft - canvasMarginW / 2) * 100 / plan.stage_scale;
				const y = (e.y - stage.y - canvas.offsetParent.offsetTop - canvasMarginH / 2) * 100 / plan.stage_scale;
				this.calibrationLine(x, y, 1);
			}
			if (!mouse_last_click) { return; }
			if (itemTypes.includes(mouse_mode) || !ap_clicked) {
				is_dragging = true;
			}
			if (!itemTypes.includes(mouse_mode) || !ap_clicked) {
				stage.x += e.x - mouse_last_position.x;
				stage.y += e.y - mouse_last_position.y;
				update = true;
				mouse_last_position = { x: e.x, y: e.y };
			}
		};

		var drawIntersections = function (ap, processing) {
			if (ap.itemType !== "ap") { return; }
			let c, d, r2, i, j, rsq, overlap, apb, alpha, beta, color;
			let hash_color, leftside, rightside;
			const intersections = [];
			_.each(stage.children, (child) => {
				if (child.layer_type === "ap") {
					for (i = 0; i < child.children.length; i++) {
						if (child.children[i] !== ap && child.children[i].itemType === "ap") {
							c = child.children[i];
							d = Math.sqrt(Math.pow(c.x - ap.x, 2) + Math.pow(c.y - ap.y, 2));
							if (d < plan.radius * 2) {
								r2 = 2 * plan.radius;
								rsq = Math.pow(plan.radius, 2);
								overlap = ((2 * rsq * Math.acos(d / r2) - d / 2 * Math.sqrt(4 * rsq - d * d)) / (2 * rsq * Math.acos(0)) * 100).toFixed(0);

								const text = new createjs.Text(`${overlap}%`, "12px Arial", TEXT_RGB.distance);
								alpha = Math.atan((ap.y - c.y) / (ap.x - c.x));
								beta = Math.acos(Math.sqrt(Math.pow(ap.x - c.x, 2) + Math.pow(ap.y - c.y, 2)) / 2 / plan.radius);
								apb = alpha + beta;
								text.x = plan.radius * Math.cos(apb);
								text.y = plan.radius * Math.sin(apb);
								text.textBaseline = "alphabetic";
								// ap.addChild(text);

								leftside = 0;
								if (ap.x >= c.x) { leftside = 1; }
								rightside = 1 - leftside;
								for (color = 0; color < HASH_COLOR.length; color++) {
									if (overlap > HASH_COLOR[color].overlap) {
										hash_color = HASH_COLOR[color].color;
										break;
									}
								}

								const hash = new createjs.Shape();
								hash.puddleShape = "hash";
								hash.graphics.beginFill(hash_color).arc(0, 0, plan.radius - 1, leftside * Math.PI + alpha - beta, leftside * Math.PI + alpha + beta - 1 / plan.radius);
								hash.graphics.beginFill(hash_color).arc(c.x - ap.x, c.y - ap.y, plan.radius - 1, rightside * Math.PI + alpha - beta, rightside * Math.PI + alpha + beta - 1 / plan.radius);
								intersections.push(hash);

								// update the intersections on the adjacent AP as well
								if (!processing) { drawIntersections(c, true); }
							}
						}
					}
				}
			});

			for (j = 0; j < ap.children.length; j++) {
				ap.overlaps.removeAllChildren();
			}
			if (show_overlaps) {
				for (j = 0; j < intersections.length; j++) {
					ap.overlaps.addChild(intersections[j]);
				}
			}
		};

		const addHandlers = function (ap) {
			let names;

			function mousedown (evt) {
                self.setFloorplanDirty();
				if (evt.nativeEvent.button === 2) {
					selectedAP = ap;
					contextMenu.switchMenu(ap.itemType);

					return;
				}
				if (!itemTypes.includes(mouse_mode)) { return; }
				ap_clicked = true;
				evt.stopPropagation();
				evt.preventDefault();
				this.offset = {
					x: this.x - evt.stageX * 100 / plan.stage_scale,
					y: this.y - evt.stageY * 100 / plan.stage_scale
				};
				this.parent.addChild(this);
				names = [];
				for (let i = 0; i < ap.distances.length; i++) { names.push(distances.getChildByName(ap.distances[i].name)); }
			}

			function mousemove (evt) {
				if (evt.nativeEvent.button === 2) { return; }
				if (!itemTypes.includes(mouse_mode)) { return; }
				if (!ap.offset) { return; }
				ap.x = evt.stageX * 100 / plan.stage_scale + ap.offset.x;
				ap.y = evt.stageY * 100 / plan.stage_scale + ap.offset.y;
				let i, l = names.length;

				const mperpx = 1 / plan.stage_ppm;
				ap.realx = mperpx * ap.x;
				ap.realy = mperpx * ap.y;

				for (i = 0; i < l; i++) {
					if (!names[i]) { continue; }
					if (ap === names[i].ap_start) {
						names[i].p_start.x = ap.x;
						names[i].p_start.y = ap.y;
					} else {
						names[i].p_end.x = ap.x;
						names[i].p_end.y = ap.y;
					}
					drawDistanceObject(names[i], names[i].p_start, names[i].p_end);
				}

				if (ap.itemType === "ap") { drawIntersections(ap); }
				is_dragging = true;
				update = true;
			}

			function mouseup (evt) {
				ap_clicked = false;
			}

			ap.on("mousedown", mousedown);
			ap.on("touchstart", mousedown);
			ap.on("pressmove", mousemove);
			ap.on("mousemove", mousemove);
			ap.on("touchmove", mousemove);
			ap.on("mouseup", mouseup);
			ap.on("pressup", mouseup);
			ap.on("touchend", mouseup);

			ap.on("rollover", function (evt) {
				if (!itemTypes.includes(mouse_mode)) { return; }
				const color = BUBBLE_RGBA_TRANSLUCENT[ap.itemType];
				const graphics = this.children[0].graphics;
				switch (ap.itemType) {
					case "ap":
						if (graphics) {
							graphics.clear().setStrokeStyle(1).beginFill(BUBBLE_RGBA_TRANSLUCENT.ap).beginStroke(AP_CIRCLE_STROKE_RGB).drawCircle(0, 0, plan.radius);
						}
						break;

					case "am":
						graphics.clear().beginFill(color).drawCircle(0, 0, AM_VISUAL_RADIUS - 5).endFill();
						graphics.beginStroke(color).drawCircle(0, 0, AM_VISUAL_RADIUS).endStroke();
						graphics.beginStroke(color).drawCircle(0, 0, AM_VISUAL_RADIUS + 10).endStroke();
						break;

					case "idf":
						graphics.clear().beginFill(color).drawRoundRect(0 - IDF_VISUAL_RADIUS / 2, 0 - IDF_VISUAL_RADIUS / 2, IDF_VISUAL_RADIUS, IDF_VISUAL_RADIUS, 5, 5);
						break;

					case "mdf":
						graphics.clear().beginFill(color).drawRoundRect(0 - MDF_VISUAL_RADIUS / 2, 0 - MDF_VISUAL_RADIUS / 2, MDF_VISUAL_RADIUS, MDF_VISUAL_RADIUS, 15, 15);
						break;
				}
				update = true;
			});

			ap.on("rollout", function (evt) {
				if (!itemTypes.includes(mouse_mode)) { return; }
				const color = BUBBLE_RGB[ap.itemType];
				const graphics = this.children[0].graphics;
				switch (ap.itemType) {
					case "ap":
						if (graphics) {
							graphics.clear().setStrokeStyle(1).beginFill(AP_CIRCLE_RGBA).beginStroke(AP_CIRCLE_STROKE_RGB).drawCircle(0, 0, plan.radius);
						}
						break;

					case "am":
						graphics.clear().beginFill(color).drawCircle(0, 0, AM_VISUAL_RADIUS - 5).endFill();
						graphics.beginStroke(color).drawCircle(0, 0, AM_VISUAL_RADIUS).endStroke();
						graphics.beginStroke(color).drawCircle(0, 0, AM_VISUAL_RADIUS + 10).endStroke();
						break;

					case "idf":
						graphics.clear().beginFill(color).drawRoundRect(0 - IDF_VISUAL_RADIUS / 2, 0 - IDF_VISUAL_RADIUS / 2, IDF_VISUAL_RADIUS / 2, IDF_VISUAL_RADIUS / 2, 5, 5);
						break;

					case "mdf":
						graphics.clear().beginFill(color).drawRoundRect(0 - MDF_VISUAL_RADIUS / 2, 0 - MDF_VISUAL_RADIUS / 2, MDF_VISUAL_RADIUS / 2, MDF_VISUAL_RADIUS / 2, 15, 15);
						break;
				}
				update = true;
			});
		};

		this.touchEnd = function (e) {
			contextMenu.disabled = false;
			if (e.button !== 2 && !is_dragging) {
				if (mouse_last_click.x === e.x && mouse_last_click.y === e.y) {
					const x = (e.x - stage.x - canvas.offsetParent.offsetLeft - canvasMarginW / 2) * 100 / plan.stage_scale;
					const y = (e.y - stage.y - canvas.offsetParent.offsetTop - canvasMarginH / 2) * 100 / plan.stage_scale;

					switch (mouse_mode) {
						case "wall":
							contextMenu.disabled = true;
							this.addWall(x, y);
							break;

						case "calibration":
							if (calibration_step === 1) {
								calibration_step++;
								this.calibrationLine(x, y, 0);
							} else if (calibration_step === 2) {
								this.calibrationLine(x, y, 1);
								this.calibrationDone();
                                calibration_step = 0;
							}
							break;

						case "ap":
							this.addAP(x, y, plan.real_radius, "ap");
							break;

						case "am":
							this.addAP(x, y, plan.real_radius, "am");
							break;

						case "idf":
							this.addAP(x, y, plan.real_radius, "idf");
							break;
					}
					update = true;
				}
			}
			is_dragging = false;
			mouse_last_click = false;
		};

		this.mouseWheelEvent = function (e) {
			e = window.event || e;
			e.preventDefault();
			e.stopPropagation();
			let delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))) * 1.02;
			if (delta <= 0) { delta = 0.98; }
			const mousex = e.x - $(canvas)[0].offsetParent.offsetLeft - canvasMarginH / 2;
			const mousey = e.y - $(canvas)[0].offsetParent.offsetTop - canvasMarginH / 2;
			const new_scale = delta * plan.stage_scale;
			if (new_scale <= 800) {
				stage.x = mousex - delta * (mousex - stage.x);
				stage.y = mousey - delta * (mousey - stage.y);
				this.scale(delta * plan.stage_scale);
			}

			return false;
		};

		this.getItemCount = function (itemType) {
			let itemCount = 0;
			if (typeof layers === "undefined") { return 0; }
			for (let i = 0; i < layers.length; i++) {
				if (layers[i].layer_type !== "ap") { continue; }
				itemCount += layers[i].children ? _.filter(layers[i].children, (child) => child.itemType === itemType).length : 0;
			}

			return itemCount;
		};

		this.initBoard = function (r, canvasIndex) {
			mouse_mode = "ap";
			plan.radius = r;
			plan.real_radius = r;
			plan.item_index = {
				ap: 1,
				am: 1,
				idf: 1,
				mdf: 1
			};
			DISTANCE_CUT_OFF = r * 2;
			canvas = document.getElementsByTagName("canvas")[canvasIndex || 0];
			canvas.width = canvas.parentElement.clientWidth - canvasMarginW;
			canvas.height = canvas.parentElement.clientHeight - canvasMarginH;
			canvas.style.width = `${canvas.parentElement.clientWidth - canvasMarginW}px`;
			if (stage) {
				stage.enableDOMEvents(false);
				/* TODO: remove ticker on leave page */
				createjs.Ticker.removeEventListener("tick", tick);
				stage.removeAllChildren();
				stage.removeAllEventListeners();
				stage.canvas = canvas;
				stage.enableDOMEvents(true);
			} else {
				stage = new createjs.Stage(canvas);
				createjs.Touch.enable(stage);
				stage.enableMouseOver(5);
			}
			addListeners(canvas, this);
			stage.mouseMoveOutside = true; // keep tracking the mouse even when it leaves the canvas
			if (!plan || !plan.floor_width) {
				plan.floor_width = 200; // m or ft
				plan.floor_width_px = canvas.width;
			}
			plan.stage_ppm = plan.floor_width_px / plan.floor_width;

			// add default layers
			layers = [new createjs.Container()];
			layers[0].layer_type = "ap";
			layers[1] = new createjs.Container();
			layers[1].layer_type = "walls";
			coverage = new createjs.Container();
			coverage.layer_type = "coverage";
			current_layer = 0;
			floorplan = new createjs.Container();
			floorplan.layer_type = "background";
			distances = new createjs.Container();
			distances.layer_type = "distances";
			stage.addChild(floorplan);
			stage.addChild(layers[0]);
			stage.addChild(layers[1]);
			stage.addChild(distances);
			stage.addChild(coverage);

			createjs.Ticker.addEventListener("tick", tick);
			contextMenu.setup(this.menu);
		};

		this.setupMenu = function (menu) {
			this.menu = menu;
		};

		this.startCalibration = function (cb) {
            self.setFloorplanDirty();
			mouse_prev_mode = mouse_mode;
			mouse_mode = "calibration";
			calibration_step = 1;
			this.calibrationDone = cb;
		};

		this.calibrationLine = function (x, y, end) {
			if (end) {
				this.calibration_line.graphics.clear();
				this.calibration_line.graphics.setStrokeStyle(4).beginStroke("#088").moveTo(originX, originY);
				this.calibration_line.graphics.lineTo(x, y);
				this.calibration_line.p_start = { x: originX, y: originY };
				this.calibration_line.p_end = { x: x, y: y };
				update = true;
			} else {
				originX = x;
				originY = y;
				this.calibration_line = new createjs.Shape();
				stage.addChild(this.calibration_line);
			}
		};

		this.completeCalibration = function (distance, cancel) {
			calibration_step = false;
			if (this.calibration_line) {
				stage.removeChild(this.calibration_line);
				if (!cancel) {
					const c = this.calibration_line;
					const d = Math.sqrt(Math.pow(c.p_start.x - c.p_end.x, 2) + Math.pow(c.p_start.y - c.p_end.y, 2));
					plan.stage_ppm = d / distance;
					plan.floor_width = plan.floor_width_px / plan.stage_ppm;
					this.updateSignalStrength(plan.real_radius);
				}
				delete this.calibration_line;
			}
			mouse_mode = mouse_prev_mode;
		};

		this.addWallSegment = function (x, y) {
			current_wall.graphics.lineTo(x, y).endStroke();
			current_wall.p_corners.push({ x: x, y: y });
			current_wall = new createjs.Shape();
			current_wall.graphics.setStrokeStyle(this.wall_type.width).setStrokeDash(this.wall_type.dash).beginStroke(this.wall_type.color).moveTo(x, y);
			if (current_wall.p_corners === undefined) { current_wall.p_corners = []; }
			current_wall.p_corners.push({ x: x, y: y });
			current_wall.wall_type = this.wall_type;
			layers[1].addChild(current_wall);
			addWallHandlers.call(this, current_wall, current_wall.p_corners.length);
		};

		this.cancelWall = function () {
			if (current_wall) { current_wall.graphics.endStroke(); }
			current_wall = false;
		};

		this.addAP = function (x, y, signal_radius, item) {
			if (is_dragging) {
				is_dragging = false;

				return;
			}

			const ap = new createjs.Shape();
			const container = new createjs.Container();
			const mperpx = 1 / plan.stage_ppm;
			layers[current_layer].addChild(container);

			container.scaleX = container.scaleY = container.scale = 1;
			container.x = x;
			container.y = y;
			container.realx = mperpx * container.x;
			container.realy = mperpx * container.y;

			let itemType;
			if (typeof item === "object") {
				item.itemType = item.itemType || "ap";
			} else {
				item = { itemType: item || "ap" };
			}
			container.itemType = itemType = item.itemType;

			addHandlers.call(this, container);

			let itemIndex = 0;
			let text;
            const AP_SQUARE_CORNER = 0.5 * plan.stage_ppm;

			switch (itemType) {
				case "ap":
					item = _.defaults(item, { vendor: this.plan.details.vendor, sku: this.plan.details.aps });
					itemIndex = plan.item_index[itemType];
					text = new createjs.Text(itemIndex, "12px Arial", TEXT_RGB[itemType]);
					var overlaps = new createjs.Container();
					container.overlaps = overlaps;
					overlaps.mouseEnabled = false;

					var circle = new createjs.Shape();
					circle.id = _.uniqueId();
					circle.graphics.setStrokeStyle(1).beginFill(AP_CIRCLE_RGBA).beginStroke(AP_CIRCLE_STROKE_RGB).drawCircle(0, 0, plan.radius);
					circle.puddleShape = "signal";
					circle.regX = circle.regY = 0;
					circle.scaleX = circle.scaleY = circle.scale = 1;
					circle.cursor = "pointer";
					container.addChild(circle);
					ap.overlaps = overlaps;
					container.addChild(ap);
					container.addChild(overlaps);
					ap.graphics.beginFill("Blue").drawRect(-AP_SQUARE_CORNER, -AP_SQUARE_CORNER, 2 * AP_SQUARE_CORNER, 2 * AP_SQUARE_CORNER);
					ap.puddleShape = "ap";
					break;

				case "am":
					item = _.defaults(item, { vendor: this.plan.details.vendor, sku: this.plan.details.ams });
					itemIndex = plan.item_index[itemType];
					text = new createjs.Text(itemIndex, "12px Arial", TEXT_RGB[itemType]);
					var circle = new createjs.Shape();
					circle.id = _.uniqueId();
					circle.graphics.beginFill(BUBBLE_RGB.am).drawCircle(0, 0, AM_VISUAL_RADIUS - 5).endFill();
					circle.graphics.beginStroke(BUBBLE_RGB.am).drawCircle(0, 0, AM_VISUAL_RADIUS).endStroke();
					circle.graphics.beginStroke(BUBBLE_RGB.am).drawCircle(0, 0, AM_VISUAL_RADIUS + 10).endStroke();
					circle.puddleShape = "print";
					circle.regX = circle.regY = 0;
					circle.scaleX = circle.scaleY = circle.scale = 1;
					circle.cursor = "pointer";
					container.addChild(circle);
					container.addChild(ap);
					ap.puddleShape = "am";
					break;

				case "idf":
					itemIndex = plan.item_index[itemType];
					text = new createjs.Text(`IDF ${itemIndex}`, "10px Arial", TEXT_RGB[itemType]);
					var square = new createjs.Shape();
					square.id = _.uniqueId();
					// square.graphics.beginFill(BUBBLE_RGB.idf).drawRoundRect(0 - IDF_VISUAL_RADIUS, 0 - IDF_VISUAL_RADIUS / 2, IDF_VISUAL_RADIUS * 2, IDF_VISUAL_RADIUS).endFill()
					square.puddleShape = "display";
					square.regX = square.regY = 0;
					square.scaleX = square.scaleY = square.scale = 1;
					square.cursor = "pointer";
					container.addChild(square);
					container.addChild(ap);
					ap.puddleShape = "idf";
					break;

				case "mdf":
					itemIndex = 1;
					text = new createjs.Text(`MDF ${itemIndex}`, "10px Arial", TEXT_RGB[itemType]);
					var square = new createjs.Shape();
					square.id = _.uniqueId();
					// square.graphics.beginFill(BUBBLE_RGB.mdf).drawRoundRect(0 - MDF_VISUAL_RADIUS / 2, 0 - MDF_VISUAL_RADIUS / 2, MDF_VISUAL_RADIUS, MDF_VISUAL_RADIUS).endFill()
					square.puddleShape = "display";
					square.regX = square.regY = 0;
					square.scaleX = square.scaleY = square.scale = 1;
					square.cursor = "pointer";
					container.addChild(square);
					container.addChild(ap);
					ap.puddleShape = "mdf";
					break;
			}

			container.inventory = _.defaults({ number: plan.item_index[itemType] }, item);
			if (itemType === "mdf") { container.inventory.mdf = true; }
			plan.item_index[itemType]++;

			ap.regX = ap.regY = 0;
			ap.scaleX = ap.scaleY = ap.scale = 1;
			ap.cursor = "pointer";

			text.scaleX = text.scaleY = 100 / plan.stage_scale;
			text.textBaseline = "alphabetic";

			const bubble = addBubble(text, itemType);
			ap.pbubble = bubble;
			container.addChild(bubble);
			container.addChild(text);

			addDistances.call(this, container);

			if (itemType === "ap") { drawIntersections(container); }

			update = true;
		};

		this.reindexItems = function () {
			const index = {
				ap: 1,
				am: 1,
				idf: 1,
				mdf: 1
			};
			_.each(layers, (layer) => {
				if (layer.layer_type === "ap") {
					_.map(layer.children, (item) => {
						switch (item.itemType) {
							case "ap":
								item.children[4].text = index[item.itemType];
								break;

							case "am":
								item.children[3].text = index[item.itemType];
								break;

							case "idf":
								item.children[3].text = `IDF ${index[item.itemType]}`;
								break;

							case "mdf":
								item.children[3].text = "MDF";
								break;
						}
						_.set(item, "inventory.number", index[item.itemType]++);
					});
				}
			});
			plan.item_index = index;
		};

		this.getCurrentItem = function () {
			return selectedAP;
		};

		this.unselectAP = function () {
			selectedAP = false;
		};

		this.deleteSelectedItem = function () {
			if (!selectedAP) { return; }
            self.setFloorplanDirty();
			contextMenu.close();
			let i, j, k;
			const selected_distances_length = selectedAP.distances.length;
			for (i = distances.children.length - 1; i >= 0; i--) {
				for (k = selected_distances_length - 1; k >= 0; k--) {
					if (selectedAP.distances[k] && distances.children[i].name === selectedAP.distances[k].name) {
						distances.removeChild(distances.children[i]);
						break;
					}
				}
			}
			let lchild, ap2;
			for (i = 0; i < layers.length; i++) {
				if (layers[i].layer_type !== "ap") { continue; }
				for (lchild = 0; lchild < layers[i].children.length; lchild++) {
					ap2 = layers[i].children[lchild];
					for (j = ap2.distances.length - 1; j >= 0; j--) {
						for (k = selected_distances_length - 1; k >= 0; k--) {
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
			this.unselectAP();
			this.toggleOverlaps();
			update = true;
			this.toggleOverlaps();
			this.reindexItems();
		};

		this.selectView = function(view_mode) {
            self.setFloorplanDirty();

			var link_count = distances.children.length;
			for (var link_pointer = 0; link_pointer != link_count; (link_pointer++)) {
				var item_type;
				var view_code = { 'ap': 1, 'am': 2, 'idf': 4};

				item_type = distances.children[link_pointer].ap_start.itemType;
				var left_view_code = view_code[item_type];
				var show_left = (view_mode & left_view_code) != 0 ? true : false;

				item_type = distances.children[link_pointer].ap_end.itemType;
				var right_view_code = view_code[item_type];
				var show_right = (view_mode & right_view_code) != 0 ? true : false;

				distances.children[link_pointer].ap_start.visible = show_left;
				distances.children[link_pointer].ap_end.visible   = show_right;
				distances.children[link_pointer].visible = show_left && show_right;
			}
			this.toggleOverlaps()
			update = true
			this.toggleOverlaps()
		}

		this.deleteSelectedWall = function () {
			if (!selectedWall) { return; }
            self.setFloorplanDirty();
			contextMenu.close();
			layers[1].removeChild(selectedWall);
			update = true;
		};

		this.updateSignalStrength = function (signal_radius) {
			DISTANCE_CUT_OFF = signal_radius * 2;
			if (stage) {
				plan.radius = signal_radius * plan.stage_ppm; // in pixels
				_.each(stage.children, (child) => {
					if (child.layer_type === "ap") {
						for (let i = 0; i < child.children.length; i++) {
							for (let j = 0; j < child.children[i].children.length; j++) {
								if (child.children[i].children[j].puddleShape === "signal") {
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

		this.toggleDistances = function (state) {
			show_distances = !show_distances;
			if (state === "off") { show_distances = false; }
			if (state === "on") { show_distances = true; }
			distances.visible = show_distances;
			update = true;
		};

		/**
		 * Overlaps are added as child for the AP container itself;
		 * the overlaps container is shown behind the main AP circle container
		 */
		this.toggleOverlaps = function (state) {
			show_overlaps = !show_overlaps;
			if (state === "off") { show_overlaps = false; }
			if (state === "on") { show_overlaps = true; }
			_.each(stage.children, (child) => {
				if (child.layer_type === "ap") {
					for (let i = 0; i < child.children.length; i++) {
						if (child.children[i].itemType === "ap") { drawIntersections(child.children[i]); }
					}
				}
			});
			update = true;
		};

		this.toggleRadius = function (state) {
			show_radius = !show_radius;
			if (state === "off") { show_radius = false; }
			if (state === "on") { show_radius = true; }
			_.each(stage.children, (child) => {
				if (child.layer_type === "ap") {
					for (let i = 0; i < child.children.length; i++) {
						child.children[i].children[0].visible = show_radius;
					}
				}
			});
			update = true;
		};

		this.scale = function (percent) {
			if (!percent || percent < 10 || percent > 1800) { return; }
			plan.stage_scale = percent;
			if (this.updateControls) { this.updateControls("scale", Math.round(plan.stage_scale)); }
			// plan.stage_ppm = plan.floor_width_px / plan.floor_width;
			plan.floor_width = plan.floor_width_px / plan.stage_ppm;
			stage.setTransform(stage.x, stage.y, percent / 100, percent / 100).update();
			for (let i = 0; i < distances.children.length; i++) {
				if (~_.indexOf(["bubble", "value"], distances.children[i].name)) {
					distances.children[i].scaleX = distances.children[i].scaleY = 100 / plan.stage_scale;
				}
			}
			_.each(stage.children, (child) => {
				if (child.layer_type === "ap") {
					for (let i = 0; i < child.children.length; i++) {
						if (child.children[i].itemType === "ap") {
							child.children[i].children[3].scaleX = child.children[i].children[3].scaleY = 100 / plan.stage_scale;
							child.children[i].children[4].scaleX = child.children[i].children[4].scaleY = 100 / plan.stage_scale;
						} else {
							child.children[i].children[2].scaleX = child.children[i].children[2].scaleY = 100 / plan.stage_scale;
							child.children[i].children[3].scaleX = child.children[i].children[3].scaleY = 100 / plan.stage_scale;
						}
					}
				}
			});
		};

		this.addFloorPlan = function (url, newimg) {
			const defer = $q.defer();
            if (!url) { return defer.resolve(); }
            if (newimg) { self.setFloorplanDirty(); }
			const img = new Image();
			img.setAttribute("crossOrigin", "anonymous");
			const request = new XMLHttpRequest();
			img.src = url.replace("public/", "");
			request.open("GET", img.src, true);
			request.onprogress = function (event) {
				self.uploadProgress(100 + 100 * event.loaded / event.total);
			};
			request.send(null);
			img.onload = function (event) {
				const t = event.target;
				const f = new createjs.Bitmap(t);
				f.x = 0;
				f.y = 0;
				f.regX = 0;
				f.regY = 0;
				plan.floor_width_px = this.width;
				const scaleX = canvas.width / this.width;
				const scaleY = canvas.height / this.height;
				if (scaleX > scaleY) {
					self.scale(scaleY * 100);
				} else {
					self.scale(scaleX * 100);
				}
				self.plan.stage.floorplan = url;
                self.uploadProgress(0, url);
				floorplan.removeAllChildren();
				floorplan.addChild(f);
				update = true;
				$timeout(() => {
					defer.resolve();
				}, 0);
			};

			return defer.promise;
		};

		function initStage () {
			if (!plan.stage) { plan.stage = {}; }
			plan.stage.x = stage.x;
			plan.stage.y = stage.y;
			plan.stage.regX = stage.regX;
			plan.stage.regY = stage.regY;
		}

		this.toJSON = function () {
			plan.stage.x = stage.x;
			plan.stage.y = stage.y;
			plan.stage.regX = stage.regX;
			plan.stage.regY = stage.regY;
			const json = {
				plan: plan,
				floorplan: this.plan.stage.floorplan,
				items: [],
				walls: []
			};

			let children, i, d, m, layers_length = layers.length;
			for (i = 0; i < layers_length; i++) {
				if (layers[i].layer_type === "ap") {
					_.each(layers[i].children, (ap) => {
						json.items.push({
							name: ap.inventory.name,
							itemType: ap.inventory.itemType,
							sku: ap.inventory.sku,
							vendor: ap.inventory.vendor,
							x: ap.x,
							y: ap.y
						});
					});
				} else if (layers[i].layer_type === "walls") {
					_.each(layers[i].children, (wall) => {
						json.walls.push({
							wall_type: wall.wall_type,
							p_corners: wall.p_corners
						});
					});
				}
			}

			return json;
		};

      this.centerStage = () => {
        const cw = canvas.width;
        const ch = canvas.height;
        const stageBounds = stage.getBounds();
        if (stageBounds) {
          const sw = cw / stageBounds.width;
          const sh = ch / stageBounds.height;
          this.scale(100 * (Math.min(sw, sh) - 0.05));
          stage.x = stage.y = 20;
          update = true;
        }
      };

      this.getPNG = () => {
        const stageContext = stage.canvas.getContext('2d')
        const crop = trimImageWhitespace(stage.canvas, stageContext)
        const tWidth = Math.min(canvas.width, crop[1] - crop[3] + 40)
        const tHeight = Math.min(canvas.height, crop[2] - crop[0] + 40)

        const newCanvas = $("<canvas>")
          .attr("width", tWidth)
          .attr("height", tHeight)[0]
        newCanvas.setAttribute("width", tWidth);
        newCanvas.setAttribute("height", tHeight);
        newCanvas.getContext("2d").drawImage(stage.canvas, 0, 0)

        return newCanvas.toDataURL();
      }

      this.getThumb = () => {
        const stageContext = stage.canvas.getContext('2d')
        const crop = trimImageWhitespace(stage.canvas, stageContext)
        let tWidth = crop[1] - crop[3]
        let tHeight = crop[2] - crop[0]
				let tY = 0
        const thumbWidth = 150
        const thumbHeight = 150
        if (tWidth/tHeight > thumbWidth/thumbHeight) {
          let scale = tWidth / thumbWidth
          tY = thumbHeight - tHeight / scale
          tHeight = scale * thumbHeight
        } else {
          tWidth = thumbWidth * tHeight / thumbHeight
        }
        const newCanvas = $("<canvas>")
          .attr("width", thumbWidth)
          .attr("height", thumbHeight)[0]

        const context = newCanvas.getContext("2d")
        context.drawImage(stage.canvas, 0, 0, tWidth, tHeight, 0, tY, thumbWidth, thumbHeight)

        return newCanvas.toDataURL()
      }

		this.loadPlan = function (planResource, signal_radius, updateControls, uploadProgress, setDirty) {
			const plan_id = planResource._id;
			const data = planResource.stage;
			this.uploadProgress = uploadProgress;
			this.plan = planResource;
			this.updateControls = updateControls;
            this.setFloorplanDirty = setDirty;
			$timeout(() => {
				if (data.plan) { plan = data.plan; }
				plan._id = this.plan.id;
				const stage_scale = _.get(plan, "stage.stage_scale");
				this.initBoard(signal_radius);
				if (data.floorplan) {
					this.addFloorPlan(data.floorplan)
						.then(() => {
							if (data.plan && data.plan.stage_scale) { this.scale(stage_scale); }
							else { this.scale(100); }
						});
				}

				stage.x = _.get(data.plan, "stage.x");
				stage.y = _.get(data.plan, "stage.y");
				stage.regX = _.get(data.plan, "stage.regX");
				stage.regY = _.get(data.plan, "stage.regY");

				if (!data.items && data.aps) { data.items = data.aps; }
				_.each(data.items, (item) => {
					this.addAP(item.x, item.y, signal_radius, item);
				});
				this.reindexItems();
				_.each(data.walls, (wall) => {
					current_wall = false;
					this.wall_type = wall.wall_type;
					_.each(wall.p_corners, (segment) => {
						this.addWall(segment.x, segment.y);
					});
				});
				$timeout(() => {
					this.updateSignalStrength(plan.real_radius);
					if (!plan.stage) { initStage(); }
				}, 100);
			}, 0);
		};

		function drawHeatmap (data) {
			const layers_length = layers.length;
			const points = [];

			for (let i = 0; i < layers_length; i++) {
				if (layers[i].layer_type !== "ap") { continue; }
				// layers[i].visible = false;
				/* jshint -W083 */
				_.each(layers[i].children, (ap2) => {
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

			$http.post(`/plans/${plan._id}/coverage`, { points: points, ppm: plan.stage_ppm })
				.success((response) => {
					const bitheat = new createjs.Bitmap(response);
					bitheat.x = 0;
					bitheat.y = 0;
					coverage.addChild(bitheat);
					update = true;
				});
		}

		this.heatmap = function (state) {
          return; // TODO
			if (state === "off") {
				coverage.removeAllChildren();
				const layers_length = layers.length;
				for (let i = 0; i < layers_length; i++)			{
					if (layers[i].layer_type !== "ap") { continue; }
					layers[i].visible = true;
				}

				return;
			}
			drawHeatmap();
		};

		this.selectTool = function (mode) {
			mouse_mode = mode;
			this.cancelWall(); // todo: do the same for other actions, like nav away
			contextMenu.switchMenu(mode);
		};

		this.selectWallType = function (wall) {
			this.cancelWall();
			this.wall_type = wall;
		};

		function redrawIDF (idf) {
			const text = _.find(idf.children, (c) => c.text !== undefined);
			if (idf.itemType === "idf") {
				idf.children[2].graphics.clear().beginFill(BUBBLE_RGB.idf).drawRoundRect(0 - IDF_VISUAL_RADIUS_PRINT, 0 - IDF_VISUAL_RADIUS_PRINT / 2, IDF_VISUAL_RADIUS_PRINT * 2, IDF_VISUAL_RADIUS_PRINT, 2, 2).endFill();
				idf.children[3].text = `IDF ${plan.item_index.idf++}`;
			} else {
				idf.children[2].graphics.clear().beginFill(BUBBLE_RGB.mdf).drawRoundRect(0 - MDF_VISUAL_RADIUS_PRINT, 0 - MDF_VISUAL_RADIUS_PRINT / 2, MDF_VISUAL_RADIUS_PRINT * 2, MDF_VISUAL_RADIUS_PRINT, 10, 10).endFill();
				idf.children[2].graphics.beginStroke(BUBBLE_RGB.mdf).drawRoundRect(-4 - MDF_VISUAL_RADIUS_PRINT, -4 - MDF_VISUAL_RADIUS_PRINT / 2, MDF_VISUAL_RADIUS_PRINT * 2 + 8, MDF_VISUAL_RADIUS_PRINT + 8, 5, 5);
				idf.children[3].text = "MDF";
			}
		}

		let lastMDF;
		this.setupIDF = function (item) {
			let children, i, d, m, layers_length = layers.length;
			for (i = 0; i < layers_length; i++) {
				if (layers[i].layer_type === "ap") {
					_.each(layers[i].children, (ap) => {
						if (ap.id !== item.id) {
							if (item.itemType === "mdf" && ap.itemType === "mdf") {
								ap.itemType = "idf";
								lastMDF = ap.id;
								redrawIDF(ap);
							}
 else if (item.itemType === "idf" && lastMDF && ap.id === lastMDF) {
								// TODO: maybe switch back option? -- only works for previous MDF assigned in current session (not loaded)
							}
						}
					});
				}
			}
			if (item.inventory.mdf) {
				item.itemType = "mdf";
				item.inventory.itemType = "mdf";
			} else {
				item.itemType = "idf";
				item.inventory.itemType = "idf";
			}
			redrawIDF(item);
			this.reindexItems();
			update = true;
		};

		Heatmap.setup({
			colors: {
				"100": [48, 110, 255],
				"75": [110, 255, 48],
				"65": [255, 255, 0],
				"0": [255, 255, 255]
			}
		});
	}
]);
