"use strict";

//script for agents development
//note: implement another index.js for real UI
window.addEventListener("load", function (ev) {
    var main = document.querySelector("main");
    var indexUri = "/index/";
    var query = "main";
    
    setInterval(function () {
        var req = new XMLHttpRequest();
        req.addEventListener("load", function (ev) {
            var doc = document.implementation.createHTMLDocument("");
            doc.documentElement.innerHTML = this.responseText;
            var listPart = doc.querySelector(query);
            if (listPart) {
                main.innerHTML = listPart.innerHTML;
            }
        }, false);
        req.open("GET", indexUri, true);
        req.setRequestHeader("cache-control", "no-cache, no-store");
        req.send();
    }, 500);
}, false);
