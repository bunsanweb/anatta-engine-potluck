"use strict";

//script for agents development
//note: implement another index.js for real UI
window.addEventListener("load", ev => {
    const main = document.querySelector("main");
    const indexUri = "./activityList/";
    const query = "#links";
    
    const req = new XMLHttpRequest();
    req.addEventListener("load", ev => {
        const doc = document.implementation.createHTMLDocument("");
        doc.documentElement.innerHTML = ev.target.responseText;
        const listPart = doc.querySelector(query);
        if (listPart) {
            main.innerHTML = listPart.innerHTML;
            const linkedList = main.querySelectorAll("[href]");
            Array.from(linkedList).forEach(
                link =>
                    link.href = `${indexUri}?id=${link.getAttribute("href")}`);
        }
    }, false);
    req.open("GET", indexUri, true);
    req.send();
}, false);
