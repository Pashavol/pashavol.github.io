window.RsJsCore = {
    state: {}, utils: {
        on(eventName, selector, callback, element) {
            element = element ? element : document;
            element.addEventListener(eventName, (event) => {
                event.rsTarget = event.target.closest(selector);
                if (event.rsTarget) {
                    callback(event);
                }
            });
        }, fetchJSON(url, options) {
            let defaults = {credentials: 'include', headers: {'X-Requested-With': 'XMLHttpRequest'}};
            return fetch(url, {...defaults, ...options}).then((response) => {
                if (!response.ok) {
                    throw new Error(lang.t('Некорректный статус ответа сервера. ' + response.statusText));
                    return;
                }
                return response.json().then((json) => {
                    if (json.reloadPage) {
                        location.replace(window.location.href);
                    }
                    if (json.windowRedirect) {
                        location.href = json.windowRedirect;
                    }
                    return json;
                });
            }).catch((error) => {
                if (error.name !== 'AbortError') {
                    if (RsJsCore.plugins.toast) {
                        RsJsCore.plugins.toast.show(lang.t('Ошибка'), error.message, {className: 'error'});
                    }
                    throw error;
                }
            });
        }, getLowerCamelName(name) {
            return name[0].toLowerCase() + name.slice(1);
        }
    }, plugins: {}, components: {}, settings: {component: {}, plugin: {}}, addPlugin(plugin, key) {
        if (!key) {
            key = this.utils.getLowerCamelName(plugin.constructor.name);
        }
        this.plugins[key] = plugin;
    }, addComponent(component, key) {
        if (!key) {
            key = this.utils.getLowerCamelName(component.constructor.name);
        }
        this.components[key] = component;
    }, classes: {
        component: class {
            constructor() {
                this.utils = RsJsCore.utils;
                this.plugins = RsJsCore.plugins;
                RsJsCore.addComponent(this);
            }

            getExtendsSettings() {
                let selfName = this.utils.getLowerCamelName(this.constructor.name);
                if (RsJsCore.settings.component[selfName]) {
                    return RsJsCore.settings.component[selfName];
                }
                return {};
            }
        }, plugin: class {
            constructor() {
                this.utils = RsJsCore.utils;
                this.plugins = RsJsCore.plugins;
                RsJsCore.addPlugin(this);
            }

            getExtendsSettings() {
                let selfName = this.utils.getLowerCamelName(this.constructor.name);
                if (RsJsCore.settings.plugin[selfName]) {
                    return RsJsCore.settings.plugin[selfName];
                }
                return {};
            }
        }
    }, init() {
        document.addEventListener('DOMContentLoaded', (event) => {
            for (let key in this.components) {
                if (typeof (this.components[key].onDocumentReady) == 'function') {
                    this.components[key].onDocumentReady.call(this.components[key], event);
                }
                if (typeof (this.components[key].onContentReady) == 'function') {
                    this.components[key].onContentReady.call(this.components[key], event);
                }
            }
            for (let key in this.components) {
                if (typeof (this.components[key].onAfterDocumentReady) == 'function') {
                    this.components[key].onAfterDocumentReady.call(this.components[key], event);
                }
            }
        });
        document.addEventListener('new-content', (event) => {
            for (let key in this.components) {
                if (typeof (this.components[key].onContentReady) == 'function') {
                    this.components[key].onContentReady.call(this.components[key], event);
                }
            }
        });
    }
};
RsJsCore.init();
(function () {
    function supportsWebp() {
        return new Promise(function (resolve, reject) {
            if (!self.createImageBitmap) {
                reject();
            } else {
                var webpData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
                fetch(webpData).then(function (response) {
                    return response.blob();
                }).then(function (blobData) {
                    return createImageBitmap(blobData).then(function () {
                        resolve();
                    }, function () {
                        reject();
                    });
                }, function () {
                    reject();
                });
            }
        });
    }

    function loadScript(url, callback) {
        var head = document.getElementsByTagName('head')[0];
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;
        script.onreadystatechange = callback;
        script.onload = callback;
        head.appendChild(script);
    }

    function start() {
        supportsWebp().catch(function () {
            var script = document.createElement('script');
            script.src = global.folder + '/resource/js/webpjs/polyfills.js';
            document.head.appendChild(script);
            var loadWebpJS = function () {
                document.addEventListener('DOMContentLoaded', function () {
                    var script = document.createElement('script');
                    script.src = global.folder + '/resource/js/webpjs/webp-init.js';
                    script.defer = true;
                    document.body.appendChild(script);
                });
            };
            loadScript(global.folder + "/resource/js/webpjs/webp-hero.bundle.js", loadWebpJS);
        });
    }

    function init() {
        if (/MSIE \d|Trident.*rv:/.test(navigator.userAgent)) {
            loadScript(global.folder + "/resource/js/webpjs/bluebird.core.min.js", function () {
                start();
            });
        } else {
            start();
        }
    }

    init();
})();
var lang = {
    baseLang: (global.baseLang) ? global.baseLang : null,
    lang: (global.lang) ? global.lang : null,
    messages: {},
    plugins: {},
    t: function (phrase, params, alias) {
        var self = this;
        var to_translate = (typeof (alias) == 'undefined') ? phrase : alias;
        var translated = this.messages[to_translate];
        if (translated) {
            phrase = translated;
        }
        phrase = phrase.replace(/\[(.*?):%(.*?):(.*?)\]/g, function (whole, plugin, param_name, plugin_param) {
            if (self.plugins[plugin]) {
                var param_value = (params[param_name]) ? params[param_name] : null;
                var phrase_lang = (translated) ? self.lang : self.baseLang;
                return self.plugins[plugin].call(self, param_value, plugin_param, params, phrase_lang);
            }
            return '';
        })
        for (var key in params) {
            phrase = this.str_replace('%' + key, params[key], phrase);
        }
        phrase = phrase.split('^')[0];
        return phrase;
    },
    str_replace: function (search, replace, subject, count) {
        j = 0, temp = '', repl = '', sl = 0, fl = 0, f = [].concat(search), r = [].concat(replace), s = subject, ra = Object.prototype.toString.call(r) === '[object Array]', sa = Object.prototype.toString.call(s) === '[object Array]';
        s = [].concat(s);
        if (count) {
            this.window[count] = 0;
        }
        for (i = 0, sl = s.length; i < sl; i++) {
            if (s[i] === '') {
                continue;
            }
            for (j = 0, fl = f.length; j < fl; j++) {
                temp = s[i] + '';
                repl = ra ? (r[j] !== undefined ? r[j] : '') : r[0];
                s[i] = (temp).split(f[j]).join(repl);
                if (count && s[i] !== temp) {
                    this.window[count] += (temp.length - s[i].length) / f[j].length;
                }
            }
        }
        return sa ? s : s[0];
    }
};
lang.plugins.plural = function (param_value, plugin_param, params, phrase_lang) {
    var values = plugin_param.split('|');
    if (phrase_lang == 'ru') {
        var result;
        var first = values[0];
        var second = values[1];
        var five = values[2];
        var prepare = Math.abs(parseInt(param_value));
        if (prepare != 0) {
            if ((prepare - prepare % 10) / 10 == 1) {
                result = five;
            } else {
                prepare = prepare % 10;
                if (prepare == 1) {
                    result = first;
                } else if (prepare > 1 && prepare < 5) {
                    result = second;
                } else {
                    result = five;
                }
            }
        } else {
            result = five;
        }
    } else if (lang == 'en') {
        result = (param_value == 1) ? $values[0] : $values[1];
    } else {
        result = values[0];
    }
    return result;
};
new class AjaxPaginator extends RsJsCore.classes.plugin {
    init(selector, settings, context) {
        (context ? context : document).querySelectorAll(selector).forEach((element) => {
            if (!element.ajaxPaginator) {
                element.ajaxPaginator = new ElementAjaxPaginator(element, settings);
            }
        });
    }
};

class ElementAjaxPaginator {
    constructor(startElement, settings) {
        let defaults = {
            method: 'GET',
            findElement: '',
            loaderButton: '.rs-ajax-paginator',
            loaderBlock: '',
            loadingClass: 'rs-in-loading',
            appendElement: '',
            contextElement: null,
            clickOnScroll: false,
            scrollDistance: 100,
        };
        if (startElement.dataset.paginationOptions) {
            defaults = {...defaults, ...JSON.parse(startElement.dataset.paginationOptions)};
        }
        this.settings = {...defaults, ...settings};
        if (!this.settings.findElement) {
            this.settings.findElement = this.settings.appendElement;
        }
        this.element = startElement;
        this.bindEvents();
    }

    bindEvents() {
        if (this.element) {
            this.element.addEventListener('click', event => this.load(event));
        }
    }

    load(event) {
        let target = event.target.closest(this.settings.loaderButton);
        if (target.classList.contains(this.settings.loadingClass)) return false;
        let url = target.hasAttribute('href') ? target.getAttribute('href') : target.dataset.url;
        target.classList.add(this.settings.loadingClass);
        RsJsCore.utils.fetchJSON(url, {method: this.settings.method}).then(response => this.onResponse(url, response));
    }

    onResponse(url, response) {
        let parsed = document.createElement('div');
        parsed.innerHTML = response.html;
        let appendElement = parsed.querySelector(this.settings.findElement);
        let destination = (this.settings.contextElement ? this.settings.contextElement : document).querySelector(this.settings.appendElement);
        while (appendElement.children.length > 0) {
            destination.append(appendElement.children[0]);
        }
        let newLoader = parsed.querySelector(this.settings.loaderButton);
        let replaceElement = this.element;
        if (this.settings.loaderBlock) {
            newLoader = parsed.querySelector(this.settings.loaderBlock);
            replaceElement = (this.settings.contextElement ? this.settings.contextElement : document).querySelector(this.settings.loaderBlock);
        }
        this.element = parsed.querySelector(this.settings.loaderButton);
        if (newLoader) {
            replaceElement.parentNode.replaceChild(newLoader, replaceElement);
            this.bindEvents();
        } else {
            replaceElement.remove();
        }
        if (this.settings.replaceBrowserUrl) {
            history.replaceState(null, null, url);
        }
        document.body.dispatchEvent(new CustomEvent('new-content', {bubbles: true}));
    }
}

