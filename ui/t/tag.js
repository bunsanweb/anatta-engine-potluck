"use strict";

window.addEventListener("load", function (ev) {
    var load = function () {
        var uri = Potluck.tagAgentUri(location.href);
        Potluck.loadTagView(uri);
    };
    load();
    setTimeout(load, 100);
    window.addEventListener("hashchange", load, false);
}, false);
