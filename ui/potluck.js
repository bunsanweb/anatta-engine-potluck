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

    var rootToEntry = function (root) {
        var entry = document.importNode(root, true);
        entry.setAttribute("class", "link");
        var container = entry.querySelector("#comments");
        entry.removeChild(container);
        entry.id = "link";
        return entry;
    };

    var loadLinkView = function (uri) {
        load(uri, function (doc) {
            var entry = rootToEntry(doc.querySelector(".root"));
            if (!document.getElementById(entry.id)) {
                linkToTagView(entry.querySelector(".tags"));
                document.querySelector("main").appendChild(entry);
                setContent(entry, doc);
            }
        });
    };

    var loadTagView = function (uri) {
        var main = document.querySelector("main");
        load(uri, function (doc) {
            var links = doc.querySelector("#links");
            if (links) {
                main.innerHTML = links.innerHTML;
                setTitle(doc);
                linkToLinkView("article > h1 > a");
                linkToTagView(".tag");
                var articles = main.querySelectorAll("article");
                Array.prototype.forEach.call(articles, function (article) {
                    addLoadContentEvent(article);
                });
            }
        });
    };

    var linkAgentBase = "./link/";
    var linkViewBase = "./l/";
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

    var tagAgentBase = "./tag/";
    var tagViewBase = "./t/#?or=";
    var tagAgentUri = function (uri) {
        return tagAgentBase + getHash(uri);
    };

    var linkToTagView = function (arg) {
        var argIsObj = typeof arg === "object";
        var tagss = argIsObj ? [arg] : document.querySelectorAll(arg);
        Array.prototype.forEach.call(tagss, function (tags) {
            var tagsText = tags && tags.textContent ? tags.textContent : "";
            if (tagsText) {
                var tagAnchors = [];
                tagsText.split(",").map(function (tag) {
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
            }
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
            formdata.append(input.id, input.value);
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

    var formatForm = function (doc, uri, title) {
        var form = document.importNode(doc.getElementById("form"), true);
        var inputs = form.querySelectorAll("input");
        Array.prototype.forEach.call(inputs, function (input) {
            var id = input.id;
            if (id == "url" || id == "title") {
                input.value = id == "url" ? uri : title;
                input.type = "hidden";
                var label = form.querySelector("[for='" + id + "']");
                label.style.display = "none";
            } else {
                input.value = "";
            }
        });
        form.querySelector("textarea").value = "";
        var container = document.createElement("div");
        container.appendChild(form);
        container.appendChild(createPostButton());
        return container;
    };

    var formUri = "./form.html";
    var formatRoot = function (entry, article) {
        var tags = article.querySelector(".tags");
        article.removeChild(tags.parentNode);
        var container = article.querySelector("#comments");
        article.removeChild(container);
        article.id = entry.id + "-root";
        var a = article.querySelector("a");
        a.textContent = a.href;
    };

    var formatComment = function (entry, article) {
        article.id = entry.id + "-comment-" + article.id;
        linkToTagView(article.querySelector(".tags"));
        var comment = article.querySelector("div.comment");
        marked.setOptions({
            smartLists: true,
            breaks: true,
            sanitize: false,
            highlight: function (code, lang) {
                return PR.prettyPrintOne(code, lang);
            }
        });
        comment.innerHTML = marked(comment.textContent);
        return document.importNode(article, true);
    };

    var getPostButton = function (entry) {
        var formUri = "./form.html";
        var button = document.createElement("button");
        button.textContent = "post";
        button.value = "post";
        button.addEventListener("click", function () {
            var a = entry.querySelector("h1 > a");
            var uri = getHash(a.href) || a.href;
            var title = encodeURIComponent(a.textContent);
            window.open(
                formUri + "#title=" + title + "&url=" + uri,
                "potluck post",
                "width=640, height=640");
            return;
        }, false);
        return button;
    };

    var setContent = function (entry, doc) {
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
        var root = document.importNode(doc.querySelector(".root"));
        var container = root.querySelector("#comments");
        var container_ = container.cloneNode(true);
        formatRoot(entry, root);
        content.appendChild(root);
        var comments = container_.querySelectorAll("article");
        Array.prototype.forEach.call(comments,
            function (comment) {
                var comment_ = formatComment(entry, comment);
                content.appendChild(comment_);
            }
        );
        entry.style.display = "inline-block";
        entry.parentNode.insertBefore(content, entry.nextSibling);
        content.appendChild(getPostButton(entry));
    };

    var addLoadContentEvent = function (entry) {
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
                var uri = linkAgentUri(href);
                load(uri, function (doc) {
                    setContent(entry, doc);
                });
            }
        }, false);
    };

    var loadActivityList = function () {
        var uri = "./activityList/";
        load(uri, function (doc) {
            var links = doc.querySelector("#links");
            if (links) {
                document.querySelector("aside").innerHTML = links.innerHTML;
            }
        });
    };

    return {
        linkAgentUri: linkAgentUri,
        tagAgentUri: tagAgentUri,
        loadLinkView: loadLinkView,
        loadTagView: loadTagView,
        linkToLinkView: linkToLinkView,
        linkToTagView: linkToTagView,
        addLoadContentEvent: addLoadContentEvent,
        loadActivityList: loadActivityList,
    };
})();
