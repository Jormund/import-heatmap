// ==UserScript==
// @id             iitc-plugin-import-heatmap@Jormund
// @name           IITC plugin : Import Heatmap
// @category       Layer
// @version        0.1.0.20170628.1744
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @downloadURL    https://raw.githubusercontent.com/Jormund/import-heatmap/master/import-heatmap.user.js
// @description    [2017-06-28-1744] Import Heatmap from text
// @include        https://ingress.com/intel*
// @include        http://ingress.com/intel*
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @grant          none
// ==/UserScript==

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
        console.log('[Import Heatmap] - Parsing...');
        var inputText = $("#importHeatmap-inputText").val();
        if (inputText.length == 0) {
            alert('Please paste data to import');
            return false;
        }
        console.log('[Import Heatmap] '+inputText.length+' char in input');
        var cleanInputText = inputText.replace(/\r([^\n])/gm, "\r\n$1").replace(/([^\r])\n/gm, "$1\r\n");
        window.plugin.importHeatmap.cleanInputText = cleanInputText;//debug
        console.log('[Import Heatmap] '+cleanInputText.length+' char after replacing new lines');
        var inputLines = cleanInputText.split("\r\n");
        window.plugin.importHeatmap.inputLines = inputLines;//debug
        console.log('[Import Heatmap] '+inputLines.length+' lines found');
        var heatPoints = [];
        //TODO: message d'erreur si parsing échoue
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
            
            if(value > max) max = value;
            if(value < min) min = value;

            heatPoints.push([lat, lng, value]);
        });
        //ramener l'intensité entre 0 et 1
        $.each(heatPoints, function(i, point){
            point.value = (point.value-min)/(max-min);
        });

        console.log('[Import Heatmap] - Will draw map from ' + heatPoints.length + ' points...');
        window.plugin.importHeatmap.heatmapFromArray(heatPoints);

        return true;
    }
    window.plugin.importHeatmap.heatmapFromArray = function (heatPoints) {
        window.plugin.importHeatmap.heatLayerGroup.clearLayers();

        //gradient
        window.plugin.importHeatmap.heatLayer = L.heatLayer(heatPoints, { radius: 10, blur: 30, maxZoom: 11, gradient: { .6: 'grey', .9: 'orange', 1: 'red'} });
        window.plugin.importHeatmap.heatLayer.addTo(window.plugin.importHeatmap.heatLayerGroup);

        //console.log('[Import Heatmap] - Done');
        alert('[Import Heatmap] - Done');
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
        */
        !function () { "use strict"; function t(i) { return this instanceof t ? (this._canvas = i = "string" == typeof i ? document.getElementById(i) : i, this._ctx = i.getContext("2d"), this._width = i.width, this._height = i.height, this._max = 1, void this.clear()) : new t(i) } t.prototype = { defaultRadius: 25, defaultGradient: { .4: "blue", .6: "cyan", .7: "lime", .8: "yellow", 1: "red" }, data: function (t) { return this._data = t, this }, max: function (t) { return this._max = t, this }, add: function (t) { return this._data.push(t), this }, clear: function () { return this._data = [], this }, radius: function (t, i) { i = i || 15; var a = this._circle = document.createElement("canvas"), e = a.getContext("2d"), s = this._r = t + i; return a.width = a.height = 2 * s, e.shadowOffsetX = e.shadowOffsetY = 200, e.shadowBlur = i, e.shadowColor = "black", e.beginPath(), e.arc(s - 200, s - 200, t, 0, 2 * Math.PI, !0), e.closePath(), e.fill(), this }, gradient: function (t) { var i = document.createElement("canvas"), a = i.getContext("2d"), e = a.createLinearGradient(0, 0, 0, 256); i.width = 1, i.height = 256; for (var s in t) e.addColorStop(s, t[s]); return a.fillStyle = e, a.fillRect(0, 0, 1, 256), this._grad = a.getImageData(0, 0, 1, 256).data, this }, draw: function (t) { this._circle || this.radius(this.defaultRadius), this._grad || this.gradient(this.defaultGradient); var i = this._ctx; i.clearRect(0, 0, this._width, this._height); for (var a, e = 0, s = this._data.length; s > e; e++) a = this._data[e], i.globalAlpha = Math.max(a[2] / this._max, t || .05), i.drawImage(this._circle, a[0] - this._r, a[1] - this._r); var n = i.getImageData(0, 0, this._width, this._height); return this._colorize(n.data, this._grad), i.putImageData(n, 0, 0), this }, _colorize: function (t, i) { for (var a, e = 3, s = t.length; s > e; e += 4) a = 4 * t[e], a && (t[e - 3] = i[a], t[e - 2] = i[a + 1], t[e - 1] = i[a + 2]) } }, window.simpleheat = t } (),
        /*
        (c) 2014, Vladimir Agafonkin
        Leaflet.heat, a tiny and fast heatmap plugin for Leaflet.
        https://github.com/Leaflet/Leaflet.heat
        */
    L.HeatLayer = L.Class.extend({ initialize: function (t, i) { this._latlngs = t, L.setOptions(this, i) }, setLatLngs: function (t) { return this._latlngs = t, this.redraw() }, addLatLng: function (t) { return this._latlngs.push(t), this.redraw() }, setOptions: function (t) { return L.setOptions(this, t), this._heat && this._updateOptions(), this.redraw() }, redraw: function () { return !this._heat || this._frame || this._map._animating || (this._frame = L.Util.requestAnimFrame(this._redraw, this)), this }, onAdd: function (t) { this._map = t, this._canvas || this._initCanvas(), t._panes.overlayPane.insertBefore(this._canvas, t._panes.overlayPane.childNodes[0]), t.on("moveend", this._reset, this), t.options.zoomAnimation && L.Browser.any3d && t.on("zoomanim", this._animateZoom, this), this._reset() }, onRemove: function (t) { t.getPanes().overlayPane.removeChild(this._canvas), t.off("moveend", this._reset, this), t.options.zoomAnimation && t.off("zoomanim", this._animateZoom, this) }, addTo: function (t) { return t.addLayer(this), this }, _initCanvas: function () { var t = this._canvas = L.DomUtil.create("canvas", "leaflet-heatmap-layer leaflet-layer"), i = this._map.getSize(); t.width = i.x, t.height = i.y; var a = this._map.options.zoomAnimation && L.Browser.any3d; L.DomUtil.addClass(t, "leaflet-zoom-" + (a ? "animated" : "hide")), this._heat = simpleheat(t), this._updateOptions() }, _updateOptions: function () { this._heat.radius(this.options.radius || this._heat.defaultRadius, this.options.blur), this.options.gradient && this._heat.gradient(this.options.gradient), this.options.max && this._heat.max(this.options.max) }, _reset: function () { var t = this._map.containerPointToLayerPoint([0, 0]); L.DomUtil.setPosition(this._canvas, t); var i = this._map.getSize(); this._heat._width !== i.x && (this._canvas.width = this._heat._width = i.x), this._heat._height !== i.y && (this._canvas.height = this._heat._height = i.y), this._redraw() }, _redraw: function () { var t, i, a, e, s, n, h, o, r, _ = [], d = 1, l = this._map.getSize(), m = new L.LatLngBounds(this._map.containerPointToLatLng(L.point([-d, -d])), this._map.containerPointToLatLng(l.add([d, d]))), c = void 0 === this.options.maxZoom ? this._map.getMaxZoom() : this.options.maxZoom, u = 1 / Math.pow(2, Math.max(0, Math.min(c - this._map.getZoom(), 12))), g = d / 2, f = [], p = this._map._getMapPanePos(), v = p.x % g, w = p.y % g; for (t = 0, i = this._latlngs.length; i > t; t++) m.contains(this._latlngs[t]) && (a = this._map.latLngToContainerPoint(this._latlngs[t]), s = Math.floor((a.x - v) / g) + 2, n = Math.floor((a.y - w) / g) + 2, r = (this._latlngs[t].alt || 1) * u, f[n] = f[n] || [], e = f[n][s], e ? (e[0] = (e[0] * e[2] + a.x * r) / (e[2] + r), e[1] = (e[1] * e[2] + a.y * r) / (e[2] + r), e[2] += r) : f[n][s] = [a.x, a.y, r]); for (t = 0, i = f.length; i > t; t++) if (f[t]) for (h = 0, o = f[t].length; o > h; h++) e = f[t][h], e && _.push([Math.round(e[0]), Math.round(e[1]), Math.min(e[2], 1)]); this._heat.data(_).draw(), this._frame = null }, _animateZoom: function (t) { var i = this._map.getZoomScale(t.zoom), a = this._map._getCenterOffset(t.center)._multiplyBy(-i).subtract(this._map._getMapPanePos()); this._canvas.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(a) + " scale(" + i + ")" } }), L.heatLayer = function (t, i) { return new L.HeatLayer(t, i) };

        /* Manual rendering
        $('#toolbox').append('<a id="farmHeat" title="Display a heatmap of P8s">Farm Heat</a>');
        $('#farmHeat').click(window.plugin.importHeatmap.heat);
        //*/

        //* Automatic rendering
//        window.addHook('mapDataRefreshEnd', function (e) {
//            window.plugin.importHeatmap.heat();
//        });
        //window.addHook('portalAdded', function(e) { 
        //    window.plugin.importHeatmap.renderPortal(e.portal);
        //});
//        window.map.on('layeradd', function (e) {
//            if (e.layer === window.plugin.importHeatmap.heatLayerGroup) {
//                window.plugin.importHeatmap.heat();
//            }
//        });
        //*/

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
