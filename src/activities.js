"use strict";

// An agent for managing list of posts
window.addEventListener("agent-load", function (ev) {
    var orb = "";
    var url = anatta.builtin.url;

    var getOrb = function () {
        var d = anatta.q.defer();
        if (!orb) {
            var config = document.querySelector("[rel='config']");
            var link = anatta.engine.link(config, "text/html", anatta.entity);
            return link.get().then(function (entity) {
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
        var root = url.resolve(orb, "/");
        var uri = url.resolve(root, generateID());
        var link = anatta.engine.link({href: uri});
        return link.put(ev.detail.request);
    };
    
    var post = function (ev) {
        getOrb().then(function (orb) {
            return putToOrb(ev, orb);
        }).then(function (entity) {
            var res = entity.response;
            ev.detail.respond(res.status, res.headers, res.text());
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
