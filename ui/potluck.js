"use strict";

const Potluck = (function () {
    const getHash = (uri) => {
        const hashPos = uri.indexOf("#");
        return hashPos < 0 ? "" : uri.substring(hashPos + 1);
    };

    const load = (uri, callback) => {
        const req = new XMLHttpRequest();
        req.addEventListener("load", ev => {
            const doc = document.implementation.createHTMLDocument("");
            doc.documentElement.innerHTML = ev.target.responseText;
            callback(doc);
        }, false);
        req.open("GET", uri, true);
        req.setRequestHeader("cache-control", "no-cache, no-store");
        req.send();
    };

    const prepareIndex = (entry) => {
        addLoadContentEvent(entry, true);
        linkToLinkView(entry.querySelectorAll("h1 a"), true);
        linkToTagView(entry.querySelectorAll(".tag > a"), true);
    };

    const linkAgentUri = (prefix, uri) => `${prefix}/link/${getHash(uri)}`;

    const tagAgentUri = (prefix, uri) => `${prefix}/tag/${getHash(uri)}`;

    const rootToEntry = (root) => {
        const entry = document.importNode(root, true);
        entry.setAttribute("class", "link");
        const container = entry.querySelector("#comments");
        entry.removeChild(container);
        entry.id = "link";
        return entry;
    };

    const loadLinkView = (uri) => {
        const prefix = "..";
        const agentUri = linkAgentUri(prefix, uri);
        load(agentUri, doc => {
            const entry = rootToEntry(doc.querySelector(".root"));
            if (!document.getElementById(entry.id)) {
                linkToTagView(entry.querySelectorAll(".tags > a"));
                document.querySelector("main").appendChild(entry);
                setContent(entry, doc);
            }
        });
    };

    const loadTagView = (uri) => {
        const prefix = "..";
        const agentUri = tagAgentUri(prefix, uri);
        const main = document.querySelector("main");
        load(agentUri, doc => {
            const links = doc.querySelector("#links");
            if (links) {
                main.innerHTML = links.innerHTML;
                setTitle(doc);
                linkToLinkView("article > h1 > a");
                linkToTagView(".tag > a");
                const articles = main.querySelectorAll("article");
                Array.from(articles).forEach(
                    article => addLoadContentEvent(article));
            }
        });
    };

    const setTitle = (doc) => {
        const subTitle = ` - ${doc.title}`;
        document.title = `Potluck${subTitle}`;
        const a = document.createElement("a");
        a.href = "../";
        a.textContent = "Potluck";
        const span = document.createElement("span");
        span.textContent = subTitle;
        const h1 = document.querySelector("h1");
        h1.innerHTML = "";
        h1.appendChild(a);
        h1.appendChild(span);
    };

    const linkToView = (arg, src, dst, isIndex) => {
        const argIsObj = typeof arg === "object";
        const elems = argIsObj ? arg : document.querySelectorAll(arg);
        Array.from(elems).forEach(elem => {
            const real = elem.getAttribute("href"); 
            if (real) {
                const ui = real.replace(src, dst);
                elem.setAttribute("href", isIndex ? ui.substring(1) : ui);
            }
        });
    };

    const linkToLinkView = (arg, isIndex) =>
              linkToView(arg, /\/link\//, "\/l\/#", isIndex);

    const linkToTagView = (arg, isIndex) => 
        linkToView(arg, /\/tag\//, "\/t\/#", isIndex);

    const markdownComment = (query) => {
        const comments = document.querySelectorAll(query);
        marked.setOptions({
            smartLists: true,
            breaks: true,
            sanitize: false,
            highlight: (code, lang) => {
                const conv = document.createElement("div");
                conv.textContent = code;
                return PR.prettyPrintOne(conv.innerHTML, lang);
            }
        });
        Array.from(comments).forEach(
            comment => comment.innerHTML = marked(comment.textContent));
    };

    const formatRoot = (entry, article) => {
        const tags = article.querySelector(".tags");
        article.removeChild(tags.parentNode);
        const container = article.querySelector("#comments");
        article.removeChild(container);
        article.id = `${entry.id}-root`;
        const a = article.querySelector("a");
        a.textContent = a.href;
    };

    const formatComment = (entry, article, isIndex) => {
        article.id = `${entry.id}-comment-${article.id}`;
        linkToTagView(article.querySelectorAll(".tags > a"), isIndex);
        const comment = article.querySelector("div.comment");
        marked.setOptions({
            smartLists: true,
            breaks: true,
            sanitize: false,
            highlight: (code, lang) => {
                const conv = document.createElement("div");
                conv.textContent = code;
                return PR.prettyPrintOne(conv.innerHTML, lang);
            }
        });
        comment.innerHTML = marked(comment.textContent);
        return document.importNode(article, true);
    };

    const getPostButton = (entry, isIndex) => {
        const prefix = isIndex ? "." : "..";
        const formUri = "/form.html";
        const button = document.createElement("button");
        button.textContent = "post";
        button.value = "post";
        button.addEventListener("click", ev => {
            const a = entry.querySelector("h1 > a");
            const uri = getHash(a.href) || a.href;
            const title = encodeURIComponent(a.textContent);
            window.open(
                `${prefix}${formUri}#title=${title}&url=${uri}`,
                "potluck post", "width=640, height=640");
            return;
        }, false);
        return button;
    };

    const setContent = (entry, doc, isIndex) => {
        const content = document.getElementById("content");
        if (content) {
            content.parentNode.removeChild(content);
            const links = document.querySelectorAll("article.link");
            Array.from(links).forEach(link => link.style.display = "block");
        }
        const newContent = document.createElement("article");
        newContent.id = "content";
        const root = document.importNode(doc.querySelector(".root"), true);
        const container = root.querySelector("#comments");
        const container_ = container.cloneNode(true);
        formatRoot(entry, root);
        newContent.appendChild(root);
        const comments = container_.querySelectorAll("article");
        Array.from(comments).forEach(comment => {
            const comment_ = formatComment(entry, comment, isIndex);
            newContent.appendChild(comment_);
        });
        entry.style.display = "inline-block";
        entry.parentNode.insertBefore(newContent, entry.nextSibling);
        newContent.appendChild(getPostButton(entry, isIndex));
    };

    const addLoadContentEvent = (entry, isIndex) => {
        const prefix = isIndex ? "." : "..";
        entry.addEventListener("mouseover", ev => {
            entry.style.background = "#898989";
            entry.style.color = "#fff";
        }, false);
        entry.addEventListener("mouseout", ev => {
            entry.style.background = "#fff";
            entry.style.color = "#000";
        }, false);
        entry.addEventListener("click", ev => {
            const articles = document.querySelectorAll("main > article");
            Array.from(articles).forEach(article => article.style.border = "");
            entry.style.border = "2px solid #898989";

            const main = document.querySelector("main");
            let target = entry.nextSibling;
            const expanded = () =>
                      target && target.id.indexOf(`${entry.id}-`) == 0;
            if (expanded()) {
                while (expanded()) {
                    main.removeChild(target);
                    target = entry.nextSibling;
                }
            } else {
                const href = entry.querySelector("h1 > a").href;
                const uri = linkAgentUri(prefix, href);
                load(uri, doc => setContent(entry, doc, isIndex));
            }
        }, false);
    };

    return {
        loadLinkView: loadLinkView,
        loadTagView: loadTagView,
        prepareIndex: prepareIndex
    };
})();
