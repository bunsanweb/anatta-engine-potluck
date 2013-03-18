"use strict";
window.addEventListener("agent-load", function (ev) {
    var base = document.querySelector("[rel='base']").href;
    var template = document.querySelector(".link");
    var url = anatta.builtin.url;

    var getConf = (function () {
        var conf = null;
        return function () {
            if (conf) return anatta.q.resolve(conf);
            var link = anatta.engine.link(
                document.querySelector("[rel='config']"),
                "text/html", anatta.entity);
            return link.get().then(function (entity) {
                conf = entity;
                return conf;
            });
        };
    })();

    var resolveOrb = (function () {
        var orb = null;
        return function (uri) {
            var path = url.resolve(base, uri);
            if (orb) return anatta.q.resolve(url.resolve(orb, path));
            return getConf().then(function (entity) {
                orb = entity.html.querySelector("[rel='orb']").href;
                return url.resolve(orb, path);
            });
        };
    })();

    var refresh = (function () {
        var streamer = null;
        return function () {
            return getConf().then(function (conf) {
                if (streamer) {
                    streamer.get("refresh")();
                } else {
                    var uri = conf.first({rel: "activities"}).href();
                    streamer = new Streamer(uri);
                    streamer.on("insert", insert);
                    streamer.on("refresh", function (updated) {
                        return setTimeout(streamer.get("refresh"),
                            updated ? 500 : 5000);
                    });
                    streamer.get("load")();
                }
                return streamer;
            });
        };
    })();

    var queue = anatta.q.resolve(null);
    var insert = function (activity) {
        queue = queue.then(function () {
            return getCache(activity).spread(updateCache).spread(putCache);
        });
    };

    var createCache = function (activity) {
        var src = activity.querySelector(".src");
        src.textContent = activity.querySelector(".title").textContent;
        var doc = document.implementation.createHTMLDocument(src.textContent);
        var h1 = doc.createElement("h1");
        h1.appendChild(doc.importNode(src, true));
        doc.body.appendChild(h1);
        var div = doc.createElement("div");
        div.id = "activities";
        doc.body.appendChild(div);
        return doc;
    };

    var getCache = function (activity) {
        var uri = activity.querySelector(".src").href;
        var uri_ = encodeURIComponent(uri);
        return resolveOrb(uri_).then(function (cacheUri) {
            return anatta.engine.link({href: cacheUri}).get();
        }).then(function (cache) {
            var status = cache.response.status;
            var cache = status == "200" ? cache.html : createCache(activity);
            return [activity, cache];
        });
    };

    var updateCache = function (activity, cache) {
        var href = activity.querySelector(".href");
        var link = anatta.engine.link(href, "text/html", anatta.entity);
        return link.get().then(function (entity) {
            var doc = entity.html;
            var obj = {
                id: activity.id,
                tags: doc.querySelector(".tags").textContent,
                author: doc.querySelector(".author").textContent,
                identity: doc.querySelector(".author").href,
                date: doc.querySelector(".date").textContent,
                comment: doc.querySelector(".comment").innerHTML
            };
            var content = window.fusion(obj, template, cache);
            var activities = cache.getElementById("activities");
            activities.appendChild(cache.importNode(content, true));
            return [activity, cache];
        });
    };

    var putCache = function (activity, cache) {
        var uri = activity.querySelector(".src").href;
        var uri_ = encodeURIComponent(uri);
        return resolveOrb(uri_).then(function (cacheUri) {
            var cacheLink = anatta.engine.link({href: cacheUri});
            return cacheLink.put({
                headers: {"content-type": "text/html"},
                body: cache.outerHTML
            });
        });
    };

    var get = function (ev) {
        var path = ev.detail.request.location.path;
        var uri = path.slice(path.indexOf(base) + base.length);
        return resolveOrb(uri).then(function (cacheUri) {
            var cacheLink = anatta.engine.link({href: cacheUri});
            return cacheLink.get();
        }).then(function (entity) {
            var res = entity.response;
            if (res.status == 200) {
                ev.detail.respond(res.status, res.headers, res.text());
            } else {
                ev.detail.respond("404", {
                    "content-type": "text/html;charset=utf-8"
                }, "not found activities for " + decodeURIComponent(uri));
            }
        }).fail(function (err) {
            ev.detail.respond("500", {
                "content-type": "text/html;charset=utf-8"
            }, "something wrong ...\n\n: " + err);
        });
    };

    window.addEventListener("agent-access", function (ev) {
        ev.detail.accept();
        refresh().then(function (streamer) {
            if (ev.detail.request.method == "GET") {
                return get(ev);
            }
            return ev.detail.respond("405", {allow: "GET"}, "");
        });
    }, false);
    refresh();
}, false);