new class ListProducts extends RsJsCore.classes.component {
    initChangeSortListProducts() {
        this.utils.on('change', 'select.rs-list-sort-change', (event) => {
            let sort = event.rsTarget.value;
            let nsort = event.rsTarget.options[event.rsTarget.selectedIndex].dataset.nsort;
            this.plugins.cookie.setCookie('sort', sort);
            this.plugins.cookie.setCookie('nsort', nsort);
            location.replace(location.href);
        });
    }

    initChangeViewListProducts() {
        this.utils.on('click', '.rs-list-view-change', (event) => {
            event.rsTarget.closest('ul').querySelectorAll('.view-as_active').forEach(element => {
                element.classList.remove('view-as_active');
            });
            event.rsTarget.classList.add('view-as_active');
            let value = event.rsTarget.dataset.view;
            this.plugins.cookie.setCookie('viewAs', value);
            location.replace(location.href);
        });
    }

    initChangePageSizeListProducts() {
        this.utils.on('change', 'select.rs-list-pagesize-change', (event) => {
            let value = event.rsTarget.value;
            this.plugins.cookie.setCookie('pageSize', value);
            location.replace(location.href);
        });
    }

    onDocumentReady() {
        this.initChangeSortListProducts();
        this.initChangeViewListProducts();
        this.initChangePageSizeListProducts();
    }

    onContentReady() {
        if (this.plugins.ajaxPaginator) {
            this.plugins.ajaxPaginator.init('.rs-ajax-paginator');
        }
    }
};
!function (t) {
    "function" == typeof define && define.amd ? define([], t) : "object" == typeof exports ? module.exports = t() : window.noUiSlider = t()
}(function () {
    "use strict";
    var lt = "14.6.3";

    function ut(t) {
        t.parentElement.removeChild(t)
    }

    function a(t) {
        return null != t
    }

    function ct(t) {
        t.preventDefault()
    }

    function o(t) {
        return "number" == typeof t && !isNaN(t) && isFinite(t)
    }

    function pt(t, e, r) {
        0 < r && (ht(t, e), setTimeout(function () {
            mt(t, e)
        }, r))
    }

    function ft(t) {
        return Math.max(Math.min(t, 100), 0)
    }

    function dt(t) {
        return Array.isArray(t) ? t : [t]
    }

    function e(t) {
        var e = (t = String(t)).split(".");
        return 1 < e.length ? e[1].length : 0
    }

    function ht(t, e) {
        t.classList && !/\s/.test(e) ? t.classList.add(e) : t.className += " " + e
    }

    function mt(t, e) {
        t.classList && !/\s/.test(e) ? t.classList.remove(e) : t.className = t.className.replace(new RegExp("(^|\\b)" + e.split(" ").join("|") + "(\\b|$)", "gi"), " ")
    }

    function gt(t) {
        var e = void 0 !== window.pageXOffset, r = "CSS1Compat" === (t.compatMode || "");
        return {
            x: e ? window.pageXOffset : r ? t.documentElement.scrollLeft : t.body.scrollLeft,
            y: e ? window.pageYOffset : r ? t.documentElement.scrollTop : t.body.scrollTop
        }
    }

    function c(t, e) {
        return 100 / (e - t)
    }

    function p(t, e, r) {
        return 100 * e / (t[r + 1] - t[r])
    }

    function f(t, e) {
        for (var r = 1; t >= e[r];) r += 1;
        return r
    }

    function r(t, e, r) {
        if (r >= t.slice(-1)[0]) return 100;
        var n, i, o = f(r, t), s = t[o - 1], a = t[o], l = e[o - 1], u = e[o];
        return l + (i = r, p(n = [s, a], n[0] < 0 ? i + Math.abs(n[0]) : i - n[0], 0) / c(l, u))
    }

    function n(t, e, r, n) {
        if (100 === n) return n;
        var i, o, s = f(n, t), a = t[s - 1], l = t[s];
        return r ? (l - a) / 2 < n - a ? l : a : e[s - 1] ? t[s - 1] + (i = n - t[s - 1], o = e[s - 1], Math.round(i / o) * o) : n
    }

    function s(t, e, r) {
        var n;
        if ("number" == typeof e && (e = [e]), !Array.isArray(e)) throw new Error("noUiSlider (" + lt + "): 'range' contains invalid value.");
        if (!o(n = "min" === t ? 0 : "max" === t ? 100 : parseFloat(t)) || !o(e[0])) throw new Error("noUiSlider (" + lt + "): 'range' value isn't numeric.");
        r.xPct.push(n), r.xVal.push(e[0]), n ? r.xSteps.push(!isNaN(e[1]) && e[1]) : isNaN(e[1]) || (r.xSteps[0] = e[1]), r.xHighestCompleteStep.push(0)
    }

    function l(t, e, r) {
        if (e) if (r.xVal[t] !== r.xVal[t + 1]) {
            r.xSteps[t] = p([r.xVal[t], r.xVal[t + 1]], e, 0) / c(r.xPct[t], r.xPct[t + 1]);
            var n = (r.xVal[t + 1] - r.xVal[t]) / r.xNumSteps[t], i = Math.ceil(Number(n.toFixed(3)) - 1),
                o = r.xVal[t] + r.xNumSteps[t] * i;
            r.xHighestCompleteStep[t] = o
        } else r.xSteps[t] = r.xHighestCompleteStep[t] = r.xVal[t]
    }

    function i(t, e, r) {
        var n;
        this.xPct = [], this.xVal = [], this.xSteps = [r || !1], this.xNumSteps = [!1], this.xHighestCompleteStep = [], this.snap = e;
        var i = [];
        for (n in t) t.hasOwnProperty(n) && i.push([t[n], n]);
        for (i.length && "object" == typeof i[0][0] ? i.sort(function (t, e) {
            return t[0][0] - e[0][0]
        }) : i.sort(function (t, e) {
            return t[0] - e[0]
        }), n = 0; n < i.length; n++) s(i[n][1], i[n][0], this);
        for (this.xNumSteps = this.xSteps.slice(0), n = 0; n < this.xNumSteps.length; n++) l(n, this.xNumSteps[n], this)
    }

    i.prototype.getDistance = function (t) {
        var e, r = [];
        for (e = 0; e < this.xNumSteps.length - 1; e++) {
            var n = this.xNumSteps[e];
            if (n && t / n % 1 != 0) throw new Error("noUiSlider (" + lt + "): 'limit', 'margin' and 'padding' of " + this.xPct[e] + "% range must be divisible by step.");
            r[e] = p(this.xVal, t, e)
        }
        return r
    }, i.prototype.getAbsoluteDistance = function (t, e, r) {
        var n, i = 0;
        if (t < this.xPct[this.xPct.length - 1]) for (; t > this.xPct[i + 1];) i++; else t === this.xPct[this.xPct.length - 1] && (i = this.xPct.length - 2);
        r || t !== this.xPct[i + 1] || i++;
        var o = 1, s = e[i], a = 0, l = 0, u = 0, c = 0;
        for (n = r ? (t - this.xPct[i]) / (this.xPct[i + 1] - this.xPct[i]) : (this.xPct[i + 1] - t) / (this.xPct[i + 1] - this.xPct[i]); 0 < s;) a = this.xPct[i + 1 + c] - this.xPct[i + c], 100 < e[i + c] * o + 100 - 100 * n ? (l = a * n, o = (s - 100 * n) / e[i + c], n = 1) : (l = e[i + c] * a / 100 * o, o = 0), r ? (u -= l, 1 <= this.xPct.length + c && c--) : (u += l, 1 <= this.xPct.length - c && c++), s = e[i + c] * o;
        return t + u
    }, i.prototype.toStepping = function (t) {
        return t = r(this.xVal, this.xPct, t)
    }, i.prototype.fromStepping = function (t) {
        return function (t, e, r) {
            if (100 <= r) return t.slice(-1)[0];
            var n, i = f(r, e), o = t[i - 1], s = t[i], a = e[i - 1], l = e[i];
            return n = [o, s], (r - a) * c(a, l) * (n[1] - n[0]) / 100 + n[0]
        }(this.xVal, this.xPct, t)
    }, i.prototype.getStep = function (t) {
        return t = n(this.xPct, this.xSteps, this.snap, t)
    }, i.prototype.getDefaultStep = function (t, e, r) {
        var n = f(t, this.xPct);
        return (100 === t || e && t === this.xPct[n - 1]) && (n = Math.max(n - 1, 1)), (this.xVal[n] - this.xVal[n - 1]) / r
    }, i.prototype.getNearbySteps = function (t) {
        var e = f(t, this.xPct);
        return {
            stepBefore: {
                startValue: this.xVal[e - 2],
                step: this.xNumSteps[e - 2],
                highestStep: this.xHighestCompleteStep[e - 2]
            },
            thisStep: {
                startValue: this.xVal[e - 1],
                step: this.xNumSteps[e - 1],
                highestStep: this.xHighestCompleteStep[e - 1]
            },
            stepAfter: {startValue: this.xVal[e], step: this.xNumSteps[e], highestStep: this.xHighestCompleteStep[e]}
        }
    }, i.prototype.countStepDecimals = function () {
        var t = this.xNumSteps.map(e);
        return Math.max.apply(null, t)
    }, i.prototype.convert = function (t) {
        return this.getStep(this.toStepping(t))
    };
    var u = {
        to: function (t) {
            return void 0 !== t && t.toFixed(2)
        }, from: Number
    }, d = {
        target: "target",
        base: "base",
        origin: "origin",
        handle: "handle",
        handleLower: "handle-lower",
        handleUpper: "handle-upper",
        touchArea: "touch-area",
        horizontal: "horizontal",
        vertical: "vertical",
        background: "background",
        connect: "connect",
        connects: "connects",
        ltr: "ltr",
        rtl: "rtl",
        textDirectionLtr: "txt-dir-ltr",
        textDirectionRtl: "txt-dir-rtl",
        draggable: "draggable",
        drag: "state-drag",
        tap: "state-tap",
        active: "active",
        tooltip: "tooltip",
        pips: "pips",
        pipsHorizontal: "pips-horizontal",
        pipsVertical: "pips-vertical",
        marker: "marker",
        markerHorizontal: "marker-horizontal",
        markerVertical: "marker-vertical",
        markerNormal: "marker-normal",
        markerLarge: "marker-large",
        markerSub: "marker-sub",
        value: "value",
        valueHorizontal: "value-horizontal",
        valueVertical: "value-vertical",
        valueNormal: "value-normal",
        valueLarge: "value-large",
        valueSub: "value-sub"
    }, vt = {tooltips: ".__tooltips", aria: ".__aria"};

    function h(t) {
        if ("object" == typeof (e = t) && "function" == typeof e.to && "function" == typeof e.from) return !0;
        var e;
        throw new Error("noUiSlider (" + lt + "): 'format' requires 'to' and 'from' methods.")
    }

    function m(t, e) {
        if (!o(e)) throw new Error("noUiSlider (" + lt + "): 'step' is not numeric.");
        t.singleStep = e
    }

    function g(t, e) {
        if (!o(e)) throw new Error("noUiSlider (" + lt + "): 'keyboardPageMultiplier' is not numeric.");
        t.keyboardPageMultiplier = e
    }

    function v(t, e) {
        if (!o(e)) throw new Error("noUiSlider (" + lt + "): 'keyboardDefaultStep' is not numeric.");
        t.keyboardDefaultStep = e
    }

    function b(t, e) {
        if ("object" != typeof e || Array.isArray(e)) throw new Error("noUiSlider (" + lt + "): 'range' is not an object.");
        if (void 0 === e.min || void 0 === e.max) throw new Error("noUiSlider (" + lt + "): Missing 'min' or 'max' in 'range'.");
        if (e.min === e.max) throw new Error("noUiSlider (" + lt + "): 'range' 'min' and 'max' cannot be equal.");
        t.spectrum = new i(e, t.snap, t.singleStep)
    }

    function x(t, e) {
        if (e = dt(e), !Array.isArray(e) || !e.length) throw new Error("noUiSlider (" + lt + "): 'start' option is incorrect.");
        t.handles = e.length, t.start = e
    }

    function S(t, e) {
        if ("boolean" != typeof (t.snap = e)) throw new Error("noUiSlider (" + lt + "): 'snap' option must be a boolean.")
    }

    function w(t, e) {
        if ("boolean" != typeof (t.animate = e)) throw new Error("noUiSlider (" + lt + "): 'animate' option must be a boolean.")
    }

    function y(t, e) {
        if ("number" != typeof (t.animationDuration = e)) throw new Error("noUiSlider (" + lt + "): 'animationDuration' option must be a number.")
    }

    function E(t, e) {
        var r, n = [!1];
        if ("lower" === e ? e = [!0, !1] : "upper" === e && (e = [!1, !0]), !0 === e || !1 === e) {
            for (r = 1; r < t.handles; r++) n.push(e);
            n.push(!1)
        } else {
            if (!Array.isArray(e) || !e.length || e.length !== t.handles + 1) throw new Error("noUiSlider (" + lt + "): 'connect' option doesn't match handle count.");
            n = e
        }
        t.connect = n
    }

    function C(t, e) {
        switch (e) {
            case"horizontal":
                t.ort = 0;
                break;
            case"vertical":
                t.ort = 1;
                break;
            default:
                throw new Error("noUiSlider (" + lt + "): 'orientation' option is invalid.")
        }
    }

    function P(t, e) {
        if (!o(e)) throw new Error("noUiSlider (" + lt + "): 'margin' option must be numeric.");
        0 !== e && (t.margin = t.spectrum.getDistance(e))
    }

    function N(t, e) {
        if (!o(e)) throw new Error("noUiSlider (" + lt + "): 'limit' option must be numeric.");
        if (t.limit = t.spectrum.getDistance(e), !t.limit || t.handles < 2) throw new Error("noUiSlider (" + lt + "): 'limit' option is only supported on linear sliders with 2 or more handles.")
    }

    function k(t, e) {
        var r;
        if (!o(e) && !Array.isArray(e)) throw new Error("noUiSlider (" + lt + "): 'padding' option must be numeric or array of exactly 2 numbers.");
        if (Array.isArray(e) && 2 !== e.length && !o(e[0]) && !o(e[1])) throw new Error("noUiSlider (" + lt + "): 'padding' option must be numeric or array of exactly 2 numbers.");
        if (0 !== e) {
            for (Array.isArray(e) || (e = [e, e]), t.padding = [t.spectrum.getDistance(e[0]), t.spectrum.getDistance(e[1])], r = 0; r < t.spectrum.xNumSteps.length - 1; r++) if (t.padding[0][r] < 0 || t.padding[1][r] < 0) throw new Error("noUiSlider (" + lt + "): 'padding' option must be a positive number(s).");
            var n = e[0] + e[1], i = t.spectrum.xVal[0];
            if (1 < n / (t.spectrum.xVal[t.spectrum.xVal.length - 1] - i)) throw new Error("noUiSlider (" + lt + "): 'padding' option must not exceed 100% of the range.")
        }
    }

    function U(t, e) {
        switch (e) {
            case"ltr":
                t.dir = 0;
                break;
            case"rtl":
                t.dir = 1;
                break;
            default:
                throw new Error("noUiSlider (" + lt + "): 'direction' option was not recognized.")
        }
    }

    function A(t, e) {
        if ("string" != typeof e) throw new Error("noUiSlider (" + lt + "): 'behaviour' must be a string containing options.");
        var r = 0 <= e.indexOf("tap"), n = 0 <= e.indexOf("drag"), i = 0 <= e.indexOf("fixed"),
            o = 0 <= e.indexOf("snap"), s = 0 <= e.indexOf("hover"), a = 0 <= e.indexOf("unconstrained");
        if (i) {
            if (2 !== t.handles) throw new Error("noUiSlider (" + lt + "): 'fixed' behaviour must be used with 2 handles");
            P(t, t.start[1] - t.start[0])
        }
        if (a && (t.margin || t.limit)) throw new Error("noUiSlider (" + lt + "): 'unconstrained' behaviour cannot be used with margin or limit");
        t.events = {tap: r || o, drag: n, fixed: i, snap: o, hover: s, unconstrained: a}
    }

    function V(t, e) {
        if (!1 !== e) if (!0 === e) {
            t.tooltips = [];
            for (var r = 0; r < t.handles; r++) t.tooltips.push(!0)
        } else {
            if (t.tooltips = dt(e), t.tooltips.length !== t.handles) throw new Error("noUiSlider (" + lt + "): must pass a formatter for all handles.");
            t.tooltips.forEach(function (t) {
                if ("boolean" != typeof t && ("object" != typeof t || "function" != typeof t.to)) throw new Error("noUiSlider (" + lt + "): 'tooltips' must be passed a formatter or 'false'.")
            })
        }
    }

    function D(t, e) {
        h(t.ariaFormat = e)
    }

    function M(t, e) {
        h(t.format = e)
    }

    function O(t, e) {
        if ("boolean" != typeof (t.keyboardSupport = e)) throw new Error("noUiSlider (" + lt + "): 'keyboardSupport' option must be a boolean.")
    }

    function L(t, e) {
        t.documentElement = e
    }

    function z(t, e) {
        if ("string" != typeof e && !1 !== e) throw new Error("noUiSlider (" + lt + "): 'cssPrefix' must be a string or `false`.");
        t.cssPrefix = e
    }

    function H(t, e) {
        if ("object" != typeof e) throw new Error("noUiSlider (" + lt + "): 'cssClasses' must be an object.");
        if ("string" == typeof t.cssPrefix) for (var r in t.cssClasses = {}, e) e.hasOwnProperty(r) && (t.cssClasses[r] = t.cssPrefix + e[r]); else t.cssClasses = e
    }

    function bt(e) {
        var r = {margin: 0, limit: 0, padding: 0, animate: !0, animationDuration: 300, ariaFormat: u, format: u}, n = {
            step: {r: !1, t: m},
            keyboardPageMultiplier: {r: !1, t: g},
            keyboardDefaultStep: {r: !1, t: v},
            start: {r: !0, t: x},
            connect: {r: !0, t: E},
            direction: {r: !0, t: U},
            snap: {r: !1, t: S},
            animate: {r: !1, t: w},
            animationDuration: {r: !1, t: y},
            range: {r: !0, t: b},
            orientation: {r: !1, t: C},
            margin: {r: !1, t: P},
            limit: {r: !1, t: N},
            padding: {r: !1, t: k},
            behaviour: {r: !0, t: A},
            ariaFormat: {r: !1, t: D},
            format: {r: !1, t: M},
            tooltips: {r: !1, t: V},
            keyboardSupport: {r: !0, t: O},
            documentElement: {r: !1, t: L},
            cssPrefix: {r: !0, t: z},
            cssClasses: {r: !0, t: H}
        }, i = {
            connect: !1,
            direction: "ltr",
            behaviour: "tap",
            orientation: "horizontal",
            keyboardSupport: !0,
            cssPrefix: "noUi-",
            cssClasses: d,
            keyboardPageMultiplier: 5,
            keyboardDefaultStep: 10
        };
        e.format && !e.ariaFormat && (e.ariaFormat = e.format), Object.keys(n).forEach(function (t) {
            if (!a(e[t]) && void 0 === i[t]) {
                if (n[t].r) throw new Error("noUiSlider (" + lt + "): '" + t + "' is required.");
                return !0
            }
            n[t].t(r, a(e[t]) ? e[t] : i[t])
        }), r.pips = e.pips;
        var t = document.createElement("div"), o = void 0 !== t.style.msTransform, s = void 0 !== t.style.transform;
        r.transformRule = s ? "transform" : o ? "msTransform" : "webkitTransform";
        return r.style = [["left", "top"], ["right", "bottom"]][r.dir][r.ort], r
    }

    function j(t, b, o) {
        var l, u, s, c, i, a, e, p, f = window.navigator.pointerEnabled ? {
                start: "pointerdown",
                move: "pointermove",
                end: "pointerup"
            } : window.navigator.msPointerEnabled ? {
                start: "MSPointerDown",
                move: "MSPointerMove",
                end: "MSPointerUp"
            } : {start: "mousedown touchstart", move: "mousemove touchmove", end: "mouseup touchend"},
            d = window.CSS && CSS.supports && CSS.supports("touch-action", "none") && function () {
                var t = !1;
                try {
                    var e = Object.defineProperty({}, "passive", {
                        get: function () {
                            t = !0
                        }
                    });
                    window.addEventListener("test", null, e)
                } catch (t) {
                }
                return t
            }(), h = t, y = b.spectrum, x = [], S = [], m = [], g = 0, v = {}, w = t.ownerDocument,
            E = b.documentElement || w.documentElement, C = w.body, P = -1, N = 0, k = 1, U = 2,
            A = "rtl" === w.dir || 1 === b.ort ? 0 : 100;

        function V(t, e) {
            var r = w.createElement("div");
            return e && ht(r, e), t.appendChild(r), r
        }

        function D(t, e) {
            var r = V(t, b.cssClasses.origin), n = V(r, b.cssClasses.handle);
            return V(n, b.cssClasses.touchArea), n.setAttribute("data-handle", e), b.keyboardSupport && (n.setAttribute("tabindex", "0"), n.addEventListener("keydown", function (t) {
                return function (t, e) {
                    if (O() || L(e)) return !1;
                    var r = ["Left", "Right"], n = ["Down", "Up"], i = ["PageDown", "PageUp"], o = ["Home", "End"];
                    b.dir && !b.ort ? r.reverse() : b.ort && !b.dir && (n.reverse(), i.reverse());
                    var s, a = t.key.replace("Arrow", ""), l = a === i[0], u = a === i[1],
                        c = a === n[0] || a === r[0] || l, p = a === n[1] || a === r[1] || u, f = a === o[0],
                        d = a === o[1];
                    if (!(c || p || f || d)) return !0;
                    if (t.preventDefault(), p || c) {
                        var h = b.keyboardPageMultiplier, m = c ? 0 : 1, g = at(e), v = g[m];
                        if (null === v) return !1;
                        !1 === v && (v = y.getDefaultStep(S[e], c, b.keyboardDefaultStep)), (u || l) && (v *= h), v = Math.max(v, 1e-7), v *= c ? -1 : 1, s = x[e] + v
                    } else s = d ? b.spectrum.xVal[b.spectrum.xVal.length - 1] : b.spectrum.xVal[0];
                    return rt(e, y.toStepping(s), !0, !0), J("slide", e), J("update", e), J("change", e), J("set", e), !1
                }(t, e)
            })), n.setAttribute("role", "slider"), n.setAttribute("aria-orientation", b.ort ? "vertical" : "horizontal"), 0 === e ? ht(n, b.cssClasses.handleLower) : e === b.handles - 1 && ht(n, b.cssClasses.handleUpper), r
        }

        function M(t, e) {
            return !!e && V(t, b.cssClasses.connect)
        }

        function r(t, e) {
            return !!b.tooltips[e] && V(t.firstChild, b.cssClasses.tooltip)
        }

        function O() {
            return h.hasAttribute("disabled")
        }

        function L(t) {
            return u[t].hasAttribute("disabled")
        }

        function z() {
            i && (G("update" + vt.tooltips), i.forEach(function (t) {
                t && ut(t)
            }), i = null)
        }

        function H() {
            z(), i = u.map(r), $("update" + vt.tooltips, function (t, e, r) {
                if (i[e]) {
                    var n = t[e];
                    !0 !== b.tooltips[e] && (n = b.tooltips[e].to(r[e])), i[e].innerHTML = n
                }
            })
        }

        function j(e, i, o) {
            var s = w.createElement("div"), a = [];
            a[N] = b.cssClasses.valueNormal, a[k] = b.cssClasses.valueLarge, a[U] = b.cssClasses.valueSub;
            var l = [];
            l[N] = b.cssClasses.markerNormal, l[k] = b.cssClasses.markerLarge, l[U] = b.cssClasses.markerSub;
            var u = [b.cssClasses.valueHorizontal, b.cssClasses.valueVertical],
                c = [b.cssClasses.markerHorizontal, b.cssClasses.markerVertical];

            function p(t, e) {
                var r = e === b.cssClasses.value, n = r ? a : l;
                return e + " " + (r ? u : c)[b.ort] + " " + n[t]
            }

            return ht(s, b.cssClasses.pips), ht(s, 0 === b.ort ? b.cssClasses.pipsHorizontal : b.cssClasses.pipsVertical), Object.keys(e).forEach(function (t) {
                !function (t, e, r) {
                    if ((r = i ? i(e, r) : r) !== P) {
                        var n = V(s, !1);
                        n.className = p(r, b.cssClasses.marker), n.style[b.style] = t + "%", N < r && ((n = V(s, !1)).className = p(r, b.cssClasses.value), n.setAttribute("data-value", e), n.style[b.style] = t + "%", n.innerHTML = o.to(e))
                    }
                }(t, e[t][0], e[t][1])
            }), s
        }

        function F() {
            c && (ut(c), c = null)
        }

        function R(t) {
            F();
            var m, g, v, b, e, r, x, S, w, n = t.mode, i = t.density || 1, o = t.filter || !1, s = function (t, e, r) {
                    if ("range" === t || "steps" === t) return y.xVal;
                    if ("count" === t) {
                        if (e < 2) throw new Error("noUiSlider (" + lt + "): 'values' (>= 2) required for mode 'count'.");
                        var n = e - 1, i = 100 / n;
                        for (e = []; n--;) e[n] = n * i;
                        e.push(100), t = "positions"
                    }
                    return "positions" === t ? e.map(function (t) {
                        return y.fromStepping(r ? y.getStep(t) : t)
                    }) : "values" === t ? r ? e.map(function (t) {
                        return y.fromStepping(y.getStep(y.toStepping(t)))
                    }) : e : void 0
                }(n, t.values || !1, t.stepped || !1),
                a = (m = i, g = n, v = s, b = {}, e = y.xVal[0], r = y.xVal[y.xVal.length - 1], S = x = !1, w = 0, (v = v.slice().sort(function (t, e) {
                    return t - e
                }).filter(function (t) {
                    return !this[t] && (this[t] = !0)
                }, {}))[0] !== e && (v.unshift(e), x = !0), v[v.length - 1] !== r && (v.push(r), S = !0), v.forEach(function (t, e) {
                    var r, n, i, o, s, a, l, u, c, p, f = t, d = v[e + 1], h = "steps" === g;
                    if (h && (r = y.xNumSteps[e]), r || (r = d - f), !1 !== f) for (void 0 === d && (d = f), r = Math.max(r, 1e-7), n = f; n <= d; n = (n + r).toFixed(7) / 1) {
                        for (u = (s = (o = y.toStepping(n)) - w) / m, p = s / (c = Math.round(u)), i = 1; i <= c; i += 1) b[(a = w + i * p).toFixed(5)] = [y.fromStepping(a), 0];
                        l = -1 < v.indexOf(n) ? k : h ? U : N, !e && x && n !== d && (l = 0), n === d && S || (b[o.toFixed(5)] = [n, l]), w = o
                    }
                }), b), l = t.format || {to: Math.round};
            return c = h.appendChild(j(a, o, l))
        }

        function T() {
            var t = l.getBoundingClientRect(), e = "offset" + ["Width", "Height"][b.ort];
            return 0 === b.ort ? t.width || l[e] : t.height || l[e]
        }

        function _(n, i, o, s) {
            var e = function (t) {
                return !!(t = function (t, e, r) {
                    var n, i, o = 0 === t.type.indexOf("touch"), s = 0 === t.type.indexOf("mouse"),
                        a = 0 === t.type.indexOf("pointer");
                    0 === t.type.indexOf("MSPointer") && (a = !0);
                    if ("mousedown" === t.type && !t.buttons && !t.touches) return !1;
                    if (o) {
                        var l = function (t) {
                            return t.target === r || r.contains(t.target) || t.target.shadowRoot && t.target.shadowRoot.contains(r)
                        };
                        if ("touchstart" === t.type) {
                            var u = Array.prototype.filter.call(t.touches, l);
                            if (1 < u.length) return !1;
                            n = u[0].pageX, i = u[0].pageY
                        } else {
                            var c = Array.prototype.find.call(t.changedTouches, l);
                            if (!c) return !1;
                            n = c.pageX, i = c.pageY
                        }
                    }
                    e = e || gt(w), (s || a) && (n = t.clientX + e.x, i = t.clientY + e.y);
                    return t.pageOffset = e, t.points = [n, i], t.cursor = s || a, t
                }(t, s.pageOffset, s.target || i)) && (!(O() && !s.doNotReject) && (e = h, r = b.cssClasses.tap, !((e.classList ? e.classList.contains(r) : new RegExp("\\b" + r + "\\b").test(e.className)) && !s.doNotReject) && (!(n === f.start && void 0 !== t.buttons && 1 < t.buttons) && ((!s.hover || !t.buttons) && (d || t.preventDefault(), t.calcPoint = t.points[b.ort], void o(t, s))))));
                var e, r
            }, r = [];
            return n.split(" ").forEach(function (t) {
                i.addEventListener(t, e, !!d && {passive: !0}), r.push([t, e])
            }), r
        }

        function B(t) {
            var e, r, n, i, o, s,
                a = 100 * (t - (e = l, r = b.ort, n = e.getBoundingClientRect(), i = e.ownerDocument, o = i.documentElement, s = gt(i), /webkit.*Chrome.*Mobile/i.test(navigator.userAgent) && (s.x = 0), r ? n.top + s.y - o.clientTop : n.left + s.x - o.clientLeft)) / T();
            return a = ft(a), b.dir ? 100 - a : a
        }

        function q(t, e) {
            "mouseout" === t.type && "HTML" === t.target.nodeName && null === t.relatedTarget && Y(t, e)
        }

        function X(t, e) {
            if (-1 === navigator.appVersion.indexOf("MSIE 9") && 0 === t.buttons && 0 !== e.buttonsProperty) return Y(t, e);
            var r = (b.dir ? -1 : 1) * (t.calcPoint - e.startCalcPoint);
            Z(0 < r, 100 * r / e.baseSize, e.locations, e.handleNumbers)
        }

        function Y(t, e) {
            e.handle && (mt(e.handle, b.cssClasses.active), g -= 1), e.listeners.forEach(function (t) {
                E.removeEventListener(t[0], t[1])
            }), 0 === g && (mt(h, b.cssClasses.drag), et(), t.cursor && (C.style.cursor = "", C.removeEventListener("selectstart", ct))), e.handleNumbers.forEach(function (t) {
                J("change", t), J("set", t), J("end", t)
            })
        }

        function I(t, e) {
            if (e.handleNumbers.some(L)) return !1;
            var r;
            1 === e.handleNumbers.length && (r = u[e.handleNumbers[0]].children[0], g += 1, ht(r, b.cssClasses.active));
            t.stopPropagation();
            var n = [], i = _(f.move, E, X, {
                target: t.target,
                handle: r,
                listeners: n,
                startCalcPoint: t.calcPoint,
                baseSize: T(),
                pageOffset: t.pageOffset,
                handleNumbers: e.handleNumbers,
                buttonsProperty: t.buttons,
                locations: S.slice()
            }), o = _(f.end, E, Y, {
                target: t.target,
                handle: r,
                listeners: n,
                doNotReject: !0,
                handleNumbers: e.handleNumbers
            }), s = _("mouseout", E, q, {
                target: t.target,
                handle: r,
                listeners: n,
                doNotReject: !0,
                handleNumbers: e.handleNumbers
            });
            n.push.apply(n, i.concat(o, s)), t.cursor && (C.style.cursor = getComputedStyle(t.target).cursor, 1 < u.length && ht(h, b.cssClasses.drag), C.addEventListener("selectstart", ct, !1)), e.handleNumbers.forEach(function (t) {
                J("start", t)
            })
        }

        function n(t) {
            t.stopPropagation();
            var i, o, s, e = B(t.calcPoint), r = (i = e, s = !(o = 100), u.forEach(function (t, e) {
                if (!L(e)) {
                    var r = S[e], n = Math.abs(r - i);
                    (n < o || n <= o && r < i || 100 === n && 100 === o) && (s = e, o = n)
                }
            }), s);
            if (!1 === r) return !1;
            b.events.snap || pt(h, b.cssClasses.tap, b.animationDuration), rt(r, e, !0, !0), et(), J("slide", r, !0), J("update", r, !0), J("change", r, !0), J("set", r, !0), b.events.snap && I(t, {handleNumbers: [r]})
        }

        function W(t) {
            var e = B(t.calcPoint), r = y.getStep(e), n = y.fromStepping(r);
            Object.keys(v).forEach(function (t) {
                "hover" === t.split(".")[0] && v[t].forEach(function (t) {
                    t.call(a, n)
                })
            })
        }

        function $(t, e) {
            v[t] = v[t] || [], v[t].push(e), "update" === t.split(".")[0] && u.forEach(function (t, e) {
                J("update", e)
            })
        }

        function G(t) {
            var i = t && t.split(".")[0], o = i ? t.substring(i.length) : t;
            Object.keys(v).forEach(function (t) {
                var e, r = t.split(".")[0], n = t.substring(r.length);
                i && i !== r || o && o !== n || ((e = n) !== vt.aria && e !== vt.tooltips || o === n) && delete v[t]
            })
        }

        function J(r, n, i) {
            Object.keys(v).forEach(function (t) {
                var e = t.split(".")[0];
                r === e && v[t].forEach(function (t) {
                    t.call(a, x.map(b.format.to), n, x.slice(), i || !1, S.slice(), a)
                })
            })
        }

        function K(t, e, r, n, i, o) {
            var s;
            return 1 < u.length && !b.events.unconstrained && (n && 0 < e && (s = y.getAbsoluteDistance(t[e - 1], b.margin, 0), r = Math.max(r, s)), i && e < u.length - 1 && (s = y.getAbsoluteDistance(t[e + 1], b.margin, 1), r = Math.min(r, s))), 1 < u.length && b.limit && (n && 0 < e && (s = y.getAbsoluteDistance(t[e - 1], b.limit, 0), r = Math.min(r, s)), i && e < u.length - 1 && (s = y.getAbsoluteDistance(t[e + 1], b.limit, 1), r = Math.max(r, s))), b.padding && (0 === e && (s = y.getAbsoluteDistance(0, b.padding[0], 0), r = Math.max(r, s)), e === u.length - 1 && (s = y.getAbsoluteDistance(100, b.padding[1], 1), r = Math.min(r, s))), !((r = ft(r = y.getStep(r))) === t[e] && !o) && r
        }

        function Q(t, e) {
            var r = b.ort;
            return (r ? e : t) + ", " + (r ? t : e)
        }

        function Z(t, n, r, e) {
            var i = r.slice(), o = [!t, t], s = [t, !t];
            e = e.slice(), t && e.reverse(), 1 < e.length ? e.forEach(function (t, e) {
                var r = K(i, t, i[t] + n, o[e], s[e], !1);
                !1 === r ? n = 0 : (n = r - i[t], i[t] = r)
            }) : o = s = [!0];
            var a = !1;
            e.forEach(function (t, e) {
                a = rt(t, r[t] + n, o[e], s[e]) || a
            }), a && e.forEach(function (t) {
                J("update", t), J("slide", t)
            })
        }

        function tt(t, e) {
            return b.dir ? 100 - t - e : t
        }

        function et() {
            m.forEach(function (t) {
                var e = 50 < S[t] ? -1 : 1, r = 3 + (u.length + e * t);
                u[t].style.zIndex = r
            })
        }

        function rt(t, e, r, n, i) {
            return i || (e = K(S, t, e, r, n, !1)), !1 !== e && (function (t, e) {
                S[t] = e, x[t] = y.fromStepping(e);
                var r = "translate(" + Q(10 * (tt(e, 0) - A) + "%", "0") + ")";
                u[t].style[b.transformRule] = r, nt(t), nt(t + 1)
            }(t, e), !0)
        }

        function nt(t) {
            if (s[t]) {
                var e = 0, r = 100;
                0 !== t && (e = S[t - 1]), t !== s.length - 1 && (r = S[t]);
                var n = r - e, i = "translate(" + Q(tt(e, n) + "%", "0") + ")", o = "scale(" + Q(n / 100, "1") + ")";
                s[t].style[b.transformRule] = i + " " + o
            }
        }

        function it(t, e) {
            return null === t || !1 === t || void 0 === t ? S[e] : ("number" == typeof t && (t = String(t)), t = b.format.from(t), !1 === (t = y.toStepping(t)) || isNaN(t) ? S[e] : t)
        }

        function ot(t, e, r) {
            var n = dt(t), i = void 0 === S[0];
            e = void 0 === e || !!e, b.animate && !i && pt(h, b.cssClasses.tap, b.animationDuration), m.forEach(function (t) {
                rt(t, it(n[t], t), !0, !1, r)
            });
            for (var o = 1 === m.length ? 0 : 1; o < m.length; ++o) m.forEach(function (t) {
                rt(t, S[t], !0, !0, r)
            });
            et(), m.forEach(function (t) {
                J("update", t), null !== n[t] && e && J("set", t)
            })
        }

        function st() {
            var t = x.map(b.format.to);
            return 1 === t.length ? t[0] : t
        }

        function at(t) {
            var e = S[t], r = y.getNearbySteps(e), n = x[t], i = r.thisStep.step, o = null;
            if (b.snap) return [n - r.stepBefore.startValue || null, r.stepAfter.startValue - n || null];
            !1 !== i && n + i > r.stepAfter.startValue && (i = r.stepAfter.startValue - n), o = n > r.thisStep.startValue ? r.thisStep.step : !1 !== r.stepBefore.step && n - r.stepBefore.highestStep, 100 === e ? i = null : 0 === e && (o = null);
            var s = y.countStepDecimals();
            return null !== i && !1 !== i && (i = Number(i.toFixed(s))), null !== o && !1 !== o && (o = Number(o.toFixed(s))), [o, i]
        }

        return ht(e = h, b.cssClasses.target), 0 === b.dir ? ht(e, b.cssClasses.ltr) : ht(e, b.cssClasses.rtl), 0 === b.ort ? ht(e, b.cssClasses.horizontal) : ht(e, b.cssClasses.vertical), ht(e, "rtl" === getComputedStyle(e).direction ? b.cssClasses.textDirectionRtl : b.cssClasses.textDirectionLtr), l = V(e, b.cssClasses.base), function (t, e) {
            var r = V(e, b.cssClasses.connects);
            u = [], (s = []).push(M(r, t[0]));
            for (var n = 0; n < b.handles; n++) u.push(D(e, n)), m[n] = n, s.push(M(r, t[n + 1]))
        }(b.connect, l), (p = b.events).fixed || u.forEach(function (t, e) {
            _(f.start, t.children[0], I, {handleNumbers: [e]})
        }), p.tap && _(f.start, l, n, {}), p.hover && _(f.move, l, W, {hover: !0}), p.drag && s.forEach(function (t, e) {
            if (!1 !== t && 0 !== e && e !== s.length - 1) {
                var r = u[e - 1], n = u[e], i = [t];
                ht(t, b.cssClasses.draggable), p.fixed && (i.push(r.children[0]), i.push(n.children[0])), i.forEach(function (t) {
                    _(f.start, t, I, {handles: [r, n], handleNumbers: [e - 1, e]})
                })
            }
        }), ot(b.start), b.pips && R(b.pips), b.tooltips && H(), G("update" + vt.aria), $("update" + vt.aria, function (t, e, s, r, a) {
            m.forEach(function (t) {
                var e = u[t], r = K(S, t, 0, !0, !0, !0), n = K(S, t, 100, !0, !0, !0), i = a[t],
                    o = b.ariaFormat.to(s[t]);
                r = y.fromStepping(r).toFixed(1), n = y.fromStepping(n).toFixed(1), i = y.fromStepping(i).toFixed(1), e.children[0].setAttribute("aria-valuemin", r), e.children[0].setAttribute("aria-valuemax", n), e.children[0].setAttribute("aria-valuenow", i), e.children[0].setAttribute("aria-valuetext", o)
            })
        }), a = {
            destroy: function () {
                for (var t in G(vt.aria), G(vt.tooltips), b.cssClasses) b.cssClasses.hasOwnProperty(t) && mt(h, b.cssClasses[t]);
                for (; h.firstChild;) h.removeChild(h.firstChild);
                delete h.noUiSlider
            }, steps: function () {
                return m.map(at)
            }, on: $, off: G, get: st, set: ot, setHandle: function (t, e, r, n) {
                if (!(0 <= (t = Number(t)) && t < m.length)) throw new Error("noUiSlider (" + lt + "): invalid handle number, got: " + t);
                rt(t, it(e, t), !0, !0, n), J("update", t), r && J("set", t)
            }, reset: function (t) {
                ot(b.start, t)
            }, __moveHandles: function (t, e, r) {
                Z(t, e, S, r)
            }, options: o, updateOptions: function (e, t) {
                var r = st(),
                    n = ["margin", "limit", "padding", "range", "animate", "snap", "step", "format", "pips", "tooltips"];
                n.forEach(function (t) {
                    void 0 !== e[t] && (o[t] = e[t])
                });
                var i = bt(o);
                n.forEach(function (t) {
                    void 0 !== e[t] && (b[t] = i[t])
                }), y = i.spectrum, b.margin = i.margin, b.limit = i.limit, b.padding = i.padding, b.pips ? R(b.pips) : F(), b.tooltips ? H() : z(), S = [], ot(e.start || r, t)
            }, target: h, removePips: F, removeTooltips: z, getTooltips: function () {
                return i
            }, getOrigins: function () {
                return u
            }, pips: R
        }
    }

    return {
        __spectrum: i, version: lt, cssClasses: d, create: function (t, e) {
            if (!t || !t.nodeName) throw new Error("noUiSlider (" + lt + "): create requires a single element, got: " + t);
            if (t.noUiSlider) throw new Error("noUiSlider (" + lt + "): Slider was already initialized.");
            var r = j(t, bt(e), e);
            return t.noUiSlider = r
        }
    }
});
!function (t, e) {
    "object" == typeof exports && "undefined" != typeof module ? module.exports = e() : "function" == typeof define && define.amd ? define(e) : (t = "undefined" != typeof globalThis ? globalThis : t || self).bootstrap = e()
}(this, (function () {
    "use strict";

    function t(t, e) {
        for (var n = 0; n < e.length; n++) {
            var i = e[n];
            i.enumerable = i.enumerable || !1, i.configurable = !0, "value" in i && (i.writable = !0), Object.defineProperty(t, i.key, i)
        }
    }

    function e(e, n, i) {
        return n && t(e.prototype, n), i && t(e, i), e
    }

    function n() {
        return (n = Object.assign || function (t) {
            for (var e = 1; e < arguments.length; e++) {
                var n = arguments[e];
                for (var i in n) Object.prototype.hasOwnProperty.call(n, i) && (t[i] = n[i])
            }
            return t
        }).apply(this, arguments)
    }

    function i(t, e) {
        var n, i;
        t.prototype = Object.create(e.prototype), t.prototype.constructor = t, n = t, i = e, (Object.setPrototypeOf || function (t, e) {
            return t.__proto__ = e, t
        })(n, i)
    }

    var o, r, s = function (t) {
            do {
                t += Math.floor(1e6 * Math.random())
            } while (document.getElementById(t));
            return t
        }, a = function (t) {
            var e = t.getAttribute("data-bs-target");
            if (!e || "#" === e) {
                var n = t.getAttribute("href");
                if (!n || !n.includes("#") && !n.startsWith(".")) return null;
                n.includes("#") && !n.startsWith("#") && (n = "#" + n.split("#")[1]), e = n && "#" !== n ? n.trim() : null
            }
            return e
        }, l = function (t) {
            var e = a(t);
            return e && document.querySelector(e) ? e : null
        }, c = function (t) {
            var e = a(t);
            return e ? document.querySelector(e) : null
        }, u = function (t) {
            if (!t) return 0;
            var e = window.getComputedStyle(t), n = e.transitionDuration, i = e.transitionDelay, o = Number.parseFloat(n),
                r = Number.parseFloat(i);
            return o || r ? (n = n.split(",")[0], i = i.split(",")[0], 1e3 * (Number.parseFloat(n) + Number.parseFloat(i))) : 0
        }, f = function (t) {
            t.dispatchEvent(new Event("transitionend"))
        }, d = function (t) {
            return (t[0] || t).nodeType
        }, h = function (t, e) {
            var n = !1, i = e + 5;
            t.addEventListener("transitionend", (function e() {
                n = !0, t.removeEventListener("transitionend", e)
            })), setTimeout((function () {
                n || f(t)
            }), i)
        }, p = function (t, e, n) {
            Object.keys(n).forEach((function (i) {
                var o, r = n[i], s = e[i],
                    a = s && d(s) ? "element" : null == (o = s) ? "" + o : {}.toString.call(o).match(/\s([a-z]+)/i)[1].toLowerCase();
                if (!new RegExp(r).test(a)) throw new TypeError(t.toUpperCase() + ': Option "' + i + '" provided type "' + a + '" but expected type "' + r + '".')
            }))
        }, g = function (t) {
            if (!t) return !1;
            if (t.style && t.parentNode && t.parentNode.style) {
                var e = getComputedStyle(t), n = getComputedStyle(t.parentNode);
                return "none" !== e.display && "none" !== n.display && "hidden" !== e.visibility
            }
            return !1
        }, m = function () {
            return function () {
            }
        }, v = function (t) {
            return t.offsetHeight
        }, _ = function () {
            var t = window.jQuery;
            return t && !document.body.hasAttribute("data-bs-no-jquery") ? t : null
        }, b = "rtl" === document.documentElement.dir, y = function (t, e) {
            var n;
            n = function () {
                var n = _();
                if (n) {
                    var i = n.fn[t];
                    n.fn[t] = e.jQueryInterface, n.fn[t].Constructor = e, n.fn[t].noConflict = function () {
                        return n.fn[t] = i, e.jQueryInterface
                    }
                }
            }, "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", n) : n()
        }, w = (o = {}, r = 1, {
            set: function (t, e, n) {
                void 0 === t.bsKey && (t.bsKey = {key: e, id: r}, r++), o[t.bsKey.id] = n
            }, get: function (t, e) {
                if (!t || void 0 === t.bsKey) return null;
                var n = t.bsKey;
                return n.key === e ? o[n.id] : null
            }, delete: function (t, e) {
                if (void 0 !== t.bsKey) {
                    var n = t.bsKey;
                    n.key === e && (delete o[n.id], delete t.bsKey)
                }
            }
        }), E = function (t, e, n) {
            w.set(t, e, n)
        }, T = function (t, e) {
            return w.get(t, e)
        }, k = /[^.]*(?=\..*)\.|.*/, A = /\..*/, L = /::\d+$/, O = {}, D = 1,
        x = {mouseenter: "mouseover", mouseleave: "mouseout"},
        C = new Set(["click", "dblclick", "mouseup", "mousedown", "contextmenu", "mousewheel", "DOMMouseScroll", "mouseover", "mouseout", "mousemove", "selectstart", "selectend", "keydown", "keypress", "keyup", "orientationchange", "touchstart", "touchmove", "touchend", "touchcancel", "pointerdown", "pointermove", "pointerup", "pointerleave", "pointercancel", "gesturestart", "gesturechange", "gestureend", "focus", "blur", "change", "reset", "select", "submit", "focusin", "focusout", "load", "unload", "beforeunload", "resize", "move", "DOMContentLoaded", "readystatechange", "error", "abort", "scroll"]);

    function S(t, e) {
        return e && e + "::" + D++ || t.uidEvent || D++
    }

    function j(t) {
        var e = S(t);
        return t.uidEvent = e, O[e] = O[e] || {}, O[e]
    }

    function N(t, e, n) {
        void 0 === n && (n = null);
        for (var i = Object.keys(t), o = 0, r = i.length; o < r; o++) {
            var s = t[i[o]];
            if (s.originalHandler === e && s.delegationSelector === n) return s
        }
        return null
    }

    function P(t, e, n) {
        var i = "string" == typeof e, o = i ? n : e, r = t.replace(A, ""), s = x[r];
        return s && (r = s), C.has(r) || (r = t), [i, o, r]
    }

    function I(t, e, n, i, o) {
        if ("string" == typeof e && t) {
            n || (n = i, i = null);
            var r = P(e, n, i), s = r[0], a = r[1], l = r[2], c = j(t), u = c[l] || (c[l] = {}),
                f = N(u, a, s ? n : null);
            if (f) f.oneOff = f.oneOff && o; else {
                var d = S(a, e.replace(k, "")), h = s ? function (t, e, n) {
                    return function i(o) {
                        for (var r = t.querySelectorAll(e), s = o.target; s && s !== this; s = s.parentNode) for (var a = r.length; a--;) if (r[a] === s) return o.delegateTarget = s, i.oneOff && B.off(t, o.type, n), n.apply(s, [o]);
                        return null
                    }
                }(t, n, i) : function (t, e) {
                    return function n(i) {
                        return i.delegateTarget = t, n.oneOff && B.off(t, i.type, e), e.apply(t, [i])
                    }
                }(t, n);
                h.delegationSelector = s ? n : null, h.originalHandler = a, h.oneOff = o, h.uidEvent = d, u[d] = h, t.addEventListener(l, h, s)
            }
        }
    }

    function M(t, e, n, i, o) {
        var r = N(e[n], i, o);
        r && (t.removeEventListener(n, r, Boolean(o)), delete e[n][r.uidEvent])
    }

    var B = {
        on: function (t, e, n, i) {
            I(t, e, n, i, !1)
        }, one: function (t, e, n, i) {
            I(t, e, n, i, !0)
        }, off: function (t, e, n, i) {
            if ("string" == typeof e && t) {
                var o = P(e, n, i), r = o[0], s = o[1], a = o[2], l = a !== e, c = j(t), u = e.startsWith(".");
                if (void 0 === s) {
                    u && Object.keys(c).forEach((function (n) {
                        !function (t, e, n, i) {
                            var o = e[n] || {};
                            Object.keys(o).forEach((function (r) {
                                if (r.includes(i)) {
                                    var s = o[r];
                                    M(t, e, n, s.originalHandler, s.delegationSelector)
                                }
                            }))
                        }(t, c, n, e.slice(1))
                    }));
                    var f = c[a] || {};
                    Object.keys(f).forEach((function (n) {
                        var i = n.replace(L, "");
                        if (!l || e.includes(i)) {
                            var o = f[n];
                            M(t, c, a, o.originalHandler, o.delegationSelector)
                        }
                    }))
                } else {
                    if (!c || !c[a]) return;
                    M(t, c, a, s, r ? n : null)
                }
            }
        }, trigger: function (t, e, n) {
            if ("string" != typeof e || !t) return null;
            var i, o = _(), r = e.replace(A, ""), s = e !== r, a = C.has(r), l = !0, c = !0, u = !1, f = null;
            return s && o && (i = o.Event(e, n), o(t).trigger(i), l = !i.isPropagationStopped(), c = !i.isImmediatePropagationStopped(), u = i.isDefaultPrevented()), a ? (f = document.createEvent("HTMLEvents")).initEvent(r, l, !0) : f = new CustomEvent(e, {
                bubbles: l,
                cancelable: !0
            }), void 0 !== n && Object.keys(n).forEach((function (t) {
                Object.defineProperty(f, t, {
                    get: function () {
                        return n[t]
                    }
                })
            })), u && f.preventDefault(), c && t.dispatchEvent(f), f.defaultPrevented && void 0 !== i && i.preventDefault(), f
        }
    }, H = function () {
        function t(t) {
            t && (this._element = t, E(t, this.constructor.DATA_KEY, this))
        }

        return t.prototype.dispose = function () {
            var t, e;
            t = this._element, e = this.constructor.DATA_KEY, w.delete(t, e), this._element = null
        }, t.getInstance = function (t) {
            return T(t, this.DATA_KEY)
        }, e(t, null, [{
            key: "VERSION", get: function () {
                return "5.0.0-beta2"
            }
        }]), t
    }(), R = function (t) {
        function n() {
            return t.apply(this, arguments) || this
        }

        i(n, t);
        var o = n.prototype;
        return o.close = function (t) {
            var e = t ? this._getRootElement(t) : this._element, n = this._triggerCloseEvent(e);
            null === n || n.defaultPrevented || this._removeElement(e)
        }, o._getRootElement = function (t) {
            return c(t) || t.closest(".alert")
        }, o._triggerCloseEvent = function (t) {
            return B.trigger(t, "close.bs.alert")
        }, o._removeElement = function (t) {
            var e = this;
            if (t.classList.remove("show"), t.classList.contains("fade")) {
                var n = u(t);
                B.one(t, "transitionend", (function () {
                    return e._destroyElement(t)
                })), h(t, n)
            } else this._destroyElement(t)
        }, o._destroyElement = function (t) {
            t.parentNode && t.parentNode.removeChild(t), B.trigger(t, "closed.bs.alert")
        }, n.jQueryInterface = function (t) {
            return this.each((function () {
                var e = T(this, "bs.alert");
                e || (e = new n(this)), "close" === t && e[t](this)
            }))
        }, n.handleDismiss = function (t) {
            return function (e) {
                e && e.preventDefault(), t.close(this)
            }
        }, e(n, null, [{
            key: "DATA_KEY", get: function () {
                return "bs.alert"
            }
        }]), n
    }(H);
    B.on(document, "click.bs.alert.data-api", '[data-bs-dismiss="alert"]', R.handleDismiss(new R)), y("alert", R);
    var W = function (t) {
        function n() {
            return t.apply(this, arguments) || this
        }

        return i(n, t), n.prototype.toggle = function () {
            this._element.setAttribute("aria-pressed", this._element.classList.toggle("active"))
        }, n.jQueryInterface = function (t) {
            return this.each((function () {
                var e = T(this, "bs.button");
                e || (e = new n(this)), "toggle" === t && e[t]()
            }))
        }, e(n, null, [{
            key: "DATA_KEY", get: function () {
                return "bs.button"
            }
        }]), n
    }(H);

    function K(t) {
        return "true" === t || "false" !== t && (t === Number(t).toString() ? Number(t) : "" === t || "null" === t ? null : t)
    }

    function U(t) {
        return t.replace(/[A-Z]/g, (function (t) {
            return "-" + t.toLowerCase()
        }))
    }

    B.on(document, "click.bs.button.data-api", '[data-bs-toggle="button"]', (function (t) {
        t.preventDefault();
        var e = t.target.closest('[data-bs-toggle="button"]'), n = T(e, "bs.button");
        n || (n = new W(e)), n.toggle()
    })), y("button", W);
    var z = {
        setDataAttribute: function (t, e, n) {
            t.setAttribute("data-bs-" + U(e), n)
        }, removeDataAttribute: function (t, e) {
            t.removeAttribute("data-bs-" + U(e))
        }, getDataAttributes: function (t) {
            if (!t) return {};
            var e = {};
            return Object.keys(t.dataset).filter((function (t) {
                return t.startsWith("bs")
            })).forEach((function (n) {
                var i = n.replace(/^bs/, "");
                i = i.charAt(0).toLowerCase() + i.slice(1, i.length), e[i] = K(t.dataset[n])
            })), e
        }, getDataAttribute: function (t, e) {
            return K(t.getAttribute("data-bs-" + U(e)))
        }, offset: function (t) {
            var e = t.getBoundingClientRect();
            return {top: e.top + document.body.scrollTop, left: e.left + document.body.scrollLeft}
        }, position: function (t) {
            return {top: t.offsetTop, left: t.offsetLeft}
        }
    }, F = function (t, e) {
        var n;
        return void 0 === e && (e = document.documentElement), (n = []).concat.apply(n, Element.prototype.querySelectorAll.call(e, t))
    }, Y = function (t, e) {
        return void 0 === e && (e = document.documentElement), Element.prototype.querySelector.call(e, t)
    }, q = function (t, e) {
        var n;
        return (n = []).concat.apply(n, t.children).filter((function (t) {
            return t.matches(e)
        }))
    }, V = function (t, e) {
        for (var n = t.previousElementSibling; n;) {
            if (n.matches(e)) return [n];
            n = n.previousElementSibling
        }
        return []
    }, X = {interval: 5e3, keyboard: !0, slide: !1, pause: "hover", wrap: !0, touch: !0}, Q = {
        interval: "(number|boolean)",
        keyboard: "boolean",
        slide: "(boolean|string)",
        pause: "(string|boolean)",
        wrap: "boolean",
        touch: "boolean"
    }, $ = function (t) {
        function o(e, n) {
            var i;
            return (i = t.call(this, e) || this)._items = null, i._interval = null, i._activeElement = null, i._isPaused = !1, i._isSliding = !1, i.touchTimeout = null, i.touchStartX = 0, i.touchDeltaX = 0, i._config = i._getConfig(n), i._indicatorsElement = Y(".carousel-indicators", i._element), i._touchSupported = "ontouchstart" in document.documentElement || navigator.maxTouchPoints > 0, i._pointerEvent = Boolean(window.PointerEvent), i._addEventListeners(), i
        }

        i(o, t);
        var r = o.prototype;
        return r.next = function () {
            this._isSliding || this._slide("next")
        }, r.nextWhenVisible = function () {
            !document.hidden && g(this._element) && this.next()
        }, r.prev = function () {
            this._isSliding || this._slide("prev")
        }, r.pause = function (t) {
            t || (this._isPaused = !0), Y(".carousel-item-next, .carousel-item-prev", this._element) && (f(this._element), this.cycle(!0)), clearInterval(this._interval), this._interval = null
        }, r.cycle = function (t) {
            t || (this._isPaused = !1), this._interval && (clearInterval(this._interval), this._interval = null), this._config && this._config.interval && !this._isPaused && (this._updateInterval(), this._interval = setInterval((document.visibilityState ? this.nextWhenVisible : this.next).bind(this), this._config.interval))
        }, r.to = function (t) {
            var e = this;
            this._activeElement = Y(".active.carousel-item", this._element);
            var n = this._getItemIndex(this._activeElement);
            if (!(t > this._items.length - 1 || t < 0)) if (this._isSliding) B.one(this._element, "slid.bs.carousel", (function () {
                return e.to(t)
            })); else {
                if (n === t) return this.pause(), void this.cycle();
                var i = t > n ? "next" : "prev";
                this._slide(i, this._items[t])
            }
        }, r.dispose = function () {
            t.prototype.dispose.call(this), B.off(this._element, ".bs.carousel"), this._items = null, this._config = null, this._interval = null, this._isPaused = null, this._isSliding = null, this._activeElement = null, this._indicatorsElement = null
        }, r._getConfig = function (t) {
            return t = n({}, X, t), p("carousel", t, Q), t
        }, r._handleSwipe = function () {
            var t = Math.abs(this.touchDeltaX);
            if (!(t <= 40)) {
                var e = t / this.touchDeltaX;
                this.touchDeltaX = 0, e > 0 && (b ? this.next() : this.prev()), e < 0 && (b ? this.prev() : this.next())
            }
        }, r._addEventListeners = function () {
            var t = this;
            this._config.keyboard && B.on(this._element, "keydown.bs.carousel", (function (e) {
                return t._keydown(e)
            })), "hover" === this._config.pause && (B.on(this._element, "mouseenter.bs.carousel", (function (e) {
                return t.pause(e)
            })), B.on(this._element, "mouseleave.bs.carousel", (function (e) {
                return t.cycle(e)
            }))), this._config.touch && this._touchSupported && this._addTouchEventListeners()
        }, r._addTouchEventListeners = function () {
            var t = this, e = function (e) {
                !t._pointerEvent || "pen" !== e.pointerType && "touch" !== e.pointerType ? t._pointerEvent || (t.touchStartX = e.touches[0].clientX) : t.touchStartX = e.clientX
            }, n = function (e) {
                !t._pointerEvent || "pen" !== e.pointerType && "touch" !== e.pointerType || (t.touchDeltaX = e.clientX - t.touchStartX), t._handleSwipe(), "hover" === t._config.pause && (t.pause(), t.touchTimeout && clearTimeout(t.touchTimeout), t.touchTimeout = setTimeout((function (e) {
                    return t.cycle(e)
                }), 500 + t._config.interval))
            };
            F(".carousel-item img", this._element).forEach((function (t) {
                B.on(t, "dragstart.bs.carousel", (function (t) {
                    return t.preventDefault()
                }))
            })), this._pointerEvent ? (B.on(this._element, "pointerdown.bs.carousel", (function (t) {
                return e(t)
            })), B.on(this._element, "pointerup.bs.carousel", (function (t) {
                return n(t)
            })), this._element.classList.add("pointer-event")) : (B.on(this._element, "touchstart.bs.carousel", (function (t) {
                return e(t)
            })), B.on(this._element, "touchmove.bs.carousel", (function (e) {
                return function (e) {
                    e.touches && e.touches.length > 1 ? t.touchDeltaX = 0 : t.touchDeltaX = e.touches[0].clientX - t.touchStartX
                }(e)
            })), B.on(this._element, "touchend.bs.carousel", (function (t) {
                return n(t)
            })))
        }, r._keydown = function (t) {
            /input|textarea/i.test(t.target.tagName) || ("ArrowLeft" === t.key ? (t.preventDefault(), b ? this.next() : this.prev()) : "ArrowRight" === t.key && (t.preventDefault(), b ? this.prev() : this.next()))
        }, r._getItemIndex = function (t) {
            return this._items = t && t.parentNode ? F(".carousel-item", t.parentNode) : [], this._items.indexOf(t)
        }, r._getItemByDirection = function (t, e) {
            var n = "next" === t, i = "prev" === t, o = this._getItemIndex(e), r = this._items.length - 1;
            if ((i && 0 === o || n && o === r) && !this._config.wrap) return e;
            var s = (o + ("prev" === t ? -1 : 1)) % this._items.length;
            return -1 === s ? this._items[this._items.length - 1] : this._items[s]
        }, r._triggerSlideEvent = function (t, e) {
            var n = this._getItemIndex(t), i = this._getItemIndex(Y(".active.carousel-item", this._element));
            return B.trigger(this._element, "slide.bs.carousel", {relatedTarget: t, direction: e, from: i, to: n})
        }, r._setActiveIndicatorElement = function (t) {
            if (this._indicatorsElement) {
                var e = Y(".active", this._indicatorsElement);
                e.classList.remove("active"), e.removeAttribute("aria-current");
                for (var n = F("[data-bs-target]", this._indicatorsElement), i = 0; i < n.length; i++) if (Number.parseInt(n[i].getAttribute("data-bs-slide-to"), 10) === this._getItemIndex(t)) {
                    n[i].classList.add("active"), n[i].setAttribute("aria-current", "true");
                    break
                }
            }
        }, r._updateInterval = function () {
            var t = this._activeElement || Y(".active.carousel-item", this._element);
            if (t) {
                var e = Number.parseInt(t.getAttribute("data-bs-interval"), 10);
                e ? (this._config.defaultInterval = this._config.defaultInterval || this._config.interval, this._config.interval = e) : this._config.interval = this._config.defaultInterval || this._config.interval
            }
        }, r._slide = function (t, e) {
            var n = this, i = Y(".active.carousel-item", this._element), o = this._getItemIndex(i),
                r = e || i && this._getItemByDirection(t, i), s = this._getItemIndex(r), a = Boolean(this._interval),
                l = "next" === t ? "carousel-item-start" : "carousel-item-end",
                c = "next" === t ? "carousel-item-next" : "carousel-item-prev", f = "next" === t ? "left" : "right";
            if (r && r.classList.contains("active")) this._isSliding = !1; else if (!this._triggerSlideEvent(r, f).defaultPrevented && i && r) {
                if (this._isSliding = !0, a && this.pause(), this._setActiveIndicatorElement(r), this._activeElement = r, this._element.classList.contains("slide")) {
                    r.classList.add(c), v(r), i.classList.add(l), r.classList.add(l);
                    var d = u(i);
                    B.one(i, "transitionend", (function () {
                        r.classList.remove(l, c), r.classList.add("active"), i.classList.remove("active", c, l), n._isSliding = !1, setTimeout((function () {
                            B.trigger(n._element, "slid.bs.carousel", {relatedTarget: r, direction: f, from: o, to: s})
                        }), 0)
                    })), h(i, d)
                } else i.classList.remove("active"), r.classList.add("active"), this._isSliding = !1, B.trigger(this._element, "slid.bs.carousel", {
                    relatedTarget: r,
                    direction: f,
                    from: o,
                    to: s
                });
                a && this.cycle()
            }
        }, o.carouselInterface = function (t, e) {
            var i = T(t, "bs.carousel"), r = n({}, X, z.getDataAttributes(t));
            "object" == typeof e && (r = n({}, r, e));
            var s = "string" == typeof e ? e : r.slide;
            if (i || (i = new o(t, r)), "number" == typeof e) i.to(e); else if ("string" == typeof s) {
                if (void 0 === i[s]) throw new TypeError('No method named "' + s + '"');
                i[s]()
            } else r.interval && r.ride && (i.pause(), i.cycle())
        }, o.jQueryInterface = function (t) {
            return this.each((function () {
                o.carouselInterface(this, t)
            }))
        }, o.dataApiClickHandler = function (t) {
            var e = c(this);
            if (e && e.classList.contains("carousel")) {
                var i = n({}, z.getDataAttributes(e), z.getDataAttributes(this)),
                    r = this.getAttribute("data-bs-slide-to");
                r && (i.interval = !1), o.carouselInterface(e, i), r && T(e, "bs.carousel").to(r), t.preventDefault()
            }
        }, e(o, null, [{
            key: "Default", get: function () {
                return X
            }
        }, {
            key: "DATA_KEY", get: function () {
                return "bs.carousel"
            }
        }]), o
    }(H);
    B.on(document, "click.bs.carousel.data-api", "[data-bs-slide], [data-bs-slide-to]", $.dataApiClickHandler), B.on(window, "load.bs.carousel.data-api", (function () {
        for (var t = F('[data-bs-ride="carousel"]'), e = 0, n = t.length; e < n; e++) $.carouselInterface(t[e], T(t[e], "bs.carousel"))
    })), y("carousel", $);
    var G = {toggle: !0, parent: ""}, Z = {toggle: "boolean", parent: "(string|element)"}, J = function (t) {
        function o(e, n) {
            var i;
            (i = t.call(this, e) || this)._isTransitioning = !1, i._config = i._getConfig(n), i._triggerArray = F('[data-bs-toggle="collapse"][href="#' + e.id + '"],[data-bs-toggle="collapse"][data-bs-target="#' + e.id + '"]');
            for (var o = F('[data-bs-toggle="collapse"]'), r = 0, s = o.length; r < s; r++) {
                var a = o[r], c = l(a), u = F(c).filter((function (t) {
                    return t === e
                }));
                null !== c && u.length && (i._selector = c, i._triggerArray.push(a))
            }
            return i._parent = i._config.parent ? i._getParent() : null, i._config.parent || i._addAriaAndCollapsedClass(i._element, i._triggerArray), i._config.toggle && i.toggle(), i
        }

        i(o, t);
        var r = o.prototype;
        return r.toggle = function () {
            this._element.classList.contains("show") ? this.hide() : this.show()
        }, r.show = function () {
            var t = this;
            if (!this._isTransitioning && !this._element.classList.contains("show")) {
                var e, n;
                this._parent && 0 === (e = F(".show, .collapsing", this._parent).filter((function (e) {
                    return "string" == typeof t._config.parent ? e.getAttribute("data-bs-parent") === t._config.parent : e.classList.contains("collapse")
                }))).length && (e = null);
                var i = Y(this._selector);
                if (e) {
                    var r = e.find((function (t) {
                        return i !== t
                    }));
                    if ((n = r ? T(r, "bs.collapse") : null) && n._isTransitioning) return
                }
                if (!B.trigger(this._element, "show.bs.collapse").defaultPrevented) {
                    e && e.forEach((function (t) {
                        i !== t && o.collapseInterface(t, "hide"), n || E(t, "bs.collapse", null)
                    }));
                    var s = this._getDimension();
                    this._element.classList.remove("collapse"), this._element.classList.add("collapsing"), this._element.style[s] = 0, this._triggerArray.length && this._triggerArray.forEach((function (t) {
                        t.classList.remove("collapsed"), t.setAttribute("aria-expanded", !0)
                    })), this.setTransitioning(!0);
                    var a = "scroll" + (s[0].toUpperCase() + s.slice(1)), l = u(this._element);
                    B.one(this._element, "transitionend", (function () {
                        t._element.classList.remove("collapsing"), t._element.classList.add("collapse", "show"), t._element.style[s] = "", t.setTransitioning(!1), B.trigger(t._element, "shown.bs.collapse")
                    })), h(this._element, l), this._element.style[s] = this._element[a] + "px"
                }
            }
        }, r.hide = function () {
            var t = this;
            if (!this._isTransitioning && this._element.classList.contains("show") && !B.trigger(this._element, "hide.bs.collapse").defaultPrevented) {
                var e = this._getDimension();
                this._element.style[e] = this._element.getBoundingClientRect()[e] + "px", v(this._element), this._element.classList.add("collapsing"), this._element.classList.remove("collapse", "show");
                var n = this._triggerArray.length;
                if (n > 0) for (var i = 0; i < n; i++) {
                    var o = this._triggerArray[i], r = c(o);
                    r && !r.classList.contains("show") && (o.classList.add("collapsed"), o.setAttribute("aria-expanded", !1))
                }
                this.setTransitioning(!0), this._element.style[e] = "";
                var s = u(this._element);
                B.one(this._element, "transitionend", (function () {
                    t.setTransitioning(!1), t._element.classList.remove("collapsing"), t._element.classList.add("collapse"), B.trigger(t._element, "hidden.bs.collapse")
                })), h(this._element, s)
            }
        }, r.setTransitioning = function (t) {
            this._isTransitioning = t
        }, r.dispose = function () {
            t.prototype.dispose.call(this), this._config = null, this._parent = null, this._triggerArray = null, this._isTransitioning = null
        }, r._getConfig = function (t) {
            return (t = n({}, G, t)).toggle = Boolean(t.toggle), p("collapse", t, Z), t
        }, r._getDimension = function () {
            return this._element.classList.contains("width") ? "width" : "height"
        }, r._getParent = function () {
            var t = this, e = this._config.parent;
            return d(e) ? void 0 === e.jquery && void 0 === e[0] || (e = e[0]) : e = Y(e), F('[data-bs-toggle="collapse"][data-bs-parent="' + e + '"]', e).forEach((function (e) {
                var n = c(e);
                t._addAriaAndCollapsedClass(n, [e])
            })), e
        }, r._addAriaAndCollapsedClass = function (t, e) {
            if (t && e.length) {
                var n = t.classList.contains("show");
                e.forEach((function (t) {
                    n ? t.classList.remove("collapsed") : t.classList.add("collapsed"), t.setAttribute("aria-expanded", n)
                }))
            }
        }, o.collapseInterface = function (t, e) {
            var i = T(t, "bs.collapse"), r = n({}, G, z.getDataAttributes(t), "object" == typeof e && e ? e : {});
            if (!i && r.toggle && "string" == typeof e && /show|hide/.test(e) && (r.toggle = !1), i || (i = new o(t, r)), "string" == typeof e) {
                if (void 0 === i[e]) throw new TypeError('No method named "' + e + '"');
                i[e]()
            }
        }, o.jQueryInterface = function (t) {
            return this.each((function () {
                o.collapseInterface(this, t)
            }))
        }, e(o, null, [{
            key: "Default", get: function () {
                return G
            }
        }, {
            key: "DATA_KEY", get: function () {
                return "bs.collapse"
            }
        }]), o
    }(H);
    B.on(document, "click.bs.collapse.data-api", '[data-bs-toggle="collapse"]', (function (t) {
        ("A" === t.target.tagName || t.delegateTarget && "A" === t.delegateTarget.tagName) && t.preventDefault();
        var e = z.getDataAttributes(this), n = l(this);
        F(n).forEach((function (t) {
            var n, i = T(t, "bs.collapse");
            i ? (null === i._parent && "string" == typeof e.parent && (i._config.parent = e.parent, i._parent = i._getParent()), n = "toggle") : n = e, J.collapseInterface(t, n)
        }))
    })), y("collapse", J);
    var tt = "top", et = "bottom", nt = "right", it = "left", ot = [tt, et, nt, it], rt = ot.reduce((function (t, e) {
            return t.concat([e + "-start", e + "-end"])
        }), []), st = [].concat(ot, ["auto"]).reduce((function (t, e) {
            return t.concat([e, e + "-start", e + "-end"])
        }), []),
        at = ["beforeRead", "read", "afterRead", "beforeMain", "main", "afterMain", "beforeWrite", "write", "afterWrite"];

    function lt(t) {
        return t ? (t.nodeName || "").toLowerCase() : null
    }

    function ct(t) {
        if ("[object Window]" !== t.toString()) {
            var e = t.ownerDocument;
            return e && e.defaultView || window
        }
        return t
    }

    function ut(t) {
        return t instanceof ct(t).Element || t instanceof Element
    }

    function ft(t) {
        return t instanceof ct(t).HTMLElement || t instanceof HTMLElement
    }

    var dt = {
        name: "applyStyles", enabled: !0, phase: "write", fn: function (t) {
            var e = t.state;
            Object.keys(e.elements).forEach((function (t) {
                var n = e.styles[t] || {}, i = e.attributes[t] || {}, o = e.elements[t];
                ft(o) && lt(o) && (Object.assign(o.style, n), Object.keys(i).forEach((function (t) {
                    var e = i[t];
                    !1 === e ? o.removeAttribute(t) : o.setAttribute(t, !0 === e ? "" : e)
                })))
            }))
        }, effect: function (t) {
            var e = t.state, n = {
                popper: {position: e.options.strategy, left: "0", top: "0", margin: "0"},
                arrow: {position: "absolute"},
                reference: {}
            };
            return Object.assign(e.elements.popper.style, n.popper), e.elements.arrow && Object.assign(e.elements.arrow.style, n.arrow), function () {
                Object.keys(e.elements).forEach((function (t) {
                    var i = e.elements[t], o = e.attributes[t] || {},
                        r = Object.keys(e.styles.hasOwnProperty(t) ? e.styles[t] : n[t]).reduce((function (t, e) {
                            return t[e] = "", t
                        }), {});
                    ft(i) && lt(i) && (Object.assign(i.style, r), Object.keys(o).forEach((function (t) {
                        i.removeAttribute(t)
                    })))
                }))
            }
        }, requires: ["computeStyles"]
    };

    function ht(t) {
        return t.split("-")[0]
    }

    function pt(t) {
        return {x: t.offsetLeft, y: t.offsetTop, width: t.offsetWidth, height: t.offsetHeight}
    }

    function gt(t, e) {
        var n, i = e.getRootNode && e.getRootNode();
        if (t.contains(e)) return !0;
        if (i && ((n = i) instanceof ct(n).ShadowRoot || n instanceof ShadowRoot)) {
            var o = e;
            do {
                if (o && t.isSameNode(o)) return !0;
                o = o.parentNode || o.host
            } while (o)
        }
        return !1
    }

    function mt(t) {
        return ct(t).getComputedStyle(t)
    }

    function vt(t) {
        return ["table", "td", "th"].indexOf(lt(t)) >= 0
    }

    function _t(t) {
        return ((ut(t) ? t.ownerDocument : t.document) || window.document).documentElement
    }

    function bt(t) {
        return "html" === lt(t) ? t : t.assignedSlot || t.parentNode || t.host || _t(t)
    }

    function yt(t) {
        if (!ft(t) || "fixed" === mt(t).position) return null;
        var e = t.offsetParent;
        if (e) {
            var n = _t(e);
            if ("body" === lt(e) && "static" === mt(e).position && "static" !== mt(n).position) return n
        }
        return e
    }

    function wt(t) {
        for (var e = ct(t), n = yt(t); n && vt(n) && "static" === mt(n).position;) n = yt(n);
        return n && "body" === lt(n) && "static" === mt(n).position ? e : n || function (t) {
            for (var e = bt(t); ft(e) && ["html", "body"].indexOf(lt(e)) < 0;) {
                var n = mt(e);
                if ("none" !== n.transform || "none" !== n.perspective || n.willChange && "auto" !== n.willChange) return e;
                e = e.parentNode
            }
            return null
        }(t) || e
    }

    function Et(t) {
        return ["top", "bottom"].indexOf(t) >= 0 ? "x" : "y"
    }

    function Tt(t, e, n) {
        return Math.max(t, Math.min(e, n))
    }

    function kt(t) {
        return Object.assign(Object.assign({}, {top: 0, right: 0, bottom: 0, left: 0}), t)
    }

    function At(t, e) {
        return e.reduce((function (e, n) {
            return e[n] = t, e
        }), {})
    }

    var Lt = {
        name: "arrow", enabled: !0, phase: "main", fn: function (t) {
            var e, n = t.state, i = t.name, o = n.elements.arrow, r = n.modifiersData.popperOffsets,
                s = ht(n.placement), a = Et(s), l = [it, nt].indexOf(s) >= 0 ? "height" : "width";
            if (o && r) {
                var c = n.modifiersData[i + "#persistent"].padding, u = pt(o), f = "y" === a ? tt : it,
                    d = "y" === a ? et : nt, h = n.rects.reference[l] + n.rects.reference[a] - r[a] - n.rects.popper[l],
                    p = r[a] - n.rects.reference[a], g = wt(o),
                    m = g ? "y" === a ? g.clientHeight || 0 : g.clientWidth || 0 : 0, v = h / 2 - p / 2, _ = c[f],
                    b = m - u[l] - c[d], y = m / 2 - u[l] / 2 + v, w = Tt(_, y, b), E = a;
                n.modifiersData[i] = ((e = {})[E] = w, e.centerOffset = w - y, e)
            }
        }, effect: function (t) {
            var e = t.state, n = t.options, i = t.name, o = n.element, r = void 0 === o ? "[data-popper-arrow]" : o,
                s = n.padding, a = void 0 === s ? 0 : s;
            null != r && ("string" != typeof r || (r = e.elements.popper.querySelector(r))) && gt(e.elements.popper, r) && (e.elements.arrow = r, e.modifiersData[i + "#persistent"] = {padding: kt("number" != typeof a ? a : At(a, ot))})
        }, requires: ["popperOffsets"], requiresIfExists: ["preventOverflow"]
    }, Ot = {top: "auto", right: "auto", bottom: "auto", left: "auto"};

    function Dt(t) {
        var e, n = t.popper, i = t.popperRect, o = t.placement, r = t.offsets, s = t.position, a = t.gpuAcceleration,
            l = t.adaptive, c = t.roundOffsets ? function (t) {
                var e = t.x, n = t.y, i = window.devicePixelRatio || 1;
                return {x: Math.round(e * i) / i || 0, y: Math.round(n * i) / i || 0}
            }(r) : r, u = c.x, f = void 0 === u ? 0 : u, d = c.y, h = void 0 === d ? 0 : d, p = r.hasOwnProperty("x"),
            g = r.hasOwnProperty("y"), m = it, v = tt, _ = window;
        if (l) {
            var b = wt(n);
            b === ct(n) && (b = _t(n)), o === tt && (v = et, h -= b.clientHeight - i.height, h *= a ? 1 : -1), o === it && (m = nt, f -= b.clientWidth - i.width, f *= a ? 1 : -1)
        }
        var y, w = Object.assign({position: s}, l && Ot);
        return a ? Object.assign(Object.assign({}, w), {}, ((y = {})[v] = g ? "0" : "", y[m] = p ? "0" : "", y.transform = (_.devicePixelRatio || 1) < 2 ? "translate(" + f + "px, " + h + "px)" : "translate3d(" + f + "px, " + h + "px, 0)", y)) : Object.assign(Object.assign({}, w), {}, ((e = {})[v] = g ? h + "px" : "", e[m] = p ? f + "px" : "", e.transform = "", e))
    }

    var xt = {
        name: "computeStyles", enabled: !0, phase: "beforeWrite", fn: function (t) {
            var e = t.state, n = t.options, i = n.gpuAcceleration, o = void 0 === i || i, r = n.adaptive,
                s = void 0 === r || r, a = n.roundOffsets, l = void 0 === a || a, c = {
                    placement: ht(e.placement),
                    popper: e.elements.popper,
                    popperRect: e.rects.popper,
                    gpuAcceleration: o
                };
            null != e.modifiersData.popperOffsets && (e.styles.popper = Object.assign(Object.assign({}, e.styles.popper), Dt(Object.assign(Object.assign({}, c), {}, {
                offsets: e.modifiersData.popperOffsets,
                position: e.options.strategy,
                adaptive: s,
                roundOffsets: l
            })))), null != e.modifiersData.arrow && (e.styles.arrow = Object.assign(Object.assign({}, e.styles.arrow), Dt(Object.assign(Object.assign({}, c), {}, {
                offsets: e.modifiersData.arrow,
                position: "absolute",
                adaptive: !1,
                roundOffsets: l
            })))), e.attributes.popper = Object.assign(Object.assign({}, e.attributes.popper), {}, {"data-popper-placement": e.placement})
        }, data: {}
    }, Ct = {passive: !0}, St = {
        name: "eventListeners", enabled: !0, phase: "write", fn: function () {
        }, effect: function (t) {
            var e = t.state, n = t.instance, i = t.options, o = i.scroll, r = void 0 === o || o, s = i.resize,
                a = void 0 === s || s, l = ct(e.elements.popper),
                c = [].concat(e.scrollParents.reference, e.scrollParents.popper);
            return r && c.forEach((function (t) {
                t.addEventListener("scroll", n.update, Ct)
            })), a && l.addEventListener("resize", n.update, Ct), function () {
                r && c.forEach((function (t) {
                    t.removeEventListener("scroll", n.update, Ct)
                })), a && l.removeEventListener("resize", n.update, Ct)
            }
        }, data: {}
    }, jt = {left: "right", right: "left", bottom: "top", top: "bottom"};

    function Nt(t) {
        return t.replace(/left|right|bottom|top/g, (function (t) {
            return jt[t]
        }))
    }

    var Pt = {start: "end", end: "start"};

    function It(t) {
        return t.replace(/start|end/g, (function (t) {
            return Pt[t]
        }))
    }

    function Mt(t) {
        var e = t.getBoundingClientRect();
        return {
            width: e.width,
            height: e.height,
            top: e.top,
            right: e.right,
            bottom: e.bottom,
            left: e.left,
            x: e.left,
            y: e.top
        }
    }

    function Bt(t) {
        var e = ct(t);
        return {scrollLeft: e.pageXOffset, scrollTop: e.pageYOffset}
    }

    function Ht(t) {
        return Mt(_t(t)).left + Bt(t).scrollLeft
    }

    function Rt(t) {
        var e = mt(t), n = e.overflow, i = e.overflowX, o = e.overflowY;
        return /auto|scroll|overlay|hidden/.test(n + o + i)
    }

    function Wt(t, e) {
        void 0 === e && (e = []);
        var n = function t(e) {
                return ["html", "body", "#document"].indexOf(lt(e)) >= 0 ? e.ownerDocument.body : ft(e) && Rt(e) ? e : t(bt(e))
            }(t), i = "body" === lt(n), o = ct(n), r = i ? [o].concat(o.visualViewport || [], Rt(n) ? n : []) : n,
            s = e.concat(r);
        return i ? s : s.concat(Wt(bt(r)))
    }

    function Kt(t) {
        return Object.assign(Object.assign({}, t), {}, {
            left: t.x,
            top: t.y,
            right: t.x + t.width,
            bottom: t.y + t.height
        })
    }

    function Ut(t, e) {
        return "viewport" === e ? Kt(function (t) {
            var e = ct(t), n = _t(t), i = e.visualViewport, o = n.clientWidth, r = n.clientHeight, s = 0, a = 0;
            return i && (o = i.width, r = i.height, /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || (s = i.offsetLeft, a = i.offsetTop)), {
                width: o,
                height: r,
                x: s + Ht(t),
                y: a
            }
        }(t)) : ft(e) ? function (t) {
            var e = Mt(t);
            return e.top = e.top + t.clientTop, e.left = e.left + t.clientLeft, e.bottom = e.top + t.clientHeight, e.right = e.left + t.clientWidth, e.width = t.clientWidth, e.height = t.clientHeight, e.x = e.left, e.y = e.top, e
        }(e) : Kt(function (t) {
            var e = _t(t), n = Bt(t), i = t.ownerDocument.body,
                o = Math.max(e.scrollWidth, e.clientWidth, i ? i.scrollWidth : 0, i ? i.clientWidth : 0),
                r = Math.max(e.scrollHeight, e.clientHeight, i ? i.scrollHeight : 0, i ? i.clientHeight : 0),
                s = -n.scrollLeft + Ht(t), a = -n.scrollTop;
            return "rtl" === mt(i || e).direction && (s += Math.max(e.clientWidth, i ? i.clientWidth : 0) - o), {
                width: o,
                height: r,
                x: s,
                y: a
            }
        }(_t(t)))
    }

    function zt(t) {
        return t.split("-")[1]
    }

    function Ft(t) {
        var e, n = t.reference, i = t.element, o = t.placement, r = o ? ht(o) : null, s = o ? zt(o) : null,
            a = n.x + n.width / 2 - i.width / 2, l = n.y + n.height / 2 - i.height / 2;
        switch (r) {
            case tt:
                e = {x: a, y: n.y - i.height};
                break;
            case et:
                e = {x: a, y: n.y + n.height};
                break;
            case nt:
                e = {x: n.x + n.width, y: l};
                break;
            case it:
                e = {x: n.x - i.width, y: l};
                break;
            default:
                e = {x: n.x, y: n.y}
        }
        var c = r ? Et(r) : null;
        if (null != c) {
            var u = "y" === c ? "height" : "width";
            switch (s) {
                case"start":
                    e[c] = e[c] - (n[u] / 2 - i[u] / 2);
                    break;
                case"end":
                    e[c] = e[c] + (n[u] / 2 - i[u] / 2)
            }
        }
        return e
    }

    function Yt(t, e) {
        void 0 === e && (e = {});
        var n = e, i = n.placement, o = void 0 === i ? t.placement : i, r = n.boundary,
            s = void 0 === r ? "clippingParents" : r, a = n.rootBoundary, l = void 0 === a ? "viewport" : a,
            c = n.elementContext, u = void 0 === c ? "popper" : c, f = n.altBoundary, d = void 0 !== f && f,
            h = n.padding, p = void 0 === h ? 0 : h, g = kt("number" != typeof p ? p : At(p, ot)),
            m = "popper" === u ? "reference" : "popper", v = t.elements.reference, _ = t.rects.popper,
            b = t.elements[d ? m : u], y = function (t, e, n) {
                var i = "clippingParents" === e ? function (t) {
                    var e = Wt(bt(t)), n = ["absolute", "fixed"].indexOf(mt(t).position) >= 0 && ft(t) ? wt(t) : t;
                    return ut(n) ? e.filter((function (t) {
                        return ut(t) && gt(t, n) && "body" !== lt(t)
                    })) : []
                }(t) : [].concat(e), o = [].concat(i, [n]), r = o[0], s = o.reduce((function (e, n) {
                    var i = Ut(t, n);
                    return e.top = Math.max(i.top, e.top), e.right = Math.min(i.right, e.right), e.bottom = Math.min(i.bottom, e.bottom), e.left = Math.max(i.left, e.left), e
                }), Ut(t, r));
                return s.width = s.right - s.left, s.height = s.bottom - s.top, s.x = s.left, s.y = s.top, s
            }(ut(b) ? b : b.contextElement || _t(t.elements.popper), s, l), w = Mt(v),
            E = Ft({reference: w, element: _, strategy: "absolute", placement: o}),
            T = Kt(Object.assign(Object.assign({}, _), E)), k = "popper" === u ? T : w, A = {
                top: y.top - k.top + g.top,
                bottom: k.bottom - y.bottom + g.bottom,
                left: y.left - k.left + g.left,
                right: k.right - y.right + g.right
            }, L = t.modifiersData.offset;
        if ("popper" === u && L) {
            var O = L[o];
            Object.keys(A).forEach((function (t) {
                var e = [nt, et].indexOf(t) >= 0 ? 1 : -1, n = [tt, et].indexOf(t) >= 0 ? "y" : "x";
                A[t] += O[n] * e
            }))
        }
        return A
    }

    function qt(t, e) {
        void 0 === e && (e = {});
        var n = e, i = n.placement, o = n.boundary, r = n.rootBoundary, s = n.padding, a = n.flipVariations,
            l = n.allowedAutoPlacements, c = void 0 === l ? st : l, u = zt(i),
            f = u ? a ? rt : rt.filter((function (t) {
                return zt(t) === u
            })) : ot, d = f.filter((function (t) {
                return c.indexOf(t) >= 0
            }));
        0 === d.length && (d = f);
        var h = d.reduce((function (e, n) {
            return e[n] = Yt(t, {placement: n, boundary: o, rootBoundary: r, padding: s})[ht(n)], e
        }), {});
        return Object.keys(h).sort((function (t, e) {
            return h[t] - h[e]
        }))
    }

    var Vt = {
        name: "flip", enabled: !0, phase: "main", fn: function (t) {
            var e = t.state, n = t.options, i = t.name;
            if (!e.modifiersData[i]._skip) {
                for (var o = n.mainAxis, r = void 0 === o || o, s = n.altAxis, a = void 0 === s || s, l = n.fallbackPlacements, c = n.padding, u = n.boundary, f = n.rootBoundary, d = n.altBoundary, h = n.flipVariations, p = void 0 === h || h, g = n.allowedAutoPlacements, m = e.options.placement, v = ht(m), _ = l || (v !== m && p ? function (t) {
                    if ("auto" === ht(t)) return [];
                    var e = Nt(t);
                    return [It(t), e, It(e)]
                }(m) : [Nt(m)]), b = [m].concat(_).reduce((function (t, n) {
                    return t.concat("auto" === ht(n) ? qt(e, {
                        placement: n,
                        boundary: u,
                        rootBoundary: f,
                        padding: c,
                        flipVariations: p,
                        allowedAutoPlacements: g
                    }) : n)
                }), []), y = e.rects.reference, w = e.rects.popper, E = new Map, T = !0, k = b[0], A = 0; A < b.length; A++) {
                    var L = b[A], O = ht(L), D = "start" === zt(L), x = [tt, et].indexOf(O) >= 0,
                        C = x ? "width" : "height",
                        S = Yt(e, {placement: L, boundary: u, rootBoundary: f, altBoundary: d, padding: c}),
                        j = x ? D ? nt : it : D ? et : tt;
                    y[C] > w[C] && (j = Nt(j));
                    var N = Nt(j), P = [];
                    if (r && P.push(S[O] <= 0), a && P.push(S[j] <= 0, S[N] <= 0), P.every((function (t) {
                        return t
                    }))) {
                        k = L, T = !1;
                        break
                    }
                    E.set(L, P)
                }
                if (T) for (var I = function (t) {
                    var e = b.find((function (e) {
                        var n = E.get(e);
                        if (n) return n.slice(0, t).every((function (t) {
                            return t
                        }))
                    }));
                    if (e) return k = e, "break"
                }, M = p ? 3 : 1; M > 0 && "break" !== I(M); M--) ;
                e.placement !== k && (e.modifiersData[i]._skip = !0, e.placement = k, e.reset = !0)
            }
        }, requiresIfExists: ["offset"], data: {_skip: !1}
    };

    function Xt(t, e, n) {
        return void 0 === n && (n = {x: 0, y: 0}), {
            top: t.top - e.height - n.y,
            right: t.right - e.width + n.x,
            bottom: t.bottom - e.height + n.y,
            left: t.left - e.width - n.x
        }
    }

    function Qt(t) {
        return [tt, nt, et, it].some((function (e) {
            return t[e] >= 0
        }))
    }

    var $t = {
        name: "hide", enabled: !0, phase: "main", requiresIfExists: ["preventOverflow"], fn: function (t) {
            var e = t.state, n = t.name, i = e.rects.reference, o = e.rects.popper, r = e.modifiersData.preventOverflow,
                s = Yt(e, {elementContext: "reference"}), a = Yt(e, {altBoundary: !0}), l = Xt(s, i), c = Xt(a, o, r),
                u = Qt(l), f = Qt(c);
            e.modifiersData[n] = {
                referenceClippingOffsets: l,
                popperEscapeOffsets: c,
                isReferenceHidden: u,
                hasPopperEscaped: f
            }, e.attributes.popper = Object.assign(Object.assign({}, e.attributes.popper), {}, {
                "data-popper-reference-hidden": u,
                "data-popper-escaped": f
            })
        }
    }, Gt = {
        name: "offset", enabled: !0, phase: "main", requires: ["popperOffsets"], fn: function (t) {
            var e = t.state, n = t.options, i = t.name, o = n.offset, r = void 0 === o ? [0, 0] : o,
                s = st.reduce((function (t, n) {
                    return t[n] = function (t, e, n) {
                        var i = ht(t), o = [it, tt].indexOf(i) >= 0 ? -1 : 1,
                            r = "function" == typeof n ? n(Object.assign(Object.assign({}, e), {}, {placement: t})) : n,
                            s = r[0], a = r[1];
                        return s = s || 0, a = (a || 0) * o, [it, nt].indexOf(i) >= 0 ? {x: a, y: s} : {x: s, y: a}
                    }(n, e.rects, r), t
                }), {}), a = s[e.placement], l = a.x, c = a.y;
            null != e.modifiersData.popperOffsets && (e.modifiersData.popperOffsets.x += l, e.modifiersData.popperOffsets.y += c), e.modifiersData[i] = s
        }
    }, Zt = {
        name: "popperOffsets", enabled: !0, phase: "read", fn: function (t) {
            var e = t.state, n = t.name;
            e.modifiersData[n] = Ft({
                reference: e.rects.reference,
                element: e.rects.popper,
                strategy: "absolute",
                placement: e.placement
            })
        }, data: {}
    }, Jt = {
        name: "preventOverflow", enabled: !0, phase: "main", fn: function (t) {
            var e = t.state, n = t.options, i = t.name, o = n.mainAxis, r = void 0 === o || o, s = n.altAxis,
                a = void 0 !== s && s, l = n.boundary, c = n.rootBoundary, u = n.altBoundary, f = n.padding,
                d = n.tether, h = void 0 === d || d, p = n.tetherOffset, g = void 0 === p ? 0 : p,
                m = Yt(e, {boundary: l, rootBoundary: c, padding: f, altBoundary: u}), v = ht(e.placement),
                _ = zt(e.placement), b = !_, y = Et(v), w = "x" === y ? "y" : "x", E = e.modifiersData.popperOffsets,
                T = e.rects.reference, k = e.rects.popper,
                A = "function" == typeof g ? g(Object.assign(Object.assign({}, e.rects), {}, {placement: e.placement})) : g,
                L = {x: 0, y: 0};
            if (E) {
                if (r) {
                    var O = "y" === y ? tt : it, D = "y" === y ? et : nt, x = "y" === y ? "height" : "width", C = E[y],
                        S = E[y] + m[O], j = E[y] - m[D], N = h ? -k[x] / 2 : 0, P = "start" === _ ? T[x] : k[x],
                        I = "start" === _ ? -k[x] : -T[x], M = e.elements.arrow,
                        B = h && M ? pt(M) : {width: 0, height: 0},
                        H = e.modifiersData["arrow#persistent"] ? e.modifiersData["arrow#persistent"].padding : {
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0
                        }, R = H[O], W = H[D], K = Tt(0, T[x], B[x]), U = b ? T[x] / 2 - N - K - R - A : P - K - R - A,
                        z = b ? -T[x] / 2 + N + K + W + A : I + K + W + A, F = e.elements.arrow && wt(e.elements.arrow),
                        Y = F ? "y" === y ? F.clientTop || 0 : F.clientLeft || 0 : 0,
                        q = e.modifiersData.offset ? e.modifiersData.offset[e.placement][y] : 0, V = E[y] + U - q - Y,
                        X = E[y] + z - q, Q = Tt(h ? Math.min(S, V) : S, C, h ? Math.max(j, X) : j);
                    E[y] = Q, L[y] = Q - C
                }
                if (a) {
                    var $ = "x" === y ? tt : it, G = "x" === y ? et : nt, Z = E[w], J = Tt(Z + m[$], Z, Z - m[G]);
                    E[w] = J, L[w] = J - Z
                }
                e.modifiersData[i] = L
            }
        }, requiresIfExists: ["offset"]
    };

    function te(t, e, n) {
        void 0 === n && (n = !1);
        var i, o, r = _t(e), s = Mt(t), a = ft(e), l = {scrollLeft: 0, scrollTop: 0}, c = {x: 0, y: 0};
        return (a || !a && !n) && (("body" !== lt(e) || Rt(r)) && (l = (i = e) !== ct(i) && ft(i) ? {
            scrollLeft: (o = i).scrollLeft,
            scrollTop: o.scrollTop
        } : Bt(i)), ft(e) ? ((c = Mt(e)).x += e.clientLeft, c.y += e.clientTop) : r && (c.x = Ht(r))), {
            x: s.left + l.scrollLeft - c.x,
            y: s.top + l.scrollTop - c.y,
            width: s.width,
            height: s.height
        }
    }

    var ee = {placement: "bottom", modifiers: [], strategy: "absolute"};

    function ne() {
        for (var t = arguments.length, e = new Array(t), n = 0; n < t; n++) e[n] = arguments[n];
        return !e.some((function (t) {
            return !(t && "function" == typeof t.getBoundingClientRect)
        }))
    }

    function ie(t) {
        void 0 === t && (t = {});
        var e = t, n = e.defaultModifiers, i = void 0 === n ? [] : n, o = e.defaultOptions, r = void 0 === o ? ee : o;
        return function (t, e, n) {
            void 0 === n && (n = r);
            var o, s, a = {
                placement: "bottom",
                orderedModifiers: [],
                options: Object.assign(Object.assign({}, ee), r),
                modifiersData: {},
                elements: {reference: t, popper: e},
                attributes: {},
                styles: {}
            }, l = [], c = !1, u = {
                state: a, setOptions: function (n) {
                    f(), a.options = Object.assign(Object.assign(Object.assign({}, r), a.options), n), a.scrollParents = {
                        reference: ut(t) ? Wt(t) : t.contextElement ? Wt(t.contextElement) : [],
                        popper: Wt(e)
                    };
                    var o, s, c = function (t) {
                        var e = function (t) {
                            var e = new Map, n = new Set, i = [];
                            return t.forEach((function (t) {
                                e.set(t.name, t)
                            })), t.forEach((function (t) {
                                n.has(t.name) || function t(o) {
                                    n.add(o.name), [].concat(o.requires || [], o.requiresIfExists || []).forEach((function (i) {
                                        if (!n.has(i)) {
                                            var o = e.get(i);
                                            o && t(o)
                                        }
                                    })), i.push(o)
                                }(t)
                            })), i
                        }(t);
                        return at.reduce((function (t, n) {
                            return t.concat(e.filter((function (t) {
                                return t.phase === n
                            })))
                        }), [])
                    }((o = [].concat(i, a.options.modifiers), s = o.reduce((function (t, e) {
                        var n = t[e.name];
                        return t[e.name] = n ? Object.assign(Object.assign(Object.assign({}, n), e), {}, {
                            options: Object.assign(Object.assign({}, n.options), e.options),
                            data: Object.assign(Object.assign({}, n.data), e.data)
                        }) : e, t
                    }), {}), Object.keys(s).map((function (t) {
                        return s[t]
                    }))));
                    return a.orderedModifiers = c.filter((function (t) {
                        return t.enabled
                    })), a.orderedModifiers.forEach((function (t) {
                        var e = t.name, n = t.options, i = void 0 === n ? {} : n, o = t.effect;
                        if ("function" == typeof o) {
                            var r = o({state: a, name: e, instance: u, options: i});
                            l.push(r || function () {
                            })
                        }
                    })), u.update()
                }, forceUpdate: function () {
                    if (!c) {
                        var t = a.elements, e = t.reference, n = t.popper;
                        if (ne(e, n)) {
                            a.rects = {
                                reference: te(e, wt(n), "fixed" === a.options.strategy),
                                popper: pt(n)
                            }, a.reset = !1, a.placement = a.options.placement, a.orderedModifiers.forEach((function (t) {
                                return a.modifiersData[t.name] = Object.assign({}, t.data)
                            }));
                            for (var i = 0; i < a.orderedModifiers.length; i++) if (!0 !== a.reset) {
                                var o = a.orderedModifiers[i], r = o.fn, s = o.options, l = void 0 === s ? {} : s,
                                    f = o.name;
                                "function" == typeof r && (a = r({state: a, options: l, name: f, instance: u}) || a)
                            } else a.reset = !1, i = -1
                        }
                    }
                }, update: (o = function () {
                    return new Promise((function (t) {
                        u.forceUpdate(), t(a)
                    }))
                }, function () {
                    return s || (s = new Promise((function (t) {
                        Promise.resolve().then((function () {
                            s = void 0, t(o())
                        }))
                    }))), s
                }), destroy: function () {
                    f(), c = !0
                }
            };
            if (!ne(t, e)) return u;

            function f() {
                l.forEach((function (t) {
                    return t()
                })), l = []
            }

            return u.setOptions(n).then((function (t) {
                !c && n.onFirstUpdate && n.onFirstUpdate(t)
            })), u
        }
    }

    var oe = ie(), re = ie({defaultModifiers: [St, Zt, xt, dt]}),
        se = ie({defaultModifiers: [St, Zt, xt, dt, Gt, Vt, Jt, Lt, $t]}), ae = Object.freeze({
            __proto__: null,
            popperGenerator: ie,
            detectOverflow: Yt,
            createPopperBase: oe,
            createPopper: se,
            createPopperLite: re,
            top: tt,
            bottom: et,
            right: nt,
            left: it,
            auto: "auto",
            basePlacements: ot,
            start: "start",
            end: "end",
            clippingParents: "clippingParents",
            viewport: "viewport",
            popper: "popper",
            reference: "reference",
            variationPlacements: rt,
            placements: st,
            beforeRead: "beforeRead",
            read: "read",
            afterRead: "afterRead",
            beforeMain: "beforeMain",
            main: "main",
            afterMain: "afterMain",
            beforeWrite: "beforeWrite",
            write: "write",
            afterWrite: "afterWrite",
            modifierPhases: at,
            applyStyles: dt,
            arrow: Lt,
            computeStyles: xt,
            eventListeners: St,
            flip: Vt,
            hide: $t,
            offset: Gt,
            popperOffsets: Zt,
            preventOverflow: Jt
        }), le = new RegExp("ArrowUp|ArrowDown|Escape"), ce = b ? "top-end" : "top-start", ue = b ? "top-start" : "top-end",
        fe = b ? "bottom-end" : "bottom-start", de = b ? "bottom-start" : "bottom-end",
        he = b ? "left-start" : "right-start", pe = b ? "right-start" : "left-start", ge = {
            offset: [0, 2],
            flip: !0,
            boundary: "clippingParents",
            reference: "toggle",
            display: "dynamic",
            popperConfig: null
        }, me = {
            offset: "(array|string|function)",
            flip: "boolean",
            boundary: "(string|element)",
            reference: "(string|element|object)",
            display: "string",
            popperConfig: "(null|object|function)"
        }, ve = function (t) {
            function o(e, n) {
                var i;
                return (i = t.call(this, e) || this)._popper = null, i._config = i._getConfig(n), i._menu = i._getMenuElement(), i._inNavbar = i._detectNavbar(), i._addEventListeners(), i
            }

            i(o, t);
            var r = o.prototype;
            return r.toggle = function () {
                if (!this._element.disabled && !this._element.classList.contains("disabled")) {
                    var t = this._element.classList.contains("show");
                    o.clearMenus(), t || this.show()
                }
            }, r.show = function () {
                if (!(this._element.disabled || this._element.classList.contains("disabled") || this._menu.classList.contains("show"))) {
                    var t = o.getParentFromElement(this._element), e = {relatedTarget: this._element};
                    if (!B.trigger(this._element, "show.bs.dropdown", e).defaultPrevented) {
                        if (this._inNavbar) z.setDataAttribute(this._menu, "popper", "none"); else {
                            if (void 0 === ae) throw new TypeError("Bootstrap's dropdowns require Popper (https://popper.js.org)");
                            var n = this._element;
                            "parent" === this._config.reference ? n = t : d(this._config.reference) ? (n = this._config.reference, void 0 !== this._config.reference.jquery && (n = this._config.reference[0])) : "object" == typeof this._config.reference && (n = this._config.reference);
                            var i = this._getPopperConfig(), r = i.modifiers.find((function (t) {
                                return "applyStyles" === t.name && !1 === t.enabled
                            }));
                            this._popper = se(n, this._menu, i), r && z.setDataAttribute(this._menu, "popper", "static")
                        }
                        var s;
                        "ontouchstart" in document.documentElement && !t.closest(".navbar-nav") && (s = []).concat.apply(s, document.body.children).forEach((function (t) {
                            return B.on(t, "mouseover", null, (function () {
                            }))
                        })), this._element.focus(), this._element.setAttribute("aria-expanded", !0), this._menu.classList.toggle("show"), this._element.classList.toggle("show"), B.trigger(this._element, "shown.bs.dropdown", e)
                    }
                }
            }, r.hide = function () {
                if (!this._element.disabled && !this._element.classList.contains("disabled") && this._menu.classList.contains("show")) {
                    var t = {relatedTarget: this._element};
                    B.trigger(this._element, "hide.bs.dropdown", t).defaultPrevented || (this._popper && this._popper.destroy(), this._menu.classList.toggle("show"), this._element.classList.toggle("show"), z.removeDataAttribute(this._menu, "popper"), B.trigger(this._element, "hidden.bs.dropdown", t))
                }
            }, r.dispose = function () {
                t.prototype.dispose.call(this), B.off(this._element, ".bs.dropdown"), this._menu = null, this._popper && (this._popper.destroy(), this._popper = null)
            }, r.update = function () {
                this._inNavbar = this._detectNavbar(), this._popper && this._popper.update()
            }, r._addEventListeners = function () {
                var t = this;
                B.on(this._element, "click.bs.dropdown", (function (e) {
                    e.preventDefault(), e.stopPropagation(), t.toggle()
                }))
            }, r._getConfig = function (t) {
                if (t = n({}, this.constructor.Default, z.getDataAttributes(this._element), t), p("dropdown", t, this.constructor.DefaultType), "object" == typeof t.reference && !d(t.reference) && "function" != typeof t.reference.getBoundingClientRect) throw new TypeError("dropdown".toUpperCase() + ': Option "reference" provided type "object" without a required "getBoundingClientRect" method.');
                return t
            }, r._getMenuElement = function () {
                return function (t, e) {
                    for (var n = t.nextElementSibling; n;) {
                        if (n.matches(e)) return [n];
                        n = n.nextElementSibling
                    }
                    return []
                }(this._element, ".dropdown-menu")[0]
            }, r._getPlacement = function () {
                var t = this._element.parentNode;
                if (t.classList.contains("dropend")) return he;
                if (t.classList.contains("dropstart")) return pe;
                var e = "end" === getComputedStyle(this._menu).getPropertyValue("--bs-position").trim();
                return t.classList.contains("dropup") ? e ? ue : ce : e ? de : fe
            }, r._detectNavbar = function () {
                return null !== this._element.closest(".navbar")
            }, r._getOffset = function () {
                var t = this, e = this._config.offset;
                return "string" == typeof e ? e.split(",").map((function (t) {
                    return Number.parseInt(t, 10)
                })) : "function" == typeof e ? function (n) {
                    return e(n, t._element)
                } : e
            }, r._getPopperConfig = function () {
                var t = {
                    placement: this._getPlacement(),
                    modifiers: [{
                        name: "preventOverflow",
                        options: {altBoundary: this._config.flip, boundary: this._config.boundary}
                    }, {name: "offset", options: {offset: this._getOffset()}}]
                };
                return "static" === this._config.display && (t.modifiers = [{
                    name: "applyStyles",
                    enabled: !1
                }]), n({}, t, "function" == typeof this._config.popperConfig ? this._config.popperConfig(t) : this._config.popperConfig)
            }, o.dropdownInterface = function (t, e) {
                var n = T(t, "bs.dropdown");
                if (n || (n = new o(t, "object" == typeof e ? e : null)), "string" == typeof e) {
                    if (void 0 === n[e]) throw new TypeError('No method named "' + e + '"');
                    n[e]()
                }
            }, o.jQueryInterface = function (t) {
                return this.each((function () {
                    o.dropdownInterface(this, t)
                }))
            }, o.clearMenus = function (t) {
                if (!t || 2 !== t.button && ("keyup" !== t.type || "Tab" === t.key)) for (var e = F('[data-bs-toggle="dropdown"]'), n = 0, i = e.length; n < i; n++) {
                    var o = T(e[n], "bs.dropdown"), r = {relatedTarget: e[n]};
                    if (t && "click" === t.type && (r.clickEvent = t), o) {
                        var s, a = o._menu;
                        if (e[n].classList.contains("show") && !(t && ("click" === t.type && /input|textarea/i.test(t.target.tagName) || "keyup" === t.type && "Tab" === t.key) && a.contains(t.target) || B.trigger(e[n], "hide.bs.dropdown", r).defaultPrevented)) "ontouchstart" in document.documentElement && (s = []).concat.apply(s, document.body.children).forEach((function (t) {
                            return B.off(t, "mouseover", null, (function () {
                            }))
                        })), e[n].setAttribute("aria-expanded", "false"), o._popper && o._popper.destroy(), a.classList.remove("show"), e[n].classList.remove("show"), z.removeDataAttribute(a, "popper"), B.trigger(e[n], "hidden.bs.dropdown", r)
                    }
                }
            }, o.getParentFromElement = function (t) {
                return c(t) || t.parentNode
            }, o.dataApiKeydownHandler = function (t) {
                if (!(/input|textarea/i.test(t.target.tagName) ? "Space" === t.key || "Escape" !== t.key && ("ArrowDown" !== t.key && "ArrowUp" !== t.key || t.target.closest(".dropdown-menu")) : !le.test(t.key)) && (t.preventDefault(), t.stopPropagation(), !this.disabled && !this.classList.contains("disabled"))) {
                    var e = o.getParentFromElement(this), n = this.classList.contains("show");
                    if ("Escape" === t.key) return (this.matches('[data-bs-toggle="dropdown"]') ? this : V(this, '[data-bs-toggle="dropdown"]')[0]).focus(), void o.clearMenus();
                    if (n || "ArrowUp" !== t.key && "ArrowDown" !== t.key) if (n && "Space" !== t.key) {
                        var i = F(".dropdown-menu .dropdown-item:not(.disabled):not(:disabled)", e).filter(g);
                        if (i.length) {
                            var r = i.indexOf(t.target);
                            "ArrowUp" === t.key && r > 0 && r--, "ArrowDown" === t.key && r < i.length - 1 && r++, i[r = -1 === r ? 0 : r].focus()
                        }
                    } else o.clearMenus(); else (this.matches('[data-bs-toggle="dropdown"]') ? this : V(this, '[data-bs-toggle="dropdown"]')[0]).click()
                }
            }, e(o, null, [{
                key: "Default", get: function () {
                    return ge
                }
            }, {
                key: "DefaultType", get: function () {
                    return me
                }
            }, {
                key: "DATA_KEY", get: function () {
                    return "bs.dropdown"
                }
            }]), o
        }(H);
    B.on(document, "keydown.bs.dropdown.data-api", '[data-bs-toggle="dropdown"]', ve.dataApiKeydownHandler), B.on(document, "keydown.bs.dropdown.data-api", ".dropdown-menu", ve.dataApiKeydownHandler), B.on(document, "click.bs.dropdown.data-api", ve.clearMenus), B.on(document, "keyup.bs.dropdown.data-api", ve.clearMenus), B.on(document, "click.bs.dropdown.data-api", '[data-bs-toggle="dropdown"]', (function (t) {
        t.preventDefault(), t.stopPropagation(), ve.dropdownInterface(this, "toggle")
    })), B.on(document, "click.bs.dropdown.data-api", ".dropdown form", (function (t) {
        return t.stopPropagation()
    })), y("dropdown", ve);
    var _e = {backdrop: !0, keyboard: !0, focus: !0},
        be = {backdrop: "(boolean|string)", keyboard: "boolean", focus: "boolean"}, ye = function (t) {
            function o(e, n) {
                var i;
                return (i = t.call(this, e) || this)._config = i._getConfig(n), i._dialog = Y(".modal-dialog", e), i._backdrop = null, i._isShown = !1, i._isBodyOverflowing = !1, i._ignoreBackdropClick = !1, i._isTransitioning = !1, i._scrollbarWidth = 0, i
            }

            i(o, t);
            var r = o.prototype;
            return r.toggle = function (t) {
                return this._isShown ? this.hide() : this.show(t)
            }, r.show = function (t) {
                var e = this;
                if (!this._isShown && !this._isTransitioning) {
                    this._element.classList.contains("fade") && (this._isTransitioning = !0);
                    var n = B.trigger(this._element, "show.bs.modal", {relatedTarget: t});
                    this._isShown || n.defaultPrevented || (this._isShown = !0, this._checkScrollbar(), this._setScrollbar(), this._adjustDialog(), this._setEscapeEvent(), this._setResizeEvent(), B.on(this._element, "click.dismiss.bs.modal", '[data-bs-dismiss="modal"]', (function (t) {
                        return e.hide(t)
                    })), B.on(this._dialog, "mousedown.dismiss.bs.modal", (function () {
                        B.one(e._element, "mouseup.dismiss.bs.modal", (function (t) {
                            t.target === e._element && (e._ignoreBackdropClick = !0)
                        }))
                    })), this._showBackdrop((function () {
                        return e._showElement(t)
                    })))
                }
            }, r.hide = function (t) {
                var e = this;
                if (t && t.preventDefault(), this._isShown && !this._isTransitioning && !B.trigger(this._element, "hide.bs.modal").defaultPrevented) {
                    this._isShown = !1;
                    var n = this._element.classList.contains("fade");
                    if (n && (this._isTransitioning = !0), this._setEscapeEvent(), this._setResizeEvent(), B.off(document, "focusin.bs.modal"), this._element.classList.remove("show"), B.off(this._element, "click.dismiss.bs.modal"), B.off(this._dialog, "mousedown.dismiss.bs.modal"), n) {
                        var i = u(this._element);
                        B.one(this._element, "transitionend", (function (t) {
                            return e._hideModal(t)
                        })), h(this._element, i)
                    } else this._hideModal()
                }
            }, r.dispose = function () {
                [window, this._element, this._dialog].forEach((function (t) {
                    return B.off(t, ".bs.modal")
                })), t.prototype.dispose.call(this), B.off(document, "focusin.bs.modal"), this._config = null, this._dialog = null, this._backdrop = null, this._isShown = null, this._isBodyOverflowing = null, this._ignoreBackdropClick = null, this._isTransitioning = null, this._scrollbarWidth = null
            }, r.handleUpdate = function () {
                this._adjustDialog()
            }, r._getConfig = function (t) {
                return t = n({}, _e, t), p("modal", t, be), t
            }, r._showElement = function (t) {
                var e = this, n = this._element.classList.contains("fade"), i = Y(".modal-body", this._dialog);
                this._element.parentNode && this._element.parentNode.nodeType === Node.ELEMENT_NODE || document.body.appendChild(this._element), this._element.style.display = "block", this._element.removeAttribute("aria-hidden"), this._element.setAttribute("aria-modal", !0), this._element.setAttribute("role", "dialog"), this._element.scrollTop = 0, i && (i.scrollTop = 0), n && v(this._element), this._element.classList.add("show"), this._config.focus && this._enforceFocus();
                var o = function () {
                    e._config.focus && e._element.focus(), e._isTransitioning = !1, B.trigger(e._element, "shown.bs.modal", {relatedTarget: t})
                };
                if (n) {
                    var r = u(this._dialog);
                    B.one(this._dialog, "transitionend", o), h(this._dialog, r)
                } else o()
            }, r._enforceFocus = function () {
                var t = this;
                B.off(document, "focusin.bs.modal"), B.on(document, "focusin.bs.modal", (function (e) {
                    document === e.target || t._element === e.target || t._element.contains(e.target) || t._element.focus()
                }))
            }, r._setEscapeEvent = function () {
                var t = this;
                this._isShown ? B.on(this._element, "keydown.dismiss.bs.modal", (function (e) {
                    t._config.keyboard && "Escape" === e.key ? (e.preventDefault(), t.hide()) : t._config.keyboard || "Escape" !== e.key || t._triggerBackdropTransition()
                })) : B.off(this._element, "keydown.dismiss.bs.modal")
            }, r._setResizeEvent = function () {
                var t = this;
                this._isShown ? B.on(window, "resize.bs.modal", (function () {
                    return t._adjustDialog()
                })) : B.off(window, "resize.bs.modal")
            }, r._hideModal = function () {
                var t = this;
                this._element.style.display = "none", this._element.setAttribute("aria-hidden", !0), this._element.removeAttribute("aria-modal"), this._element.removeAttribute("role"), this._isTransitioning = !1, this._showBackdrop((function () {
                    document.body.classList.remove("modal-open"), t._resetAdjustments(), t._resetScrollbar(), B.trigger(t._element, "hidden.bs.modal")
                }))
            }, r._removeBackdrop = function () {
                this._backdrop.parentNode.removeChild(this._backdrop), this._backdrop = null
            }, r._showBackdrop = function (t) {
                var e = this, n = this._element.classList.contains("fade") ? "fade" : "";
                if (this._isShown && this._config.backdrop) {
                    if (this._backdrop = document.createElement("div"), this._backdrop.className = "modal-backdrop", n && this._backdrop.classList.add(n), document.body.appendChild(this._backdrop), B.on(this._element, "click.dismiss.bs.modal", (function (t) {
                        e._ignoreBackdropClick ? e._ignoreBackdropClick = !1 : t.target === t.currentTarget && ("static" === e._config.backdrop ? e._triggerBackdropTransition() : e.hide())
                    })), n && v(this._backdrop), this._backdrop.classList.add("show"), !n) return void t();
                    var i = u(this._backdrop);
                    B.one(this._backdrop, "transitionend", t), h(this._backdrop, i)
                } else if (!this._isShown && this._backdrop) {
                    this._backdrop.classList.remove("show");
                    var o = function () {
                        e._removeBackdrop(), t()
                    };
                    if (this._element.classList.contains("fade")) {
                        var r = u(this._backdrop);
                        B.one(this._backdrop, "transitionend", o), h(this._backdrop, r)
                    } else o()
                } else t()
            }, r._triggerBackdropTransition = function () {
                var t = this;
                if (!B.trigger(this._element, "hidePrevented.bs.modal").defaultPrevented) {
                    var e = this._element.scrollHeight > document.documentElement.clientHeight;
                    e || (this._element.style.overflowY = "hidden"), this._element.classList.add("modal-static");
                    var n = u(this._dialog);
                    B.off(this._element, "transitionend"), B.one(this._element, "transitionend", (function () {
                        t._element.classList.remove("modal-static"), e || (B.one(t._element, "transitionend", (function () {
                            t._element.style.overflowY = ""
                        })), h(t._element, n))
                    })), h(this._element, n), this._element.focus()
                }
            }, r._adjustDialog = function () {
                var t = this._element.scrollHeight > document.documentElement.clientHeight;
                (!this._isBodyOverflowing && t && !b || this._isBodyOverflowing && !t && b) && (this._element.style.paddingLeft = this._scrollbarWidth + "px"), (this._isBodyOverflowing && !t && !b || !this._isBodyOverflowing && t && b) && (this._element.style.paddingRight = this._scrollbarWidth + "px")
            }, r._resetAdjustments = function () {
                this._element.style.paddingLeft = "", this._element.style.paddingRight = ""
            }, r._checkScrollbar = function () {
                var t = document.body.getBoundingClientRect();
                this._isBodyOverflowing = Math.round(t.left + t.right) < window.innerWidth, this._scrollbarWidth = this._getScrollbarWidth()
            }, r._setScrollbar = function () {
                var t = this;
                this._isBodyOverflowing && (this._setElementAttributes(".fixed-top, .fixed-bottom, .is-fixed, .sticky-top", "paddingRight", (function (e) {
                    return e + t._scrollbarWidth
                })), this._setElementAttributes(".sticky-top", "marginRight", (function (e) {
                    return e - t._scrollbarWidth
                })), this._setElementAttributes("body", "paddingRight", (function (e) {
                    return e + t._scrollbarWidth
                }))), document.body.classList.add("modal-open")
            }, r._setElementAttributes = function (t, e, n) {
                F(t).forEach((function (t) {
                    var i = t.style[e], o = window.getComputedStyle(t)[e];
                    z.setDataAttribute(t, e, i), t.style[e] = n(Number.parseFloat(o)) + "px"
                }))
            }, r._resetScrollbar = function () {
                this._resetElementAttributes(".fixed-top, .fixed-bottom, .is-fixed, .sticky-top", "paddingRight"), this._resetElementAttributes(".sticky-top", "marginRight"), this._resetElementAttributes("body", "paddingRight")
            }, r._resetElementAttributes = function (t, e) {
                F(t).forEach((function (t) {
                    var n = z.getDataAttribute(t, e);
                    void 0 === n && t === document.body ? t.style[e] = "" : (z.removeDataAttribute(t, e), t.style[e] = n)
                }))
            }, r._getScrollbarWidth = function () {
                var t = document.createElement("div");
                t.className = "modal-scrollbar-measure", document.body.appendChild(t);
                var e = t.getBoundingClientRect().width - t.clientWidth;
                return document.body.removeChild(t), e
            }, o.jQueryInterface = function (t, e) {
                return this.each((function () {
                    var i = T(this, "bs.modal"),
                        r = n({}, _e, z.getDataAttributes(this), "object" == typeof t && t ? t : {});
                    if (i || (i = new o(this, r)), "string" == typeof t) {
                        if (void 0 === i[t]) throw new TypeError('No method named "' + t + '"');
                        i[t](e)
                    }
                }))
            }, e(o, null, [{
                key: "Default", get: function () {
                    return _e
                }
            }, {
                key: "DATA_KEY", get: function () {
                    return "bs.modal"
                }
            }]), o
        }(H);
    B.on(document, "click.bs.modal.data-api", '[data-bs-toggle="modal"]', (function (t) {
        var e = this, i = c(this);
        "A" !== this.tagName && "AREA" !== this.tagName || t.preventDefault(), B.one(i, "show.bs.modal", (function (t) {
            t.defaultPrevented || B.one(i, "hidden.bs.modal", (function () {
                g(e) && e.focus()
            }))
        }));
        var o = T(i, "bs.modal");
        if (!o) {
            var r = n({}, z.getDataAttributes(i), z.getDataAttributes(this));
            o = new ye(i, r)
        }
        o.toggle(this)
    })), y("modal", ye);
    var we = new Set(["background", "cite", "href", "itemtype", "longdesc", "poster", "src", "xlink:href"]),
        Ee = /^(?:(?:https?|mailto|ftp|tel|file):|[^#&/:?]*(?:[#/?]|$))/gi,
        Te = /^data:(?:image\/(?:bmp|gif|jpeg|jpg|png|tiff|webp)|video\/(?:mpeg|mp4|ogg|webm)|audio\/(?:mp3|oga|ogg|opus));base64,[\d+/a-z]+=*$/i;

    function ke(t, e, n) {
        var i;
        if (!t.length) return t;
        if (n && "function" == typeof n) return n(t);
        for (var o = (new window.DOMParser).parseFromString(t, "text/html"), r = Object.keys(e), s = (i = []).concat.apply(i, o.body.querySelectorAll("*")), a = function (t, n) {
            var i, o = s[t], a = o.nodeName.toLowerCase();
            if (!r.includes(a)) return o.parentNode.removeChild(o), "continue";
            var l = (i = []).concat.apply(i, o.attributes), c = [].concat(e["*"] || [], e[a] || []);
            l.forEach((function (t) {
                (function (t, e) {
                    var n = t.nodeName.toLowerCase();
                    if (e.includes(n)) return !we.has(n) || Boolean(Ee.test(t.nodeValue) || Te.test(t.nodeValue));
                    for (var i = e.filter((function (t) {
                        return t instanceof RegExp
                    })), o = 0, r = i.length; o < r; o++) if (i[o].test(n)) return !0;
                    return !1
                })(t, c) || o.removeAttribute(t.nodeName)
            }))
        }, l = 0, c = s.length; l < c; l++) a(l);
        return o.body.innerHTML
    }

    var Ae = new RegExp("(^|\\s)bs-tooltip\\S+", "g"), Le = new Set(["sanitize", "allowList", "sanitizeFn"]), Oe = {
            animation: "boolean",
            template: "string",
            title: "(string|element|function)",
            trigger: "string",
            delay: "(number|object)",
            html: "boolean",
            selector: "(string|boolean)",
            placement: "(string|function)",
            offset: "(array|string|function)",
            container: "(string|element|boolean)",
            fallbackPlacements: "array",
            boundary: "(string|element)",
            customClass: "(string|function)",
            sanitize: "boolean",
            sanitizeFn: "(null|function)",
            allowList: "object",
            popperConfig: "(null|object|function)"
        }, De = {AUTO: "auto", TOP: "top", RIGHT: b ? "left" : "right", BOTTOM: "bottom", LEFT: b ? "right" : "left"},
        xe = {
            animation: !0,
            template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
            trigger: "hover focus",
            title: "",
            delay: 0,
            html: !1,
            selector: !1,
            placement: "top",
            offset: [0, 0],
            container: !1,
            fallbackPlacements: ["top", "right", "bottom", "left"],
            boundary: "clippingParents",
            customClass: "",
            sanitize: !0,
            sanitizeFn: null,
            allowList: {
                "*": ["class", "dir", "id", "lang", "role", /^aria-[\w-]*$/i],
                a: ["target", "href", "title", "rel"],
                area: [],
                b: [],
                br: [],
                col: [],
                code: [],
                div: [],
                em: [],
                hr: [],
                h1: [],
                h2: [],
                h3: [],
                h4: [],
                h5: [],
                h6: [],
                i: [],
                img: ["src", "srcset", "alt", "title", "width", "height"],
                li: [],
                ol: [],
                p: [],
                pre: [],
                s: [],
                small: [],
                span: [],
                sub: [],
                sup: [],
                strong: [],
                u: [],
                ul: []
            },
            popperConfig: null
        }, Ce = {
            HIDE: "hide.bs.tooltip",
            HIDDEN: "hidden.bs.tooltip",
            SHOW: "show.bs.tooltip",
            SHOWN: "shown.bs.tooltip",
            INSERTED: "inserted.bs.tooltip",
            CLICK: "click.bs.tooltip",
            FOCUSIN: "focusin.bs.tooltip",
            FOCUSOUT: "focusout.bs.tooltip",
            MOUSEENTER: "mouseenter.bs.tooltip",
            MOUSELEAVE: "mouseleave.bs.tooltip"
        }, Se = function (t) {
            function o(e, n) {
                var i;
                if (void 0 === ae) throw new TypeError("Bootstrap's tooltips require Popper (https://popper.js.org)");
                return (i = t.call(this, e) || this)._isEnabled = !0, i._timeout = 0, i._hoverState = "", i._activeTrigger = {}, i._popper = null, i.config = i._getConfig(n), i.tip = null, i._setListeners(), i
            }

            i(o, t);
            var r = o.prototype;
            return r.enable = function () {
                this._isEnabled = !0
            }, r.disable = function () {
                this._isEnabled = !1
            }, r.toggleEnabled = function () {
                this._isEnabled = !this._isEnabled
            }, r.toggle = function (t) {
                if (this._isEnabled) if (t) {
                    var e = this._initializeOnDelegatedTarget(t);
                    e._activeTrigger.click = !e._activeTrigger.click, e._isWithActiveTrigger() ? e._enter(null, e) : e._leave(null, e)
                } else {
                    if (this.getTipElement().classList.contains("show")) return void this._leave(null, this);
                    this._enter(null, this)
                }
            }, r.dispose = function () {
                clearTimeout(this._timeout), B.off(this._element, this.constructor.EVENT_KEY), B.off(this._element.closest(".modal"), "hide.bs.modal", this._hideModalHandler), this.tip && this.tip.parentNode && this.tip.parentNode.removeChild(this.tip), this._isEnabled = null, this._timeout = null, this._hoverState = null, this._activeTrigger = null, this._popper && this._popper.destroy(), this._popper = null, this.config = null, this.tip = null, t.prototype.dispose.call(this)
            }, r.show = function () {
                var t = this;
                if ("none" === this._element.style.display) throw new Error("Please use show on visible elements");
                if (this.isWithContent() && this._isEnabled) {
                    var e = B.trigger(this._element, this.constructor.Event.SHOW), n = function t(e) {
                            if (!document.documentElement.attachShadow) return null;
                            if ("function" == typeof e.getRootNode) {
                                var n = e.getRootNode();
                                return n instanceof ShadowRoot ? n : null
                            }
                            return e instanceof ShadowRoot ? e : e.parentNode ? t(e.parentNode) : null
                        }(this._element),
                        i = null === n ? this._element.ownerDocument.documentElement.contains(this._element) : n.contains(this._element);
                    if (!e.defaultPrevented && i) {
                        var o = this.getTipElement(), r = s(this.constructor.NAME);
                        o.setAttribute("id", r), this._element.setAttribute("aria-describedby", r), this.setContent(), this.config.animation && o.classList.add("fade");
                        var a = "function" == typeof this.config.placement ? this.config.placement.call(this, o, this._element) : this.config.placement,
                            l = this._getAttachment(a);
                        this._addAttachmentClass(l);
                        var c = this._getContainer();
                        E(o, this.constructor.DATA_KEY, this), this._element.ownerDocument.documentElement.contains(this.tip) || c.appendChild(o), B.trigger(this._element, this.constructor.Event.INSERTED), this._popper = se(this._element, o, this._getPopperConfig(l)), o.classList.add("show");
                        var f, d,
                            p = "function" == typeof this.config.customClass ? this.config.customClass() : this.config.customClass;
                        p && (f = o.classList).add.apply(f, p.split(" ")), "ontouchstart" in document.documentElement && (d = []).concat.apply(d, document.body.children).forEach((function (t) {
                            B.on(t, "mouseover", (function () {
                            }))
                        }));
                        var g = function () {
                            var e = t._hoverState;
                            t._hoverState = null, B.trigger(t._element, t.constructor.Event.SHOWN), "out" === e && t._leave(null, t)
                        };
                        if (this.tip.classList.contains("fade")) {
                            var m = u(this.tip);
                            B.one(this.tip, "transitionend", g), h(this.tip, m)
                        } else g()
                    }
                }
            }, r.hide = function () {
                var t = this;
                if (this._popper) {
                    var e = this.getTipElement(), n = function () {
                        "show" !== t._hoverState && e.parentNode && e.parentNode.removeChild(e), t._cleanTipClass(), t._element.removeAttribute("aria-describedby"), B.trigger(t._element, t.constructor.Event.HIDDEN), t._popper && (t._popper.destroy(), t._popper = null)
                    };
                    if (!B.trigger(this._element, this.constructor.Event.HIDE).defaultPrevented) {
                        var i;
                        if (e.classList.remove("show"), "ontouchstart" in document.documentElement && (i = []).concat.apply(i, document.body.children).forEach((function (t) {
                            return B.off(t, "mouseover", m)
                        })), this._activeTrigger.click = !1, this._activeTrigger.focus = !1, this._activeTrigger.hover = !1, this.tip.classList.contains("fade")) {
                            var o = u(e);
                            B.one(e, "transitionend", n), h(e, o)
                        } else n();
                        this._hoverState = ""
                    }
                }
            }, r.update = function () {
                null !== this._popper && this._popper.update()
            }, r.isWithContent = function () {
                return Boolean(this.getTitle())
            }, r.getTipElement = function () {
                if (this.tip) return this.tip;
                var t = document.createElement("div");
                return t.innerHTML = this.config.template, this.tip = t.children[0], this.tip
            }, r.setContent = function () {
                var t = this.getTipElement();
                this.setElementContent(Y(".tooltip-inner", t), this.getTitle()), t.classList.remove("fade", "show")
            }, r.setElementContent = function (t, e) {
                if (null !== t) return "object" == typeof e && d(e) ? (e.jquery && (e = e[0]), void (this.config.html ? e.parentNode !== t && (t.innerHTML = "", t.appendChild(e)) : t.textContent = e.textContent)) : void (this.config.html ? (this.config.sanitize && (e = ke(e, this.config.allowList, this.config.sanitizeFn)), t.innerHTML = e) : t.textContent = e)
            }, r.getTitle = function () {
                var t = this._element.getAttribute("data-bs-original-title");
                return t || (t = "function" == typeof this.config.title ? this.config.title.call(this._element) : this.config.title), t
            }, r.updateAttachment = function (t) {
                return "right" === t ? "end" : "left" === t ? "start" : t
            }, r._initializeOnDelegatedTarget = function (t, e) {
                var n = this.constructor.DATA_KEY;
                return (e = e || T(t.delegateTarget, n)) || (e = new this.constructor(t.delegateTarget, this._getDelegateConfig()), E(t.delegateTarget, n, e)), e
            }, r._getOffset = function () {
                var t = this, e = this.config.offset;
                return "string" == typeof e ? e.split(",").map((function (t) {
                    return Number.parseInt(t, 10)
                })) : "function" == typeof e ? function (n) {
                    return e(n, t._element)
                } : e
            }, r._getPopperConfig = function (t) {
                var e = this, i = {
                    placement: t,
                    modifiers: [{
                        name: "flip",
                        options: {altBoundary: !0, fallbackPlacements: this.config.fallbackPlacements}
                    }, {name: "offset", options: {offset: this._getOffset()}}, {
                        name: "preventOverflow",
                        options: {boundary: this.config.boundary}
                    }, {name: "arrow", options: {element: "." + this.constructor.NAME + "-arrow"}}, {
                        name: "onChange",
                        enabled: !0,
                        phase: "afterWrite",
                        fn: function (t) {
                            return e._handlePopperPlacementChange(t)
                        }
                    }],
                    onFirstUpdate: function (t) {
                        t.options.placement !== t.placement && e._handlePopperPlacementChange(t)
                    }
                };
                return n({}, i, "function" == typeof this.config.popperConfig ? this.config.popperConfig(i) : this.config.popperConfig)
            }, r._addAttachmentClass = function (t) {
                this.getTipElement().classList.add("bs-tooltip-" + this.updateAttachment(t))
            }, r._getContainer = function () {
                return !1 === this.config.container ? document.body : d(this.config.container) ? this.config.container : Y(this.config.container)
            }, r._getAttachment = function (t) {
                return De[t.toUpperCase()]
            }, r._setListeners = function () {
                var t = this;
                this.config.trigger.split(" ").forEach((function (e) {
                    if ("click" === e) B.on(t._element, t.constructor.Event.CLICK, t.config.selector, (function (e) {
                        return t.toggle(e)
                    })); else if ("manual" !== e) {
                        var n = "hover" === e ? t.constructor.Event.MOUSEENTER : t.constructor.Event.FOCUSIN,
                            i = "hover" === e ? t.constructor.Event.MOUSELEAVE : t.constructor.Event.FOCUSOUT;
                        B.on(t._element, n, t.config.selector, (function (e) {
                            return t._enter(e)
                        })), B.on(t._element, i, t.config.selector, (function (e) {
                            return t._leave(e)
                        }))
                    }
                })), this._hideModalHandler = function () {
                    t._element && t.hide()
                }, B.on(this._element.closest(".modal"), "hide.bs.modal", this._hideModalHandler), this.config.selector ? this.config = n({}, this.config, {
                    trigger: "manual",
                    selector: ""
                }) : this._fixTitle()
            }, r._fixTitle = function () {
                var t = this._element.getAttribute("title"),
                    e = typeof this._element.getAttribute("data-bs-original-title");
                (t || "string" !== e) && (this._element.setAttribute("data-bs-original-title", t || ""), !t || this._element.getAttribute("aria-label") || this._element.textContent || this._element.setAttribute("aria-label", t), this._element.setAttribute("title", ""))
            }, r._enter = function (t, e) {
                e = this._initializeOnDelegatedTarget(t, e), t && (e._activeTrigger["focusin" === t.type ? "focus" : "hover"] = !0), e.getTipElement().classList.contains("show") || "show" === e._hoverState ? e._hoverState = "show" : (clearTimeout(e._timeout), e._hoverState = "show", e.config.delay && e.config.delay.show ? e._timeout = setTimeout((function () {
                    "show" === e._hoverState && e.show()
                }), e.config.delay.show) : e.show())
            }, r._leave = function (t, e) {
                e = this._initializeOnDelegatedTarget(t, e), t && (e._activeTrigger["focusout" === t.type ? "focus" : "hover"] = !1), e._isWithActiveTrigger() || (clearTimeout(e._timeout), e._hoverState = "out", e.config.delay && e.config.delay.hide ? e._timeout = setTimeout((function () {
                    "out" === e._hoverState && e.hide()
                }), e.config.delay.hide) : e.hide())
            }, r._isWithActiveTrigger = function () {
                for (var t in this._activeTrigger) if (this._activeTrigger[t]) return !0;
                return !1
            }, r._getConfig = function (t) {
                var e = z.getDataAttributes(this._element);
                return Object.keys(e).forEach((function (t) {
                    Le.has(t) && delete e[t]
                })), t && "object" == typeof t.container && t.container.jquery && (t.container = t.container[0]), "number" == typeof (t = n({}, this.constructor.Default, e, "object" == typeof t && t ? t : {})).delay && (t.delay = {
                    show: t.delay,
                    hide: t.delay
                }), "number" == typeof t.title && (t.title = t.title.toString()), "number" == typeof t.content && (t.content = t.content.toString()), p("tooltip", t, this.constructor.DefaultType), t.sanitize && (t.template = ke(t.template, t.allowList, t.sanitizeFn)), t
            }, r._getDelegateConfig = function () {
                var t = {};
                if (this.config) for (var e in this.config) this.constructor.Default[e] !== this.config[e] && (t[e] = this.config[e]);
                return t
            }, r._cleanTipClass = function () {
                var t = this.getTipElement(), e = t.getAttribute("class").match(Ae);
                null !== e && e.length > 0 && e.map((function (t) {
                    return t.trim()
                })).forEach((function (e) {
                    return t.classList.remove(e)
                }))
            }, r._handlePopperPlacementChange = function (t) {
                var e = t.state;
                e && (this.tip = e.elements.popper, this._cleanTipClass(), this._addAttachmentClass(this._getAttachment(e.placement)))
            }, o.jQueryInterface = function (t) {
                return this.each((function () {
                    var e = T(this, "bs.tooltip"), n = "object" == typeof t && t;
                    if ((e || !/dispose|hide/.test(t)) && (e || (e = new o(this, n)), "string" == typeof t)) {
                        if (void 0 === e[t]) throw new TypeError('No method named "' + t + '"');
                        e[t]()
                    }
                }))
            }, e(o, null, [{
                key: "Default", get: function () {
                    return xe
                }
            }, {
                key: "NAME", get: function () {
                    return "tooltip"
                }
            }, {
                key: "DATA_KEY", get: function () {
                    return "bs.tooltip"
                }
            }, {
                key: "Event", get: function () {
                    return Ce
                }
            }, {
                key: "EVENT_KEY", get: function () {
                    return ".bs.tooltip"
                }
            }, {
                key: "DefaultType", get: function () {
                    return Oe
                }
            }]), o
        }(H);
    y("tooltip", Se);
    var je = new RegExp("(^|\\s)bs-popover\\S+", "g"), Ne = n({}, Se.Default, {
        placement: "right",
        offset: [0, 8],
        trigger: "click",
        content: "",
        template: '<div class="popover" role="tooltip"><div class="popover-arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>'
    }), Pe = n({}, Se.DefaultType, {content: "(string|element|function)"}), Ie = {
        HIDE: "hide.bs.popover",
        HIDDEN: "hidden.bs.popover",
        SHOW: "show.bs.popover",
        SHOWN: "shown.bs.popover",
        INSERTED: "inserted.bs.popover",
        CLICK: "click.bs.popover",
        FOCUSIN: "focusin.bs.popover",
        FOCUSOUT: "focusout.bs.popover",
        MOUSEENTER: "mouseenter.bs.popover",
        MOUSELEAVE: "mouseleave.bs.popover"
    }, Me = function (t) {
        function n() {
            return t.apply(this, arguments) || this
        }

        i(n, t);
        var o = n.prototype;
        return o.isWithContent = function () {
            return this.getTitle() || this._getContent()
        }, o.setContent = function () {
            var t = this.getTipElement();
            this.setElementContent(Y(".popover-header", t), this.getTitle());
            var e = this._getContent();
            "function" == typeof e && (e = e.call(this._element)), this.setElementContent(Y(".popover-body", t), e), t.classList.remove("fade", "show")
        }, o._addAttachmentClass = function (t) {
            this.getTipElement().classList.add("bs-popover-" + this.updateAttachment(t))
        }, o._getContent = function () {
            return this._element.getAttribute("data-bs-content") || this.config.content
        }, o._cleanTipClass = function () {
            var t = this.getTipElement(), e = t.getAttribute("class").match(je);
            null !== e && e.length > 0 && e.map((function (t) {
                return t.trim()
            })).forEach((function (e) {
                return t.classList.remove(e)
            }))
        }, n.jQueryInterface = function (t) {
            return this.each((function () {
                var e = T(this, "bs.popover"), i = "object" == typeof t ? t : null;
                if ((e || !/dispose|hide/.test(t)) && (e || (e = new n(this, i), E(this, "bs.popover", e)), "string" == typeof t)) {
                    if (void 0 === e[t]) throw new TypeError('No method named "' + t + '"');
                    e[t]()
                }
            }))
        }, e(n, null, [{
            key: "Default", get: function () {
                return Ne
            }
        }, {
            key: "NAME", get: function () {
                return "popover"
            }
        }, {
            key: "DATA_KEY", get: function () {
                return "bs.popover"
            }
        }, {
            key: "Event", get: function () {
                return Ie
            }
        }, {
            key: "EVENT_KEY", get: function () {
                return ".bs.popover"
            }
        }, {
            key: "DefaultType", get: function () {
                return Pe
            }
        }]), n
    }(Se);
    y("popover", Me);
    var Be = {offset: 10, method: "auto", target: ""},
        He = {offset: "number", method: "string", target: "(string|element)"}, Re = function (t) {
            function o(e, n) {
                var i;
                return (i = t.call(this, e) || this)._scrollElement = "BODY" === e.tagName ? window : e, i._config = i._getConfig(n), i._selector = i._config.target + " .nav-link, " + i._config.target + " .list-group-item, " + i._config.target + " .dropdown-item", i._offsets = [], i._targets = [], i._activeTarget = null, i._scrollHeight = 0, B.on(i._scrollElement, "scroll.bs.scrollspy", (function () {
                    return i._process()
                })), i.refresh(), i._process(), i
            }

            i(o, t);
            var r = o.prototype;
            return r.refresh = function () {
                var t = this, e = this._scrollElement === this._scrollElement.window ? "offset" : "position",
                    n = "auto" === this._config.method ? e : this._config.method,
                    i = "position" === n ? this._getScrollTop() : 0;
                this._offsets = [], this._targets = [], this._scrollHeight = this._getScrollHeight(), F(this._selector).map((function (t) {
                    var e = l(t), o = e ? Y(e) : null;
                    if (o) {
                        var r = o.getBoundingClientRect();
                        if (r.width || r.height) return [z[n](o).top + i, e]
                    }
                    return null
                })).filter((function (t) {
                    return t
                })).sort((function (t, e) {
                    return t[0] - e[0]
                })).forEach((function (e) {
                    t._offsets.push(e[0]), t._targets.push(e[1])
                }))
            }, r.dispose = function () {
                t.prototype.dispose.call(this), B.off(this._scrollElement, ".bs.scrollspy"), this._scrollElement = null, this._config = null, this._selector = null, this._offsets = null, this._targets = null, this._activeTarget = null, this._scrollHeight = null
            }, r._getConfig = function (t) {
                if ("string" != typeof (t = n({}, Be, "object" == typeof t && t ? t : {})).target && d(t.target)) {
                    var e = t.target.id;
                    e || (e = s("scrollspy"), t.target.id = e), t.target = "#" + e
                }
                return p("scrollspy", t, He), t
            }, r._getScrollTop = function () {
                return this._scrollElement === window ? this._scrollElement.pageYOffset : this._scrollElement.scrollTop
            }, r._getScrollHeight = function () {
                return this._scrollElement.scrollHeight || Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
            }, r._getOffsetHeight = function () {
                return this._scrollElement === window ? window.innerHeight : this._scrollElement.getBoundingClientRect().height
            }, r._process = function () {
                var t = this._getScrollTop() + this._config.offset, e = this._getScrollHeight(),
                    n = this._config.offset + e - this._getOffsetHeight();
                if (this._scrollHeight !== e && this.refresh(), t >= n) {
                    var i = this._targets[this._targets.length - 1];
                    this._activeTarget !== i && this._activate(i)
                } else {
                    if (this._activeTarget && t < this._offsets[0] && this._offsets[0] > 0) return this._activeTarget = null, void this._clear();
                    for (var o = this._offsets.length; o--;) this._activeTarget !== this._targets[o] && t >= this._offsets[o] && (void 0 === this._offsets[o + 1] || t < this._offsets[o + 1]) && this._activate(this._targets[o])
                }
            }, r._activate = function (t) {
                this._activeTarget = t, this._clear();
                var e = this._selector.split(",").map((function (e) {
                    return e + '[data-bs-target="' + t + '"],' + e + '[href="' + t + '"]'
                })), n = Y(e.join(","));
                n.classList.contains("dropdown-item") ? (Y(".dropdown-toggle", n.closest(".dropdown")).classList.add("active"), n.classList.add("active")) : (n.classList.add("active"), function (t, e) {
                    for (var n = [], i = t.parentNode; i && i.nodeType === Node.ELEMENT_NODE && 3 !== i.nodeType;) i.matches(e) && n.push(i), i = i.parentNode;
                    return n
                }(n, ".nav, .list-group").forEach((function (t) {
                    V(t, ".nav-link, .list-group-item").forEach((function (t) {
                        return t.classList.add("active")
                    })), V(t, ".nav-item").forEach((function (t) {
                        q(t, ".nav-link").forEach((function (t) {
                            return t.classList.add("active")
                        }))
                    }))
                }))), B.trigger(this._scrollElement, "activate.bs.scrollspy", {relatedTarget: t})
            }, r._clear = function () {
                F(this._selector).filter((function (t) {
                    return t.classList.contains("active")
                })).forEach((function (t) {
                    return t.classList.remove("active")
                }))
            }, o.jQueryInterface = function (t) {
                return this.each((function () {
                    var e = T(this, "bs.scrollspy");
                    if (e || (e = new o(this, "object" == typeof t && t)), "string" == typeof t) {
                        if (void 0 === e[t]) throw new TypeError('No method named "' + t + '"');
                        e[t]()
                    }
                }))
            }, e(o, null, [{
                key: "Default", get: function () {
                    return Be
                }
            }, {
                key: "DATA_KEY", get: function () {
                    return "bs.scrollspy"
                }
            }]), o
        }(H);
    B.on(window, "load.bs.scrollspy.data-api", (function () {
        F('[data-bs-spy="scroll"]').forEach((function (t) {
            return new Re(t, z.getDataAttributes(t))
        }))
    })), y("scrollspy", Re);
    var We = function (t) {
        function n() {
            return t.apply(this, arguments) || this
        }

        i(n, t);
        var o = n.prototype;
        return o.show = function () {
            var t = this;
            if (!(this._element.parentNode && this._element.parentNode.nodeType === Node.ELEMENT_NODE && this._element.classList.contains("active") || this._element.classList.contains("disabled"))) {
                var e, n = c(this._element), i = this._element.closest(".nav, .list-group");
                if (i) {
                    var o = "UL" === i.nodeName || "OL" === i.nodeName ? ":scope > li > .active" : ".active";
                    e = (e = F(o, i))[e.length - 1]
                }
                var r = e ? B.trigger(e, "hide.bs.tab", {relatedTarget: this._element}) : null;
                if (!(B.trigger(this._element, "show.bs.tab", {relatedTarget: e}).defaultPrevented || null !== r && r.defaultPrevented)) {
                    this._activate(this._element, i);
                    var s = function () {
                        B.trigger(e, "hidden.bs.tab", {relatedTarget: t._element}), B.trigger(t._element, "shown.bs.tab", {relatedTarget: e})
                    };
                    n ? this._activate(n, n.parentNode, s) : s()
                }
            }
        }, o._activate = function (t, e, n) {
            var i = this,
                o = (!e || "UL" !== e.nodeName && "OL" !== e.nodeName ? q(e, ".active") : F(":scope > li > .active", e))[0],
                r = n && o && o.classList.contains("fade"), s = function () {
                    return i._transitionComplete(t, o, n)
                };
            if (o && r) {
                var a = u(o);
                o.classList.remove("show"), B.one(o, "transitionend", s), h(o, a)
            } else s()
        }, o._transitionComplete = function (t, e, n) {
            if (e) {
                e.classList.remove("active");
                var i = Y(":scope > .dropdown-menu .active", e.parentNode);
                i && i.classList.remove("active"), "tab" === e.getAttribute("role") && e.setAttribute("aria-selected", !1)
            }
            t.classList.add("active"), "tab" === t.getAttribute("role") && t.setAttribute("aria-selected", !0), v(t), t.classList.contains("fade") && t.classList.add("show"), t.parentNode && t.parentNode.classList.contains("dropdown-menu") && (t.closest(".dropdown") && F(".dropdown-toggle").forEach((function (t) {
                return t.classList.add("active")
            })), t.setAttribute("aria-expanded", !0)), n && n()
        }, n.jQueryInterface = function (t) {
            return this.each((function () {
                var e = T(this, "bs.tab") || new n(this);
                if ("string" == typeof t) {
                    if (void 0 === e[t]) throw new TypeError('No method named "' + t + '"');
                    e[t]()
                }
            }))
        }, e(n, null, [{
            key: "DATA_KEY", get: function () {
                return "bs.tab"
            }
        }]), n
    }(H);
    B.on(document, "click.bs.tab.data-api", '[data-bs-toggle="tab"], [data-bs-toggle="pill"], [data-bs-toggle="list"]', (function (t) {
        t.preventDefault(), (T(this, "bs.tab") || new We(this)).show()
    })), y("tab", We);
    var Ke = {animation: "boolean", autohide: "boolean", delay: "number"},
        Ue = {animation: !0, autohide: !0, delay: 5e3}, ze = function (t) {
            function o(e, n) {
                var i;
                return (i = t.call(this, e) || this)._config = i._getConfig(n), i._timeout = null, i._setListeners(), i
            }

            i(o, t);
            var r = o.prototype;
            return r.show = function () {
                var t = this;
                if (!B.trigger(this._element, "show.bs.toast").defaultPrevented) {
                    this._clearTimeout(), this._config.animation && this._element.classList.add("fade");
                    var e = function () {
                        t._element.classList.remove("showing"), t._element.classList.add("show"), B.trigger(t._element, "shown.bs.toast"), t._config.autohide && (t._timeout = setTimeout((function () {
                            t.hide()
                        }), t._config.delay))
                    };
                    if (this._element.classList.remove("hide"), v(this._element), this._element.classList.add("showing"), this._config.animation) {
                        var n = u(this._element);
                        B.one(this._element, "transitionend", e), h(this._element, n)
                    } else e()
                }
            }, r.hide = function () {
                var t = this;
                if (this._element.classList.contains("show") && !B.trigger(this._element, "hide.bs.toast").defaultPrevented) {
                    var e = function () {
                        t._element.classList.add("hide"), B.trigger(t._element, "hidden.bs.toast")
                    };
                    if (this._element.classList.remove("show"), this._config.animation) {
                        var n = u(this._element);
                        B.one(this._element, "transitionend", e), h(this._element, n)
                    } else e()
                }
            }, r.dispose = function () {
                this._clearTimeout(), this._element.classList.contains("show") && this._element.classList.remove("show"), B.off(this._element, "click.dismiss.bs.toast"), t.prototype.dispose.call(this), this._config = null
            }, r._getConfig = function (t) {
                return t = n({}, Ue, z.getDataAttributes(this._element), "object" == typeof t && t ? t : {}), p("toast", t, this.constructor.DefaultType), t
            }, r._setListeners = function () {
                var t = this;
                B.on(this._element, "click.dismiss.bs.toast", '[data-bs-dismiss="toast"]', (function () {
                    return t.hide()
                }))
            }, r._clearTimeout = function () {
                clearTimeout(this._timeout), this._timeout = null
            }, o.jQueryInterface = function (t) {
                return this.each((function () {
                    var e = T(this, "bs.toast");
                    if (e || (e = new o(this, "object" == typeof t && t)), "string" == typeof t) {
                        if (void 0 === e[t]) throw new TypeError('No method named "' + t + '"');
                        e[t](this)
                    }
                }))
            }, e(o, null, [{
                key: "DefaultType", get: function () {
                    return Ke
                }
            }, {
                key: "Default", get: function () {
                    return Ue
                }
            }, {
                key: "DATA_KEY", get: function () {
                    return "bs.toast"
                }
            }]), o
        }(H);
    return y("toast", ze), {
        Alert: R,
        Button: W,
        Carousel: $,
        Collapse: J,
        Dropdown: ve,
        Modal: ye,
        Popover: Me,
        ScrollSpy: Re,
        Tab: We,
        Toast: ze,
        Tooltip: Se
    }
}));
var t, e;
t = this, e = function () {
    "use strict";

    function t(t, e) {
        var n = Object.keys(t);
        if (Object.getOwnPropertySymbols) {
            var r = Object.getOwnPropertySymbols(t);
            e && (r = r.filter((function (e) {
                return Object.getOwnPropertyDescriptor(t, e).enumerable
            }))), n.push.apply(n, r)
        }
        return n
    }

    function e(e) {
        for (var n = 1; n < arguments.length; n++) {
            var i = null != arguments[n] ? arguments[n] : {};
            n % 2 ? t(Object(i), !0).forEach((function (t) {
                r(e, t, i[t])
            })) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(i)) : t(Object(i)).forEach((function (t) {
                Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(i, t))
            }))
        }
        return e
    }

    function n(t) {
        return (n = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (t) {
            return typeof t
        } : function (t) {
            return t && "function" == typeof Symbol && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t
        })(t)
    }

    function r(t, e, n) {
        return e in t ? Object.defineProperty(t, e, {
            value: n,
            enumerable: !0,
            configurable: !0,
            writable: !0
        }) : t[e] = n, t
    }

    function i(t) {
        return function (t) {
            if (Array.isArray(t)) return s(t)
        }(t) || function (t) {
            if ("undefined" != typeof Symbol && null != t[Symbol.iterator] || null != t["@@iterator"]) return Array.from(t)
        }(t) || o(t) || function () {
            throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
        }()
    }

    function o(t, e) {
        if (t) {
            if ("string" == typeof t) return s(t, e);
            var n = Object.prototype.toString.call(t).slice(8, -1);
            return "Object" === n && t.constructor && (n = t.constructor.name), "Map" === n || "Set" === n ? Array.from(t) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? s(t, e) : void 0
        }
    }

    function s(t, e) {
        (null == e || e > t.length) && (e = t.length);
        for (var n = 0, r = new Array(e); n < e; n++) r[n] = t[n];
        return r
    }

    var u, a = function (t) {
        new MutationObserver((function (e, n) {
            e.forEach((function (e) {
                t.input && (n.disconnect(), t.init())
            }))
        })).observe(document, {childList: !0, subtree: !0})
    }, c = function (t) {
        return "string" == typeof t ? document.querySelector(t) : t
    }, l = function (t, e) {
        var n = "string" == typeof t ? document.createElement(t) : t;
        for (var r in e) {
            var i = e[r];
            if ("inside" === r) i.append(n); else if ("dest" === r) c(i[0]).insertAdjacentElement(i[1], n); else if ("around" === r) {
                var o = c(i);
                o.parentNode.insertBefore(n, o), n.append(o), null != o.getAttribute("autofocus") && o.focus()
            } else r in n ? n[r] = i : n.setAttribute(r, i)
        }
        return n
    }, f = function (t, e) {
        return t = t.toString().toLowerCase(), e ? t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC") : t
    }, p = function (t, n) {
        return l("mark", e({innerHTML: t}, "string" == typeof n && {class: n})).outerHTML
    }, d = function (t, e) {
        e.input.dispatchEvent(new CustomEvent(t, {bubbles: !0, detail: e.feedback, cancelable: !0}))
    }, h = function (t, e, n) {
        var r = n || {}, i = r.mode, o = r.diacritics, s = r.highlight, u = f(e, o);
        if (e = e.toString(), t = f(t, o), "loose" === i) {
            var a = (t = t.replace(/ /g, "")).length, c = 0, l = Array.from(e).map((function (e, n) {
                return c < a && u[n] === t[c] && (e = s ? p(e, s) : e, c++), e
            })).join("");
            if (c === a) return l
        } else {
            var d = u.indexOf(t);
            if (~d) return t = e.substring(d, d + t.length), d = s ? e.replace(t, p(t, s)) : e
        }
    }, m = function (t) {
        return new Promise((function (e, n) {
            var r, i, o;
            return r = t.input, i = t.query, (o = t.data).cache && o.store ? e() : (i = i ? i(r.value) : r.value, new Promise((function (t, e) {
                return "function" == typeof o.src ? o.src(i).then(t, e) : t(o.src)
            })).then((function (r) {
                try {
                    return t.feedback = o.store = r, d("response", t), e()
                } catch (t) {
                    return n(t)
                }
            }), n))
        }))
    }, v = function (t, e) {
        var n = e.data, r = e.searchEngine, i = e.diacritics, s = e.resultsList, u = e.resultItem, a = [];
        n.store.forEach((function (e, s) {
            var c = function (n) {
                var o = n ? e[n] : e,
                    s = "function" == typeof r ? r(t, o) : h(t, o, {mode: r, diacritics: i, highlight: u.highlight});
                if (s) {
                    var c = {match: s, value: e};
                    n && (c.key = n), a.push(c)
                }
            };
            if (n.keys) {
                var l, f = function (t, e) {
                    var n = "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
                    if (!n) {
                        if (Array.isArray(t) || (n = o(t)) || e && t && "number" == typeof t.length) {
                            n && (t = n);
                            var r = 0, i = function () {
                            };
                            return {
                                s: i, n: function () {
                                    return r >= t.length ? {done: !0} : {done: !1, value: t[r++]}
                                }, e: function (t) {
                                    throw t
                                }, f: i
                            }
                        }
                        throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                    }
                    var s, u = !0, a = !1;
                    return {
                        s: function () {
                            n = n.call(t)
                        }, n: function () {
                            var t = n.next();
                            return u = t.done, t
                        }, e: function (t) {
                            a = !0, s = t
                        }, f: function () {
                            try {
                                u || null == n.return || n.return()
                            } finally {
                                if (a) throw s
                            }
                        }
                    }
                }(n.keys);
                try {
                    for (f.s(); !(l = f.n()).done;) c(l.value)
                } catch (t) {
                    f.e(t)
                } finally {
                    f.f()
                }
            } else c()
        })), n.filter && (a = n.filter(a));
        var c = a.slice(0, s.maxResults);
        e.feedback = {query: t, matches: a, results: c}, d("results", e)
    }, b = "aria-expanded", y = "aria-activedescendant", g = "aria-selected", w = function (t, n) {
        t.feedback.selection = e({index: n}, t.feedback.results[n])
    }, O = function (t) {
        t.isOpen || ((t.wrapper || t.input).setAttribute(b, !0), t.list.removeAttribute("hidden"), t.isOpen = !0, d("open", t))
    }, A = function (t) {
        t.isOpen && ((t.wrapper || t.input).setAttribute(b, !1), t.input.setAttribute(y, ""), t.list.setAttribute("hidden", ""), t.isOpen = !1, d("close", t))
    }, S = function (t, e) {
        var n = e.list.getElementsByTagName(e.resultItem.tag);
        if (e.isOpen && n.length) {
            var r, o, s = e.cursor;
            t >= n.length && (t = 0), t < 0 && (t = n.length - 1), e.cursor = t, s > -1 && (n[s].removeAttribute(g), u && (o = n[s].classList).remove.apply(o, i(u))), n[t].setAttribute(g, !0), u && (r = n[t].classList).add.apply(r, i(u)), e.input.setAttribute(y, n[e.cursor].id), e.list.scrollTop = n[t].offsetTop - e.list.clientHeight + n[t].clientHeight + 5, e.feedback.cursor = e.cursor, w(e, t), d("navigate", e)
        }
    }, L = function (t) {
        var e = t.cursor + 1;
        S(e, t)
    }, j = function (t) {
        var e = t.cursor - 1;
        S(e, t)
    }, k = function (t, e, n) {
        (n = n >= 0 ? n : t.cursor) < 0 || (t.feedback.event = e, w(t, n), d("selection", t), A(t))
    };

    function E(t) {
        var n = this;
        return new Promise((function (r, i) {
            var o, s, u, a, c, f, p;
            return o = t.input, s = t.query, u = t.trigger, a = t.threshold, c = t.resultsList, f = (p = o) instanceof HTMLInputElement || p instanceof HTMLTextAreaElement ? p.value : p.innerHTML, function (t, e, n) {
                return e ? e(t) : t.length >= n
            }(f = s ? s(f) : f, u, a) ? m(t).then((function (o) {
                try {
                    return t.feedback instanceof Error ? r() : (v(f, t), c && function (t) {
                        var n = t.resultsList, r = t.list, i = t.resultItem, o = t.feedback;
                        o.query;
                        var s = o.matches, u = o.results;
                        if (t.cursor = -1, r.innerHTML = "", s.length || n.noResults) {
                            var a = document.createDocumentFragment();
                            u.forEach((function (t, n) {
                                var r = l(i.tag, e({
                                    id: "".concat(i.id, "_").concat(n),
                                    role: "option",
                                    innerHTML: t.match,
                                    inside: a
                                }, i.class && {class: i.class}));
                                i.element && i.element(r, t)
                            })), r.append(a), n.element && n.element(r, o), O(t)
                        } else A(t)
                    }(t), d.call(n))
                } catch (t) {
                    return i(t)
                }
            }), i) : (A(t), d.call(n));

            function d() {
                return r()
            }
        }))
    }

    var T = function (t, e) {
        for (var n in t) for (var r in t[n]) e(r, n)
    }, I = function (t) {
        var n = t.events;
        t.trigger;
        var r = t.debounce, i = t.resultsList, o = function (t, e) {
            var n;
            return function () {
                clearTimeout(n), n = setTimeout((function () {
                    return t()
                }), e)
            }
        }((function () {
            return E(t)
        }), r), s = t.events = e({input: e({}, n && n.input)}, i && {list: n ? e({}, n.list) : {}}), a = {
            input: {
                input: function () {
                    o()
                }, keydown: function (e) {
                    !function (t, e) {
                        var n = t.keyCode, r = e.resultItem.selected;
                        switch (r && (u = r.split(" ")), n) {
                            case 40:
                            case 38:
                                t.preventDefault(), 40 === n ? L(e) : j(e);
                                break;
                            case 13:
                                t.preventDefault(), e.cursor >= 0 && k(e, t);
                                break;
                            case 9:
                                e.resultsList.tabSelect && e.cursor >= 0 ? (t.preventDefault(), k(e, t)) : A(e);
                                break;
                            case 27:
                                t.preventDefault(), e.input.value = "", A(e)
                        }
                    }(e, t)
                }, blur: function () {
                    A(t)
                }
            }, list: {
                mousedown: function (t) {
                    t.preventDefault()
                }, click: function (e) {
                    !function (t, e) {
                        var n = e.resultItem.tag.toUpperCase(), r = Array.from(e.list.querySelectorAll(n)),
                            i = t.target.closest(n);
                        if (i && i.nodeName === n) {
                            t.preventDefault();
                            var o = r.indexOf(i);
                            k(e, t, o)
                        }
                    }(e, t)
                }
            }
        };
        T(a, (function (t, e) {
            (i || "list" !== e) && (s[e][t] || (s[e][t] = a[e][t]))
        })), T(s, (function (e, n) {
            t[n].addEventListener(e, s[n][e])
        }))
    };

    function x(t) {
        var n = this;
        return new Promise((function (r, i) {
            var o, s, u, a, c, f;
            if (o = t.name, s = t.input, u = t.placeHolder, a = t.resultsList, c = t.data, f = {
                role: "combobox",
                "aria-owns": a.id,
                "aria-haspopup": !0,
                "aria-expanded": !1
            }, l(s, e(e({
                "aria-controls": a.id,
                "aria-autocomplete": "both"
            }, u && {placeholder: u}), !t.wrapper && e({}, f))), t.wrapper && (t.wrapper = l("div", e({
                around: s,
                class: o + "_wrapper"
            }, f))), a && (t.list = l(a.tag, e({
                dest: ["string" == typeof a.destination ? document.querySelector(a.destination) : a.destination(), a.position],
                id: a.id,
                role: "listbox",
                hidden: "hidden"
            }, a.class && {class: a.class}))), c.cache) return m(t).then((function (t) {
                try {
                    return p.call(n)
                } catch (t) {
                    return i(t)
                }
            }), i);

            function p() {
                return I(t), d("init", t), r()
            }

            return p.call(n)
        }))
    }

    function P(t) {
        var e = t.prototype;
        e.preInit = function () {
            a(this)
        }, e.init = function () {
            x(this)
        }, e.start = function () {
            E(this)
        }, e.unInit = function () {
            var t;
            T((t = this).events, (function (e, n) {
                t[n].removeEventListener(e, t.events[n][e])
            }))
        }, e.open = function () {
            O(this)
        }, e.close = function () {
            A(this)
        }, e.goTo = function (t) {
            S(t, this)
        }, e.next = function () {
            L(this)
        }, e.previous = function () {
            j(this)
        }, e.select = function (t) {
            k(this, null, t)
        }, t.search = e.search = function (t, e, n) {
            h(t, e, n)
        }
    }

    return function t(e) {
        this.options = e, this.id = t.instances = (t.instances || 0) + 1, this.name = "autoComplete", this.wrapper = 1, this.threshold = 1, this.debounce = 0, this.resultsList = {
            position: "afterend",
            tag: "ul",
            maxResults: 5
        }, this.resultItem = {tag: "li"}, function (t) {
            var e = t.id, r = t.name, i = t.options, o = t.resultsList, s = t.resultItem;
            for (var u in i) if ("object" === n(i[u])) for (var a in t[u] || (t[u] = {}), i[u]) t[u][a] = i[u][a]; else t[u] = i[u];
            t.selector = t.selector || "#" + r, o.destination = o.destination || t.selector, o.id = o.id || r + "_list_" + e, s.id = s.id || r + "_result", t.input = "string" == typeof t.selector ? document.querySelector(t.selector) : t.selector()
        }(this), P.call(this, t), (this.observe ? a : x)(this)
    }
}, "object" == typeof exports && "undefined" != typeof module ? module.exports = e() : "function" == typeof define && define.amd ? define(e) : (t = "undefined" != typeof globalThis ? globalThis : t || self).autoComplete = e();
!function (e) {
    "function" == typeof define && define.amd ? define([], e) : "object" == typeof exports ? module.exports = e() : window.wNumb = e()
}(function () {
    "use strict";
    var o = ["decimals", "thousand", "mark", "prefix", "suffix", "encoder", "decoder", "negativeBefore", "negative", "edit", "undo"];

    function w(e) {
        return e.split("").reverse().join("")
    }

    function h(e, t) {
        return e.substring(0, t.length) === t
    }

    function f(e, t, n) {
        if ((e[t] || e[n]) && e[t] === e[n]) throw new Error(t)
    }

    function x(e) {
        return "number" == typeof e && isFinite(e)
    }

    function n(e, t, n, r, i, o, f, u, s, c, a, p) {
        var d, l, h, g = p, v = "", m = "";
        return o && (p = o(p)), !!x(p) && (!1 !== e && 0 === parseFloat(p.toFixed(e)) && (p = 0), p < 0 && (d = !0, p = Math.abs(p)), !1 !== e && (p = function (e, t) {
            return e = e.toString().split("e"), (+((e = (e = Math.round(+(e[0] + "e" + (e[1] ? +e[1] + t : t)))).toString().split("e"))[0] + "e" + (e[1] ? e[1] - t : -t))).toFixed(t)
        }(p, e)), -1 !== (p = p.toString()).indexOf(".") ? (h = (l = p.split("."))[0], n && (v = n + l[1])) : h = p, t && (h = w((h = w(h).match(/.{1,3}/g)).join(w(t)))), d && u && (m += u), r && (m += r), d && s && (m += s), m += h, m += v, i && (m += i), c && (m = c(m, g)), m)
    }

    function r(e, t, n, r, i, o, f, u, s, c, a, p) {
        var d, l = "";
        return a && (p = a(p)), !(!p || "string" != typeof p) && (u && h(p, u) && (p = p.replace(u, ""), d = !0), r && h(p, r) && (p = p.replace(r, "")), s && h(p, s) && (p = p.replace(s, ""), d = !0), i && function (e, t) {
            return e.slice(-1 * t.length) === t
        }(p, i) && (p = p.slice(0, -1 * i.length)), t && (p = p.split(t).join("")), n && (p = p.replace(n, ".")), d && (l += "-"), "" !== (l = (l += p).replace(/[^0-9\.\-.]/g, "")) && (l = Number(l), f && (l = f(l)), !!x(l) && l))
    }

    function i(e, t, n) {
        var r, i = [];
        for (r = 0; r < o.length; r += 1) i.push(e[o[r]]);
        return i.push(n), t.apply("", i)
    }

    return function e(t) {
        if (!(this instanceof e)) return new e(t);
        "object" == typeof t && (t = function (e) {
            var t, n, r, i = {};
            for (void 0 === e.suffix && (e.suffix = e.postfix), t = 0; t < o.length; t += 1) if (void 0 === (r = e[n = o[t]])) "negative" !== n || i.negativeBefore ? "mark" === n && "." !== i.thousand ? i[n] = "." : i[n] = !1 : i[n] = "-"; else if ("decimals" === n) {
                if (!(0 <= r && r < 8)) throw new Error(n);
                i[n] = r
            } else if ("encoder" === n || "decoder" === n || "edit" === n || "undo" === n) {
                if ("function" != typeof r) throw new Error(n);
                i[n] = r
            } else {
                if ("string" != typeof r) throw new Error(n);
                i[n] = r
            }
            return f(i, "mark", "thousand"), f(i, "prefix", "negative"), f(i, "prefix", "negativeBefore"), i
        }(t), this.to = function (e) {
            return i(t, n, e)
        }, this.from = function (e) {
            return i(t, r, e)
        })
    }
});
!function (e, t) {
    "object" == typeof exports && "undefined" != typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define(t) : (e || self).loadingAttributePolyfill = t()
}(this, function () {
    var e, t = {
            rootMargin: "0px 0px 256px 0px",
            threshold: .01,
            lazyImage: 'img[loading="lazy"]',
            lazyIframe: 'iframe[loading="lazy"]'
        }, r = "loading" in HTMLImageElement.prototype, a = "loading" in HTMLIFrameElement.prototype,
        o = "onscroll" in window;

    function n(e) {
        var t, r, a = [];
        "picture" === e.parentNode.tagName.toLowerCase() && ((r = (t = e.parentNode).querySelector("source[data-lazy-remove]")) && t.removeChild(r), a = Array.prototype.slice.call(e.parentNode.querySelectorAll("source"))), a.push(e), a.forEach(function (e) {
            e.hasAttribute("data-lazy-srcset") && (e.setAttribute("srcset", e.getAttribute("data-lazy-srcset")), e.removeAttribute("data-lazy-srcset"))
        }), e.setAttribute("src", e.getAttribute("data-lazy-src")), e.removeAttribute("data-lazy-src")
    }

    function i(t) {
        var n = document.createElement("div");
        for (n.innerHTML = function (t) {
            var n = t.textContent || t.innerHTML,
                i = "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 " + ((n.match(/width=['"](\d+)['"]/) || !1)[1] || 1) + " " + ((n.match(/height=['"](\d+)['"]/) || !1)[1] || 1) + "%27%3E%3C/svg%3E";
            return (/<img/gim.test(n) && !r || /<iframe/gim.test(n) && !a) && o && (n = void 0 === e ? n.replace(/(?:\r\n|\r|\n|\t| )src=/g, ' lazyload="1" src=') : (n = n.replace("<source", '<source srcset="' + i + '" data-lazy-remove="true"></source>\n<source')).replace(/(?:\r\n|\r|\n|\t| )srcset=/g, " data-lazy-srcset=").replace(/(?:\r\n|\r|\n|\t| )src=/g, ' src="' + i + '" data-lazy-src=')), n
        }(t); n.firstChild;) {
            var i = n.firstChild;
            if (o && void 0 !== e && i.tagName && (("img" === i.tagName.toLowerCase() || "picture" === i.tagName.toLowerCase()) && !r || "iframe" === i.tagName.toLowerCase() && !a)) {
                var c = "picture" === i.tagName.toLowerCase() ? n.querySelector("img") : i;
                e.observe(c)
            }
            t.parentNode.insertBefore(i, t)
        }
        t.parentNode.removeChild(t)
    }

    window.NodeList && !NodeList.prototype.forEach && (NodeList.prototype.forEach = Array.prototype.forEach), "IntersectionObserver" in window && (e = new IntersectionObserver(function (e, t) {
        e.forEach(function (e) {
            if (0 !== e.intersectionRatio) {
                var r = e.target;
                t.unobserve(r), n(r)
            }
        })
    }, t));
    var c = function () {
        document.querySelectorAll("noscript.loading-lazy").forEach(function (e) {
            return i(e)
        }), void 0 !== window.matchMedia && window.matchMedia("print").addListener(function (e) {
            e.matches && document.querySelectorAll(t.lazyImage + "[data-lazy-src]," + t.lazyIframe + "[data-lazy-src]").forEach(function (e) {
                n(e)
            })
        })
    };
    return /comp|inter/.test(document.readyState) ? c() : "addEventListener" in document ? document.addEventListener("DOMContentLoaded", function () {
        c()
    }) : document.attachEvent("onreadystatechange", function () {
        "complete" === document.readyState && c()
    }), {prepareElement: i}
});
new class Scroller extends RsJsCore.classes.plugin {
    constructor() {
        super();
        this.prevScroll = 0;
    }

    saveScroll(newX, newY) {
        this.prevScroll = window.scrollY;
        if (newX || newY) {
            window.scroll(newX, newY);
        }
    }

    returnToPrevScroll() {
        window.scrollTo(0, this.prevScroll);
    }

    scroll(x, y) {
        window.scroll(x, y);
    }
};
new class Modal extends RsJsCore.classes.plugin {
    open(html, onOpen, options) {
        let isReopen = this.isOpen();
        if (this.modal) {
            this.modal._element.classList.remove('fade');
            this.close();
        }
        let element = document.createElement('div');
        element.className = 'modal rs-dialog' + (isReopen ? '' : ' fade');
        element.addEventListener('shown.bs.modal', (event) => {
            if (isReopen) {
                let modal = bootstrap.Modal.getInstance(event.target);
                element.classList.add('fade');
                modal._backdrop.classList.add('fade');
            }
            element.dispatchEvent(new CustomEvent('new-content', {bubbles: true}));
        });
        element.addEventListener('shown.bs.modal', onOpen);
        element.addEventListener('hide.bs.modal', () => {
            this.modal = null
        });
        element.addEventListener('hidden.bs.modal', (event) => {
            let modal = bootstrap.Modal.getInstance(event.target);
            modal.dispose();
            event.target.remove();
        });
        element.innerHTML = html;
        this.modal = new bootstrap.Modal(element, options);
        this.modal.show();
    }

    close() {
        if (this.modal) {
            this.modal.hide();
        }
    }

    isOpen() {
        return !!this.modal;
    }

    showLoader() {
        if (this.modal) {
            this.loader = document.createElement('div');
            this.loader.classList.add('rs-loader');
            this.modal._element.querySelector('.modal-content').append(this.loader);
        }
    }

    hideLoader() {
        if (this.loader) {
            this.loader.remove();
        }
    }
};
new class Cookie extends RsJsCore.classes.plugin {
    setCookie(name, value, options = {}) {
        options = {path: '/', expires: new Date(Date.now() + 750 * 24 * 60 * 60 * 1000), ...options};
        if (options.expires instanceof Date) {
            options.expires = options.expires.toUTCString();
        }
        let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);
        for (let optionKey in options) {
            updatedCookie += "; " + optionKey;
            let optionValue = options[optionKey];
            if (optionValue !== true) {
                updatedCookie += "=" + optionValue;
            }
        }
        document.cookie = updatedCookie;
    }

    getCookie(name) {
        let matches = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"));
        return matches ? decodeURIComponent(matches[1]) : undefined;
    }
};
new class Toast extends RsJsCore.classes.plugin {
    constructor() {
        super();
        let defaults = {containerClassName: "toast-container position-fixed bottom-0 end-0 p-3"};
        this.settings = {...defaults, ...this.getExtendsSettings()};
    }

    _getContainer() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = this.settings.containerClassName;
            document.body.appendChild(this.container);
        }
        return this.container;
    }

    _makeToast(title, message, options) {
        let toast = document.createElement('div');
        toast.className = 'toast ' + (options.className ? options.className : '');
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.innerHTML = `<div class="toast-header">
                            <strong class="me-auto">${title}</strong>
                            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>                              
                          </div>
                          <div class="toast-body">
                            ${message}
                          </div>`;
        return toast;
    }

    show(title, message, options) {
        let defaults = {className: '', animation: true, autohide: true, delay: 10000};
        let settings = {...defaults, ...options};
        let toastElement = this._makeToast(title, message, settings);
        this._getContainer().appendChild(toastElement);
        let toastInstance = new bootstrap.Toast(toastElement, settings);
        toastInstance.show();
        return toastInstance;
    }
};
new class OpenDialog extends RsJsCore.classes.plugin {
    constructor() {
        super();
        let defaults = {inDialogSelector: '.rs-in-dialog', disableClass: 'disabled'};
        this.settings = {...defaults, ...this.getExtendsSettings()};
        if (RsJsCore.plugins.modal) {
            this.modal = RsJsCore.plugins.modal;
        } else {
            console.error(lang.t('Плагин для модальных окон RsJsCore.plugins.modal не установлен'));
        }
        this._bindEvents();
    }

    _bindEvents() {
        document.addEventListener('click', (e) => {
            let element = e.target.closest(this.settings.inDialogSelector);
            if (element) {
                let href = element.dataset.href ? element.dataset.href : element.href;
                if (href) {
                    if (!element.classList.contains(this.settings.disableClass)) {
                        this.show({url: href});
                    }
                    e.preventDefault();
                }
            }
        });
    }

    show(options, requestOptions) {
        let defaults = {url: '', data: {}, callback: null, bindSubmit: true};
        this.options = {...defaults, ...options};
        let url = new URL(this.options.url, window.location.origin);
        url.searchParams.append('dialogWrap', 1);
        Object.keys(this.options.data).forEach(key => url.searchParams.append(key, this.options.data[key]));
        this._requestContent(url, requestOptions);
    }

    _requestContent(url, options) {
        this.showOverlay();
        return RsJsCore.utils.fetchJSON(url, options).then(response => {
            this._prepareResponse(response);
            if (response.html) {
                this.modal.open(response.html, (event) => {
                    this._prepareHtml(response, event.target);
                });
            }
        }).finally(() => {
            this.hideOverlay();
        });
    }

    _prepareResponse(response) {
        if (response.closeDialog) {
            if (this.modal && this.modal.isOpen()) {
                this.modal.close();
                response.html = null;
            }
        }
        if (response.redirect) {
            this.show({url: response.redirect});
            response.html = null;
        }
        return true;
    }

    _prepareHtml(response, element) {
        if (this.options.bindSubmit) {
            element.querySelectorAll('form').forEach((form) => {
                this._ajaxForm(form);
            });
        }
        if (this.options.callback) {
            this.options.callback.call(this, response, element);
        }
    }

    _ajaxForm(form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            let data = new FormData(form);
            let formAction = form.dataset.ajaxAction ? form.dataset.ajaxAction : form.getAttribute('action');
            if (!formAction) formAction = '';
            formAction += formAction.indexOf('?') === -1 ? '?dialogWrap=1' : '&dialogWrap=1';
            form.querySelectorAll('button[type="submit"], input[type="submit"]').forEach((element) => {
                element.disabled = true;
            });
            this._requestContent(formAction, {method: 'POST', body: data}).finally(() => {
                form.querySelectorAll('button[type="submit"], input[type="submit"]').forEach((element) => {
                    element.disabled = false;
                });
            });
        });
    }

    showOverlay() {
        if (this.modal.isOpen()) {
            this.modal.showLoader();
        }
    }

    hideOverlay() {
        if (this.modal.isOpen()) {
            this.modal.hideLoader();
        }
    }
};
new class Theme extends RsJsCore.classes.component {

    initSideBars() {
        let closeOffcanvasMenus = () => {
            let overlay = document.querySelector('.offcanvas-overlay');
            overlay && overlay.remove();
            document.body.classList.remove('offcanvas-body');
            document.querySelectorAll('.offcanvas_active').forEach((it) => {
                it.addEventListener('transitionend', () => {
                    if (it.sourceElement) {
                        let from = it.destinationElement ? it.destinationElement.childNodes : it.childNodes;
                        while (from.length > 0) {
                            it.sourceElement.append(from[0]);
                        }
                    }
                    if (!it.id) {
                        it.remove();
                    }
                }, {once: true});
                it.classList.remove('offcanvas_active');
            });
            this.plugins.scroller.returnToPrevScroll();
        };
        let openOffcanvasMenu = async (event) => {
            let target = event.rsTarget;
            let id = target.dataset.id;
            let extraClass = target.dataset.extraClass;
            let sidebar = document.getElementById(id);
            let createDiv = () => {
                let sidebar = document.createElement('div');
                if (id) sidebar.id = id;
                if (extraClass) sidebar.className += extraClass;
                sidebar.classList.add('offcanvas');
                return sidebar;
            };
            if (target.dataset.loadUrl && (!id || !sidebar)) {
                let content = await this.utils.fetchJSON(target.dataset.loadUrl);
                if (content && content.html) {
                    sidebar = createDiv();
                    sidebar.innerHTML = content.html;
                    document.body.append(sidebar);
                    sidebar.dispatchEvent(new CustomEvent('new-content', {bubbles: true}));
                    this.initMultilevelMenu();
                } else {
                    console.error(lang.t('Ответ на запрос не содержит JSON {html: "..."}'));
                }
            } else if (target.dataset.source) {
                let sourceElement = document.querySelector(target.dataset.source);
                if (!sidebar) {
                    sidebar = createDiv();
                }
                sidebar.sourceElement = sourceElement;
                let destination;
                if (target.dataset.destination) {
                    destination = sidebar.querySelector(target.dataset.destination);
                    sidebar.destinationElement = destination;
                } else {
                    destination = sidebar
                }
                while (sourceElement.childNodes.length > 0) {
                    destination.append(sourceElement.childNodes[0]);
                }
                document.body.append(sidebar);
            }
            this.plugins.scroller.saveScroll();
            const overlay = document.createElement('div');
            overlay.classList.add('offcanvas-overlay');
            document.body.classList.add('offcanvas-body');
            document.body.prepend(overlay);
            sidebar.classList.add('offcanvas_active');
            overlay.addEventListener('click', closeOffcanvasMenus);
        };
        this.utils.on('click', '.offcanvas-open', (event) => {
            event.preventDefault();
            openOffcanvasMenu(event);
        });
        this.utils.on('click', '.offcanvas-close', (event) => {
            closeOffcanvasMenus(event);
        });
    }



    onDocumentReady() {

        this.initSideBars();

    }


};
new class Verification extends RsJsCore.classes.component {
    constructor() {
        super();
        this.settings = {
            verifyBlock: '.rs-verify-code-block',
            refreshButtonSelector: '.rs-verify-refresh-code',
            resetButtonSelector: '.rs-verify-reset',
            verifyTimerLine: '.rs-verify-timer-line',
            verifyTimer: '.rs-verify-timer .rs-time',
            verifyPhoneInput: 'input[data-phone]',
            verifyTokenInput: 'input[data-token]',
            autoSubmitInput: 'input[data-auto-submit-length]',
            errorSelector: '.rs-verify-error',
            errorFieldSelector: '.invalid-feedback',
            waitClass: 'rs-wait'
        };
    }

    onDocumentReady() {
        this.utils.on('click', this.settings.refreshButtonSelector, (event) => this.refreshCode(event));
        this.utils.on('click', this.settings.resetButtonSelector, (event) => this.resetCode(event));
        this.utils.on('keyup', this.settings.autoSubmitInput, (event) => this.onKeyPressAutoSubmit(event));
    }

    onContentReady() {
        document.querySelectorAll(this.settings.verifyBlock).forEach((element) => {
            let timer = element.querySelector('[data-delay-refresh-code-sec]');
            if (timer) {
                this.runTimer(timer);
            }
        });
    }

    refresh(url, data, context) {
        let showError = (text) => {
            let errorElement = context.querySelector(this.settings.errorSelector)
            if (errorElement) {
                errorElement.innerText = text;
                errorElement.classList.remove('hidden');
            }
        };
        fetch(url, {
            credentials: 'include',
            headers: {'X-Requested-With': 'XMLHttpRequest'},
            method: 'POST',
            body: new URLSearchParams(data)
        }).then(async (data) => {
            if (data.ok) {
                let response = await data.json();
                if (response.success) {
                    let input = context.querySelector(this.settings.verifyPhoneInput);
                    input && input.classList.remove('is-invalid');
                    let name = input.getAttribute('name');
                    let error = context.parentNode.querySelector(this.settings.errorFieldSelector + '[data-field="' + name + '"]');
                    error && error.remove();
                }
                if (response.html) {
                    let parent = context.parentNode;
                    context.insertAdjacentHTML("afterend", response.html);
                    context.remove();
                    parent.dispatchEvent(new CustomEvent('new-content', {bubbles: true}));
                }
            } else {
                if (data.status === 404) {
                    showError(lang.t('Сессия истекла. Обновите страницу'));
                }
            }
        }).catch((response) => {
            showError(lang.t('Произошла ошибка. Попробуйте позже'));
        });
    }

    onKeyPressAutoSubmit(event) {
        let target = event.rsTarget;
        let context = target.closest(this.settings.verifyBlock);
        if (event.keyCode === 13) {
            event.preventDefault();
        }
        setTimeout(() => {
            let value = target.value;
            let url = context.dataset.checkCodeUrl;
            let data = {
                phone: context.querySelector(this.settings.verifyPhoneInput).value,
                token: context.querySelector(this.settings.verifyTokenInput).value,
                code: value,
            };
            if (value.length == target.dataset.autoSubmitLength || event.keyCode === 13) {
                this.refresh(url, data, context);
            }
        }, 0);
    }

    refreshCode(event) {
        let target = event.rsTarget;
        let context = target.closest(this.settings.verifyBlock);
        let phone = context.querySelector(this.settings.verifyPhoneInput)
        let url = target.dataset.url;
        let data = {token: context.dataset.token, phone: phone && phone.value};
        this.refresh(url, data, context);
    }

    resetCode(event) {
        let target = event.rsTarget;
        let context = target.closest(this.settings.verifyBlock);
        let url = target.dataset.url;
        let data = {token: context.dataset.token};
        this.refresh(url, data, context);
    }

    formatTime(second) {
        let hours = Math.floor(second / 3600);
        let minutes = Math.floor((second - hours * 3600) / 60);
        let seconds = Math.floor(second - (minutes * 60 + hours * 3600));
        return (hours > 0 ? ("0" + hours).substr(-2, 2) + ':' : '') +
            ("0" + minutes).substr(-2, 2) + ':' +
            ("0" + seconds).substr(-2, 2);
    }

    runTimer(element) {
        let interval = setInterval(() => {
            let delay = element.dataset.delayRefreshCodeSec ? element.dataset.delayRefreshCodeSec : 0;
            if (delay > 0) {
                delay--;
                let timer = element.querySelector(this.settings.verifyTimer);
                if (timer) {
                    timer.innerText = this.formatTime(delay);
                }
                element.dataset.delayRefreshCodeSec = delay;
            }
            if (delay <= 0) {
                clearInterval(interval);
                element.classList.remove(this.settings.waitClass);
            }
        }, 1000);
    }
};
new class ChangeOffer extends RsJsCore.classes.component {
    constructor() {
        super();
        let defaults = {
            offerInput: '[name="offer"]',
            notExistOffer: '.rs-not-exists-offer',
            context: '[data-id]',
            dataAttrChangeElements: 'changeElements',
            notAvaliableClass: 'rs-not-avaliable',
            buyOneClick: '.rs-buy-one-click',
            reserve: '.rs-reserve',
            badOfferClass: 'rs-bad-offer',
            badOfferError: '.rs-bad-offer-error',
            offerProperty: '.rs-offer-property',
            unitBlock: '.rs-unit-block',
            unitValue: '.rs-unit',
            priceSelector: '.rs-price-new',
            oldPriceSelector: '.rs-price-old',
            barcodeSelector: '.rs-product-barcode',
            inDialogUrlDataAttr: 'href',
            mainPicture: ".rs-main-picture",
            previewPicture: ".rs-gallery-source .rs-item",
            hiddenClass: 'd-none',
            sticksRow: '.rs-warehouse-row',
            stickWrap: '.rs-stick-wrap',
            stick: '.rs-stick',
            stickRowEmptyClass: 'rs-warehouse-empty',
            stickFilledClass: 'availability-indicator__point_act',
            stockCountTextContainer: '.rs-stock-count-text-container',
            stockCountTextWrapper: '.rs-stock-count-text-wrapper',
            hiddenOffers: '.rs-hidden-offers',
            multiOfferInput: '[name^="multioffers"]',
            noExistsClass: 'no-exists'
        };
        this.settings = {...defaults, ...this.getExtendsSettings()};
    }

    init(event) {
        event.target.querySelectorAll('.rs-product, .rs-multi-complectations').forEach((element) => {
            if (!element.changeOffer) {
                element.changeOffer = new ProductChangeOffer(element, this.settings);
            }
        });
    }

    onContentReady(event) {
        this.init(event);
    }
};

