"use strict";

// An agent for managing list of posts
window.addEventListener("agent-load", function (ev) {
    var config = anatta.engine.link(
        document.querySelector("[rel='config']"), "text/html", anatta.entity);
    var orb = "";
    var template = document.querySelector(".link");
    var url = anatta.builtin.url;

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

    var generateID = function () {
        return (Math.random() * 0x100000000).toString(16);
    };

    var putToOrb = function (ev, orb) {
        var root = url.resolve(orb, "/activities/");
        var uri = url.resolve(root, generateID());
        var link = anatta.engine.link({href: uri});
        return link.put(ev.detail.request);
    };

    var createIndex = function (entity) {
        var doc = document.implementation.createHTMLDocument("index");
        var div = doc.createElement("div");
        div.id = "links";
        doc.body.appendChild(div);
        return doc;
    };

    var toArticle = function (index, entity) {
        var article = entity.html.querySelector(".link");
        var obj = {
            uri: url.parse(entity.request.href).pathname,
            title: article.querySelector(".title").textContent,
            tags: article.querySelector(".tags").textContent,
            author: article.querySelector(".author").textContent,
            date: article.querySelector(".date").textContent
        };
        return window.fusion(obj, template, index);
    };

    var toLocation = function (entity) {
        var uri = entity.html.querySelector(".title").href;
        return config.get().then(function (configEntity) {
            var link = configEntity.html.querySelector("[rel='link']").href;
            var root = url.parse(link).path;
            var location = url.resolve(root, encodeURIComponent(uri));
            return location;
        });
    };

    var updateIndex = function (entity) {
        var uri = entity.request.href;
        var indexUri = url.resolve(uri, "index.html");
        var indexLink = anatta.engine.link({href: indexUri});
        return indexLink.get().then(function (indexEntity) {
            var index = "";
            if (indexEntity.response.status != "200") {
                index = createIndex();
            } else {
                index = indexEntity.html;
            }
            var article = toArticle(index, entity);
            var links = index.getElementById("links");
            links.insertBefore(article, links.firstChild);
            return indexLink.put({
                headers: {"content-type": "text/html"},
                body: index.outerHTML
            }).then(function (indexEntity) {
                return toLocation(entity);
            });
        });
    };
    
    var post = function (ev) {
        getOrb().then(function (orb) {
            return putToOrb(ev, orb);
        }).then(updateIndex).then(function (location) {
            ev.detail.respond("201", {location: location}, "");
        });
        // To be impl as
        // - generate id and PUT request to orb post
        // - update index
        // - redirect to the post url
    };
    
    var get = function (ev) {
        // To be impl as:
        // - respond list html of query (refresh, backward)
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
