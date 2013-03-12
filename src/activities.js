"use strict";

// An agent for managing list of posts
window.addEventListener("agent-load", function (ev) {
    var index = anatta.engine.link(
        document.querySelector("[rel='index']"),
        "text/html", anatta.entity);
    var postBase = document.querySelector("[rel='posts']").href;
    
    var post = function (ev) {
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