class ProductChangeOffer {
    constructor(context, settings) {
        this.context = context;
        this.settings = settings;
        this.scriptElement = this.context.querySelector('[rel="product-offers"]');
        if (this.scriptElement) {
            this.checkQuantity = parseInt(this.scriptElement.dataset.checkQuantity);
            this.isForcedReserved = this.context.classList.contains(this.settings.forcedReservedClass);
            this.offersData = JSON.parse(this.scriptElement.innerText);
            let selectedOfferId;
            this.context.querySelectorAll(this.settings.offerInput).forEach((it => {
                it.addEventListener('change', event => {
                    let selectedOfferData = this.getOfferById(event.target.value);
                    selectedOfferData && this.onChangeOffer(selectedOfferData, null, event);
                });
                if ((it.getAttribute('type') === 'radio' && it.checked) || (it.getAttribute('type') === 'hidden')) {
                    selectedOfferId = it.value;
                }
            }));
            this.context.querySelectorAll(this.settings.multiOfferInput).forEach((it => {
                it.addEventListener('change', event => this.onChangeMultiOffer(event));
            }));
            this.buildValueMatrix();
            this.setStartOffer(selectedOfferId);
        }
    }

    buildValueMatrix() {
        this.matrixValue = {};
        this.context.querySelectorAll('.item-product-choose > li').forEach(it => {
            it.querySelectorAll('[data-property-title]').forEach(element => {
                if (!this.matrixValue[element.dataset.propertyTitle]) {
                    this.matrixValue[element.dataset.propertyTitle] = {};
                }
                this.matrixValue[element.dataset.propertyTitle][element.value] = it;
            });
        });
    }

