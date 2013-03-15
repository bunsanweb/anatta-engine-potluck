"use strict";

// An agent for managing list of posts
window.addEventListener("agent-load", function (ev) {
    var base = "/activities/";
    var config = anatta.engine.link(
        document.querySelector("[rel='config']"), "text/html", anatta.entity);
    var orb = "";
    var template = document.querySelector(".link");
    var url = anatta.builtin.url;
    var NUM = 5;

    var getOrb = function () {
        var d = anatta.q.defer();
        if (!orb) {
            return config.get().then(function (entity) {
                orb = entity.html.querySelector("[rel='orb']").href;
                return orb;
            });
        }
        d.resolve(orb);
        return d.promise;
    };

    var getIndex = function () {
        return getOrb().then(function (orb) {
            var indexPath = url.resolve(base, "index.html");
            var indexUri = url.resolve(orb, indexPath);
            return anatta.engine.link({href: indexUri}).get();
        });
    };

    var generateID = function () {
        return (Math.random() * 0x100000000).toString(16);
    };

    var putToOrb = function (request) {
        return getOrb().then(function (orb) {
            var root = url.resolve(orb, base);
            var uri = url.resolve(root, generateID());
            var link = anatta.engine.link({href: uri});
            return link.put(request);
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
        var path = entity.request.location.path.slice(base.length);
        var id = "activity-" + path;
        var article = entity.html.querySelector(".link");
        var obj = {
            id: id,
            uri: url.resolve(base, "?id=" + id),
            src: article.querySelector(".title").href,
            title: article.querySelector(".title").textContent,
            tags: article.querySelector(".tags").textContent,
            author: article.querySelector(".author").textContent,
            date: article.querySelector(".date").textContent
        };
        return window.fusion(obj, template, index);
    };

    var updateIndex = function (entity) {
        return getIndex().then(function (indexEntity) {
            var index = "";
            if (indexEntity.response.status != "200") {
                index = createIndex();
            } else {
                index = indexEntity.html;
            }
            var article = toArticle(index, entity);
            var links = index.getElementById("links");
            links.insertBefore(article, links.firstChild);
            return indexEntity.put({
                headers: {"content-type": "text/html"},
                body: index.outerHTML
            }).then(function (indexEntity) {
                return article.querySelector(".href").href;
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
                        return [pivot];
                    } else {
                        return activitySlice(links.firstChild, NUM, true);
                    }
            }
        });
    };

    var formatUri = function (location, on, elem) {
        var base = location.protocol + "//" + location.host + location.pathname;
        var id = elem ? elem.id : location.query.id;
        var search = id ? "?on=" + on + "&id=" + id : "";
        return base + search;
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
            }, doc.outerHTML);
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
