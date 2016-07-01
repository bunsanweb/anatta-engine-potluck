/*global anatta*/
"use strict";

// An agent for managing list of posts
window.addEventListener("agent-load", ev => {
    const base = document.querySelector("[rel='base']").getAttribute("href");
    const indexPath =
            document.querySelector("[rel='index']").getAttribute("href");
    const template = document.querySelector(".link");
    const url = anatta.builtin.url;
    const NUM = 5;

    const getConf = (() => {
        let conf = null;
        return () => {
            if (conf) return Promise.resolve(conf);
            const link = anatta.engine.link(
                document.querySelector("[rel='config']"),
                "text/html", anatta.entity);
            return link.get().then(entity => {
                conf = entity;
                return conf;
            });
        };
    })();

    const resolveOrb = (() => {
        let orb = null;
        return (uri) => {
            const path = url.resolve(base, uri);
            if (orb) return Promise.resolve(url.resolve(orb, path));
            return getConf().then(entity => {
                orb = entity.first({rel: "orb"}).href();
                //console.log(orb, path, url.resolve(orb, path));
                return url.resolve(orb, path);
            });
        };
    })();

    const getIndex = () => resolveOrb(indexPath).then(
        indexUri => anatta.engine.link({href: indexUri}).get());

    //NOTE: it should not include "." because of bad `querySelector` id
    const generateID = () =>
              `activity-${(Math.random() * 0x100000000000000).toString(16)}`;

    const putToOrb = (request) => {
        const id = generateID();
        //console.log(id);
        return resolveOrb(id).then(
            uri => anatta.engine.link({href: uri}).put(request));
    };

    const createIndex = () => {
        const doc = document.implementation.createHTMLDocument("activities");
        const div = doc.createElement("div");
        div.id = "links";
        doc.body.appendChild(div);
        return doc;
    };

    const toArticle = (index, entity) => getConf().then(conf => {
        const id = entity.request.location.path.slice(base.length);
        const article = entity.html.querySelector(".link");
        const tags = article.querySelector(".tags");
        const root = conf.first({rel: "activities"}).href();
        const uriObj = Object.create(
            url.parse(root, true, true),
            {query: {value: {id}}});
        const obj = {
            id,
            uri: url.format(uriObj),
            src: article.querySelector(".title").getAttribute("href"),
            title: article.querySelector(".title").textContent,
            tags: tags ? tags.textContent : "",
            author: article.querySelector(".author").textContent,
            date: article.querySelector(".date").textContent
        };
        //console.log(obj);
        return window.fusion(obj, template, index);
    });

    const updateIndex = (entity) => getIndex().then(indexEntity => {
        const index = +indexEntity.response.status !== 200 ?
                  createIndex() : indexEntity.html;
        //console.log(indexEntity.html.documentElement.outerHTML);
        return [indexEntity, index, toArticle(index, entity)];
    }).then(a => Promise.all(a)).then(([indexEntity, index, article]) => {
        const links = index.getElementById("links");
        links.insertBefore(article, links.firstChild);
        //console.log(index.documentElement.outerHTML);
        return indexEntity.put({
            headers: {"content-type": "text/html;charset=utf-8"},
            body: index.documentElement.outerHTML
        }).then(indexEntity =>
                article.querySelector(".href").getAttribute("href"));
    });
    
    const post = (ev) => {
        const request = ev.detail.request;
        putToOrb(request).then(updateIndex).then(
            location => ev.detail.respond("201", {location}, "")
        ).catch(err => ev.detail.respond("400", {
            "content-type": "text/html;charset=utf-8"
        }, `something wrong ... ${"\n\n"}${err}`));
    };

    const activitySlice = (pivot, max, getBack) => {
        const sibling = getBack ? "nextSibling" : "previousSibling";
        const slice = [];
        const append = getBack ? v => slice.push(v) : v => slice.unshift(v);
        //console.log(pivot);
        for (let p = pivot, i = 0; p && i < max; p = p[sibling], i++) {
            append(p);
        }
        return slice;
    };

    const findActivities = (query) => getIndex().then(index => {
        if (!index.html) return [];
        const pivot = index.html.getElementById(query.id);
        const links = index.html.getElementById("links");
        switch (query.on) {
        case "refresh": {
            const updated = activitySlice(pivot, NUM + 1, false);
            return updated.slice(0, -1);
        }
        case "backward": {
            const past = activitySlice(pivot, NUM + 1, true);
            return past.slice(1);
        }
        default:
            if (pivot) {
                return resolveOrb(query.id).then(
                    uri => anatta.engine.link({href: uri}).get()
                ).then(entity => [entity.html.querySelector(".link")]);
            }
            return activitySlice(links.firstChild, NUM, true);
        }
    });

    const formatUri = (location, on, elem) => {
        const id = elem ? elem.id : location.query.id;
        const search = id ? `?on=${on}&id=${id}` : "";
        const obj = Object.create(location, {search: {value: search}});
        const r = url.format(obj);
        //console.log("[formatUri]", r);
        return r;
    };
    
    const formatDocument = (activities, location) => {
        const doc = document.implementation.createHTMLDocument("activities");
        const div = doc.createElement("div");
        activities.forEach(
            status => div.appendChild(doc.importNode(status, true)));
        doc.body.appendChild(div);
        //console.log(activities.length, div.outerHTML);
        
        const refresh = doc.createElement("link");
        refresh.rel = "refresh";
        refresh.setAttribute(
            "href", formatUri(location, "refresh", div.firstChild));
        doc.head.appendChild(refresh);
        //console.log("[formatDocument]", refresh.outerHTML);

        const backward = doc.createElement("link");
        backward.rel = "backward";
        backward.setAttribute(
            "href", formatUri(location, "backward", div.lastChild));
        doc.head.appendChild(backward);

        return doc;
    };
    
    const get = (ev) => {
        const req = ev.detail.request;
        const query = req.location.query;
        return findActivities(query).then(activities => {
            const doc = formatDocument(activities, req.origin().location);
            ev.detail.respond("200", {
                "content-type": "text/html;charset=utf-8"
            }, doc.documentElement.outerHTML);
        }).catch(err => ev.detail.respond("500", {
            "content-type": "text/html;charset=utf-8"
        }, `something wrong ... ${"\n\n"}${err}`));
    };
    
    window.addEventListener("agent-access", ev => {
        ev.detail.accept();
        switch (ev.detail.request.method) {
        case "GET": return get(ev);
        case "POST": return post(ev);
        default: return ev.detail.respond("405", {allow: "GET,POST"}, "");
        }
    }, false);
}, false);
