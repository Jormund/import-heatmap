// ==UserScript==
// @id             iitc-plugin-import-heatmap@Jormund
// @name           IITC plugin : Import Heatmap
// @category       Layer
// @version        1.0.0.20210407.2122
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      https://raw.githubusercontent.com/Jormund/import-heatmap/master/import-heatmap.meta.js
// @downloadURL    https://raw.githubusercontent.com/Jormund/import-heatmap/master/import-heatmap.user.js
// @description    [2021-04-07-2122] Import Heatmap from text
// @include        https://ingress.com/intel*
// @include        http://ingress.com/intel*
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @include        https://intel.ingress.com/*
// @match          https://intel.ingress.com/*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @grant          none
// ==/UserScript==
//Changelog
//1.0.0 Fix for leaflet 1.6 used by IITC CE 0.31.1
//0.1.1 Activate on intel.ingress.com
//0.1.0 Initial release


// PLUGIN START
function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if (typeof window.plugin !== 'function') window.plugin = function () { };

    window.plugin.importHeatmap = function () { };

    window.plugin.importHeatmap.KEY_STORAGE = 'importHeatmap-storage';
    window.plugin.importHeatmap.DEFAULT_COLUMN_SEPARATOR = ';';
    window.plugin.importHeatmap.storage = {
        columnSeparator: window.plugin.importHeatmap.DEFAULT_COLUMN_SEPARATOR,
    };

    // update the localStorage datas
    window.plugin.importHeatmap.saveStorage = function () {
        localStorage[window.plugin.importHeatmap.KEY_STORAGE] = JSON.stringify(window.plugin.importHeatmap.storage);
    };

    // load the localStorage datas
    window.plugin.importHeatmap.loadStorage = function () {
        if (typeof localStorage[window.plugin.importHeatmap.KEY_STORAGE] != "undefined") {
            window.plugin.importHeatmap.storage = JSON.parse(localStorage[window.plugin.importHeatmap.KEY_STORAGE]);
        }

        //ensure default values are always set
        if (typeof window.plugin.importHeatmap.storage.columnSeparator == "undefined") {
            window.plugin.importHeatmap.storage.columnSeparator = window.plugin.importHeatmap.DEFAULT_COLUMN_SEPARATOR;
        }

    };

    window.plugin.importHeatmap.importText = function () {
        try {
            console.log('[Import Heatmap] - Parsing...');
            var inputText = $("#importHeatmap-inputText").val();
            if (inputText.length == 0) {
                alert('Please paste data to import');
                return false;
            }
            //console.log('[Import Heatmap] '+inputText.length+' char in input');
            var cleanInputText = inputText.replace(/\r([^\n])/gm, "\r\n$1").replace(/([^\r])\n/gm, "$1\r\n");
            window.plugin.importHeatmap.cleanInputText = cleanInputText;//debug
            //console.log('[Import Heatmap] '+cleanInputText.length+' char after replacing new lines');
            var inputLines = cleanInputText.split("\r\n");
            window.plugin.importHeatmap.inputLines = inputLines;//debug
            console.log('[Import Heatmap] ' + inputLines.length + ' lines found');
            var heatPoints = [];
            window.plugin.importHeatmap.heatPoints = heatPoints;//debug

            var max = -Infinity;
            var min = Infinity;
            $.each(inputLines, function (i, line) {
                var cells = line.split(window.plugin.importHeatmap.storage.columnSeparator);
                if (cells.length < 2)
                    return true;//syntaxe erronée, on passe à la ligne suivante
                //if (cells.length > 3) return;
                var lat = parseFloat(cells[0]);
                var lng = parseFloat(cells[1]);
                var value = 1;
                if (cells.length >= 3)
                    value = parseFloat(cells[2]);
                if (isNaN(lat) || isNaN(lng) || isNaN(value))
                    return true;//valeur erronée, on passe à la ligne suivante

                if (value > max) max = value;
                if (value < min) min = value;

                heatPoints.push([lat, lng, value]);
            });

            if (min == Infinity) min = 0;
            if (max == -Infinity) max = 1;
            if (min == max) {
                //all points have same intensity, we don't need to use it
                max = 1;
                min = 0;
            }
            if (!(max == 1 && min == 0)) {
                //ramener l'intensité entre 0 et 1
                $.each(heatPoints, function (i, point) {
                    point[2] = (point[2] - min) / (max - min);
                });
            }

            console.log('[Import Heatmap] - Will draw map from ' + heatPoints.length + ' points...');
            window.plugin.importHeatmap.heatmapFromArray(heatPoints);
            var message = '[Import Heatmap] - Done';
            message += '\r\n' + heatPoints.length + ' points';
            if (!(max == 1 && min == 0)) {
                message += '\r\nwith intensity between ' + min + ' and ' + max;
            }
            alert(message);
            return true;
        }
        catch (err) {
            alert(err.Message);
            throw err;
        }
    }
    window.plugin.importHeatmap.heatmapFromArray = function (heatPoints) {
        window.plugin.importHeatmap.heatLayerGroup.clearLayers();

        //gradient
        window.plugin.importHeatmap.heatLayer = L.heatLayer(heatPoints, {
            radius: 20, blur: 30, maxZoom: 11,
            gradient: {
                0.1: 'grey',
                0.2: 'blue',
                0.3: 'cyan',
                0.4: 'lime',
                0.5: 'yellow',
                0.7: 'orange',
                1.0: 'red'
            }
        });
        window.plugin.importHeatmap.heatLayer.addTo(window.plugin.importHeatmap.heatLayerGroup);
    };

    window.plugin.importHeatmap.manualOpt = function () {

        var html = '<div class="drawtoolsSetbox">'
            + 'Insert data below (lat;lng;value)'
            + '<textarea id="importHeatmap-inputText"></textarea>'
            //+ '<a onclick="window.plugin.importHeatmap.importText();return false;" tabindex="0">Import</a>'
            + '</div>';

        dialog({
            html: html,
            id: 'plugin-importHeatmap-options',
            dialogClass: 'ui-dialog-drawtoolsSet',
            title: 'Import Heatmap',
            buttons: {
                'Import': function () {
                    if (window.plugin.importHeatmap.importText())
                        $(this).dialog('close');
                }
            }
        });
    }
    setup = function () {

        /*
        (c) 2014, Vladimir Agafonkin
        simpleheat, a tiny JavaScript library for drawing heatmaps with Canvas
        https://github.com/mourner/simpleheat
        commit c1998c36fa2f9a31350371fd42ee30eafcc78f9c
        */
        function simpleheat(canvas) {
            if (!(this instanceof simpleheat)) return new simpleheat(canvas);

            this._canvas = canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;

            this._ctx = canvas.getContext('2d');
            this._width = canvas.width;
            this._height = canvas.height;

            this._max = 1;
            this._data = [];
        }

        simpleheat.prototype = {

            defaultRadius: 25,

            defaultGradient: {
                0.4: 'blue',
                0.6: 'cyan',
                0.7: 'lime',
                0.8: 'yellow',
                1.0: 'red'
            },

            data: function (data) {
                this._data = data;
                return this;
            },

            max: function (max) {
                this._max = max;
                return this;
            },

            add: function (point) {
                this._data.push(point);
                return this;
            },

            clear: function () {
                this._data = [];
                return this;
            },

            radius: function (r, blur) {
                blur = blur === undefined ? 15 : blur;

                // create a grayscale blurred circle image that we'll use for drawing points
                var circle = this._circle = this._createCanvas(),
                    ctx = circle.getContext('2d'),
                    r2 = this._r = r + blur;

                circle.width = circle.height = r2 * 2;

                ctx.shadowOffsetX = ctx.shadowOffsetY = r2 * 2;
                ctx.shadowBlur = blur;
                ctx.shadowColor = 'black';

                ctx.beginPath();
                ctx.arc(-r2, -r2, r, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.fill();

                return this;
            },

            resize: function () {
                this._width = this._canvas.width;
                this._height = this._canvas.height;
            },

            gradient: function (grad) {
                // create a 256x1 gradient that we'll use to turn a grayscale heatmap into a colored one
                var canvas = this._createCanvas(),
                    ctx = canvas.getContext('2d'),
                    gradient = ctx.createLinearGradient(0, 0, 0, 256);

                canvas.width = 1;
                canvas.height = 256;

                for (var i in grad) {
                    gradient.addColorStop(+i, grad[i]);
                }

                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 1, 256);

                this._grad = ctx.getImageData(0, 0, 1, 256).data;

                return this;
            },

            draw: function (minOpacity) {
                if (!this._circle) this.radius(this.defaultRadius);
                if (!this._grad) this.gradient(this.defaultGradient);

                var ctx = this._ctx;

                ctx.clearRect(0, 0, this._width, this._height);

                // draw a grayscale heatmap by putting a blurred circle at each data point
                for (var i = 0, len = this._data.length, p; i < len; i++) {
                    p = this._data[i];
                    ctx.globalAlpha = Math.min(Math.max(p[2] / this._max, minOpacity === undefined ? 0.05 : minOpacity), 1);
                    ctx.drawImage(this._circle, p[0] - this._r, p[1] - this._r);
                }

                // colorize the heatmap, using opacity value of each pixel to get the right color from our gradient
                var colored = ctx.getImageData(0, 0, this._width, this._height);
                this._colorize(colored.data, this._grad);
                ctx.putImageData(colored, 0, 0);

                return this;
            },

            _colorize: function (pixels, gradient) {
                for (var i = 0, len = pixels.length, j; i < len; i += 4) {
                    j = pixels[i + 3] * 4; // get gradient color from opacity value

                    if (j) {
                        pixels[i] = gradient[j];
                        pixels[i + 1] = gradient[j + 1];
                        pixels[i + 2] = gradient[j + 2];
                    }
                }
            },

            _createCanvas: function () {
                if (typeof document !== 'undefined') {
                    return document.createElement('canvas');
                } else {
                    // create a new canvas instance in node.js
                    // the canvas class needs to have a default constructor without any parameter
                    return new this._canvas.constructor();
                }
            }
        };

            /*
            (c) 2014, Vladimir Agafonkin
            Leaflet.heat, a tiny and fast heatmap plugin for Leaflet.
            https://github.com/Leaflet/Leaflet.heat
            commit d2871b3
            */
            L.HeatLayer = (L.Layer ? L.Layer : L.Class).extend({

                // options: {
                //     minOpacity: 0.05,
                //     maxZoom: 18,
                //     radius: 25,
                //     blur: 15,
                //     max: 1.0
                // },

                initialize: function (latlngs, options) {
                    this._latlngs = latlngs;
                    L.setOptions(this, options);
                },

                setLatLngs: function (latlngs) {
                    this._latlngs = latlngs;
                    return this.redraw();
                },

                addLatLng: function (latlng) {
                    this._latlngs.push(latlng);
                    return this.redraw();
                },

                setOptions: function (options) {
                    L.setOptions(this, options);
                    if (this._heat) {
                        this._updateOptions();
                    }
                    return this.redraw();
                },

                redraw: function () {
                    if (this._heat && !this._frame && this._map && !this._map._animating) {
                        this._frame = L.Util.requestAnimFrame(this._redraw, this);
                    }
                    return this;
                },

                onAdd: function (map) {
                    this._map = map;

                    if (!this._canvas) {
                        this._initCanvas();
                    }

                    if (this.options.pane) {
                        this.getPane().appendChild(this._canvas);
                    } else {
                        map._panes.overlayPane.appendChild(this._canvas);
                    }

                    map.on('moveend', this._reset, this);

                    if (map.options.zoomAnimation && L.Browser.any3d) {
                        map.on('zoomanim', this._animateZoom, this);
                    }

                    this._reset();
                },

                onRemove: function (map) {
                    if (this.options.pane) {
                        this.getPane().removeChild(this._canvas);
                    } else {
                        map.getPanes().overlayPane.removeChild(this._canvas);
                    }

                    map.off('moveend', this._reset, this);

                    if (map.options.zoomAnimation) {
                        map.off('zoomanim', this._animateZoom, this);
                    }
                },

                addTo: function (map) {
                    map.addLayer(this);
                    return this;
                },

                _initCanvas: function () {
                    var canvas = this._canvas = L.DomUtil.create('canvas', 'leaflet-heatmap-layer leaflet-layer');

                    var originProp = L.DomUtil.testProp(['transformOrigin', 'WebkitTransformOrigin', 'msTransformOrigin']);
                    canvas.style[originProp] = '50% 50%';

                    var size = this._map.getSize();
                    canvas.width = size.x;
                    canvas.height = size.y;

                    var animated = this._map.options.zoomAnimation && L.Browser.any3d;
                    L.DomUtil.addClass(canvas, 'leaflet-zoom-' + (animated ? 'animated' : 'hide'));

                    this._heat = simpleheat(canvas);
                    this._updateOptions();
                },

                _updateOptions: function () {
                    this._heat.radius(this.options.radius || this._heat.defaultRadius, this.options.blur);

                    if (this.options.gradient) {
                        this._heat.gradient(this.options.gradient);
                    }
                    if (this.options.max) {
                        this._heat.max(this.options.max);
                    }
                },

                _reset: function () {
                    var topLeft = this._map.containerPointToLayerPoint([0, 0]);
                    L.DomUtil.setPosition(this._canvas, topLeft);

                    var size = this._map.getSize();

                    if (this._heat._width !== size.x) {
                        this._canvas.width = this._heat._width = size.x;
                    }
                    if (this._heat._height !== size.y) {
                        this._canvas.height = this._heat._height = size.y;
                    }

                    this._redraw();
                },

                _redraw: function () {
                    if (!this._map) {
                        return;
                    }
                    var data = [],
                        r = this._heat._r,
                        size = this._map.getSize(),
                        bounds = new L.Bounds(
                            L.point([-r, -r]),
                            size.add([r, r])),

                        max = this.options.max === undefined ? 1 : this.options.max,
                        maxZoom = this.options.maxZoom === undefined ? this._map.getMaxZoom() : this.options.maxZoom,
                        v = 1 / Math.pow(2, Math.max(0, Math.min(maxZoom - this._map.getZoom(), 12))),
                        cellSize = r / 2,
                        grid = [],
                        panePos = this._map._getMapPanePos(),
                        offsetX = panePos.x % cellSize,
                        offsetY = panePos.y % cellSize,
                        i, len, p, cell, x, y, j, len2, k;

                    // console.time('process');
                    for (i = 0, len = this._latlngs.length; i < len; i++) {
                        p = this._map.latLngToContainerPoint(this._latlngs[i]);
                        if (bounds.contains(p)) {
                            x = Math.floor((p.x - offsetX) / cellSize) + 2;
                            y = Math.floor((p.y - offsetY) / cellSize) + 2;

                            var alt =
                                this._latlngs[i].alt !== undefined ? this._latlngs[i].alt :
                                    this._latlngs[i][2] !== undefined ? +this._latlngs[i][2] : 1;
                            k = alt * v;

                            grid[y] = grid[y] || [];
                            cell = grid[y][x];

                            if (!cell) {
                                grid[y][x] = [p.x, p.y, k];

                            } else {
                                cell[0] = (cell[0] * cell[2] + p.x * k) / (cell[2] + k); // x
                                cell[1] = (cell[1] * cell[2] + p.y * k) / (cell[2] + k); // y
                                cell[2] += k; // cumulated intensity value
                            }
                        }
                    }

                    for (i = 0, len = grid.length; i < len; i++) {
                        if (grid[i]) {
                            for (j = 0, len2 = grid[i].length; j < len2; j++) {
                                cell = grid[i][j];
                                if (cell) {
                                    data.push([
                                        Math.round(cell[0]),
                                        Math.round(cell[1]),
                                        Math.min(cell[2], max)
                                    ]);
                                }
                            }
                        }
                    }
                    // console.timeEnd('process');

                    // console.time('draw ' + data.length);
                    this._heat.data(data).draw(this.options.minOpacity);
                    // console.timeEnd('draw ' + data.length);

                    this._frame = null;
                },

                _animateZoom: function (e) {
                    var scale = this._map.getZoomScale(e.zoom),
                        offset = this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos());

                    if (L.DomUtil.setTransform) {
                        L.DomUtil.setTransform(this._canvas, offset, scale);

                    } else {
                        this._canvas.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(offset) + ' scale(' + scale + ')';
                    }
                }
            });
        L.heatLayer = function (latlngs, options) {
            return new L.HeatLayer(latlngs, options);
        };

        window.plugin.importHeatmap.heatLayerGroup = new L.LayerGroup();
        window.plugin.importHeatmap.heatLayer = null;
        window.addLayerGroup('Import HeatMap', window.plugin.importHeatmap.heatLayerGroup, true);

        //add options menu
        $('#toolbox').append('<a onclick="window.plugin.importHeatmap.manualOpt();return false;" title="Import Heatmap from text">Import Heatmap</a>');

        console.log('[Import Heatmap] - Loaded');
    };

    setup.info = plugin_info; //add the script info data to the function as a property
    if (!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
    // if IITC has already booted, immediately run the 'setup' function
    if (window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);
