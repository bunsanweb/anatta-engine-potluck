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

    return {
        linkAgentUri: linkAgentUri,
        linkToLinkView: linkToLinkView,
        tagAgentUri: tagAgentUri,
        linkToTagView: linkToTagView,
        markdownComment: markdownComment,
        setTitle: setTitle,
    };
})();