    setStartOffer(selectedOfferId) {
        let selectOfferData = this.getOfferById(selectedOfferId);
        if (selectOfferData && selectOfferData.info.length) {
            this.setOffer(selectedOfferId);
        } else if (this.offersData.levels && !this.offersData.virtual) {
            this.offersData.levels.forEach(level => {
                if (level.values.length) {
                    this.context.querySelectorAll('input[data-property-title="' + level.title + '"]').forEach(element => {
                        if (element.value === level.values[0].text) {
                            element.checked = true;
                        }
                    });
                }
            });
            this.onChangeMultiOffer();
        }
    }

    getOfferById(id) {
        if (this.offersData.offers) {
            for (const offer of this.offersData.offers) {
                if (offer.id == id) {
                    return offer;
                }
            }
        }
    }

    setOffer(offerId) {
        if (!this.offersData) {
            return;
        }
        let selectedOfferData = this.getOfferById(offerId);
        if (selectedOfferData) {
            let offerInput;
            this.context.querySelectorAll(this.settings.offerInput).forEach(element => {
                if (element.getAttribute('type') === 'radio' && element.value == offerId) {
                    offerInput = element;
                    offerInput.checked = true;
                }
                if (element.getAttribute('type') === 'hidden') {
                    offerInput = element;
                    offerInput.value = offerId;
                }
            });
            let formData = new FormData();
            if (this.offersData.levels && !this.offersData.vrtual) {
                this.setMultioffersByOfferData(selectedOfferData, formData);
            }
            this.onChangeOffer(selectedOfferData, formData);
        }
    }

