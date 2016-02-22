"use strict";

const Streamer = (function () {
    const Streamer = function Streamer(uri, formatter) {
        return Object.create(Streamer.prototype, {
            uri: {value: uri},
            formatter: {value: formatter ||
                        (entry => document.importNode(entry, true))},
            links: {value: {refresh: "", backward: ""}},
            ents: {value: []},
            entries: {value: document.createElement("div")},
            events: {value: {
                clear: () => {},
                insert: () => {},
                refresh: () => {}
            }}
        });
    };

    anatta.engine.glossary.add(anatta.termset.desc.create({
        name: "stream",
        "content-type": "text/html",
        "uri-pattern": "^.*",
        entity: {
            refresh: {selector: "link[rel='refresh']", value: "href"},
            backward: {selector: "link[rel='backward']", value: "href"}
        }
    }));

    Streamer.prototype.on = function (event, handler) {
        this.events[event] = handler || (() => {});
        return this;
    };

    Streamer.prototype.spawn = function (name) {
        const args = Array.from(arguments).slice(1);
        try {
            this.events[name].apply(this, args);
        } catch (ex) {
            console.log(ex);
        }
    };

    Streamer.prototype.get = function (action) {
        return actions[action](this);
    };

    const actions = {
        load: (s) => () => getHtml(s.uri, handlers.load(s)),
        refresh: (s) => () => getHtml(s.links.refresh, handlers.refresh(s)),
        backward: (s) => () => getHtml(s.links.backward, handlers.backward(s))
    };

    const handlers = {
        load: (s) => (entity) => {
            s.entries.innerHTML = "";
            s.spawn("clear");
            s.links.refresh = entity.attr("refresh");
            s.links.backward = entity.attr("backward");
            const updated = updates.load(s, entity.html);
            s.spawn("refresh", updated);
        },
        refresh: (s) => (entity) => {
            s.links.refresh = entity.attr("refresh");
            const updated = updates.refresh(s, entity.html);
            s.spawn("refresh", updated);
        },
        backward: (s) => (entity) => {
            s.links.backward = entity.attr("backward");
            const updated = updates.backward(s, entity.html);
        }
    };

    const updates = {
        load: (s, doc) => {
            const articles = doc.querySelectorAll("body > div > article");
            return Array.from(articles).reduce(
                (updated, article) =>
                    updates.insert(s, article, () => {}) || updated, false);
        },
        refresh: (s, doc) => {
            const articles = Array.from(
                doc.querySelectorAll("body > div > article"));
            articles.reverse();
            return articles.reduce(
                (updated, article) => 
                    updates.insert(s, article, elem => elem.firstChild) ||
                    updated, false);
        },
        backward: (s, doc) => {
            const articles = doc.querySelectorAll("body > div > article");
            return Array.from(articles).reduce(
                (updated, article) =>
                    updates.insert(s, article, () => {}) || updated, false);
        },
        insert: (s, article, getter) => {
            if (!!s.entries.querySelector(`#${article.id}`)) return false;
            const pivot = getter(s.entries);
            const doc = s.entries.ownerDocument;
            s.entries.insertBefore(doc.importNode(article, true), pivot);
            const id = !!pivot ? pivot.id : null;
            s.spawn("insert", s.formatter(article), id);
            return true;
        }
    };

    const getHtml = function (uri, action) {
        if (!uri) return;
        anatta.engine.link({href: uri}).get().then(action);
    };

    return Streamer;
})();
