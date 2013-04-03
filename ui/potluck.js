"use strict";

var Potluck = (function () {
    var getHash = function (uri) {
        var hashPos = uri.indexOf("#");
        return hashPos < 0 ? "" : uri.substring(hashPos + 1);
    };

    var linkAgentBase = "/link/";
    var linkViewBase = "/l/";
    var linkAgentUri = function (uri) {
        return linkAgentBase + getHash(uri);
    };
    var linkToLinkView = function (arg) {
        var argIsObj = typeof arg === "object";
        var anchors = argIsObj ? [arg] : document.querySelectorAll(arg);
        Array.prototype.forEach.call(anchors, function (a) {
            var real = a.getAttribute("href"); 
            var ui = real.replace(/^\/link\//, "/l/#");
            a.setAttribute("href", ui);
        });
    };

    var tagAgentBase = "/tag/";
    var tagViewBase = "/t/#?or=";
    var tagAgentUri = function (uri) {
        return tagAgentBase + getHash(uri);
    };

    var linkToTagView = function (arg) {
        var argIsObj = typeof arg === "object";
        var tagss = argIsObj ? [arg] : document.querySelectorAll(arg);
        Array.prototype.forEach.call(tagss, function (tags) {
            var tagAnchors = [];
            tags.textContent.split(",").map(function (tag) {
                var tag_ = tag.trim();
                if (tag_) {
                    var a = document.createElement("a");
                    a.href = tagViewBase + tag_;
                    a.textContent = tag_;
                    tags.appendChild(a);
                    tagAnchors.push(a.outerHTML);
                }
            });
            tags.innerHTML = tagAnchors.join(", ");
        });
    };

    var markdownComment = function (query) {
        var comments = document.querySelectorAll(query);
        marked.setOptions({
            smartLists: true,
            breaks: true,
            sanitize: false,
            highlight: function (code, lang) {
                return PR.prettyPrintOne(code, lang);
            }
        });
        Array.prototype.forEach.call(comments, function (comment) {
            comment.innerHTML = marked(comment.textContent);
        });
    };

    var setTitle = function (doc) {
        var subTitle = " - " + doc.title;
        document.title = "Potluck" + subTitle;
        var a = document.createElement("a");
        a.href = "/";
        a.textContent = "Potluck";
        var span = document.createElement("span");
        span.textContent = subTitle;
        var h1 = document.querySelector("h1");
        h1.innerHTML = "";
        h1.appendChild(a);
        h1.appendChild(span);
    };

    var buildFormData = function () {
        var formdata = new FormData();
        var inputs = document.querySelectorAll("input, textarea");
        Array.prototype.forEach.call(inputs, function (input) {
            var key = input.id;
            var val = "";
            switch (key) {
                case "url":
                    val = decodeURIComponent(getHash(location.href));
                    break;
                case "title":
                    val = document.querySelector(".title").textContent;
                    break;
                default:
                    val = input.value;
            }
            formdata.append(key, val);
        });
        return formdata;
    };

    var post = function () {
        var uri = "/post/";
        var formdata = buildFormData();
        var req = new XMLHttpRequest();
        req.addEventListener("load", function (ev) {
            setTimeout(function () {
                window.location.href = "/";
            }, 300);
        }, false);
        req.open("POST", uri, true);
        req.send(formdata);
    };

    var createPostButton = function () {
        var button = document.createElement("button");
        button.id = "post";
        button.textContent = "post";
        button.addEventListener("click", post, false);
        var div = document.createElement("div");
        div.appendChild(button);
        return div;
    };

    var formatForm = function (doc) {
        var form = document.importNode(doc.getElementById("form"), true);
        var inputs = form.querySelectorAll("input");
        Array.prototype.forEach.call(inputs, function (input) {
            var id = input.id;
            if (id == "url" || id == "title") {
                form.querySelector("#" + id).type = "hidden";
                var label = form.querySelector("[for='" + id + "']");
                label.style.display = "none";
            }
            input.value = "";
        });
        form.querySelector("textarea").value = "";
        var container = document.createElement("div");
        container.appendChild(form);
        container.appendChild(createPostButton());
        return container;
    };

    var loadPostForm =  function () {
        var form = document.getElementById("form");
        if (form) {
            form.parentNode.parentNode.removeChild(form.parentNode);
            return;
        }
        var uri = "/form.html";
        var req = new XMLHttpRequest();
        req.addEventListener("load", function (ev) {
            console.log(this.responseText);
            var doc = document.implementation.createHTMLDocument("");
            doc.documentElement.innerHTML = this.responseText;
            document.body.appendChild(formatForm(doc));
        }, false);
        req.open("GET", uri, true);
        req.setRequestHeader("cache-control", "no-cache, no-store");
        req.send();
    };

    var appendLoadPostFormButton = function () {
        var id = "formButton";
        if (document.getElementById(id)) return;
        var button = document.createElement("button");
        button.id = id;
        button.textContent = "load post form";
        document.body.appendChild(button);
        button.addEventListener("click", loadPostForm, false);
    };

    return {
        linkAgentUri: linkAgentUri,
        linkToLinkView: linkToLinkView,
        tagAgentUri: tagAgentUri,
        linkToTagView: linkToTagView,
        markdownComment: markdownComment,
        setTitle: setTitle,
        appendLoadPostFormButton: appendLoadPostFormButton,
    };
})();
