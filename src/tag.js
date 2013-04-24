"use strict";
window.addEventListener("agent-load", function (ev) {
    var cacheBase = document.querySelector("[rel='cacheBase']").href;
    var linkBase = document.querySelector("[rel='linkBase']").href;
    var cacheIndex = document.querySelector("[rel='cacheIndex']").href;
    var cacheTemplate = document.querySelector(".cache");
    var linkTemplate = document.querySelector(".link");
    var indexTemplate = document.querySelector(".index");
    var elemTemplate = document.querySelector(".elem");
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
            var tags = getTagTexts(activity, ".tags");
            return anatta.q.all(tags.map(function (tag) {
                return updateCache(tag, activity);
            })).then(function () {
                return updateIndex(tags);
            });
        });
    };

    var getTagTexts = function (elem, query) {
        var tags = elem.querySelector(query);
        return tags.textContent.split(",").map(function (tag) {
            var tag_ = tag.trim();
            if (tag_) return tag_;
        });
    };

    var toID = function (prefix, src) {
        var body = Array.prototype.slice.call(src).map(function (ch) {
            return ch.charCodeAt(0).toString(16);
        }).join("");
        return prefix + "-" + body;
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
            var id = toID("link", activity.querySelector(".src").href);
            var updated = false;
            var article = cache.getElementById(id);
            var links = cache.querySelector("#links");
            if (!article) {
                return createArticle(cache, activity).then(
                    function (article) {
                        links.insertBefore(article, links.firstChild);
                        return [cache, true];
                    }
                );
            } else {
                return updateArticle(article, activity).then(
                    function (updated) {
                        if (updated) {
                            links.removeChild(article);
                            links.insertBefore(article, links.firstChild);
                            return [cache, updated];
                        }
                    }
                );
            }
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
        var cacheTitle = cache.querySelector("h1");
        cacheTitle.textContent = title;
        doc.body.innerHTML = cache.innerHTML;
        return doc;
    };

    var getTagHTML = function (elem, query, base) {
        var doc = elem.ownerDocument;
        var tagAnchorHTMLs= [];
        var tagTexts = getTagTexts(elem, query);
        tagTexts.forEach(function (tag) {
            var a = doc.createElement("a");
            a.textContent = tag;
            a.href = base + tag;
            tagAnchorHTMLs.push(a.outerHTML);
        });
        return tagAnchorHTMLs.join(", ");
    };

    var createArticle = function (cache, activity) {
        var uri = activity.querySelector(".src").href;
        var tags = activity.querySelector(".tags");
        return getConf().then(function (conf) {
            var tagBase = conf.first(
                {rel: "tagBase"}).html.getAttribute("href") + "?or=";
            var tagHTML = getTagHTML(activity, ".tags", tagBase);
            var obj = {
                id: toID("link", uri),
                view: url.resolve(linkBase, encodeURIComponent(uri)),
                title: activity.querySelector(".title").textContent,
                tags: tagHTML,
                updated: activity.querySelector(".date").textContent,
            };
            return window.fusion(obj, linkTemplate, cache);
        });
    };

    var getTagAnchorHTMLs = function (elem, query) {
        var tags = elem.querySelectorAll(query);
        var tagAnchorHTMLs = [];
        Array.prototype.forEach.call(tags, function (tag) {
            tagAnchorHTMLs.push(tag.outerHTML);
        });
        return tagAnchorHTMLs;
    };

    var updateArticle = function (article, activity) {
        var updated = false;
        var doc = article.ownerDocument;
        var tagAnchorHTMLs = getTagAnchorHTMLs(article, ".tag > a");
        return getConf().then(function (conf) {
            var tagBase = conf.first(
                {rel: "tagBase"}).html.getAttribute("href") + "?or=";
            getTagTexts(activity, ".tags").forEach(function (tag) {
                var a = doc.createElement("a");
                a.textContent = tag;
                a.href = tagBase + tag;
                var pos = tagAnchorHTMLs.indexOf(a.outerHTML);
                if (pos < 0) {
                    tagAnchorHTMLs.push(a.outerHTML);
                    updated = true;
                }
            });
            if (updated) {
                var tagHTML = tagAnchorHTMLs.sort().join(", ");
                article.querySelector(".tag").innerHTML = tagHTML;
                var date = activity.querySelector(".date").textContent;
                article.querySelector(".updated").textContent = date;
            }
            return updated;
        });
    };

    var updateIndex = function (tags) {
        return getIndex().then(function (index) {
            var tagElems = {};
            var elems = index.querySelectorAll(".elem");
            Array.prototype.forEach.call(elems, function (elem) {
                var tag = elem.textContent.trim();
                tagElems[tag] = elem;
            });
            tags.forEach(function (tag) {
                var id = toID("tag", tag);
                if (!index.getElementById(id)) {
                    tagElems[tag] = createElem(index, tag);
                }
            });
            var container = index.querySelector("#elems");
            container.innerHTML = "";
            Object.keys(tagElems).sort().forEach(function (tag) {
                var elem = tagElems[tag];
                container.appendChild(
                    tags.indexOf(tag) < 0 ? elem : updateElem(elem));
            });
            return index;
        }).then(function (index) {
            var indexLink = anatta.engine.link
            return resolveOrb(cacheIndex).then(function (indexUri) {
                return anatta.engine.link({href: indexUri}).put({
                    headers: {"content-type": "text/html;charset=utf-8"},
                    body: index.outerHTML
                });
            });
        });
    };

    var createIndex = function () {
        var title = "tag index"; 
        var doc = document.implementation.createHTMLDocument(title);
        var index = doc.importNode(indexTemplate, true);
        doc.body.innerHTML = index.innerHTML;
        return doc;
    };

    var createElem = function (index, tag) {
        var uriObj = Object.create(
                url.parse(cacheBase, true, true),
                {query: {value: {or: tag}}});
        var obj = {
            id: toID("tag", tag),
            view: url.format(uriObj),
            text: tag
        };
        return window.fusion(obj, elemTemplate, index);
    };

    var updateElem = function (elem) {
        var attr = "data-count";
        var count = elem.getAttribute(attr);
        elem.setAttribute(attr, count ? (count*1)+1 : "1");
        return elem;
    };

    var mergeEntities = function (tags, entities, intersection) {
        var base = "";
        var articles = {};
        entities.forEach(function (entity) {
            if (entity.response.status == "200") {
                if (!base) base = entity;
                var articles_ = entity.html.querySelectorAll(".link");
                Array.prototype.forEach.call(articles_, function (article) {
                    var updated = article.querySelector(".updated");
                    var msec = new Date(updated.textContent).valueOf();
                    var tags = getTagAnchorHTMLs(article, ".tag > a");
                    var obj = {
                        article: article,
                        count: 1, msec: msec, tags: tags
                    };
                    var fragment = articles[article.id];
                    if (fragment) {
                        if (msec < fragment.mec) {
                            obj.article = fragment.article;
                            obj.msec = fragment.msec;
                        }
                        obj.count = fragment.count + 1;
                        obj.tags = fragment.tags.concat(tags);
                    }
                    articles[article.id] = obj;
                });
            }
        });
        var articles_ = {};
        Object.keys(articles).forEach(function (id) {
            var article = articles[id];
            if (!intersection ||
                intersection && article.count == entities.length) {
                var key = [article.msec, id];
                var tagHTML = article.tags.sort().join(", ");
                article.article.querySelector(".tag").innerHTML = tagHTML;
                articles_[key] = article.article;
            }
        });
        return [base, articles_];
    };

    var formatDocument = function (base, title, articles) {
        if (!base.html || !articles) return "";
        var doc = base.html;
        doc.querySelector("title").textContent = title;
        doc.querySelector("h1").textContent = title;
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

    var getIndex = function () {
        return resolveOrb(cacheIndex).then(function (indexUri) {
            return anatta.engine.link({href: indexUri}).get();
        }).then(function (entity) {
            var status = entity.response.status;
            var index = status == "200" ? entity.html : createIndex();
            return index;
        });
    };

    var get = function (ev) {
        var respond = function (status, message) {
            ev.detail.respond(status, {
                "content-type": "text/html;charset=utf-8"
            }, message);
        };
        var query = ev.detail.request.location.query;
        if (!query.and && !query.or) {
            return getIndex().then(function (index) {
                respond("200", index.outerHTML);
            });
        }
        var tags = query.and ? query.and.split(" ") : query.or.split(" ");
        var tagDelimiter = query.and ? " && " : " || ";
        var title = "tag: " + tags.join(tagDelimiter);
        return anatta.q.all(tags.map(function (tag) {
            return resolveOrb(tag).then(function (cacheUri) {
                return anatta.engine.link({href: cacheUri}).get();
            });
        })).then(function (entities) {
            return mergeEntities(tags, entities, !!query.and);
        }).spread(function (base, articles) {
            return formatDocument(base, title, articles);
        }).then(function (doc) {
            var status = doc ? "200" : "404";
            var message = doc ? doc.outerHTML : "no link for " + tags;
            respond(status, message);
        }).fail(function (err) {
            respond("500", "somethind wrong ...\n\n: " + err);
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
