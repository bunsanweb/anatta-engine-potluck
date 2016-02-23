"use strict";
window.addEventListener("agent-load", ev => {
    const base = document.querySelector("[rel='base']").getAttribute("href");
    const cacheTemplate = document.querySelector(".cache");
    const commentTemplate = document.querySelector(".comment");
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
            const path = url.resolve(base, uri);
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
        queue = queue.then(() => getCache(activity)).
            then(a => updateCache(...a)).
            then(a => Promise.all(a)).then(a => putCache(...a));
    };

    const createCache = (activity) => {
        const src = activity.querySelector(".src");
        const title = activity.querySelector(".title").textContent;
        src.textContent = title;
        const doc = document.implementation.createHTMLDocument(title);
        const cache = doc.importNode(cacheTemplate, true);
        const cacheTitle = cache.querySelector(".title");
        cacheTitle.appendChild(doc.importNode(src, true));
        doc.body.innerHTML = cache.innerHTML;
        return doc;
    };

    const getCache = (activity) => {
        const uri = activity.querySelector(".src").getAttribute("href");
        return resolveOrb(encodeURIComponent(uri)).then(
            cacheUri => anatta.engine.link({href: cacheUri}).get()
        ).then(cache => {
            const status = cache.response.status;
            const cacheDoc =
                      status == "200" ? cache.html : createCache(activity);
            return [activity, cacheDoc];
        });
    };

    const updateCacheTags = (cache, tags) => {
        if (!tags) return Promise.resolve(false);
        const cacheTags = cache.querySelector(".tags");
        const tagText = [cacheTags.textContent, tags.textContent].join(",");
        return linkToTagAgent(cache, tagText).then(tagHTML => {
            cacheTags.innerHTML = tagHTML;
            return true;
        });
    };

    const uniq = (a) => a.length <= 1 ? a : a.reduce((r, e) => {
        if (r[r.length - 1] !== e) r.push(e);
        return r;
    }, [a[0]]);
    const linkToTagAgent = (doc, tagText) => getConf().then(conf => {
        if (!tagText) return "";
        const tagBase = conf.first({rel: "tagBase"}).html.getAttribute("href");
        const tags = tagText.split(",").map(tag => tag.trim()).
                  filter(tag => tag !== "").sort();
        return uniq(tags).map(tag => {
            const a = doc.createElement("a");
            a.textContent = tag;
            a.href = `${tagBase}?or=${tag}`;
            return a.outerHTML;
        }).join(", ");
    });

    const updateCache = (activity, cache) => {
        const activity_ = cache.getElementById(activity.id);
        if (!!activity_) return [activity, cache, false];
        const href = activity.querySelector(".href");
        const link = anatta.engine.link(href, "text/html", anatta.entity);
        return link.get().then(entity => {
            const doc = entity.html;
            const tags = doc.querySelector(".tags");
            return [doc, updateCacheTags(cache, tags)];
        }).then(a => Promise.all(a)).then(([doc, updated]) => {
            const tagText = doc.querySelector(".tags").textContent;
            return [doc, linkToTagAgent(doc, tagText)];
        }).then(a => Promise.all(a)).then(([doc, tagHTML]) => {
            const obj = {
                id: activity.id,
                tags: tagHTML,
                author: doc.querySelector(".author").textContent,
                identity: doc.querySelector(".author").getAttribute("href"),
                date: doc.querySelector(".date").textContent,
                comment: doc.querySelector(".comment").innerHTML
            };
            const template = commentTemplate.cloneNode(true);
            const content = window.fusion(obj, template, cache);
            const comments = cache.querySelector("#comments");
            comments.appendChild(cache.importNode(content, true));
            return [activity, cache, true];
        });
    };

    const putCache = (activity, cache, updated) => {
        if (!updated) return Promise.resolve(true);
        const uri = activity.querySelector(".src").getAttribute("href");
        return resolveOrb(encodeURIComponent(uri)).then(cacheUri => {
            const cacheLink = anatta.engine.link({href: cacheUri});
            return cacheLink.put({
                headers: {"content-type": "text/html;charset=utf-8"},
                body: cache.documentElement.outerHTML
            });
        });
    };

    const get = (ev) => {
        const path = ev.detail.request.location.path;
        const uri = path.slice(path.indexOf(base) + base.length);
        return resolveOrb(uri).then(cacheUri => {
            const cacheLink = anatta.engine.link({href: cacheUri});
            return cacheLink.get();
        }).then(entity => {
            const res = entity.response;
            if (res.status == 200) {
                ev.detail.respond(res.status, res.headers, res.text());
            } else {
                ev.detail.respond("404", {
                    "content-type": "text/html;charset=utf-8"
                }, `there is no comment for ${decodeURIComponent(uri)}`);
            }
        }).catch(err => {
            ev.detail.respond("500", {
                "content-type": "text/html;charset=utf-8"
            }, `something wrong ...${"\n\n"}: ${err}`);
        });
    };

    window.addEventListener("agent-access", ev => {
        ev.detail.accept();
        refresh().then(streamer => {
            if (ev.detail.request.method == "GET") {
                return get(ev);
            }
            return ev.detail.respond("405", {allow: "GET"}, "");
        });
    }, false);
    refresh();
}, false);
