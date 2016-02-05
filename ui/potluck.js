"use strict";

var Potluck = (function () {
    var getHash = function (uri) {
        var hashPos = uri.indexOf("#");
        return hashPos < 0 ? "" : uri.substring(hashPos + 1);
    };

    var load = function (uri, callback) {
        var req = new XMLHttpRequest();
        req.addEventListener("load", function (ev) {
            var doc = document.implementation.createHTMLDocument("");
            doc.documentElement.innerHTML = this.responseText;
            callback(doc);
        }, false);
        req.open("GET", uri, true);
        req.setRequestHeader("cache-control", "no-cache, no-store");
        req.send();
    };

    var prepareIndex = function (entry) {
        addLoadContentEvent(entry, true);
        linkToLinkView(entry.querySelectorAll("h1 a"), true);
        linkToTagView(entry.querySelectorAll(".tag > a"), true);
    };

    var linkAgentUri = function (prefix, uri) {
        return prefix + "/link/" + getHash(uri);
    };

    var tagAgentUri = function (prefix, uri) {
        return prefix + "/tag/" + getHash(uri);
    };

    var rootToEntry = function (root) {
        var entry = document.importNode(root, true);
        entry.setAttribute("class", "link");
        var container = entry.querySelector("#comments");
        entry.removeChild(container);
        entry.id = "link";
        return entry;
    };

    var loadLinkView = function (uri) {
        var prefix = "..";
        var uri = linkAgentUri(prefix, uri);
        load(uri, function (doc) {
            var entry = rootToEntry(doc.querySelector(".root"));
            if (!document.getElementById(entry.id)) {
                linkToTagView(entry.querySelectorAll(".tags > a"));
                document.querySelector("main").appendChild(entry);
                setContent(entry, doc);
            }
        });
    };

    var loadTagView = function (uri) {
        var prefix = "..";
        uri = tagAgentUri(prefix, uri);
        var main = document.querySelector("main");
        load(uri, function (doc) {
            var links = doc.querySelector("#links");
            if (links) {
                main.innerHTML = links.innerHTML;
                setTitle(doc);
                linkToLinkView("article > h1 > a");
                linkToTagView(".tag > a");
                var articles = main.querySelectorAll("article");
                Array.prototype.forEach.call(articles, function (article) {
                    addLoadContentEvent(article);
                });
            }
        });
    };

    var setTitle = function (doc) {
        var subTitle = " - " + doc.title;
        document.title = "Potluck" + subTitle;
        var a = document.createElement("a");
        a.href = "../";
        a.textContent = "Potluck";
        var span = document.createElement("span");
        span.textContent = subTitle;
        var h1 = document.querySelector("h1");
        h1.innerHTML = "";
        h1.appendChild(a);
        h1.appendChild(span);
    };

    var linkToView = function (arg, src, dst, isIndex) {
        var argIsObj = typeof arg === "object";
        var elems = argIsObj ? arg : document.querySelectorAll(arg);
        Array.prototype.forEach.call(elems, function (elem) {
            var real = elem.getAttribute("href"); 
            if (real) {
                var ui = real.replace(src, dst);
                elem.setAttribute("href", isIndex ? ui.substring(1) : ui);
            }
        });
    };

    var linkToLinkView = function (arg, isIndex) {
        return linkToView(arg, /\/link\//, "\/l\/#", isIndex);
    };

    var linkToTagView = function (arg, isIndex) {
        return linkToView(arg, /\/tag\//, "\/t\/#", isIndex);
    };

    var markdownComment = function (query) {
        var comments = document.querySelectorAll(query);
        marked.setOptions({
            smartLists: true,
            breaks: true,
            sanitize: false,
            highlight: function (code, lang) {
                var conv = document.createElement("div");
                conv.textContent = code;
                return PR.prettyPrintOne(conv.innerHTML, lang);
            }
        });
        Array.prototype.forEach.call(comments, function (comment) {
            comment.innerHTML = marked(comment.textContent);
        });
    };

    var formatRoot = function (entry, article) {
        var tags = article.querySelector(".tags");
        article.removeChild(tags.parentNode);
        var container = article.querySelector("#comments");
        article.removeChild(container);
        article.id = entry.id + "-root";
        var a = article.querySelector("a");
        a.textContent = a.href;
    };

    var formatComment = function (entry, article, isIndex) {
        article.id = entry.id + "-comment-" + article.id;
        linkToTagView(article.querySelectorAll(".tags > a"), isIndex);
        var comment = article.querySelector("div.comment");
        marked.setOptions({
            smartLists: true,
            breaks: true,
            sanitize: false,
            highlight: function (code, lang) {
                var conv = document.createElement("div");
                conv.textContent = code;
                return PR.prettyPrintOne(conv.innerHTML, lang);
            }
        });
        comment.innerHTML = marked(comment.textContent);
        return document.importNode(article, true);
    };

    var getPostButton = function (entry, isIndex) {
        var prefix = isIndex ? "." : "..";
        var formUri = "/form.html";
        var button = document.createElement("button");
        button.textContent = "post";
        button.value = "post";
        button.addEventListener("click", function () {
            var a = entry.querySelector("h1 > a");
            var uri = getHash(a.href) || a.href;
            var title = encodeURIComponent(a.textContent);
            window.open(
                prefix + formUri + "#title=" + title + "&url=" + uri,
                "potluck post",
                "width=640, height=640");
            return;
        }, false);
        return button;
    };

    var setContent = function (entry, doc, isIndex) {
        var content = document.getElementById("content");
        if (content) {
            content.parentNode.removeChild(content);
            var links = document.querySelectorAll("article.link");
            Array.prototype.forEach.call(links, function (link) {
                link.style.display = "block";
            });
        }
        content = document.createElement("article");
        content.id = "content";
        var root = document.importNode(doc.querySelector(".root"), true);
        var container = root.querySelector("#comments");
        var container_ = container.cloneNode(true);
        formatRoot(entry, root);
        content.appendChild(root);
        var comments = container_.querySelectorAll("article");
        Array.prototype.forEach.call(comments,
            function (comment) {
                var comment_ = formatComment(entry, comment, isIndex);
                content.appendChild(comment_);
            }
        );
        entry.style.display = "inline-block";
        entry.parentNode.insertBefore(content, entry.nextSibling);
        content.appendChild(getPostButton(entry, isIndex));
    };

    var addLoadContentEvent = function (entry, isIndex) {
        var prefix = isIndex ? "." : "..";
        entry.addEventListener("mouseover", function () {
            entry.style.background = "#898989";
            entry.style.color = "#fff";
        }, false);
        entry.addEventListener("mouseout", function () {
            entry.style.background = "#fff";
            entry.style.color = "#000";
        }, false);
        entry.addEventListener("click", function () {
            var articles = document.querySelectorAll("main > article");
            Array.prototype.forEach.call(articles, function (article) {
                article.style.border = "";
            });
            entry.style.border = "2px solid #898989";

            var main = document.querySelector("main");
            var target = entry.nextSibling;
            var expanded = function () {
                return target && target.id.indexOf(entry.id + "-") == 0;
            };
            if (expanded()) {
                while (expanded()) {
                    main.removeChild(target);
                    target = entry.nextSibling;
                }
            } else {
                var href = entry.querySelector("h1 > a").href;
                var uri = linkAgentUri(prefix, href);
                load(uri, function (doc) {
                    setContent(entry, doc, isIndex);
                });
            }
        }, false);
    };

    return {
        loadLinkView: loadLinkView,
        loadTagView: loadTagView,
        prepareIndex: prepareIndex
    };
})();
