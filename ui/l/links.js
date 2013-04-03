"use strict";

window.addEventListener("load", function (ev) {
    var main = document.querySelector("main");
    var load = function () {
        var uri = Potluck.linkAgentUri(location.href);
        var req = new XMLHttpRequest();
        req.addEventListener("load", function (ev) {
            console.log(this.responseText);
            var doc = document.implementation.createHTMLDocument("");
            doc.documentElement.innerHTML = this.responseText;
            var main_ = doc.querySelector("main");
            if (main_) {
                main.innerHTML = main_.innerHTML;
                Potluck.setTitle(doc);
                Potluck.markdownComment("div.comment");
                Potluck.linkToTagView(".tags");
                Potluck.appendLoadPostFormButton();
            }
        }, false);
        req.open("GET", uri, true);
        req.setRequestHeader("cache-control", "no-cache, no-store");
        req.send();
    };
    load();
    setTimeout(load, 100);
    window.addEventListener("hashchange", load, false);
}, false);
