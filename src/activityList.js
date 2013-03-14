"use strict";

// agent for development 
window.addEventListener("agent-load", function (ev) {
    var base = document.querySelector("[rel=base]").href;
    var index = anatta.engine.link(
        document.querySelector("[rel=index]"), "text/html", anatta.entity);
    
    window.addEventListener("agent-access", function (ev) {
        ev.detail.accept();
        switch (ev.detail.request.method) {
        case "GET": return get(ev);
        default: return ev.detail.respond("405", {allow: "GET"}, "");
        }
    }, false);
    
    var activity = function (id) {
        var uri = anatta.builtin.url.resolve(base, id);
        return anatta.engine.link({href: uri});
    };
    
    var get = function (ev) {
        //console.log("get raw activity index in orb");
        var id = ev.detail.request.location.query.id;
        var page = id ? activity(id) : index;
        return page.get().then(function (entity) {
            //console.log(entity.response.status);
            //console.log(entity.response.text());
            ev.detail.respond(
                entity.response.status,
                entity.response.headers,
                entity.response.body);
        });
    };
    
}, false);
