"use strict";

window.addEventListener("load", function (ev) {
    var load = function () {
        var uri = Potluck.linkAgentUri(location.href);
        Potluck.loadLinkView(uri);
    };
    load();
    setTimeout(load, 100);
    window.addEventListener("hashchange", load, false);
}, false);
