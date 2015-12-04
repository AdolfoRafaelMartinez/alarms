'use strict';

/*globals _ */

// Context Menu service on HTML5 canvas
angular.module('core').service('Heatmap', ['$timeout',
	function($timeout) {
        var canvas,
            context,
            pixels,
            width,
            height,
            ppm,  // int ppm: scale in pixels per meter
            pixel_index,
            colors = [],
            twopi = 2 * Math.PI;

        function drawPixel(x, y, val)
        {
            // console.log('pixel', x, y, colors[val]);
            pixel_index = (y * width + x) * 4;
            if (pixel_index + 2 < pixels.length) {
                pixels[pixel_index + 0] = colors[val][0];
                pixels[pixel_index + 1] = colors[val][1];
                pixels[pixel_index + 2] = colors[val][2];
                pixels[pixel_index + 3] = 255;
            }
        }

        /**
         * @param int x: coord in pixels
         * @param in y: coord in pixels
         * @param int val: intesity at (x,y)
         * @param int radius: max radius to draw, in pixels
         */
        function drawCloud(x, y, val, radius)
        {
            var r, a, step, loss;
            drawPixel(x, y, val);
            for (r=1; r<radius; r++)
            {
                var strength = Math.min(100, Math.round(val - (20*Math.log10(5550) + 20*Math.log10(0.000621371 * r/ppm))));
                console.log(strength);
                if (strength <= 0) {
                    return;
                }
                step = Math.PI / (Math.ceil(twopi *r));
                for (a=0; a<twopi; a+=step)
                {
                    drawPixel(x + Math.round(r*Math.sin(a)), y + Math.round(r*Math.cos(a)), strength);
                }
            }
        }

        this.draw = function(data)
        {
            if (!ppm) {
                console.log('no PPM defined');
                return;
            }
            canvas = document.createElement('canvas');
            width = data.width;
            height = data.height;
            canvas.width = width;
            canvas.height = height;
            context = canvas.getContext('2d');

            var index;
            var imageData = context.createImageData(width, height);
            pixels = imageData.data;
            var points = data.points;
            var pixel_index;

            for (index=0; index<points.length; index++)
            {
                drawCloud(Math.round(points[index].x), Math.round(points[index].y), Math.round(points[index].value), Math.round(points[index].radius * 2));
            }

            context.putImageData(imageData, 0, 0);

            return canvas;
        };

        this.setup = function(options) {

            if (options.colors) {
                var ci = 0,
                    steps = Object.keys(options.colors).map(function(e) { return parseInt(e); }),
                    previous = 1*steps.pop(),
                    current, pcol, ccol, colstep;
                do {
                    current = 1*steps.pop();
                    pcol = options.colors[previous];
                    ccol = options.colors[current];
                    colstep = [
                        (ccol[0] - pcol[0]) / (current - previous),
                        (ccol[1] - pcol[1]) / (current - previous),
                        (ccol[2] - pcol[2]) / (current - previous),
                    ];
                    for (ci=previous; ci>current; ci--) {
                        pcol[0] -= colstep[0];
                        pcol[1] -= colstep[1];
                        pcol[2] -= colstep[2];
                        colors[ci] = [ pcol[0], pcol[1], pcol[2] ];
                    }
                    previous = current;
                } while (current);
                colors = colors.map(function(col) { return col.map(function(e) { return Math.round(e); }); });
            }

            if (options.ppm) {
                ppm = options.ppm;
            }
        };

    }
]);