    setMultioffersByOfferData(selectedOfferData, formData) {
        if (selectedOfferData.info) {
            for (let pair of selectedOfferData.info) {
                let [title, value] = pair;
                this.context.querySelectorAll('[data-property-title]').forEach(element => {
                    if (element.dataset.propertyTitle === title && element.value === value) {
                        element.checked = true;
                        formData.append(`multioffers[${element.dataset.propertyId}]`, element.value);
                    }
                });
            }
        }
    }

    getCurrentValueMatrix(formData) {
        let multiofferValues = [];
        this.context.querySelectorAll('[data-property-title]:checked').forEach(element => {
            formData.append(`multioffers[${element.dataset.propertyId}]`, element.value);
            multiofferValues.push([element.dataset.propertyTitle, element.value]);
        });
        return multiofferValues;
    }

    getUnExistsOffer() {
        let offer = {id: 0};
        if (this.offersData.levels && this.offersData.levels.length && this.offersData.offers && this.offersData.offers.length > 1) {
            offer.num = 0;
            offer.price = '--';
            offer.oldPrice = '--';
            offer.badOffer = true
        }
        return offer;
    }

    onChangeMultiOffer() {
        let formData = new FormData();
        let selectedOfferData = this.getUnExistsOffer();
        let multioffersMatrix = this.getCurrentValueMatrix(formData);
        let source = this.offersData.virtual ? this.offersData.virtual : this.offersData.offers;
        for (let offer of source) {
            let count = 0;
            offer.info.forEach(pair => {
                multioffersMatrix.forEach(selectedPair => {
                    if (pair[0] === selectedPair[0] && pair[1] === selectedPair[1]) {
                        count++;
                    }
                })
            });
            if (count === multioffersMatrix.length) {
                selectedOfferData = offer;
                break;
            }
        }
        if (selectedOfferData.url) {
            location.href = selectedOfferData.url;
        } else {
            this.context.querySelector(this.settings.offerInput).value = selectedOfferData.id;
            this.onChangeOffer(selectedOfferData, formData, event);
        }
    }

