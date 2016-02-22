"use strict";

//script for agents development
//note: implement another index.js for real UI
window.addEventListener("load", ev => {
    const main = document.querySelector("main");
    const indexUri = "./index/";
    let firstTime = true;
    const streamer = Streamer(indexUri);
    streamer.on("clear", () => main.innerHTML = "");
    streamer.on("insert", (entry, id) => {
        const cur = document.querySelector(`#${id}`);
        main.insertBefore(entry, cur);
        Potluck.prepareIndex(entry);
    });
    streamer.on("refresh", updated => {
        if (firstTime) {
            // hack
            setTimeout(streamer.get("refresh"), 100);
            firstTime = false;
            return;
        }
        //setTimeout(streamer.get("refresh"), updated ? 500 : 1000);
    });
    setTimeout(streamer.get("load"), 0);
    const more = document.getElementById("more");
    more.addEventListener("click", ev => streamer.get("backward")(), false);
    /*
    setInterval(() => {
        const req = new XMLHttpRequest();
        req.addEventListener("load", ev => {
            console.log(ev.target.responseText);
            const doc = document.implementation.createHTMLDocument("");
            doc.documentElement.innerHTML = this.responseText;
            const listPart = doc.querySelector(query);
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
