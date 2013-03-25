"use strict";

window.addEventListener("load", function (ev) {
    if (!location.hash) return location.href = "/";
    var uri = "/link/" + location.hash.substring(1);
    
    var load = function (uri) {
        var req = new XMLHttpRequest();
        req.addEventListener("load", function (ev) {
            console.log(this.responseText);
            var doc = document.implementation.createHTMLDocument("");
            doc.documentElement.innerHTML = this.responseText;
            document.body.innerHTML = doc.body.innerHTML;
            document.title = doc.title;
        }, false);
        req.open("GET", uri, true);
        req.setRequestHeader("cache-control", "no-cache, no-store");
        req.send();
    };
    load(uri);
    setTimeout(function () {
        load(uri);
    }, 100);
}, false);