    onChangeOffer(selectedOfferData, formData, event) {
        this.changePrice(selectedOfferData);
        this.changeBarcode(selectedOfferData);
        this.changeUnit(selectedOfferData);
        this.showProperties(selectedOfferData);
        this.showPhotos(selectedOfferData);
        this.showAvailability(selectedOfferData);
        this.showStockSticks(selectedOfferData);
        this.updateButtonsLink(formData, selectedOfferData);
        this.checkBadOffer(selectedOfferData);
        this.context.dispatchEvent(new CustomEvent('offer-changed', {bubbles: true}));
    }

    checkBadOffer(selectedOfferData) {
        let errorContainer = this.context.querySelector(this.settings.badOfferError);
        if (selectedOfferData.badOffer) {
            this.context.classList.add(this.settings.badOfferClass);
            errorContainer && (errorContainer.innerText = lang.t('Товара в такой комплектации не существует'));
        } else {
            this.context.classList.remove(this.settings.badOfferClass);
            errorContainer && (errorContainer.innerText = '');
        }
    }

    changePrice(selectedOfferData) {
        if (selectedOfferData.price) {
            let price = this.context.querySelector(this.settings.priceSelector);
            price && (price.innerText = selectedOfferData.price);
        }
        if (selectedOfferData.oldPrice) {
            let oldPrice = this.context.querySelector(this.settings.oldPriceSelector);
            if (oldPrice) {
                oldPrice.innerText = selectedOfferData.oldPrice;
                if (selectedOfferData.oldPrice == 0 || selectedOfferData.oldPrice == selectedOfferData.price) {
                    oldPrice.parentElement.classList.add(this.settings.hiddenClass);
                } else {
                    oldPrice.parentElement.classList.remove(this.settings.hiddenClass);
                }
            }
        }
    }

    changeBarcode(selectedOfferData) {
        if (selectedOfferData.barcode) {
            let barcode = this.context.querySelector(this.settings.barcodeSelector);
            barcode && (barcode.innerText = selectedOfferData.barcode);
        }
    }

    changeUnit(selectedOfferData) {
        let unitBlock = this.context.querySelector(this.settings.unitBlock);
        if (unitBlock && selectedOfferData.unit && selectedOfferData.unit != "") {
            unitBlock.classList.remove(this.settings.hiddenClass);
            unitBlock.querySelector(this.settings.unitValue).innerText = selectedOfferData.unit;
        } else {
            unitBlock && unitBlock.classList.add(this.settings.hiddenClass);
        }
    }

    showProperties(selectedOfferData) {
        this.context.querySelectorAll(this.settings.offerProperty).forEach(element => {
            element.classList.add(this.settings.hiddenClass);
        });
        let propertyBlock = this.context.querySelector(this.settings.offerProperty + '[data-offer="' + selectedOfferData.id + '"]');
        propertyBlock && propertyBlock.classList.remove(this.settings.hiddenClass);
    }

    updateButtonsLink(formData, selectedOfferData) {
        if (!formData) {
            formData = new FormData();
        }
        if (selectedOfferData.id > 0) {
            formData.append('offer_id', selectedOfferData.id);
        }
        let queryParams = new URLSearchParams(formData);
        let replacer = (element) => {
            let clickHref = element.dataset[this.settings.inDialogUrlDataAttr].split('?');
            element.dataset[this.settings.inDialogUrlDataAttr] = clickHref[0] + "?" + queryParams.toString();
        };
        this.context.querySelectorAll(this.settings.buyOneClick).forEach(replacer);
        this.context.querySelectorAll(this.settings.reserve).forEach(replacer);
    }

