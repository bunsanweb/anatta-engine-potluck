"use strict";

window.addEventListener("load", function (ev) {
    var bookmarkletFunc = function (formUrl) {
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
        var href = formUrl + "#" + "title=" + encodeURIComponent(title) + "&" +
            "url=" + encodeURIComponent(url) + "&" +
            "tags=" + encodeURIComponent(tags.join(", ")) + "&" +
            "comment=" + encodeURIComponent(quote);
        window.location.href = href;
    };
    var bookmarkletCode = function () {
        var formUrl = location.href.replace(/#.*$/, "");
        return "javascript:(" + bookmarkletFunc.toString() + ')("' + 
            formUrl + '")';
    };
    
    var inputs = {
        url: document.getElementById("url"),
        title: document.getElementById("title"),
        tags: document.getElementById("tags"),
        identity: document.getElementById("identity"),
        author: document.getElementById("author"),
        comment: document.getElementById("comment"),
    };
    
    var loadContentFromHash = function () {
        if (!location.hash) return;
        var kvs = location.hash.substring(1);
        kvs.split(/&/).forEach(function (kv) {
            var index = kv.indexOf("=");
            var key = kv.substring(0, index);
            var value = kv.substring(index + 1);
            if (Object.prototype.hasOwnProperty.call(inputs, key)) {
                inputs[key].value = decodeURIComponent(value);
            }
        });
    };
    
    var doPost = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var postUri = "/post/";
        var form = new FormData();
        Object.keys(inputs).forEach(function (key) {
            form.append(key, inputs[key].value);
        });
        var req = new XMLHttpRequest();
        req.addEventListener("load", onLoad.bind(req), false);
        req.open("POST", postUri, true);
        req.send(form);
    };
    var onLoad = function (ev) {
        setTimeout(function () {
            window.location.href = "/";
        }, 300);
    };
    
    // init
    var bookmarkletLink = document.querySelector("#bookmarklet");
    if (bookmarkletLink) bookmarkletLink.href = bookmarkletCode();
    loadContentFromHash();
    window.addEventListener("hashchange", loadContentFromHash, false);
    document.getElementById("post").addEventListener("click", doPost, false);
}, false);
