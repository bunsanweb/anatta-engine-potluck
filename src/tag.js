"use strict";
window.addEventListener("agent-load", function (ev) {
    var cacheBase = document.querySelector("[rel='cacheBase']").href;
    var linkBase = document.querySelector("[rel='linkBase']").href;
    var cacheTemplate = document.querySelector(".cache");
    var linkTemplate = document.querySelector(".link");
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
            var path = url.resolve(cacheBase, uri);
            if (orb) return anatta.q.resolve(url.resolve(orb, path));
            return getConf().then(function (entity) {
                orb = entity.first({rel: "orb"}).href();
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
            var tags = getTags(activity, ".tags");
            return anatta.q.all(tags.map(function (tag) {
                return updateCache(tag, activity);
            }));
        });
    };

    var getTags = function (elem, query) {
        var tags = elem.querySelector(query);
        return tags.textContent.split(",").map(function (tag) {
            var tag_ = tag.trim();
            if (tag_) return tag_;
        });
    };

    var updateCache = function (tag, activity) {
        var cacheLink = "";
        return resolveOrb(tag).then(function (cacheUri) {
            cacheLink = anatta.engine.link({href: cacheUri});
            return cacheLink.get();
        }).then(function (cache) {
            var status = cache.response.status;
            var cache = status == "200" ? cache.html : createCache(tag);
            return cache;
        }).then(function (cache) {
            var id = idFromUri(activity.querySelector(".src").href);
            var updated = false;
            var article = cache.getElementById(id);
            var links = cache.querySelector("#links");
            if (!article) {
                updated = true;
                article = createArticle(cache, activity);
            } else {
                updated = updateArticle(article, activity);
                if (updated) links.removeChild(article);
            }
            if (updated) links.insertBefore(article, links.firstChild);
            return [cache, updated];
        }).spread(function (cache, updated) {
            if (!updated) return;
            return cacheLink.put({
                headers: {"content-type": "text/html;charset=utf-8"},
                body: cache.outerHTML
            });
        });
    };

    var createCache = function (tag) {
        var title = "tag: " + tag; 
        var doc = document.implementation.createHTMLDocument(title);
        var cache = doc.importNode(cacheTemplate, true);
        var cacheTitle = cache.querySelector(".title");
        cacheTitle.textContent = title;
        doc.body.innerHTML = cache.innerHTML;
        return doc;
    };

    var idFromUri = function (uri) {
        var head = "link-";
        return head + Array.prototype.slice.call(uri).map(function (ch) {
            return ch.charCodeAt(0).toString(16);
        }).join("");
    };

    var createArticle = function (cache, activity) {
        var uri = activity.querySelector(".src").href;
        var tags = activity.querySelector(".tags");
        var obj = {
            id: idFromUri(uri),
            view: linkBase + encodeURIComponent(uri),
            title: activity.querySelector(".title").textContent,
            tags: tags ? tags.textContent : "",
            updated: activity.querySelector(".date").textContent,
        };
        return window.fusion(obj, linkTemplate, cache);
    };

    var updateArticle = function (article, activity) {
        var updated = false;
        var tags = getTags(article, ".tag");
        getTags(activity, ".tags").forEach(function (tag) {
            var pos = tags.indexOf(tag);
            if (pos < 0) {
                tags.push(tag);
                updated = true;
            }
        });
        if (updated) {
            var tagText = tags.sort().join(", ");
            article.querySelector(".tag").textContent = tagText;
            var date = activity.querySelector(".date").textContent;
            article.querySelector(".updated").textContent = date;
        }
        return updated;
    };

    var mergeArticles = function (entities) {
        var base = "";
        var articles = {};
        entities.forEach(function (entity) {
            if (entity.response.status == "200") {
                if (!base) base = entity;
                var articles_ = entity.html.querySelectorAll(".link");
                Array.prototype.forEach.call(articles_, function (article) {
                    var updated = article.querySelector(".updated");
                    var msec = new Date(updated.textContent).valueOf();
                    var key = [msec, article.id];
                    articles[key] = article;
                });
            }
        });
        return [base, articles];
    };

    var formatDocument = function (base, tags, articles) {
        if (!base.html || !articles) return "";
        var doc = base.html;
        var title = "tag: " + tags.join(", ");
        doc.querySelector("title").textContent = title;
        doc.querySelector(".title").textContent = title;
        var container = doc.querySelector("#links");
        container.innerHTML = "";
        Object.keys(articles).sort().forEach(function (key) {
            var article = articles[key];
            container.insertBefore(
                doc.importNode(article, true),
                container.firstChild);
        });
        return doc;
    };

    var get = function (ev) {
        var respond = function (status, message) {
            ev.detail.respond(status, {
                "content-type": "text/html;charset=utf-8"
            }, message);
        };
        var query = ev.detail.request.location.query;
        if (!query.tag) respond("404", "no link");
        var tags = query.tag.split(" ");
        return anatta.q.all(tags.map(function (tag) {
            return resolveOrb(tag).then(function (cacheUri) {
                return anatta.engine.link({href: cacheUri}).get();
            });
        })).then(mergeArticles).spread(function (base, articles) {
            return formatDocument(base, tags, articles);
        }).then(function (doc) {
            var status = doc ? "200" : "404";
            var message = doc ? doc.outerHTML : "no link for " + tags;
            respond(status, message);
        }).fail(function (err) {
            respond("500", "somethind wrond ...\n\n: " + err);
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