    showPhotos(selectedOfferData) {
        if (selectedOfferData.photos) {
            let images = selectedOfferData.photos;
            if (!images || !images.length) images = [];
            this.context.dispatchEvent(new CustomEvent('offer-photo-changed', {
                bubbles: true,
                detail: {images: images}
            }));
        }
    }

    showAvailability(selectedOfferData) {
        if (this.checkQuantity) {
            let num = selectedOfferData.num;
            if (typeof (num) != 'undefined') {
                if (num <= 0) {
                    this.context.classList.add(this.settings.notAvaliableClass);
                } else {
                    this.context.classList.remove(this.settings.notAvaliableClass);
                }
            }
            this.highlightNotAvailable();
        }
    }

    getNodeIndex(element) {
        return [...element.parentNode.children].indexOf(element);
    }

    showStockSticks(selectedOfferData) {
        let sticks = selectedOfferData.sticks ? selectedOfferData.sticks : [];
        this.context.querySelectorAll(this.settings.stick).forEach((element) => {
            element.classList.remove(this.settings.stickFilledClass);
        });
        this.context.querySelectorAll(this.settings.sticksRow).forEach((row) => {
            let warehouseId = row.dataset.warehouseId;
            let num = sticks[warehouseId] ? sticks[warehouseId] : 0;
            row.querySelectorAll(this.settings.stick).forEach((stick) => {
                if (this.getNodeIndex(stick) < num) {
                    stick.classList.add(this.settings.stickFilledClass);
                }
            });
            if (num > 0) {
                row.classList.remove(this.settings.stickRowEmptyClass);
            } else {
                row.classList.add(this.settings.stickRowEmptyClass);
            }
        });
        let countText = this.context.querySelector(this.settings.stockCountTextContainer);
        if (countText) {
            let availableStockCount = 0;
            for (let warehouseId in sticks) {
                if (sticks[warehouseId] > 0) {
                    availableStockCount++;
                }
            }
            countText.innerText = lang.t('В наличии на %n [plural:%n:складе|складах|складах]', {n: availableStockCount});
            let countTextWrapper = countText.closest(this.settings.stockCountTextWrapper);
            availableStockCount > 0 ? countTextWrapper.classList.remove(this.settings.hiddenClass) : countTextWrapper.classList.add(this.settings.hiddenClass);
        }
    }

    highlightNotAvailable() {
        if (this.offersData.levels && this.offersData.levels.length && this.offersData.offers && this.offersData.offers.length > 1 && !this.offersData.virtual) {
            let multioffersMatrix = {};
            let levelCount = 0;
            this.context.querySelectorAll('input[data-property-title]:checked').forEach(element => {
                multioffersMatrix[element.dataset.propertyTitle] = element.value;
                levelCount++;
            });
            for (let i in this.matrixValue) {
                for (let j in this.matrixValue[i]) {
                    this.matrixValue[i][j].classList.add(this.settings.noExistsClass);
                }
            }
            if (!this.isForcedReserved) {
                this.offersData.offers.forEach(offer => {
                    let identity = 0;
                    let updatePair = [];
                    offer.info.forEach(pair => {
                        if (multioffersMatrix[pair[0]] && multioffersMatrix[pair[0]] == pair[1]) {
                            identity++;
                        } else {
                            updatePair.push(pair);
                        }
                    });
                    if (identity === levelCount) {
                        updatePair = offer.info;
                    }
                    if (identity >= levelCount - 1) {
                        if (offer.num > 0) {
                            updatePair.forEach((pair) => {
                                this.matrixValue[pair[0]][pair[1]].classList.remove(this.settings.noExistsClass);
                            });
                        }
                    }
                });
            }
        }
    }
};new class OffersPreview extends RsJsCore.classes.component {
    constructor(settings) {
        super();
        let defaults = {
            productContext: '[data-id]',
            offersPreviewContainer: '.rs-offers-preview',
            previewBlockClass: 'item-card__wrapper',
            previewTableClass: 'item-list__bar',
            price: '.rs-price-new',
            oldPrice: '.rs-price-old',
            toProductLink: '.rs-to-product',
            toCartButton: '.rs-to-cart',
            reserveButton: '.rs-reserve',
            oneClickButton: '.rs-buy-one-click',
            mainImage: '.rs-image',
            initOnHover: false,
            hiddenClass: 'd-none',
            notAvaliableClass: 'rs-not-avaliable',
            forcedReservedClass: 'rs-forced-reserve',
            noExistsClass: 'no-exists',
            badOfferClass: 'rs-bad-offer',
            badOfferError: '.rs-bad-offer-error',
        };
        this.settings = {...defaults, ...this.getExtendsSettings(), ...settings};
        this.counter = 1;
    }

    onContentReady(event) {
        event.target.querySelectorAll('script[rel="offers"]').forEach((scriptElement) => {
            if (!scriptElement.offersPreview) {
                scriptElement.offersPreview = new OffersPreviewCard(scriptElement, this.settings, this.counter++);
            }
        });
    }
};

class OffersPreviewCard {
    constructor(scriptElement, settings, index) {
        this.settings = settings;
        this.scriptElement = scriptElement;
        this.context = this.scriptElement.closest(this.settings.productContext);
        this.isForcedReserved = this.context.classList.contains(this.settings.forcedReservedClass);
        this.productId = this.context.dataset.id;
        this.offersData = JSON.parse(this.scriptElement.innerText);
        this.unique = index;
        this.checkQuantity = parseInt(this.scriptElement.dataset.checkQuantity);
        this.toCartButton = this.context.querySelector(this.settings.toCartButton);
        this.reserveButton = this.context.querySelector(this.settings.reserveButton);
        this.toProductLink = this.context.querySelectorAll(this.settings.toProductLink);
        this.oneClickButton = this.context.querySelector(this.settings.oneClickButton);
        this.toCartButton && (this.toCartButton.originalHref = this.toCartButton.dataset.href);
        this.reserveButton && (this.reserveButton.originalHref = this.reserveButton.dataset.href);
        this.oneClickButton && (this.oneClickButton.originalHref = this.oneClickButton.dataset.href)
        this.matrixValue = {};
        this.toProductLink.forEach((element) => {
            element.originalHref = element.getAttribute('href');
        });
        if (!this.settings.initOnHover) {
            this.init();
        } else {
            this.context.addEventListener('mouseenter', () => this.init(), {once: true});
        }
    }

    init() {
        let container = this.context.querySelector(this.settings.offersPreviewContainer);
        if ((this.offersData.levels && this.offersData.levels.length) || (this.offersData.offers && this.offersData.offers.length > 1)) {
            this.wrapper0 = document.createElement('div');
            this.wrapper0.className = container.classList.contains('item-card__wrapper') ? 'item-card__complete' : 'd-none d-sm-block mb-4';
            this.wrapper = document.createElement('div');
            this.wrapper.className = 'row g-3 row-cols-auto';
            this.wrapper0.appendChild(this.wrapper);
            container.prepend(this.wrapper0);
            if (this.offersData.levels && this.offersData.levels.length > 0) {
                this.makeByLevels();
            } else {
                this.makeByOffers();
            }
        }
    }

    makeByLevels() {
        this.offersData.levels.forEach((level) => {
            let choose = this.makeChoose(level.title);
            level.values.forEach((value, i) => {
                let className = 'radio-' + (level.isPhoto ? 'image' : level.type);
                let name = `${this.unique}-${this.productId}-${level.id}`;
                let id = `${this.unique}-${name}-${i}`;
                let {content, title} = this.getContentByLevel(level, value);
                let tpl = `<div class="${className}">
                                <input type="radio" id="${id}" name="${name}">
                                <label for="${id}" title="${title}">
                                    ${content}
                                </label>
                            </div>`;
                let li = document.createElement('li');
                li.innerHTML = tpl;
                let input = li.querySelector('input');
                input.dataset.propertyTitle = level.title;
                input.dataset.propertyId = level.id;
                input.value = value.text;
                input.setAttribute('autocomplete', 'off');
                input.addEventListener('change', event => this.onChangeMultioffers());
                if (!this.matrixValue[level.title]) {
                    this.matrixValue[level.title] = {};
                }
                this.matrixValue[level.title][value.text] = li;
                choose.append(li);
            });
        });
        let mainOfferId = this.offersData.mainOfferId;
        let mainOffer = this.getOfferById(mainOfferId);
        if (this.checkQuantity && mainOffer && mainOffer.num <= 0) {
            for (let offer of this.offersData.offers) {
                if (offer.num > 0) {
                    mainOfferId = offer.id;
                    break;
                }
            }
        }
        this.setMultiofferByOfferId(mainOfferId);
    }

    makeChoose(title) {
        let levelWrapper = document.createElement('div');
        levelWrapper.innerHTML = `<div class="fs-5 text-gray">${title}:</div>
                <ul class="item-product-choose"></ul>`;
        this.wrapper.appendChild(levelWrapper);
        return levelWrapper.querySelector('.item-product-choose');
    }

    getContentByLevel(level, value) {
        let content = '';
        let title = '';
        if (!level.isPhoto) {
            if (level.type === 'color') {
                if (value.image) {
                    content = `<img src="${value.image.url}" alt="" loading="lazy">`;
                } else {
                    content = `<div class="radio-bg-color" style="background-color:${value.color}"></div>`;
                }
            } else if (level.type === 'image' && value.image) {
                content = `<img src="${value.image.url}" alt="" loading="lazy">`;
                title = value.text;
            } else {
                content = value.text;
            }
        } else {
            if (value.image) {
                content = `<img src="${value.image.url}" alt="" loading="lazy">`;
                title = value.text;
            } else {
                content = value.text;
            }
        }
        return {content: content, title: title};
    }

    getOfferById(id) {
        if (this.offersData.offers) {
            for (const offer of this.offersData.offers) {
                if (offer.id == id) {
                    return offer;
                }
            }
        }
    }

    setMultiofferByOfferId(offerId) {
        let offer = this.getOfferById(offerId);
        if (offer && offer.info.length) {
            offer.info.forEach((pair) => {
                this.wrapper.querySelectorAll('input[data-property-title]').forEach(element => {
                    if (element.dataset.propertyTitle === pair[0] && element.value === pair[1]) {
                        element.checked = true;
                    }
                });
            });
            this.onChangeMultioffers();
        } else {
            this.offersData.levels.forEach(level => {
                if (level.values.length) {
                    this.wrapper.querySelectorAll('input[data-property-title="' + level.title + '"]').forEach(element => {
                        if (element.value === level.values[0].text) {
                            element.checked = true;
                        }
                    });
                }
            });
            this.onChangeMultioffers();
        }
    }

    onChangeMultioffers() {
        let formData = new FormData();
        let multioffersMatrix = [];
        let offerId = 0;
        this.wrapper.querySelectorAll('input[data-property-title]:checked').forEach(element => {
            formData.append(`multioffers[${element.dataset.propertyId}]`, element.value);
            multioffersMatrix.push([element.dataset.propertyTitle, element.value]);
        });
        for (let offer of this.offersData.offers) {
            let count = 0;
            offer.info.forEach(pair => {
                multioffersMatrix.forEach(selectedPair => {
                    if (pair[0] === selectedPair[0] && pair[1] === selectedPair[1]) {
                        count++;
                    }
                })
            });
            if (count === multioffersMatrix.length) {
                offerId = offer.id;
                break;
            }
        }
        this.onChangeOffer(offerId, formData);
    }

    makeByOffers() {
        if (this.offersData.offers && this.offersData.offers.length > 1) {
            let choose = this.makeChoose(this.offersData.offersCaption);
            let activeOffer;
            let firstExistsInput;
            for (let offer of this.offersData.offers) {
                let className = 'radio-list';
                let id = `${this.unique}-${this.productId}--${offer.id}`;
                let name = `${this.unique}-${this.productId}--`;
                let tpl = `<div class="${className}">
                                <input type="radio" id="${id}" name="${name}">
                                <label for="${id}">
                                    ${offer.title}
                                </label>
                            </div>`;
                let li = document.createElement('li');
                li.className = (this.checkQuantity && offer.num <= 0) ? this.settings.noExistsClass : '';
                li.innerHTML = tpl;
                let input = li.querySelector('input');
                input.value = offer.id;
                input.setAttribute('autocomplete', 'off');
                input.checked = (offer.id == this.offersData.mainOfferId);
                input.addEventListener('change', event => {
                    let offerId = event.target.value;
                    this.onChangeOffer(offerId);
                });
                choose.append(li);
                if (this.checkQuantity && offer.num > 0 && !firstExistsInput) {
                    firstExistsInput = input;
                }
                if (input.checked) {
                    activeOffer = offer;
                }
            }
            if (activeOffer && activeOffer.num <= 0 && firstExistsInput) {
                firstExistsInput.checked = true;
                firstExistsInput.dispatchEvent(new Event('change', {bubbles: true}));
            } else if (activeOffer) {
                this.addOfferToLink(null, activeOffer);
            }
        }
    }

    onChangeOffer(offerId, formData) {
        let offer;
        if (offerId > 0) {
            offer = this.getOfferById(offerId);
            this.changePrice(offer);
            this.changePhoto(offer);
            this.changeAvailability(offer);
        } else {
            offer = null;
        }
        this.addOfferToLink(formData, offer);
        this.checkBadOffer(offer);
    }

    checkBadOffer(offer) {
        if (this.offersData.levels && this.offersData.levels.length && this.offersData.offers && this.offersData.offers.length > 1) {
            let errorContainer = this.context.querySelector(this.settings.badOfferError);
            if (offer === null) {
                this.context.classList.add(this.settings.badOfferClass);
                errorContainer && (errorContainer.innerText = lang.t('Нет комплектации'));
            } else {
                this.context.classList.remove(this.settings.badOfferClass);
                errorContainer && (errorContainer.innerText = '');
            }
        }
    }

    changePrice(offer) {
        let price = this.context.querySelector(this.settings.price);
        let oldPrice = this.context.querySelector(this.settings.oldPrice);
        price && (price.innerText = offer.price);
        if (oldPrice) {
            oldPrice.innerText = offer.oldPrice;
            if (offer.oldPrice == 0 || offer.oldPrice == offer.price) {
                oldPrice.parentElement.classList.add(this.settings.hiddenClass);
            } else {
                oldPrice.parentElement.classList.remove(this.settings.hiddenClass);
            }
        }
    }

    changePhoto(offer) {
        let imageElement = this.context.querySelector(this.settings.mainImage);
        if (imageElement) {
            let image;
            if (offer.photos && offer.photos.length) {
                if (this.offersData.images[offer.photos[0]]) {
                    image = this.offersData.images[offer.photos[0]];
                }
            } else {
                let mainImageId = this.offersData.mainImageId ? this.offersData.mainImageId : Object.keys(this.offersData.images)[0];
                image = this.offersData.images[mainImageId];
            }
            if (image) {
                imageElement.src = image.url;
                imageElement.srcset = image.url2x + ' 2x';
            }
        }
    }

    addOfferToLink(formData, offer) {
        if (!formData) {
            formData = new FormData();
        }
        if (offer) {
            formData.append('offer_id', offer.id);
        }
        let queryParams = new URLSearchParams(formData);
        if (this.toCartButton) {
            this.toCartButton.dataset.href = this.toCartButton.originalHref
                + (this.toCartButton.originalHref.indexOf('?') === -1 ? '?' : '&')
                + queryParams.toString();
        }
        if (this.reserveButton) {
            this.reserveButton.dataset.href = this.reserveButton.originalHref
                + (this.reserveButton.originalHref.indexOf('?') === -1 ? '?' : '&')
                + queryParams.toString();
        }
        if (this.oneClickButton) {
            this.oneClickButton.dataset.href = this.oneClickButton.originalHref
                + (this.oneClickButton.originalHref.indexOf('?') === -1 ? '?' : '&')
                + queryParams.toString();
        }
        this.toProductLink.forEach((element) => {
            let newHref = element.originalHref + ((offer && offer.id != this.offersData.mainOfferId) ? '#' + offer.id : '');
            element.setAttribute('href', newHref);
        });
    }

    changeAvailability(offer) {
        if (this.checkQuantity) {
            if (offer.num <= 0) {
                this.context.classList.add(this.settings.notAvaliableClass);
            } else {
                this.context.classList.remove(this.settings.notAvaliableClass);
            }
            this.highlightNotAvailable();
        }
    }

    highlightNotAvailable() {
        if (this.offersData.levels && this.offersData.levels.length && this.offersData.offers && this.offersData.offers.length > 1 && !this.offersData.virtual) {
            let multioffersMatrix = {};
            let levelCount = 0;
            this.wrapper.querySelectorAll('input[data-property-title]:checked').forEach(element => {
                multioffersMatrix[element.dataset.propertyTitle] = element.value;
                levelCount++;
            });
            for (let i in this.matrixValue) {
                for (let j in this.matrixValue[i]) {
                    this.matrixValue[i][j].classList.add(this.settings.noExistsClass);
                }
            }
            if (!this.isForcedReserved) {
                this.offersData.offers.forEach(offer => {
                    let identity = 0;
                    let updatePair = [];
                    offer.info.forEach(pair => {
                        if (multioffersMatrix[pair[0]] && multioffersMatrix[pair[0]] == pair[1]) {
                            identity++;
                        } else {
                            updatePair.push(pair);
                        }
                    });
                    if (identity === levelCount) {
                        updatePair = offer.info;
                    }
                    if (identity >= levelCount - 1) {
                        if (offer.num > 0) {
                            updatePair.forEach((pair) => {
                                let value;
                                if (this.matrixValue[pair[0]]) {
                                    value = this.matrixValue[pair[0]][pair[1]];
                                }
                                if (value) {
                                    value.classList.remove(this.settings.noExistsClass);
                                } else {
                                    console.log('Ошибка в товаре ' + this.productId, 'Отсутстует комплектация', pair);
                                }
                            });
                        }
                    }
                });
            }
        }
    }
};new class Affiliate extends RsJsCore.classes.component {
    constructor() {
        super();
        let defaults = {
            confirmDialog: '.affilliate-confirm',
            confirmClose: '.modal-close',
            inputSearch: '.rs-city-search',
            autocompleteResult: '.rs-autocomplete-result',
            affiliateConfirmTemplate: '#affiliate-confirm-template'
        };
        this.settings = {...defaults, ...this.getExtendsSettings()};
    }

    initSearchAffiliateInDialog(newElement) {
        let input = newElement.querySelector(this.settings.inputSearch);
        let resultWrapper = input && input.parentNode.querySelector(this.settings.autocompleteResult);
        let cancelController;
        if (input && !input.rsInitialized) {
            input.rsInitialized = true;
            let autoCompleteInstance = new autoComplete({
                selector: () => input,
                searchEngine: () => true,
                wrapper: false,
                data: {
                    src: async () => {
                        if (cancelController) cancelController.abort();
                        cancelController = new AbortController();
                        let data = await this.utils.fetchJSON(input.dataset.urlSearch + '&' + new URLSearchParams({term: autoCompleteInstance.input.value}), {signal: cancelController.signal});
                        return data ? data.list : [];
                    }, keys: ['label']
                },
                resultsList: {class: '', maxResults: 20, position: 'beforeend', destination: () => resultWrapper,},
                resultItem: {
                    element: (element, data) => {
                        let tpl;
                        tpl = `<a class="dropdown-item" href="${data.value.url}">
                                        <div class="col">${data.value.label}</div>
                                    </a>`;
                        element.innerHTML = tpl;
                    }, selected: 'selected'
                },
                events: {
                    input: {
                        selection: (event) => {
                            location.href = event.detail.selection.value.url;
                        }
                    }
                }
            });
        }
    }

    checkNeedConfirmAffiliate() {
        let template = document.querySelector(this.settings.affiliateConfirmTemplate);
        if (template) {
            document.body.appendChild(template.content);
            let win = document.querySelector(this.settings.confirmDialog);
            win.querySelectorAll(this.settings.confirmClose).forEach(it => {
                it.addEventListener('click', event => this.closeConfirmAffiliate(event));
            });
        }
    }

    closeConfirmAffiliate(event) {
        let context = event.target.closest(this.settings.confirmDialog);
        context && context.remove();
        this.plugins.cookie.setCookie('affiliate_already_select', 1);
    }

    onDocumentReady() {
        this.checkNeedConfirmAffiliate();
    }

    onContentReady(event) {
        this.initSearchAffiliateInDialog(event.target);
    }
};
new class SearchLine extends RsJsCore.classes.component {
    onDocumentReady() {
        let searchLine = document.querySelector('.rs-search-line');
        let input = searchLine && searchLine.querySelector('.rs-autocomplete');
        let resultWrapper = searchLine && searchLine.querySelector('.rs-autocomplete-result');
        let clearButton = searchLine && searchLine.querySelector('.rs-autocomplete-clear');
        let cancelController;
        if (input && input.dataset.sourceUrl) {
            if (clearButton) {
                input.addEventListener('keyup', (event) => {
                    clearButton.classList.toggle('d-none', event.target.value === '');
                });
                clearButton.addEventListener('click', (event) => {
                    input.value = '';
                    input.dispatchEvent(new Event('keyup'));
                    input.dispatchEvent(new Event('keydown'));
                });
            }
            let onEnter = (event) => {
                if (event.key === 'Enter') {
                    event.target.closest('form').submit();
                }
            };
            this.autoComplete = new autoComplete({
                selector: () => input,
                searchEngine: () => true,
                wrapper: false,
                data: {
                    src: async () => {
                        if (cancelController) cancelController.abort();
                        cancelController = new AbortController();
                        let data = await this.utils.fetchJSON(input.dataset.sourceUrl + '&' + new URLSearchParams({term: this.autoComplete.input.value}), {signal: cancelController.signal});
                        return data ? data : [];
                    }, keys: ['value']
                },
                resultsList: {
                    class: '',
                    maxResults: 20,
                    destination: () => resultWrapper,
                    position: 'beforeend',
                    noResults: true,
                    element: (list, data) => {
                        if (!data.results.length) {
                            const message = document.createElement("li");
                            message.setAttribute("class", "no_result");
                            message.innerHTML = lang.t('Ничего не найдено по вашему запросу');
                            list.appendChild(message);
                        }
                    },
                },
                resultItem: {
                    element: (element, data) => {
                        let tpl;
                        if (data.value.type === 'product') {
                            tpl = `<a class="dropdown-item" href="${data.value.url}">
                                        <div class="col">${data.value.label}</div>
                                        <div class="ms-4 text-nowrap">${data.value.price}</div>
                                    </a>`;
                        } else {
                            let types = {'category': lang.t('Категория: '), 'brand': lang.t('Бренд: ')};
                            let typeAsString = types[data.value.type] ? types[data.value.type] : '';
                            tpl = `<a class="dropdown-item" href="${data.value.url}">
                                        <div class="col">${typeAsString}${data.value.label}</div>
                                    </a>`;
                        }
                        element.innerHTML = tpl;
                    }, selected: 'selected'
                },
                events: {
                    input: {
                        selection: (event) => {
                            if (event.detail.selection.value) {
                                input.removeEventListener('keyup', onEnter);
                                location.href = event.detail.selection.value.url;
                            }
                        }
                    }
                }
            });
            input.addEventListener('keyup', onEnter);
        }
    }
};
new class Compare extends RsJsCore.classes.component {
    constructor(settings) {
        super();
        let defaults = {
            comparePage: '.rs-compare-page',
            compareBlock: '.rs-compare-block',
            compareButton: '.rs-compare',
            compareItemsCount: '.rs-compare-items-count',
            activeCompareClass: 'rs-in-compare',
            activeClass: 'active',
            doCompare: '.rs-do-compare',
            removeItem: '.rs-remove',
            removeAll: '.rs-remove-all',
            context: '[data-id]',
            doCompareWindowTarget: '_blank',
            doCompareWindowParams: ''
        };
        this.settings = {...defaults, ...this.getExtendsSettings(), ...settings};
    }

    init() {
        this.blocks = document.querySelectorAll(this.settings.compareBlock);
        this.urls = JSON.parse(document.querySelector('[data-compare-url]').dataset.compareUrl);
        this.utils.on('click', this.settings.compareButton, event => this.toggleCompare(event))
        this.utils.on('click', this.settings.doCompare, event => this.compare(event));
        this.comparePage = document.querySelector(this.settings.comparePage);
        if (this.comparePage) {
            this.utils.on('click', this.settings.removeItem, event => this.removeItem(event), this.comparePage);
            this.utils.on('click', this.settings.removeAll, event => this.removeAll(event), this.comparePage);
        }
        this.initFirstState();
        this.initUpdateTitle();
    }

    add(productId) {
        this.toggleIcons(productId, true);
        let data = new FormData();
        data.append('id', productId);
        this.utils.fetchJSON(this.urls.add, {method: 'POST', body: data}).then(response => {
            this.checkActive(response.total);
        });
    }

    remove(productId) {
        this.toggleIcons(productId, false);
        let data = new FormData();
        data.append('id', productId);
        this.utils.fetchJSON(this.urls.remove, {method: 'POST', body: data}).then((response) => {
            if (response.success) {
                this.checkActive(response.total);
            }
        });
    }

    toggleIcons(productId, active) {
        let items = document.querySelectorAll('[data-id="' + productId + '"] ' + this.settings.compareButton);
        items.forEach((element) => {
            if (active) {
                element.classList.add(this.settings.activeCompareClass);
            } else {
                element.classList.remove(this.settings.activeCompareClass);
            }
            this.updateTitle(element);
        });
        return items;
    }

    toggleCompare(event) {
        let id = event.rsTarget.closest(this.settings.context).dataset.id;
        if (event.rsTarget.classList.contains(this.settings.activeCompareClass)) {
            this.remove(id);
        } else {
            this.add(id);
        }
        return false;
    }

    removeItem(event) {
        let id = event.rsTarget.closest('[data-compare-id]').dataset.compareId;
        this.remove(id);
    }

    removeAll(event) {
    }

    compare(event) {
        if (this.blocks[0].classList.contains(this.settings.activeClass)) {
            window.open(this.urls.compare, this.settings.doCompareWindowTarget, this.settings.doCompareWindowParams);
        }
        return false;
    }

    checkActive(count, productId, productState) {
        this.blocks.forEach((block) => {
            let counter = block.querySelector(this.settings.compareItemsCount);
            counter && (counter.innerHTML = count);
            if (count > 0) {
                block.classList.add(this.settings.activeClass);
            } else {
                block.classList.remove(this.settings.activeClass);
            }
        });
        if (productId) {
            this.toggleIcons(productId, productState)
        }
    }

    updateTitle(element) {
        let title = element.classList.contains(this.settings.activeCompareClass) ? element.dataset.alreadyTitle : element.dataset.title;
        if (typeof (title) != 'undefined') {
            element.title = title;
        }
    }

    initUpdateTitle() {
        document.querySelectorAll(this.settings.compareButton + '[data-title]').forEach((element) => this.updateTitle(element));
    }

    initFirstState() {
        if (global.compareProducts) {
            document.querySelectorAll(this.settings.compareButton).forEach((element) => {
                let productId = element.closest(this.settings.context).dataset.id;
                if (productId) {
                    let isActive = global.compareProducts.indexOf(parseInt(productId)) > -1;
                    isActive ? element.classList.add(this.settings.activeCompareClass) : element.classList.remove(this.settings.activeCompareClass);
                }
            });
        }
    }

    onDocumentReady() {
        this.init();
    }
};
new class Favorite extends RsJsCore.classes.component {
    constructor(settings) {
        super();
        let defaults = {
            favorite: '.rs-favorite-page',
            favoriteBlock: '.rs-favorite-block',
            favoriteLink: '.rs-favorite-link',
            favoriteCount: '.rs-favorite-items-count',
            favoriteButton: '.rs-favorite',
            inFavoriteClass: 'rs-in-favorite',
            activeClass: 'active',
            context: '[data-id]'
        };
        this.settings = {...defaults, ...this.getExtendsSettings(), ...settings};
    }

    init() {
        this.blocks = document.querySelectorAll(this.settings.favoriteBlock);
        let favUrlElement = document.querySelector('[data-favorite-url]');
        this.addUrl = favUrlElement && favUrlElement.dataset.favoriteUrl;
        if (this.addUrl) {
            this.favoriteCounterElement = document.querySelector(this.settings.favoriteCount);
            this.utils.on('click', this.settings.favoriteButton, event => this.toggleFavorite(event))
            this.utils.on('click', this.settings.favoriteLink, event => {
                location.href = event.rsTarget.dataset.href;
            });
            this.initFirstState();
            this.initUpdateTitle();
        } else {
            console.error(lang.t('Не найден элемент [data-favorite-url], содержащий ссылку на контроллер управления избранным'));
        }
    }

    toggleFavorite(event) {
        let productId = event.rsTarget.closest('[data-id]').dataset.id;
        if (event.rsTarget.classList.contains(this.settings.inFavoriteClass)) {
            this.remove(productId);
        } else {
            this.add(productId);
        }
        event.preventDefault();
    }

    add(productId) {
        this.toggleIcons(productId, true);
        let data = new FormData();
        data.append('Act', 'add');
        data.append('product_id', productId);
        this.utils.fetchJSON(this.addUrl, {method: 'POST', body: data}).then((response) => {
            this.checkActive(response.count, productId, true);
        });
    }

    toggleIcons(productId, active) {
        let items = document.querySelectorAll('[data-id="' + productId + '"] ' + this.settings.favoriteButton);
        items.forEach((element) => {
            if (active) {
                element.classList.add(this.settings.inFavoriteClass);
            } else {
                element.classList.remove(this.settings.inFavoriteClass);
            }
            this.updateTitle(element);
        });
        return items;
    }

    remove(productId) {
        let isFavoritePage;
        let items = this.toggleIcons(productId, false);
        items.forEach((element) => {
            isFavoritePage = element.closest(this.settings.favorite);
            if (isFavoritePage) {
                element.closest(this.settings.context).style.opacity = 0.5;
            }
        });
        if (items.length) {
            let data = new FormData();
            data.append('Act', 'remove');
            data.append('product_id', productId);
            this.utils.fetchJSON(this.addUrl, {method: 'POST', body: data}).then((response) => {
                if (response.success) {
                    this.checkActive(response.count, productId, false);
                    if (isFavoritePage) {
                        this.updateBody();
                    }
                }
            });
        }
    }

    updateBody() {
        this.utils.fetchJSON(window.location.href).then((response) => {
            let element = document.querySelector(this.settings.favorite);
            if (element) {
                let parent = element.parentNode;
                element.insertAdjacentHTML('afterend', response.html);
                element.remove();
                parent.dispatchEvent(new CustomEvent('new-content', {bubbles: true}));
                this.initUpdateTitle();
            }
        });
    }

    updateTitle(element) {
        let title = element.classList.contains(this.settings.inFavoriteClass) ? element.dataset.alreadyTitle : element.dataset.title;
        if (typeof (title) != 'undefined') {
            element.title = title;
        }
    }

    initFirstState() {
        if (global.favoriteProducts) {
            document.querySelectorAll(this.settings.favoriteButton).forEach((element) => {
                let productId = element.closest(this.settings.context).dataset.id;
                if (productId) {
                    let isActive = global.favoriteProducts.indexOf(parseInt(productId)) > -1;
                    isActive ? element.classList.add(this.settings.inFavoriteClass) : element.classList.remove(this.settings.inFavoriteClass);
                }
            });
        }
    }

    initUpdateTitle() {
        document.querySelectorAll(this.settings.favoriteButton + '[data-title]').forEach((element) => this.updateTitle(element));
    }

    checkActive(count, productId, productState, noFireOpener) {
        this.blocks.forEach((block) => {
            let counter = block.querySelector(this.settings.favoriteCount);
            counter && (counter.innerHTML = count);
            if (count > 0) {
                block.classList.add(this.settings.activeClass);
            } else {
                block.classList.remove(this.settings.activeClass);
            }
        });
        if (!noFireOpener) {
            try {
                window.opener.RsJsCore.components.Favorite.checkActive(count, null, null, true);
                if (productId) {
                    window.opener.RsJsCore.components.Favorite.toggleIcons(productId, productState);
                }
            } catch (e) {
            }
        }
    }

    onDocumentReady() {
        this.init();
    }
};

