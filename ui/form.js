/*eslint no-var: 0, func-names: 0, prefer-reflect: 0,
         prefer-arrow-callback: 0, prefer-template: 0, curly: 0,
*/
"use strict";

window.addEventListener("load", ev => {
    // Keep ES5 syntax for bookmarklet source
    const bookmarkletFunc = function (formUrl) {
        var url = window.location.href;
        var title = document.title;
        var tags = [];
        var ogtype = document.querySelector("meta[property='og:type']");
        if (ogtype) tags.push(ogtype.content);
        var ogsite = document.querySelector("meta[property='og:site_name']");
        if (ogsite) tags.push(ogsite.content);
        var keywords = document.querySelector("meta[name=keywords]");
        if (keywords) tags = tags.concat(keywords.content.split(/\s*,\s*/));
        var wikipediaCategory = Array.prototype.map.call(
            document.querySelectorAll("[title^='Category:']"),
            function (elem) {
                return elem.title.replace(/^Category:/, "");
            });
        tags = tags.concat(wikipediaCategory);
        var quote = window.getSelection().toString();
        if (quote) quote = quote.split(/\n/).map(function (line) {
            return "> " + line;
        }).join("\n");
        var href = formUrl + "#title=" + encodeURIComponent(title) + "&" +
            "url=" + encodeURIComponent(url) + "&" +
            "tags=" + encodeURIComponent(tags.join(", ")) + "&" +
            "comment=" + encodeURIComponent(quote);
        window.open(href);
    };
    const bookmarkletCode = () => {
        const formUrl = location.href.replace(/#.*$/, "");
        return `javascript:(${bookmarkletFunc.toString()})("${formUrl}")`;
    };
    
    const inputs = {
        url: document.getElementById("url"),
        title: document.getElementById("title"),
        tags: document.getElementById("tags"),
        identity: document.getElementById("identity"),
        author: document.getElementById("author"),
        comment: document.getElementById("comment")
    };
    
    const loadContentFromHash = () => {
        const hashPos = location.href.indexOf("#");
        if (hashPos < 0) return;
        const kvs = location.href.substring(hashPos + 1);
        kvs.split(/&/).forEach(kv => {
            const index = kv.indexOf("=");
            const key = kv.substring(0, index);
            const value = kv.substring(index + 1);
            if (Object.prototype.hasOwnProperty.call(inputs, key)) {
                inputs[key].value = decodeURIComponent(value);
            }
        });
    };
    
    const loadId = () => {
        const identity = window.localStorage.getItem("identity");
        const author = window.localStorage.getItem("author");
        if (identity) inputs.identity.value = identity;
        if (author) inputs.author.value = author;
    };
    const storeId = () => {
        window.localStorage.setItem("identity", inputs.identity.value);
        window.localStorage.setItem("author", inputs.author.value);
    };

    const doPost = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const postUri = "./post/";
        const form = new FormData();
        Object.keys(inputs).forEach(
            key => form.append(key, inputs[key].value));
        const req = new XMLHttpRequest();
        req.addEventListener("load", onLoad, false);
        req.open("POST", postUri, true);
        req.send(form);
    };
    const onLoad = (ev) => {
        storeId();
        setTimeout(() => {window.location.href = "./";}, 300);
    };
    
    const personaInit = () => {
        if (!navigator.id) return;
        var onlogin = (assertion) => {
            const gateway = "./persona/";
            const data = `assertion=${assertion}&audience=${location.href}`;
            const req = new XMLHttpRequest();
            req.addEventListener("load", ev => {
                var data = JSON.parse(req.responseText);
                inputs.identity.value = "persona:" + data.email;
                inputs.author.value = data.email;
            }, false);
            req.addEventListener("error", ev => {
                navigator.id.logout();
            }, false);
            req.open("POST", gateway, true);
            req.setRequestHeader(
                "content-type", "application/x-www-form-urlencoded");
            req.send(data);
        };
        navigator.id.watch({
            onlogin,
            onlogout: () => {}
        });
        const button = document.querySelector("#persona-signin");
        if (button) button.addEventListener("click", ev => {
            navigator.id.request();
        }, false);
    };
    
    // init
    const bookmarkletLink = document.querySelector("#bookmarklet");
    if (bookmarkletLink) bookmarkletLink.href = bookmarkletCode();
    loadContentFromHash();
    loadId();
    personaInit();
    window.addEventListener("hashchange", loadContentFromHash, false);
    document.getElementById("post").addEventListener("click", doPost, false);
}, false);
