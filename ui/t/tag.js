"use strict";

window.addEventListener("load", function (ev) {
    var load = function () {
        Potluck.loadTagView(location.href);
    };
    load();
    setTimeout(load, 100);
    window.addEventListener("hashchange", load, false);
}, false);
