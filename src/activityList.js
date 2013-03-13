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

    var get = function (ev) {
        console.log("get raw activity index in orb");
        return index.get().then(function (entity) {
            ev.detail.respond(
                entity.response.status,
                entity.response.headers,
                entity.response.body);
        });
    };
    
}, false);
