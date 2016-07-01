"use strict";

window.Streamer = (function build() {
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
            }},
            selectors: {value: {
                entries: "article",
                refresh: 'link[rel="refresh"]',
                backward: 'link[rel="backward"]'
            }}
        });
    };

    Streamer.prototype.on = function on(event, handler) {
        this.events[event] = handler || (() => {});
        return this;
    };

    Streamer.prototype.spawn = function spawn(name, ...args) {
        try {
            Reflect.apply(this.events[name], this, args);
        } catch (ex) {
            console.log(ex);
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
        load: (s) => (doc) => {
            s.entries.innerHTML = "";
            s.spawn("clear");
            s.links.refresh = getHref(doc, s.selectors.refresh);
            s.links.backward = getHref(doc, s.selectors.backward);
            const entries = doc.querySelectorAll(s.selectors.entries);
            const updated = updates.load(s, entries);
            s.spawn("refresh", updated);
        },
        refresh: (s) => (doc) => {
            s.links.refresh = getHref(doc, s.selectors.refresh);
            const entries = doc.querySelectorAll(s.selectors.entries);
            const updated = updates.refresh(s, entries);
            s.spawn("refresh", updated);
        },
        backward: (s) => (doc) => {
            s.links.backward = getHref(doc, s.selectors.backward);
            const entries = doc.querySelectorAll(s.selectors.entries);
            const updated = updates.backward(s, entries);
            s.spawn("refresh", updated);
        }
    };

    const updates = {
        load(s, entries) {
            return Array.from(entries).reduce(
                (updated, entry) =>
                    updates.insert(s, entry, () => {}) || updated, false);
        },
        refresh(s, entries) {
            const entries$ = Array.from(entries);
            entries$.reverse();
            return entries$.reduce(
                (updated, entry) =>
                    updates.insert(s, entry, cont => cont.firstChild) ||
                    updated, false);
        },
        backward(s, entries) {
            Array.from(entries).reduce(
                (updated, entry) =>
                    updates.insert(s, entry, () => {}) || updated, false);
        },
        insert(s, entry, getter) {
            if (s.entries.querySelector(`#${entry.id}`)) return false;
            const pivot = getter(s.entries);
            s.entries.insertBefore(
                s.entries.ownerDocument.importNode(entry, true), pivot);
            const id = pivot ? pivot.id : null;
            s.spawn("insert", s.formatter(entry), id);
            return true;
        }
    };

    const parseHtml = (html) => {
        const doc = document.implementation.createHTMLDocument("");
        doc.documentElement.innerHTML = html;
        return doc;
    };

    const getHtml = (uri, action) => {
        if (!uri) return null;
        const req = new XMLHttpRequest();
        req.addEventListener("load", ev => {
            const doc = parseHtml(req.responseText);
            // fix for href attr
            const link = document.createElement("link");
            link.href = uri;
            const base = doc.createElement("base");
            base.href = link.href;
            doc.head.appendChild(base);
            action(doc);
        }, false);
        req.open("GET", uri, true);
        req.setRequestHeader("cache-control", "no-cache");
        req.send();
        return req;
    };

    const getHref = (doc, selector) => {
        const elem = doc.querySelector(selector);
        return elem ? elem.href : "";
    };

    return Streamer;
})();
