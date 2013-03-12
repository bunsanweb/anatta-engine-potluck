"use strict";
window.addEventListener("agent-load", function (ev) {
    var store = anatta.engine.link(
        document.getElementById("store"), "text/html", anatta.entity);
    store.get().then(function (entity) {
        console.log("streamer loaded");
    });
    window.addEventListener("agent-access", function (ev) {
        ev.detail.accept();
        ev.detail.respond("200", {
            "content-type": "text/html;charset=utf-8"
        }, "store agent");
    }, false);
}, false);
