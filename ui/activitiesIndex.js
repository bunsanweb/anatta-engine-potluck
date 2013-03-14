"use strict";

//script for agents development
//note: implement another index.js for real UI
window.addEventListener("load", function (ev) {
    var main = document.querySelector("main");
    var indexUri = "/activityList/";
    var query = "#links";
    
    var req = new XMLHttpRequest();
    req.addEventListener("load", function (ev) {
        var doc = document.implementation.createHTMLDocument("");
        doc.documentElement.innerHTML = this.responseText;
        var listPart = doc.querySelector(query);
        if (listPart) {
            main.innerHTML = listPart.innerHTML;
            var linkedList = main.querySelectorAll("[href]");
            Array.prototype.forEach.call(linkedList, function (link) {
                link.href = indexUri + "?id=" + link.getAttribute("href");
            });
        }
    }, false);
    req.open("GET", indexUri, true);
    req.send();
}, false);
