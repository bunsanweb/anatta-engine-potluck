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
            }}
        });
    };

    anatta.engine.glossary.add(anatta.termset.desc.create({
        name: "stream",
        "content-type": "text/html",
        "uri-pattern": "^.*",
        entity: {
            refresh: {selector: "link[rel='refresh']", value: "href"},
            backward: {selector: "link[rel='backward']", value: "href"},
        }
    }));

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
        load: function (entity) {
            this.entries.innerHTML = "";
            this.spawn("clear");
            this.links.refresh = entity.attr("refresh");
            this.links.backward = entity.attr("backward");
            var updated = updates.load.call(this, entity.html);
            this.spawn("refresh", updated);
        },
        refresh: function (entity) {
            this.links.refresh = entity.attr("refresh");
            var updated = updates.refresh.call(this, entity.html);
            this.spawn("refresh", updated);
        },
        backward: function (entity) {
            this.links.backward = entity.attr("backward");
            var updated = updates.backward.call(this, entity.html);
        }
    };

    var updates = {
        load: function (doc) {
            var updated = false;
            var articles = doc.querySelectorAll("body > div > article");
            Array.prototype.forEach.call(articles, function (article) {
                updated = updates.insert.call(this, article, function () {});
            }, this);
            return updated;
        },
        refresh: function (doc) {
            var updated = false;
            var articles = doc.querySelectorAll("body > div > article");
            var articles_ = Array.prototype.slice.call(articles);
            articles_.reverse();
            articles_.forEach(function (article) {
                updated = updates.insert.call(this, article, function (elem) {
                    return elem.firstChild;
                });
            }, this);
            return updated;
        },
        backward: function (doc) {
            var updated = false;
            var articles = doc.querySelectorAll("body > div > article");
            Array.prototype.forEach.call(articles, function (article) {
                updated = updates.insert.call(this, article, function () {});
            }, this);
            return updated;
        },
        insert: function (article, getter) {
            if (!!this.entries.querySelector("#" + article.id)) return false;
            var pivot = getter(this.entries);
            var doc = this.entries.ownerDocument;
            this.entries.insertBefore(doc.importNode(article, true), pivot);
            //var id = !!pivot ? pivot.id : null;
            this.spawn("insert", this.formatter(article));
            return true;
        }
    };

    var getHtml = function (uri, action) {
        if (!uri) return;
        anatta.engine.link({href: uri}).get().then(function (entity) {
            action(entity);
        });
    };

    return Streamer;
})();
