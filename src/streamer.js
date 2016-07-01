/*global anatta*/
"use strict";

window.Streamer = (function build() {
    const Streamer = function Streamer(uri, formatter) {
        const entries = document.createElement("div");
        //document.body.appendChild(entries);
        return Object.create(Streamer.prototype, {
            uri: {value: uri},
            formatter: {value: formatter ||
                        (entry => document.importNode(entry, true))},
            links: {value: {refresh: "", backward: ""}},
            ents: {value: []},
            entries: {value: entries},
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

    Streamer.prototype.on = function on(event, handler) {
        this.events[event] = handler || (() => {});
        return this;
    };

    Streamer.prototype.spawn = function spawn(name, ...args) {
        try {
            Reflect.apply(this.events[name], this, args);
        } catch (ex) {
            console.log(`[spawn] handler error of ${name}:`, ex);
        }
    };

    Streamer.prototype.get = function get(action) {
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
            //console.log("[handlers.load]", updated);
            s.spawn("refresh", updated);
        },
        refresh: (s) => (entity) => {
            s.links.refresh = entity.attr("refresh");
            //console.log("[handler.refresh]", s.links.refresh);
            const updated = updates.refresh(s, entity.html);
            s.spawn("refresh", updated);
        },
        backward: (s) => (entity) => {
            s.links.backward = entity.attr("backward");
            updates.backward(s, entity.html);
        }
    };

    const updates = {
        load: (s, doc) => {
            //console.log("[updates.load]", doc.documentElement.outerHTML);
            const articles = doc.querySelectorAll("body > div > article");
            //console.log("[updates.load/2]", articles.length);
            return Array.from(articles).reduce(
                (updated, article) =>
                    updates.insert(s, article, () => {}) || updated, false);
        },
        refresh: (s, doc) => {
            //console.log("[updates.refresh]", doc.documentElement.outerHTML);
            const articles = Array.from(
                doc.querySelectorAll("body > div > article"));
            //console.log("[updates.refresh/2]", articles.length);
            return articles.reduceRight(
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
            //console.log("[updates.intert]", article.id);
            //TBD: id must be escaped in selector: ".", ":", ...
            if (s.entries.querySelectorAll(`#${article.id}`).length !== 0) {
                return false;
            }
            const pivot = getter(s.entries);
            const doc = s.entries.ownerDocument;
            s.entries.insertBefore(doc.importNode(article, true), pivot);
            const id = pivot ? pivot.id : null;
            s.spawn("insert", s.formatter(article), id);
            return true;
        }
    };

    const getHtml = function getHtml(uri, action) {
        //console.log("[getHtml]", uri);
        if (!uri) return;
        anatta.engine.link({href: uri}).get().then(action).catch(
            err => console.log("[getHtml] err:", err));
    };

    return Streamer;
})();
