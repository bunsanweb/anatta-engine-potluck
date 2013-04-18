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
        window.open(href);
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
        var hashPos = location.href.indexOf("#");
        if (hashPos < 0) return;
        var kvs = location.href.substring(hashPos + 1);
        kvs.split(/&/).forEach(function (kv) {
            var index = kv.indexOf("=");
            var key = kv.substring(0, index);
            var value = kv.substring(index + 1);
            if (Object.prototype.hasOwnProperty.call(inputs, key)) {
                inputs[key].value = decodeURIComponent(value);
            }
        });
    };
    
    var loadId = function () {
        var identity = window.localStorage.getItem("identity");
        var author = window.localStorage.getItem("author");
        if (identity) inputs.identity.value = identity;
        if (author) inputs.author.value = author;
    };
    var storeId = function () {
        window.localStorage.setItem("identity", inputs.identity.value);
        window.localStorage.setItem("author", inputs.author.value);
    };

    var doPost = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var postUri = "./post/";
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
        storeId();
        setTimeout(function () {
            window.location.href = "./";
        }, 300);
    };
    
    var personaInit = function () {
        if (!navigator.id) return;
        var onlogin = function (assertion) {
            var gateway = "/persona/";
            var data = "assertion=" + assertion + 
                "&audience=" + location.href;
            var req = new XMLHttpRequest();
            req.addEventListener("load", function (ev) {
                var data = JSON.parse(req.responseText);
                inputs.identity.value = "persona:" + data.email;
                inputs.author.value = data.email
            }, false);
            req.addEventListener("error", function (ev) {
                navigator.id.logout();
            }, false);
            req.open("POST", gateway, true);
            req.setRequestHeader(
                "content-type", "application/x-www-form-urlencoded");
            req.send(data);
        };
        navigator.id.watch({
            onlogin: onlogin,
            onlogout: function () {},
        });
        var button = document.querySelector("#persona-signin");
        if (button) button.addEventListener("click", function (ev) {
            navigator.id.request();
        }, false);
    };
    
    // init
    var bookmarkletLink = document.querySelector("#bookmarklet");
    if (bookmarkletLink) bookmarkletLink.href = bookmarkletCode();
    loadContentFromHash();
    loadId();
    personaInit();
    window.addEventListener("hashchange", loadContentFromHash, false);
    document.getElementById("post").addEventListener("click", doPost, false);
}, false);
