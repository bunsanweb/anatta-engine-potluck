"use strict";

//script for agents development
//note: implement another index.js for real UI
window.addEventListener("load", function (ev) {
    var main = document.querySelector("main");
    var indexUri = "./index/";
    var firstTime = true;
    var streamer = Streamer(indexUri);
    streamer.on("clear", function () {
        main.innerHTML = "";
    });
    streamer.on("insert", function (entry, id) {
        var cur = document.querySelector("#" + id);
        main.insertBefore(entry, cur);
        Potluck.prepareIndex(entry);
    });
    streamer.on("refresh", function (updated) {
        if (firstTime) {
            // hack
            setTimeout(streamer.get("refresh"), 100);
            firstTime = false;
            return;
        }
        setTimeout(streamer.get("refresh"), updated ? 500 : 1000);
    });
    setTimeout(streamer.get("load"), 0);
    
    /*
    setInterval(function () {
        var req = new XMLHttpRequest();
        req.addEventListener("load", function (ev) {
            console.log(this.responseText);
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
    }, 1000);
    */
}, false);
