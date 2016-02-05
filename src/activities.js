"use strict";

// An agent for managing list of posts
window.addEventListener("agent-load", function (ev) {
    var base = document.querySelector("[rel='base']").getAttribute("href");
    var indexPath =
            document.querySelector("[rel='index']").getAttribute("href");
    var template = document.querySelector(".link");
    var url = anatta.builtin.url;
    var NUM = 5;

    var getConf = (function () {
        var conf = null;
        return function () {
            if (conf) return anatta.q(conf);
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
            if (orb) return anatta.q(url.resolve(orb, path));
            return getConf().then(function (entity) {
                orb = entity.first({rel: "orb"}).href();
                //console.log(orb, path, url.resolve(orb, path));
                return url.resolve(orb, path);
            });
        };
    })();

    var getIndex = function () {
        return resolveOrb(indexPath).then(function (indexUri) {
            return anatta.engine.link({href: indexUri}).get();
        });
    };

    var generateID = function () {
        return "activity-" + (Math.random() * 0x100000000).toString(16);
    };

    var putToOrb = function (request) {
        var id = generateID();
        //console.log(id);
        return resolveOrb(id).then(function (uri) {
            //console.log(uri, request.body);
            return anatta.engine.link({href: uri}).put(request);
        });
    };

    var createIndex = function () {
        var doc = document.implementation.createHTMLDocument("activities");
        var div = doc.createElement("div");
        div.id = "links";
        doc.body.appendChild(div);
        return doc;
    };

    var toArticle = function (index, entity) {
        return getConf().then(function (conf) {
            var id = entity.request.location.path.slice(base.length);
            var article = entity.html.querySelector(".link");
            var tags = article.querySelector(".tags");
            var root = conf.first({rel: "activities"}).href();
            var uriObj = Object.create(
                url.parse(root, true, true),
                {query: {value: {id: id}}});
            var obj = {
                id: id,
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
    };

    var updateIndex = function (entity) {
        return getIndex().then(function (indexEntity) {
            var index = "";
            if (indexEntity.response.status != "200") {
                index = createIndex();
            } else {
                index = indexEntity.html;
            }
            //console.log(indexEntity.html.documentElement.outerHTML);
            return [indexEntity, index, toArticle(index, entity)];
        }).spread(function (indexEntity, index, article) {
            var links = index.getElementById("links");
            links.insertBefore(article, links.firstChild);
            //console.log(index.documentElement.outerHTML);
            return indexEntity.put({
                headers: {"content-type": "text/html;charset=utf-8"},
                body: index.documentElement.outerHTML
            }).then(function (indexEntity) {
                return article.querySelector(".href").getAttribute("href");
            });
        });
    };
    
    var post = function (ev) {
        var request = ev.detail.request;
        putToOrb(request).then(updateIndex).then(function (location) {
            ev.detail.respond("201", {location: location}, "");
        }).fail(function (err) {
            ev.detail.respond("400", {
                "content-type": "text/html;charset=utf-8"
            }, "something wrong ... \n\n" + err);
        });
    };

    var activitySlice = function (pivot, max, getBack) {
        var sibling = getBack ? "nextSibling" : "previousSibling";
        var append = getBack ? "push" : "unshift";
        var slice = [];
        for (var i = 0; pivot && i < max; i++) {
            slice[append](pivot);
            pivot = pivot[sibling];
        }
        return slice;
    };

    var findActivities = function (query) {
        return getIndex().then(function (index) {
            if (!index.html) return [];
            var pivot = index.html.getElementById(query.id);
            var links = index.html.getElementById("links");
            switch (query.on) {
                case "refresh":
                    var slice = activitySlice(pivot, NUM+1, false);
                    return slice.slice(0, slice.length-1);
                case "backward":
                    var slice = activitySlice(pivot, NUM+1, true);
                    return slice.slice(1);
                default:
                    if (pivot) {
                        return resolveOrb(query.id).then(function (uri) {
                            return anatta.engine.link({href: uri}).get();
                        }).then(function (entity) {
                            return [entity.html.querySelector(".link")];
                        });
                    } else {
                        return activitySlice(links.firstChild, NUM, true);
                    }
            }
        });
    };

    var formatUri = function (location, on, elem) {
        var id = elem ? elem.id : location.query.id;
        var search = id ? "?on=" + on + "&id=" + id : "";
        var obj = Object.create(location, {search: {value: search}});
        return url.format(obj);
    };

    var formatDocument = function (activities, location) {
        var doc = document.implementation.createHTMLDocument("activities");
        var div = doc.createElement("div");
        activities.forEach(function (status) {
            div.appendChild(doc.importNode(status, true));
        });
        doc.body.appendChild(div);

        var refresh = doc.createElement("link");
        refresh.rel = "refresh";
        refresh.href = formatUri(location, "refresh", div.firstChild);
        doc.head.appendChild(refresh);

        var backward = doc.createElement("link");
        backward.rel = "backward";
        backward.href = formatUri(location, "backward", div.lastChild);
        doc.head.appendChild(backward);

        return doc;
    };
    
    var get = function (ev) {
        var req = ev.detail.request;
        var query = req.location.query;
        return findActivities(query).then(function (activities) {
            var doc = formatDocument(activities, req.origin().location);
            ev.detail.respond("200", {
                "content-type": "text/html;charset=utf-8"
            }, doc.documentElement.outerHTML);
        }).fail(function (err) {
            ev.detail.respond("500", {
                "content-type": "text/html;charset=utf-8"
            }, "something wrong ... \n\n" + err);
        });
    };
    
    window.addEventListener("agent-access", function (ev) {
        ev.detail.accept();
        switch (ev.detail.request.method) {
        case "GET": return get(ev);
        case "POST": return post(ev);
        default: return ev.detail.respond("405", {allow: "GET,POST"}, "");
        }
    }, false);
}, false);
