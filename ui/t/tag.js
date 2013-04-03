"use strict";

window.addEventListener("load", function (ev) {
    var main = document.querySelector("main");
    var load = function (uri) {
        var req = new XMLHttpRequest();
        req.addEventListener("load", function (ev) {
            console.log(this.responseText);
            var doc = document.implementation.createHTMLDocument("");
            doc.documentElement.innerHTML = this.responseText;
            var main_ = doc.querySelector("main");
            if (main_) {
                main.innerHTML = main_.innerHTML;
                Potluck.setTitle(doc);
                Potluck.linkToLinkView("article h1 a");
                Potluck.linkToTagView(".tag");
            }
        }, false);
        req.open("GET", uri, true);
        req.setRequestHeader("cache-control", "no-cache, no-store");
        req.send();
    };
    var tagAgentUri= Potluck.tagAgentUri(location.href);
    load(tagAgentUri);
    setTimeout(function () {
        load(tagAgentUri);
    }, 100);
}, false);
