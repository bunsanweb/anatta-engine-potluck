/*global Potluck*/
"use strict";

window.addEventListener("load", ev => {
    const load = () => Potluck.loadLinkView(location.href);
    load();
    setTimeout(load, 100);
    window.addEventListener("hashchange", load, false);
}, false);