class SelectedAddressChange {
    constructor(element, eventTarget) {
        this.selector = {
            ownerSelector: '.rs-region-change',
            regionInput: '.rs-region-input',
            markedRegion: '.rs-region-marked',
            regionBlock: '.rs-region-block',
            otherRegionForm: 'form'
        };
        this.class = {open: 'rs-open',};
        this.mode = {selectedAddress: 'selectedAddress', dispatchEvent: 'dispatchEvent',};
        this.options = {resultEventTarget: eventTarget,};
        this.owner = element.querySelector(this.selector.ownerSelector);
        this.owner.querySelectorAll(this.selector.markedRegion).forEach((element) => {
            element.addEventListener('click', async () => {
                let address = await this.getAddressFieldsByRegionId(element.dataset.regionId);
                if (address) {
                    this.addressSelected(address);
                }
            });
        });
        this.owner.querySelector(this.selector.otherRegionForm).addEventListener('submit', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.selectOtherAddress(event.target);
        });
        if (this.owner.querySelector('[name="country_id"]')) {
            this.owner.querySelector('[name="country_id"]').addEventListener('change', (event) => {
                this.loadRegionsByCountry(event.target.value);
            });
        }
        this.initSearchAutocomplete();
    }

    initSearchAutocomplete() {
        let input = this.owner.querySelector(this.selector.regionInput);
        let resultWrapper = input && input.parentNode.querySelector('.rs-autocomplete-result');
        let cancelController;
        let autoCompleteInstance = new autoComplete({
            selector: () => input,
            searchEngine: () => true,
            wrapper: false,
            data: {
                src: async () => {
                    if (cancelController) cancelController.abort();
                    let data;
                    cancelController = new AbortController();
                    data = await RsJsCore.utils.fetchJSON(input.dataset.regionAutocompleteUrl + '&' + new URLSearchParams({term: autoCompleteInstance.input.value}), {signal: cancelController.signal});
                    return data ? data : [];
                }, keys: ['label']
            },
            resultsList: {maxResults: 20, class: '', position: 'beforeend', destination: () => resultWrapper,},
            resultItem: {
                element: (element, data) => {
                    let tpl;
                    tpl = `<a class="dropdown-item">
                                <div class="col">${data.value.label}</div>
                            </a>`;
                    element.innerHTML = tpl;
                }, selected: 'selected'
            },
            events: {
                input: {
                    selection: (event) => {
                        this.addressSelected(event.detail.selection.value.address_data);
                    }
                }
            }
        });
    }

    loadRegionsByCountry(countryId) {
        let data = new FormData();
        data.append('Act', 'getRegionsByParent');
        data.append('parent_id', countryId);
        RsJsCore.utils.fetchJSON(this.owner.dataset.url, {method: 'post', body: data}).then((response) => {
            if (response.success) {
                this.owner.querySelector(this.selector.regionBlock).innerHTML = response.regionBlock;
            }
        });
    }

    selectOtherAddress(form) {
        let address = {country_id: 0, region_id: 0, city_id: 0, country: '', region: '', city: '',};
        form.querySelectorAll('[name]').forEach((element) => {
            address[element.name] = element.value;
        });
        this.addressSelected(address);
    }

    async getAddressFieldsByRegionId(regionId) {
        let data = new FormData();
        data.append('Act', 'getAddressByRegion');
        data.append('region_id', regionId);
        return RsJsCore.utils.fetchJSON(this.owner.dataset.url, {method: 'post', body: data,}).then((response) => {
            if (response.success) {
                return response.address;
            }
        });
    }

    addressSelected(address) {
        let target = this.options.resultEventTarget;
        if (typeof (target) == 'function') {
            target(address);
        } else {
            target.dispatchEvent(new CustomEvent('addressSelected', {detail: {address: address}}));
        }
        RsJsCore.plugins.modal.close();
    }
};new class SelectCity extends RsJsCore.classes.component {
    constructor() {
        super();
        let defaults = {changeCity: '.rs-change-city'};
        this.settings = {...defaults, ...this.getExtendsSettings()};
    }

    init() {
        this.utils.on('click', this.settings.changeCity, event => this.changeCityDialog(event));
    }

    changeCityDialog(event) {
        let setAddressUrl = event.rsTarget.dataset.setAddressUrl;
        let dialogUrl = event.rsTarget.dataset.selectAddressUrl;
        this.plugins.openDialog.show({
            url: dialogUrl, bindSubmit: false, callback: (response, element) => {
                new SelectedAddressChange(element, (address) => {
                    let formData = new FormData();
                    for (let key in address) {
                        formData.append(key, address[key]);
                    }
                    this.utils.fetchJSON(setAddressUrl, {method: 'POST', body: formData}).then(response => {
                        if (response.success) {
                            location.replace(location.href.replace(location.hash, ""));
                        }
                    });
                });
            }
        });
    }

    onDocumentReady() {
        this.init();
    }
};
new class Cart extends RsJsCore.classes.component {
    constructor(settings) {
        super();
        let defaults = {
            cartBlockMain: '#rs-cart',
            cartBlock: '.rs-cart-block',
            context: '[data-id]',
            addToCart: '.rs-to-cart',
            reserve: '.rs-reserve',
            alreadyInCartClass: 'added',
            alreadyInCartClassTimeout: 5,
            noShowModalCartClass: 'rs-no-modal-cart',
            offerFormName: '[name="offer"]',
            amountFormName: '[name="amount"]',
            multiOfferFormName: '[name^="multioffers"]',
            concomitantFormName: '[name^="concomitant"]',
            cartTotalPrice: '.rs-cart-items-price',
            cartTotalItems: '.rs-cart-items-count',
            cartActiveClass: 'active',
            checkoutButton: '.rs-go-checkout',
            checkoutButtonActiveClass: 'active',
            cartAmountField: '.rs-amount',
            cartPage: '#rs-cart-page',
            cartForm: '#rs-cart-form',
            cartItem: '.rs-cart-item',
            cartItemRemove: '.rs-remove',
            cartItemRemoveConcomitant: '.rs-remove-concomitant',
            cartItemOffer: '.rs-offer',
            cartItemMultiOffer: '.rs-multioffer',
            cartGoBackButton: '.rs-go-back',
            cartItemHiddenOffers: '.rs-hidden-multioffer',
            cartClean: '.rs-clean',
            cartApplyCoupon: '.rs-apply-coupon',
            productWrapper: '.rs-product-item',
            inLoadingClass: 'in-loading',
            cartConcomitantCheckbox: '.rs-concomitant-checkbox',
        };
        this.settings = {...defaults, ...this.getExtendsSettings(), ...settings};
    }

    init() {
        this.utils.on('click', this.settings.addToCart, event => this.addToCart(event));
        this.utils.on('click', this.settings.reserve, event => this.reserve(event));
        this.utils.on('click', this.settings.checkoutButton, event => this.checkout(event));
        this.cartBlockMain = document.querySelector(this.settings.cartBlockMain);
        let cartPage = document.querySelector(this.settings.cartPage);
        if (cartPage) {
            this.initCart(cartPage.parentNode);
        }
        this.utils.on('click', this.settings.smartAmountBuyButton, event => this.smartAmountAdd(event));
    }

    addToCart(event) {
        let button = event.rsTarget;
        let context = button.closest(this.settings.context);
        this.changeStateToAdded(button);
        let formData = this.getProductParams(context);
        if (this.needShowSelectMultiofferDialog(button)) {
            let url = button.dataset.selectMultiofferHref;
            this.plugins.openDialog.show({url: url});
        } else {
            let url = button.dataset.href ? button.dataset.href : button.getAttribute('href');
            let noShowModalCart = this.cartBlockMain.classList.contains(this.settings.noShowModalCartClass) || button.classList.contains(this.settings.noShowModalCartClass);
            this.requestToCart(url, formData, noShowModalCart);
        }
    }

    reserve(event) {
        let button = event.rsTarget;
        let url;
        if (this.needShowSelectMultiofferDialog(button)) {
            url = button.dataset.selectMultiofferHref;
        } else {
            url = button.dataset.href;
        }
        if (url) {
            this.plugins.openDialog.show({url: url});
        }
    }

    needShowSelectMultiofferDialog(button) {
        if (!button.dataset.selectMultiofferHref) return false;
        let showOffersInListThemeOption = button.closest('[data-sol]');
        return !showOffersInListThemeOption || !window.matchMedia('(min-width: 992px)').matches;
    }

    requestToCart(url, formData, noShowModalCart) {
        this.utils.fetchJSON(url, {method: 'POST', body: formData}).then((response) => {
            this.updateCartBlock(response);
            if (!noShowModalCart) {
                this.plugins.modal.open(response.html, (event) => {
                    this.initCart(event.target);
                });
            }
        });
    }

    initCart(context) {
        this.cartPage = context.querySelector(this.settings.cartPage);
        if (this.cartPage) {
            this.utils.on('change', this.settings.cartAmountField, event => this.refresh(), this.cartPage);
            this.utils.on('click', this.settings.cartItemRemove, event => this.removeProduct(event), this.cartPage);
            this.utils.on('click', this.settings.cartItemRemoveConcomitant, event => this.removeConcomitant(event), this.cartPage);
            this.utils.on('change', this.settings.cartConcomitantCheckbox, () => this.refresh(), this.cartPage);
            this.utils.on('click', this.settings.cartGoBackButton, () => this.goBack(), this.cartPage);
            this.utils.on('change', this.settings.cartItemOffer, () => this.refresh(), this.cartPage);
            this.utils.on('change', this.settings.cartItemMultiOffer, (event) => this.changeMultiOffer(event), this.cartPage);
            this.utils.on('click', this.settings.cartClean, event => this.cleanCart(event), this.cartPage);
            this.utils.on('click', this.settings.cartApplyCoupon, () => this.refresh(), this.cartPage);
            let form = this.cartPage.querySelector(this.settings.cartForm);
            if (form) {
                form.addEventListener('submit', (event) => {
                    clearTimeout(this.cartPage.changeTimer);
                    this.refresh();
                    event.preventDefault();
                });
            }
        }
    }

    getCurrentValueMatrix(context) {
        let multiofferValues = [];
        context.querySelectorAll('[data-prop-title]').forEach(element => {
            multiofferValues.push([element.dataset.propTitle, element.value]);
        });
        return multiofferValues;
    }

    changeMultiOffer(event) {
        let context = event.target.closest(this.settings.cartItem);
        let values = this.getCurrentValueMatrix(context);
        let hiddenOffers = context.querySelectorAll(this.settings.cartItemHiddenOffers);
        let offerInput = context.querySelector(this.settings.cartItemOffer);
        console.log(offerInput);
        let foundOfferInput;
        hiddenOffers.forEach(element => {
            if (element.dataset.info) {
                let info = JSON.parse(element.dataset.info);
                let counter = 0;
                info.forEach(inputPair => {
                    values.forEach(valuesPair => {
                        if (inputPair[0] === valuesPair[0] && inputPair[1] === valuesPair[1]) counter++;
                    });
                });
                if (counter === values.length) {
                    foundOfferInput = element;
                }
            }
        });
        if (foundOfferInput) {
            offerInput.value = foundOfferInput.value;
        } else {
            offerInput.value = 0;
        }
        this.refresh();
    }

    removeProduct(event) {
        event.preventDefault();
        if (!this.isLoading()) {
            let removeButton = event.rsTarget;
            let cartItem = removeButton.closest(this.settings.cartItem);
            if (cartItem) {
                cartItem.style.opacity = 0.5;
                let other = cartItem.parentNode.querySelectorAll('[data-id="' + cartItem.dataset.productId + '"]');
                if (!other.length) {
                    document.querySelectorAll(this.settings.productWrapper + '[data-id="' + cartItem.dataset.productId + '"] ' + this.settings.addToCart).forEach(element => {
                        element.classList.remove(this.settings.alreadyInCartClass);
                    });
                }
            }
            this.refresh(removeButton.getAttribute('href'));
        }
    }

    refresh(url, callback) {
        let cartForm = this.cartPage.querySelector(this.settings.cartForm);
        let formData = new FormData(cartForm);
        if (!url) {
            url = cartForm.getAttribute('action');
        }
        cartForm.querySelectorAll('input, select, button').forEach(element => {
            element.disabled = true;
        });
        this.showLoading();
        this.utils.fetchJSON(url, {method: 'POST', body: formData}).then(response => {
            if (response.redirect) {
                location.href = response.redirect;
            }
            if (response.cart.items_count === 0 && this.plugins.modal.isOpen()) {
                this.plugins.modal.close();
            } else {
                this.cartPage.insertAdjacentHTML('afterend', response.html);
                let parent = this.cartPage.parentNode;
                this.cartPage.remove();
                this.initCart(parent);
                parent.dispatchEvent(new CustomEvent('new-content', {bubbles: true}));
                parent.dispatchEvent(new CustomEvent('cart.change', {"bubbles": true, "cancelable": true}));
            }
            this.updateCartBlock(response);
            if (callback) callback(response);
        });
    }

    updateCartBlock(response) {
        if (response) {
            global.cartProducts = response.cart.session_cart_products;
            document.querySelectorAll(this.settings.cartBlock).forEach((cartBlock) => {
                let totalItems = cartBlock.querySelector(this.settings.cartTotalItems);
                let totalPrice = cartBlock.querySelector(this.settings.cartTotalPrice);
                let checkoutButton = cartBlock.querySelector(this.settings.checkoutButton);
                totalItems && (totalItems.innerText = response.cart.items_count);
                totalPrice && (totalPrice.innerText = response.cart.total_price);
                if (checkoutButton) {
                    if (response.cart.can_checkout && parseFloat(response.cart.items_count) > 0) {
                        checkoutButton.classList.add(this.settings.checkoutButtonActiveClass);
                    } else {
                        checkoutButton.classList.remove(this.settings.checkoutButtonActiveClass);
                    }
                }
                if (parseFloat(response.cart.items_count) > 0) {
                    cartBlock.classList.add(this.settings.cartActiveClass);
                } else {
                    cartBlock.classList.remove(this.settings.cartActiveClass);
                }
            });
        }
    }

    showLoading() {
        this.cartPage.classList.add(this.settings.inLoadingClass);
    }

    isLoading() {
        return this.cartPage.classList.contains(this.settings.inLoadingClass);
    }

    getProductParams(context) {
        let data = new FormData();
        let radioInput = context.querySelector(this.settings.offerFormName + ':checked');
        let hiddenInput = context.querySelector(this.settings.offerFormName);
        let offerId = radioInput ? radioInput.value : (hiddenInput ? hiddenInput.value : 0);
        if (offerId) {
            data.append('offer', offerId);
        }
        let amountElement = context.querySelector(this.settings.amountFormName);
        let amount = amountElement && amountElement.value;
        if (amount) {
            data.append('amount', amount);
        }
        context.querySelectorAll(this.settings.multiOfferFormName + ':checked').forEach(element => {
            data.append(element.getAttribute('name'), element.value);
        });
        context.querySelectorAll(this.settings.concomitantFormName + ':checked').forEach(element => {
            data.append(element.getAttribute('name'), element.value);
        });
        data.append('floatCart', 1);
        return data;
    }

    changeStateToAdded(button) {
        if (button.timeoutText) {
            clearTimeout(button.timeoutText);
        }
        let buttonSpan = button.querySelector('span');
        button.classList.add(this.settings.alreadyInCartClass);
        if (!button.dataset.storedText && button.dataset.addText) {
            button.dataset.storedText = buttonSpan.innerHTML;
            buttonSpan.innerHTML = button.dataset.addText;
        }
        if (this.settings.alreadyInCartClassTimeout) {
            button.timeoutText = setTimeout(() => {
                button.classList.remove(this.settings.alreadyInCartClass);
                if (button.dataset.storedText) {
                    buttonSpan.innerHTML = button.dataset.storedText;
                    delete button.dataset.storedText;
                }
            }, this.settings.alreadyInCartClassTimeout * 1000);
        }
    }

    cleanCart(event) {
        event.preventDefault();
        document.querySelectorAll(this.settings.productWrapper + '[data-id] ' + this.settings.addToCart).forEach((element) => {
            element.classList.remove(this.settings.alreadyInCartClass)
        });
        this.refresh(event.rsTarget.getAttribute('href'));
    }

    goBack() {
        history.back();
    }

    checkout(event) {
        if (this.cartPage) {
            let cartForm = this.cartPage.querySelector(this.settings.cartForm);
            let url = cartForm.getAttribute('action');
            let checkoutParam = (url.indexOf('?') > -1 ? '&' : '?') + 'checkout=1';
            this.refresh(url + checkoutParam);
            event.preventDefault();
        }
    }

    onDocumentReady() {
        this.init();
    }

    onContentReady() {
        SmartAmount.init();
    }
};

class SmartAmount {
    constructor(element, settings) {
        let defaults = {
            smartAmount: '.rs-sa',
            smartAmountActiveClass: 'item-product-cart-action_amount',
            smartAmountBuyButton: '.rs-to-cart',
            smartAmountIncButton: '.rs-sa-inc',
            smartAmountDecButton: '.rs-sa-dec',
            smartAmountInput: '.rs-sa-input',
            productContext: '[data-id]'
        };
        this.settings = {...settings, ...defaults};
        this.smartButton = element;
        this.smartButton.querySelector(this.settings.smartAmountBuyButton).addEventListener('click', event => this.addProduct(event));
        this.smartButton.querySelector(this.settings.smartAmountIncButton).addEventListener('click', event => this.incButton(event));
        this.smartButton.querySelector(this.settings.smartAmountDecButton).addEventListener('click', event => this.decButton(event));
        this.amountInput = this.smartButton.querySelector(this.settings.smartAmountInput);
        this.amountInput.addEventListener('keyup', event => this.changeAmount(event));
        this.amountInput.addEventListener('blur', event => this.blur(event));
        this.amountParams = JSON.parse(this.smartButton.dataset.amountParams);
        document.addEventListener('cart.removeProduct', event => this.onRemoveProduct(event));
        this.restoreFromCache();
    }

    restoreFromCache() {
        let productId = this.smartButton.closest(this.settings.productContext).dataset.id;
        let numList = global.cartProducts[productId];
        if (numList) {
            let total = 0;
            for (let num in numList) {
                total = total + numList[num];
            }
            this.amountInput.value = total;
            this.smartButton.classList.add(this.settings.smartAmountActiveClass);
        } else {
            this.amountInput.value = 0;
            this.smartButton.classList.remove(this.settings.smartAmountActiveClass);
        }
    }

    onRemoveProduct(event) {
        let productId = this.smartButton.closest(this.settings.productContext).dataset.id;
        if (event.detail.productId === productId) {
            this.amountInput.value = 0;
            this.amountInput.dispatchEvent(new CustomEvent('keyup', {bubbles: true, detail: {noRefreshCart: true}}));
        }
    }

    addProduct() {
        this.smartButton.classList.add(this.settings.smartAmountActiveClass);
        this.smartButton.dispatchEvent(new CustomEvent('add-product', {bubbles: true}));
        this.amountInput.value = this.amountParams.amountAddToCart;
    }

    incButton() {
        let oldValue = parseFloat(this.amountInput.value);
        let newValue = Math.round((oldValue + this.amountParams.amountStep) * 1000) / 1000;
        let breakpoint = parseFloat(this.amountParams.amountBreakPoint);
        if (newValue < this.amountParams.minAmount) {
            newValue = this.amountParams.minAmount;
        }
        if (oldValue < breakpoint && newValue > breakpoint) {
            newValue = breakpoint;
        }
        if (this.amountParams.maxAmount !== null && newValue > this.amountParams.maxAmount) {
            newValue = this.amountParams.maxAmount;
            this.smartButton.dispatchEvent(new CustomEvent('max-limit', {bubbles: true}));
        } else {
            this.smartButton.dispatchEvent(new CustomEvent('increase-amount', {bubbles: true}));
        }
        this.amountInput.value = newValue;
        this.amountInput.dispatchEvent(new Event('keyup', {bubbles: true}));
    }

    decButton() {
        let oldValue = parseFloat(this.amountInput.value);
        let newValue = Math.round((oldValue - this.amountParams.amountStep) * 1000) / 1000;
        let breakpoint = parseFloat(this.amountParams.amountBreakPoint);
        if (newValue < this.amountParams.minAmount) {
            newValue = 0;
        }
        if (oldValue > breakpoint && newValue < breakpoint) {
            newValue = breakpoint;
        }
        if (newValue != 0 || !this.amountParams.forbidRemoveProducts) {
            this.smartButton.dispatchEvent(new CustomEvent('decrease-amount', {bubbles: true}));
            this.amountInput.value = newValue;
            this.amountInput.dispatchEvent(new Event('keyup', {bubbles: true}));
        }
        return false;
    }

    changeAmount(event) {
        let noChangesKeycodes = [16, 17, 18, 35, 36, 37, 39];
        if (noChangesKeycodes.includes(event.keyCode)) {
            return false;
        }
        let amount = this.amountInput.value;
        if (amount === '') {
            return false;
        }
        if (this.amountParams.maxAmount !== null && amount > parseFloat(this.amountParams.maxAmount)) {
            amount = this.amountParams.maxAmount;
            this.amountInput.value = amount;
            this.smartButton.dispatchEvent(new CustomEvent('max-limit', {bubbles: true}));
        }
        if (amount == 0) {
            this.smartButton.classList.remove(this.settings.smartAmountActiveClass);
            this.smartButton.dispatchEvent(new CustomEvent('remove-product', {bubbles: true}));
        }
        if (!event.detail || !event.detail.noRefreshCart) {
            let formData = new FormData();
            formData.append('id', this.smartButton.closest(this.settings.productContext).dataset.id);
            formData.append('amount', amount);
            RsJsCore.utils.fetchJSON(this.smartButton.dataset.url, {method: 'post', body: formData}).then(response => {
                if (response.success) {
                    RsJsCore.components.cart.updateCartBlock(response);
                }
            });
        }
    }

    blur() {
        if (this.amountInput.value === '') {
            this.amountInput.value = 0;
            this.amountInput.dispatchEvent(new Event('keyup', {bubbles: true}));
        }
    }

    static init(selector) {
        document.querySelectorAll(selector ? selector : '.rs-sa').forEach(element => {
            if (!element.smartAmount) {
                element.smartAmount = new SmartAmount(element);
            }
        });
    }
};new class Category extends RsJsCore.classes.component {
    dropdownOpen() {
        this.plugins.scroller.saveScroll();
        this.plugins.scroller.scroll(0, 0);
        const overlay = document.createElement('div');
        overlay.classList.add('dropdown-overlay');
        document.body.prepend(overlay);
        this.dropdownCatalog.classList.add('d-block');
        this.dropdownCatalog.style.top = this.head.clientHeight + 'px';
        overlay.addEventListener('click', this.dropdownCloseHandler);
        this.dropdownCatalogBtn.removeEventListener('click', this.dropdownOpenHandler);
        this.dropdownCatalogBtn.addEventListener('click', this.dropdownCloseHandler);
    };

    dropdownClose() {
        document.querySelector('.dropdown-overlay').remove();
        this.dropdownCatalog.classList.remove('d-block');
        this.dropdownCatalogBtn.removeEventListener('click', this.dropdownCloseHandler);
        this.dropdownCatalogBtn.addEventListener('click', this.dropdownOpenHandler);
        this.plugins.scroller.returnToPrevScroll();
    };

    dropdownBind(links, subcategories, linkAct, defaultSubCategory) {
        let dropdownChange = function (links, subcategories, linkAct) {
            links.forEach((it) => it.classList.remove(linkAct));
            if (this.dataset.target) {
                subcategories.forEach((it) => it.classList.remove('d-block'));
                let panel;
                let realPanel = document.getElementById(this.dataset.target);
                panel = realPanel || document.getElementById(defaultSubCategory);
                if (panel) {
                    panel.classList.add('d-block');
                }
                if (realPanel) {
                    this.classList.add(linkAct);
                }
            }
        };
        if (links.length) {
            links.forEach(function (it) {
                it.addEventListener('mouseover', dropdownChange.bind(it, links, subcategories, linkAct));
                it.addEventListener('touch', function (e) {
                    e.preventDefault();
                    dropdownChange.call(it, links, subcategories, linkAct);
                });
            });
        }
    };

    initDropdown() {
        this.dropdownOpenHandler = this.dropdownOpen.bind(this);
        this.dropdownCloseHandler = this.dropdownClose.bind(this);
        this.dropdownCatalogBtn = document.querySelector('.dropdown-catalog-btn');
        this.dropdownCatalog = document.querySelector('.head-dropdown-catalog');
        this.head = document.querySelector('.head');
        if (this.dropdownCatalogBtn) {
            this.dropdownCatalogBtn.addEventListener('click', this.dropdownOpenHandler);
            const dropdownLinks = document.querySelectorAll('.head-dropdown-catalog__category');
            const dropdownSubcategories = document.querySelectorAll('.head-dropdown-catalog__subcat');
            this.dropdownBind(dropdownLinks, dropdownSubcategories, 'head-dropdown-catalog__category_active', 'dropdown-subcat-0');
            const dropdownSubLinks = document.querySelectorAll('.head-dropdown-catalog__subcat-list-item');
            const dropdownSubSubcategories = document.querySelectorAll('.head-dropdown-catalog__subsubcat');
            this.dropdownBind(dropdownSubLinks, dropdownSubSubcategories, 'head-dropdown-catalog__subcat-list-item_active');
        }
    }

    onDocumentReady() {
        this.initDropdown();
    }
};
new class SideFilters extends RsJsCore.classes.component {
    constructor(settings) {
        super();
        let defaults = {
            targetList: '#products',
            context: '.rs-filter-section',
            form: '.rs-filters',
            submitButton: '.rs-apply-filter',
            cleanFilter: '.rs-clean-filter',
            activeFilterClass: 'rs-filter-active',
            multiSelectActiveClass: 'rs-active',
            multiSelectRemoveProps: '.rs-clear-one-filter',
            multiSelectBlock: '.rs-type-multiselect',
            multiSelectInsertBlock: '.rs-selected',
            multiSelectRowsBlock: '.rs-unselected',
            multiSelectRow: 'li',
            sliderInput: '.rs-type-interval .rs-plugin-input',
            loadingClass: 'rs-in-loading',
            disablePropertyClass: 'rs-disabled-property',
            hiddenClass: 'd-none'
        };
        this.settings = {...defaults, ...this.getExtendsSettings(), ...settings};
    }

    initFilters() {
        window.addEventListener('popstate', event => this.returnPageFilterFromFilter(event));
        let cleanButton = this.context.querySelector(this.settings.cleanFilter);
        cleanButton && cleanButton.addEventListener('click', (event) => this.cleanFilters(event));
        let submitButton = this.context.querySelector(this.settings.submitButton);
        submitButton && submitButton.classList.add(this.settings.hiddenClass);
        this.form = this.context.querySelector(this.settings.form);
        this.context.querySelectorAll('input[type="text"], input[type="hidden"], select').forEach((element) => {
            element.dataset.lastValue = element.value;
        });
        this.bindChanges();
        this.changeEventWithNoApply = new CustomEvent('change', {detail: {noApply: true}});
        this.checkActiveFilters();
    }

    changeMultiSelectCheckedRowsPosition() {
        this.context.querySelectorAll(this.settings.multiSelectBlock).forEach((it) => {
            let selectedList = it.querySelector(this.settings.multiSelectInsertBlock);
            if (selectedList) {
                let unselectedList = it.querySelector(this.settings.multiSelectRowsBlock);
                let haveChecked = false;
                it.querySelectorAll('input').forEach((input) => {
                    let li = input.closest(this.settings.multiSelectRow);
                    if (input.checked) {
                        haveChecked = true;
                        selectedList.append(li);
                    } else {
                        if (li.closest(this.settings.multiSelectInsertBlock)) {
                            unselectedList.prepend(li);
                        }
                    }
                });
                if (haveChecked) {
                    selectedList.classList.remove(this.settings.hiddenClass);
                } else {
                    selectedList.classList.add(this.settings.hiddenClass);
                }
            }
        });
    }

    returnPageFilterFromFilter(event) {
        this.cleanFilters(event, true);
        let params = history.state ? history.state : [];
        let formData = new FormData();
        params.forEach(keyval => {
            this.setFilterParam(keyval);
            formData.append(keyval[0], keyval[1]);
        });
        this.queryFilters(formData, false);
    }

    setFilterParam(keyval) {
        let key = keyval[0];
        let value = keyval[1];
        let filtersInputs = this.context.querySelectorAll("[name='" + key + "']");
        if (filtersInputs.length > 1) {
            filtersInputs = filtersInputs.filter((element) => {
                return element.value == value;
            });
        }
        if (filtersInputs.length) {
            let filtersInput = filtersInputs[0];
            let tagName = filtersInput.tagName.toLowerCase();
            switch (tagName) {
                case"input":
                    switch (filtersInput.getAttribute('type').toLowerCase()) {
                        case"checkbox":
                            filtersInput.checked = true;
                            break;
                        default:
                            filtersInput.value = value;
                            break;
                    }
                    break;
                default:
                    filtersInput.value = value;
                    break;
            }
            filtersInput.dispatchEvent(this.changeEventWithNoApply);
        }
    }

    getFiltersFormData() {
        let formData = new FormData(this.form);
        let queryValue = this.context.dataset.queryValue;
        if (queryValue != 'undefined' && queryValue.length) {
            formData.append('query', queryValue);
        }
        let forDelete = [];
        for (let pair of formData.entries()) {
            let key = pair[0];
            let value = pair[1];
            let field = this.context.querySelector('[name="' + key + '"][data-start-value]');
            if (field && field.dataset.startValue == value) {
                forDelete.push(key);
            }
        }
        forDelete.forEach((key) => formData.delete(key));
        return formData;
    }

    applyFilters(event) {
        if (event.detail && event.detail.noApply) return false;
        let formData = this.getFiltersFormData();
        this.queryFilters(formData);
    }

    checkActiveFilters() {
        this.context.querySelectorAll(this.settings.multiSelectBlock).forEach((element) => {
            let isSelected = element.querySelectorAll('input[type="checkbox"]:checked').length;
            isSelected ? element.classList.add(this.settings.multiSelectActiveClass) : element.classList.remove(this.settings.multiSelectActiveClass);
        });
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.changeMultiSelectCheckedRowsPosition();
        }, 300);
    }

    queryFilters(formData, updateHistoryState = true) {
        this.context.classList.add(this.settings.loadingClass);
        let filters = Array.from(formData.entries());
        filters.length ? this.context.classList.add(this.settings.activeFilterClass) : this.context.classList.remove(this.settings.activeFilterClass);
        let searchParams = new URLSearchParams(formData);
        let url = this.form.getAttribute('action');
        this.utils.fetchJSON(url + (url.indexOf('?') === -1 ? '?' : '&') + searchParams.toString(), {method: 'GET'}).then((response) => {
            let products = document.querySelector(this.settings.targetList);
            if (products) {
                let parent = products.parentNode;
                products.insertAdjacentHTML('afterend', response.html);
                products.remove();
                var url = decodeURIComponent(response.new_url);
                if (updateHistoryState) {
                    history.pushState(filters, null, url);
                }
                if (typeof response.filters_allowed_sorted !== "undefined") {
                    var allow_filters = Object.entries(response.filters_allowed_sorted);
                    if (allow_filters !== false) {
                        allow_filters.forEach((filter) => {
                            Object.entries(filter[1]).forEach((filter_val) => {
                                let inputFilter = this.context.querySelector('input[name="pf[' + filter[0] + '][]"][value="' + filter_val[0] + '"]');
                                let inputBFilter = this.context.querySelector('input[name="bfilter[' + filter[0] + '][]"][value="' + filter_val[0] + '"]');
                                if (filter_val[1] === false) {
                                    inputBFilter && inputBFilter.parentNode.classList.add(this.settings.disablePropertyClass);
                                    inputFilter && inputFilter.parentNode.classList.add(this.settings.disablePropertyClass);
                                } else {
                                    inputBFilter && inputBFilter.parentNode.classList.remove(this.settings.disablePropertyClass);
                                    inputFilter && inputFilter.parentNode.classList.remove(this.settings.disablePropertyClass);
                                }
                            });
                        });
                    }
                }
                parent.dispatchEvent(new CustomEvent('new-content', {bubbles: true}));
                this.context.dispatchEvent(new CustomEvent('filters.loaded', {bubbles: true}));
            } else {
                console.error(this.settings.targetList + ' selector not found');
            }
        }).finally(() => {
            this.context.classList.remove(this.settings.loadingClass);
        });
        this.checkActiveFilters();
    }

    cleanBlockProps(event) {
        let block = event.target.closest(this.settings.multiSelectBlock);
        block && block.querySelectorAll("input[type='checkbox']").forEach((element) => {
            element.checked = false;
            element.dispatchEvent(this.changeEventWithNoApply);
        });
        this.applyFilters(event);
    };

    bindChanges() {
        this.form.addEventListener('submit', event => this.applyFilters(event));
        this.context.querySelectorAll('select, input[type="radio"], input[type="checkbox"], input[type="hidden"]').forEach((element) => {
            element.addEventListener('change', event => this.applyFilters(event));
        });
        this.context.querySelectorAll(this.settings.multiSelectRemoveProps).forEach((element) => {
            element.addEventListener('click', event => this.cleanBlockProps(event));
        });
        this.context.querySelectorAll('input[type="text"]').forEach((element) => {
            element.addEventListener('keyup', (event) => {
                clearTimeout(this.keyupTimer);
                if (event.keyCode === 13) {
                    return;
                }
                this.keyupTimer = setTimeout(() => {
                    this.applyFilters(event);
                }, 500);
            });
        });
    };

    cleanFilters(event, noApply) {
        event.preventDefault();
        this.context.querySelectorAll('input[type="text"], input[type="hidden"], input[type="number"], select').forEach((element) => {
            element.value = element.dataset.startValue !== '' ? element.dataset.startValue : "";
            element.dispatchEvent(this.changeEventWithNoApply);
        });
        this.context.querySelectorAll('input[type="radio"][data-start-value]').forEach((element) => {
            element.checked = true;
        });
        this.context.querySelectorAll('input[type="checkbox"]').forEach((element) => {
            element.checked = false;
            element.dispatchEvent(this.changeEventWithNoApply);
        });
        if (!noApply) this.applyFilters(event);
        return false;
    }

    initSliders() {
        this.context.querySelectorAll(this.settings.sliderInput).forEach((pluginInput) => {
            let slider = JSON.parse(pluginInput.dataset.slider);
            let element = document.createElement('div');
            pluginInput.insertAdjacentElement('afterend', element);
            let context = pluginInput.closest('.rs-type-interval');
            let fromField = context.querySelector('.rs-filter-from');
            let toField = context.querySelector('.rs-filter-to');
            noUiSlider.create(element, {
                start: [fromField.value, toField.value],
                step: parseFloat(slider.step),
                connect: false,
                range: {'min': slider.from, 'max': slider.to},
                format: wNumb({decimals: slider.round, thousand: ''})
            });
            element.noUiSlider.on('slide', function (values, handle) {
                fromField.value = values[0];
                toField.value = values[1];
            });
            element.noUiSlider.on('change', function (values, handle) {
                pluginInput.dispatchEvent(new Event('change'));
            });
            let onKeyPress = (event) => {
                setTimeout(function () {
                    element.noUiSlider.set([parseFloat(fromField.value), parseFloat(toField.value)]);
                }, 10);
            };
            fromField.addEventListener('change', onKeyPress);
            fromField.addEventListener('keyup', onKeyPress);
            toField.addEventListener('change', onKeyPress);
            toField.addEventListener('keyup', onKeyPress);
        });
    }

    onDocumentReady() {
        this.context = document.querySelector(this.settings.context);
        if (this.context) {
            this.initSliders();
            this.initFilters();
        }
    }
};
new class EmailSubscribe extends RsJsCore.classes.component {
    executeScript(HTML) {
        var head = document.getElementsByTagName("head")[0];
        var scr;
        var tmp = document.createElement('div');
        tmp.innerHTML = HTML;
        var scrajx = tmp.getElementsByTagName('script');
        for (var i in scrajx) {
            scr = document.createElement("script");
            scr.text = scrajx[i].text;
            head.appendChild(scr);
            head.removeChild(scr);
        }
    }

    initAjaxForm() {
        this.utils.on('submit', '.rs-mailing', (event) => {
            event.preventDefault();
            let form = event.rsTarget;
            let mailingBlock = event.rsTarget.closest('.rs-mailing-block');
            let formData = new FormData(event.target);
            this.utils.fetchJSON(form.action, {method: 'POST', body: formData}).then((response) => {
                if (response.html) {
                    let parent = mailingBlock.parentNode;
                    mailingBlock.insertAdjacentHTML("afterend", response.html);
                    mailingBlock.remove();
                    this.executeScript(response.html);
                    parent.dispatchEvent(new CustomEvent('new-content', {bubbles: true}));
                }
            });
        });
    }

    onDocumentReady() {
        this.initAjaxForm();
    }
};
new class CookiePolicy extends RsJsCore.classes.component {
    onDocumentReady() {
        const cookiesPolicy = document.querySelector('.cookies-policy');
        const cookiesPolicyBtn = cookiesPolicy && cookiesPolicy.querySelector('.btn');
        if (cookiesPolicy) {
            cookiesPolicyBtn.addEventListener('click', () => {
                cookiesPolicy.classList.remove('cookies-policy_active');
                this.plugins.cookie.setCookie('cookiesPolicy', '1');
            });
        }
    }
};