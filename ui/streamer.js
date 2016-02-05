"use strict";

var Streamer = (function () {
    var Streamer = function Streamer(uri, formatter) {
        return Object.create(Streamer.prototype, {
            uri: {value: uri},
            formatter: {value: formatter || function (entry) {
                return document.importNode(entry, true);
            }},
            links: {value: {refresh: "", backward: ""}},
            ents: {value: []},
            entries: {value: document.createElement("div")},
            events: {value: {
                clear: function () {},
                insert: function () {},
                refresh: function () {}
            }},
            selectors: {value: {
                entries: "article",
                refresh: 'link[rel="refresh"]',
                backward: 'link[rel="backward"]'
            }}
        });
    };

    Streamer.prototype.on = function (event, handler) {
        this.events[event] = handler || function () {};
        return this;
    };

    Streamer.prototype.spawn = function (name) {
        var args = Array.prototype.slice.call(arguments, 1);
        try {
            this.events[name].apply(this, args);
        } catch (ex) {
        }
    };

    Streamer.prototype.get = function (action) {
        return actions[action].bind(this);
    };

    var actions = {
        load: function () {
            getHtml(this.uri, handlers.load.bind(this));
        },
        refresh: function () {
            getHtml(this.links.refresh, handlers.refresh.bind(this));
        },
        backward: function () {
            getHtml(this.links.backward, handlers.backward.bind(this));
        }
    };

    var handlers = {
        load: function (doc) {
            this.entries.innerHTML = "";
            this.spawn("clear");
            this.links.refresh = getHref(doc, this.selectors.refresh);
            this.links.backward = getHref(doc, this.selectors.backward);
            var entries = doc.querySelectorAll(this.selectors.entries);
            var updated = updates.load.call(this, entries);
            this.spawn("refresh", updated);
        },
        refresh: function (doc) {
            this.links.refresh = getHref(doc, this.selectors.refresh);
            var entries = doc.querySelectorAll(this.selectors.entries);
            var updated = updates.refresh.call(this, entries);
            this.spawn("refresh", updated);
        },
        backward: function (doc) {
            this.links.backward = getHref(doc, this.selectors.backward);
            var entries = doc.querySelectorAll(this.selectors.entries);
            var updated = updates.backward.call(this, entries);
        }
    };

    var updates = {
        load: function (entries) {
            var updated = false;
            Array.prototype.forEach.call(entries, function (entry) {
                updated = updates.insert.call(this, entry, function () {});
            }, this);
            return updated;
        },
        refresh: function (entries) {
            var updated = false;
            var entries_ = Array.prototype.slice.call(entries);
            entries_.reverse();
            Array.prototype.forEach.call(entries_, function (entry) {
                updated = updates.insert.call(this, entry, function (cont) {
                    return cont.firstChild;
                });
            }, this);
            return updated;
        },
        backward: function (entries) {
            var updated = false;
            Array.prototype.forEach.call(entries, function (entry) {
                updated = updates.insert.call(this, entry, function () {});
            }, this);
            return updated;
        },
        insert: function (entry, getter) {
            if (!!this.entries.querySelector("#" + entry.id)) return false;
            var pivot = getter(this.entries);
            this.entries.insertBefore(
                this.entries.ownerDocument.importNode(entry, true), pivot);
            var id = !!pivot ? pivot.id : null;
            this.spawn("insert", this.formatter(entry), id);
            return true;
        }
    };

    var parseHtml = function (html) {
        var doc = document.implementation.createHTMLDocument("");
        doc.documentElement.innerHTML = html;
        return doc;
    };

    var getHtml = function (uri, action) {
        if (!uri) return;
        var req = new XMLHttpRequest();
        req.addEventListener("load", function (ev) {
            var doc = parseHtml(req.responseText);
            // fix for href attr
            var link = document.createElement("link");
            link.href = uri;
            var base = doc.createElement("base");
            base.href = link.href;
            doc.head.appendChild(base);
            action(doc);
        }, false);
        req.open("GET", uri, true);
        req.setRequestHeader("cache-control", "no-cache");
        req.send();
        return req;
    };

    var getHref = function (doc, selector) {
        var elem = doc.querySelector(selector);
        return elem ? elem.href : "";
    };

    return Streamer;
})();
