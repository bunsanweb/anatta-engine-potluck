"use strict";
window.addEventListener("agent-load", function (ev) {
    var base = "/link/";
    var config = anatta.engine.link(
        document.querySelector("[rel='config']"), "text/html", anatta.entity);
    var orb = "";
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

    var getUri = function (request) {
        var path = request.location.path;
        return path.slice(path.indexOf(base) + base.length);
    };

    var createCache = function (uri) {
        var uri_ = decodeURIComponent(uri);
        var indexUri = orb + "/activities/index.html";
        var indexLink = anatta.engine.link({href: indexUri});
        return indexLink.get().then(function (entity) {
            var target = "";
            var links = entity.html.querySelectorAll(".link");
            Array.prototype.some.call(links, function (link) {
                if (link.querySelector(".src").href == uri_) {
                    target = link;
                    return true;
                }
            });
            return target;
        }).then(function (target) {
            var targetUri = target.querySelector(".href").href;
            var targetLink = anatta.engine.link({href: targetUri});
            return targetLink.get();
        }).then(function (entity) {
            var cacheUri = orb + "/link/" + uri;
            var cacheLink = anatta.engine.link({href: cacheUri});
            return cacheLink.put(entity.response);
        });
    };

    var get = function (ev, orb) {
        var uri = getUri(ev.detail.request);
        var link = anatta.engine.link({href: orb + url.resolve(base, uri)});
        link.get().then(function (entity) {
            var status = entity.response.status;
            return status == "200" ? entity : createCache(uri);
        }).then(function (entity) {
            ev.detail.respond("200", {
                "content-type": "text/html;charset=utf-8"
            }, entity.response.text());
        }, function (err) {
            ev.detail.respond("404", {
                "content-type": "text/html;charset=utf-8"
            }, "not found: " + uri);
        });
    };

    var post = function (ev, orb) {
        ev.detail.respond("200", {
            "content-type": "text/html;charset=utf-8"
        }, "link agent");
    };

    window.addEventListener("agent-access", function (ev) {
        ev.detail.accept();
        getOrb().then(function (orb) {
            switch (ev.detail.request.method) {
            case "GET": return get(ev, orb);
            case "POST": return post(ev, orb);
            default: return ev.detail.respond("405", {allow: "GET,POST"}, "");
            }
        });
    }, false);
}, false);
