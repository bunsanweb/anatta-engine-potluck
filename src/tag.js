/*global anatta, Streamer*/
"use strict";
window.addEventListener("agent-load", ev => {
    const cacheBase =
            document.querySelector("[rel='cacheBase']").getAttribute("href");
    const linkBase =
            document.querySelector("[rel='linkBase']").getAttribute("href");
    const cacheIndex =
            document.querySelector("[rel='cacheIndex']").getAttribute("href");
    const cacheTemplate = document.querySelector(".cache");
    const linkTemplate = document.querySelector(".link");
    const indexTemplate = document.querySelector(".index");
    const elemTemplate = document.querySelector(".elem");
    const url = anatta.builtin.url;

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
            const path = url.resolve(cacheBase, uri);
            if (orb) return Promise.resolve(url.resolve(orb, path));
            return getConf().then(entity => {
                orb = entity.first({rel: "orb"}).href();
                return url.resolve(orb, path);
            });
        };
    })();

    const refresh = (() => {
        let streamer = null;
        return () => getConf().then(conf => {
            if (streamer) {
                streamer.get("refresh")();
            } else {
                const uri = conf.first({rel: "activities"}).href();
                streamer = new Streamer(uri);
                streamer.on("insert", insert);
                streamer.on("refresh", updated => setTimeout(
                    streamer.get("refresh"), updated ? 500 : 5000));
                streamer.get("load")();
            }
            return streamer;
        });
    })();

    let queue = Promise.resolve(null);
    const insert = (activity) => {
        queue = queue.then(() => {
            const tags = getTagTexts(activity, ".tags");
            return Promise.all(tags.map(tag => updateCache(tag, activity))).
                then(() => updateIndex(tags));
        });
    };

    const getTagTexts = (elem, query) => {
        const tags = elem.querySelector(query);
        return tags.textContent.split(",").map(tag => tag.trim()).
            filter(tag => tag !== "");
    };

    const toID = (prefix, src) => {
        const body = Array.from(
            src, ch => ch.charCodeAt(0).toString(16)).join("");
        return `${prefix}-${body}`;
    };

    const updateCache = (tag, activity) => resolveOrb(tag).then(cacheUri => {
        const cacheLink = anatta.engine.link({href: cacheUri});
        return cacheLink.get().then(cache => {
            const status = cache.response.status;
            return +status === 200 ? cache.html : createCache(tag);
        }).then(cache => {
            const id = toID(
                "link", activity.querySelector(".src").getAttribute("href"));
            const article = cache.getElementById(id);
            const links = cache.querySelector("#links");
            if (!article) {
                return createArticle(cache, activity).then(article => {
                    links.insertBefore(article, links.firstChild);
                    return [cache, true];
                });
            }
            return updateArticle(article, activity).then(updated => {
                if (updated) {
                    links.removeChild(article);
                    links.insertBefore(article, links.firstChild);
                }
                return [cache, updated];
            });
        }).then(a => Promise.all(a)).then(([cache, updated]) => {
            if (!updated) return null;
            return cacheLink.put({
                headers: {"content-type": "text/html;charset=utf-8"},
                body: cache.documentElement.outerHTML
            });
        });
    });

    const createCache = (tag) => {
        const title = `tag: ${tag}`;
        const doc = document.implementation.createHTMLDocument(title);
        const cache = doc.importNode(cacheTemplate, true);
        const cacheTitle = cache.querySelector("h1");
        cacheTitle.textContent = title;
        doc.body.innerHTML = cache.innerHTML;
        return doc;
    };

    const getTagHTML = (elem, query, base) => {
        const doc = elem.ownerDocument;
        const tagTexts = getTagTexts(elem, query);
        return tagTexts.map(tag => {
            const a = doc.createElement("a");
            a.textContent = tag;
            a.setAttribute("href", `${base}${tag}`);
            return a.outerHTML;
        }).join(", ");
    };

    const createArticle = (cache, activity) => {
        const uri = activity.querySelector(".src").getAttribute("href");
        return getConf().then(conf => {
            const tagBase =
                      conf.first({rel: "tagBase"}).html.getAttribute("href");
            const tagHTML = getTagHTML(activity, ".tags", `${tagBase}?or=`);
            const obj = {
                id: toID("link", uri),
                view: url.resolve(linkBase, encodeURIComponent(uri)),
                title: activity.querySelector(".title").textContent,
                tags: tagHTML,
                updated: activity.querySelector(".date").textContent
            };
            return window.fusion(obj, linkTemplate, cache);
        });
    };

    const getTagAnchorHTMLs = (elem, query) => {
        const tags = elem.querySelectorAll(query);
        return Array.from(tags, tag => tag.outerHTML);
    };

    const updateArticle = (article, activity) => {
        const doc = article.ownerDocument;
        const tagAnchorHTMLs = getTagAnchorHTMLs(article, ".tag > a");
        return getConf().then(conf => {
            const tagBase =
                      conf.first({rel: "tagBase"}).html.getAttribute("href");
            const updated = getTagTexts(activity, ".tags").reduce(
                (updated, tag) => {
                    const a = doc.createElement("a");
                    a.textContent = tag;
                    a.href = `${tagBase}?or=${tag}`;
                    const pos = tagAnchorHTMLs.indexOf(a.outerHTML);
                    if (pos < 0) {
                        tagAnchorHTMLs.push(a.outerHTML);
                        return true;
                    }
                    return updated;
                }, false);
            if (updated) {
                const tagHTML = tagAnchorHTMLs.sort().join(", ");
                article.querySelector(".tag").innerHTML = tagHTML;
                const date = activity.querySelector(".date").textContent;
                article.querySelector(".updated").textContent = date;
            }
            return updated;
        });
    };

    const updateIndex = (tags) => getIndex().then(index => {
        const tagElems = {};
        const elems = index.querySelectorAll(".elem");
        Array.from(elems).forEach(elem => {
            const tag = elem.textContent.trim();
            tagElems[tag] = elem;
        });
        tags.forEach(tag => {
            const id = toID("tag", tag);
            if (!index.getElementById(id)) {
                tagElems[tag] = createElem(index, tag);
            }
        });
        const container = index.querySelector("#elems");
        container.innerHTML = "";
        Object.keys(tagElems).sort().forEach(tag => {
            const elem = tagElems[tag];
            container.appendChild(
                tags.indexOf(tag) < 0 ? elem : updateElem(elem));
        });
        return index;
    }).then(index => resolveOrb(cacheIndex).then(
        indexUri => anatta.engine.link({href: indexUri}).put({
            headers: {"content-type": "text/html;charset=utf-8"},
            body: index.documentElement.outerHTML
        })));
    
    const createIndex = () => {
        const title = "tag index";
        const doc = document.implementation.createHTMLDocument(title);
        const index = doc.importNode(indexTemplate, true);
        doc.body.innerHTML = index.innerHTML;
        return doc;
    };

    const createElem = (index, tag) => {
        const uriObj = Object.createOA(
            url.parse(cacheBase, true, true),
            {query: {value: {or: tag}}});
        const obj = {
            id: toID("tag", tag),
            view: url.format(uriObj),
            text: tag
        };
        return window.fusion(obj, elemTemplate, index);
    };

    const updateElem = (elem) => {
        const attr = "data-count";
        const count = elem.getAttribute(attr);
        elem.setAttribute(attr, count ? count * 1 + 1 : "1");
        return elem;
    };

    const mergeEntities = (tags, entities, intersection) => {
        const activeEntities =
                  entities.filter(entity => +entity.response.status === 200);
        const base = activeEntities.length > 0 ? activeEntities[0] : null;
        const byId = {};
        activeEntities.forEach(entity => {
            const links = entity.html.querySelectorAll(".link");
            Array.from(links).forEach(link => {
                byId[link.id] = [link].concat(...byId[link.id]);
            });
        });
        const articles = {};
        Object.keys(byId).forEach(id => {
            const links = byId[id];
            const count = links.length;
            if (intersection && count !== entities.length) return;
            const tags = links.reduce((tags, link) => tags.concat(
                getTagAnchorHTMLs(link, ".tag > a")), []);
            const byDate = byId[id].map(link => ({
                date: new Date(link.querySelector(".updated").textContent),
                link
            })).sort((a, b) => a.date - b.date);
            const latest = byDate[byDate.length - 1];
            const key = [latest.date.getTime(), id];
            const tagHTML = tags.sort().join(", ");
            latest.link.querySelector(".tag").innerHTML = tagHTML;
            articles[key] = latest.link;
        });
        return [base, articles];
    };

    const formatDocument = (base, title, articles) => {
        if (!base.html || !articles) return "";
        const doc = base.html;
        doc.querySelector("title").textContent = title;
        doc.querySelector("h1").textContent = title;
        const container = doc.querySelector("#links");
        container.innerHTML = "";
        Object.keys(articles).sort().forEach(key => {
            const article = articles[key];
            container.insertBefore(
                doc.importNode(article, true), container.firstChild);
        });
        return doc;
    };

    const getIndex = () => resolveOrb(cacheIndex).then(
        indexUri => anatta.engine.link({href: indexUri}).get()
    ).then(
        entity => +entity.response.status === 200 ? entity.html : createIndex()
    );

    const get = (ev) => {
        const respond = (status, message) => ev.detail.respond(status, {
            "content-type": "text/html;charset=utf-8"
        }, message);
        const query = ev.detail.request.location.query;
        if (!query.and && !query.or) {
            return getIndex().then(
                index => respond("200", index.documentElement.outerHTML));
        }
        const tags = query.and ? query.and.split(" ") : query.or.split(" ");
        const tagDelimiter = query.and ? " && " : " || ";
        const title = `tag: ${tags.join(tagDelimiter)}`;
        return Promise.all(tags.map(tag => resolveOrb(tag).then(
            cacheUri => anatta.engine.link({href: cacheUri}).get()
        ))).then(
            entities => mergeEntities(tags, entities, !!query.and)
        ).then(a => Promise.all(a)).then(
            ([base, articles]) => formatDocument(base, title, articles)
        ).then(doc => {
            const status = doc ? "200" : "404";
            const message = doc ? doc.documentElement.outerHTML :
                    `no link for ${tags}`;
            return respond(status, message);
        }).catch(
            err => respond("500", `somethind wrong ...${"\n\n"}: ${err}`));
    };

    window.addEventListener("agent-access", ev => {
        ev.detail.accept();
        refresh().then(streamer => {
            if (ev.detail.request.method === "GET") {
                return get(ev);
            }
            return ev.detail.respond("405", {allow: "GET"}, "");
        });
    }, false);
    refresh();
}, false);
