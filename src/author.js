"use strict";
window.addEventListener("agent-load", function (ev) {
    window.addEventListener("agent-access", function (ev) {
        ev.detail.accept();
        ev.detail.respond("200", {
            "content-type": "text/html;charset=utf-8"
        }, "author agent");
    }, false);
}, false);
