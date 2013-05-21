"use strict";

window.addEventListener("agent-load", function (ev) {
    var refresh = (function () {
        var streamer = null;
        var initOrRefreshStreamer = function (conf) {
            if (!streamer) {
                var watchUri = conf.first({rel: "activities"}).href();
                streamer = new Streamer(watchUri);
                streamer.on("insert", activityArrived);
                streamer.get("load")();
            } else {
                streamer.get("refresh")();
            }
            return streamer;
        };
        return function () {
            return Conf.get().then(initOrRefreshStreamer);
        };
    })();
    
    var queue = anatta.q.resolve(null);
    var activityArrived = function (activity) {
        queue = queue.then(function () {
            return Index.get().then(function (index) {
                return Activity.updateIndex(index, activity);
            }).then(Index.put.bind(Index));
        });
    };
    var get = function (ev) {
        //queue = queue.then(function () {
        return Index.get().then(function (index) {
            var view = View.get(ev, index);
            return ev.detail.respond(
                "200", {
                    "content-type": "text/html;charset=utf-8",
                    // for demo
                    "cache-control": [
                        "no-store", "no-cache",
                        "max-age=0", "must-revalidate"].join(", "),
                    "expires": new Date(0).toUTCString(),
                    "pragma": "no-cache",
                },
                "<!doctype html>" + view.outerHTML);
                //view.outerHTML);
        });
        //});
    };
    
    // init
    window.addEventListener("agent-access", function (ev) {
        ev.detail.accept();
        refresh().then(function (streamer) {
            if (ev.detail.request.method === "GET") {
                return get(ev);
            }
            return ev.detail.respond("405", {allow: "GET"}, "");
        });
    }, false);
    refresh();
}, false);

var Conf = {
    get: (function () {
        var conf = null;
        return function () {
            if (conf) return anatta.q.resolve(conf);
            var confLink = anatta.engine.link(
                document.querySelector("[rel=config]"),
                "text/html", anatta.entity
            );
            return confLink.get().then(function (entity) {
                conf = entity;
                return conf;
            });
        };
    })(),
};

var Index = {
    getLink: (function () {
        var indexLink = null;
        return function () {
            if (indexLink) return anatta.q.resolve(indexLink);
            return Conf.get().then(function (conf) {
                indexLink = conf.first({rel: "indexCache"});
                return indexLink;
            });
        };
    })(),
    get: function () {
        var self = this;
        return self.getLink().then(function (indexLink) {
            return indexLink.get().then(function (entity) {
                if (entity.response.status === "200") return entity;
                return self.put(self.empty());
            }).then(function (entity) {
                //console.log(entity.html.outerHTML);
                return entity.html;
            });
        });
    },
    put: function (doc) {
        return this.getLink().then(function (indexLink) {
            var message = {
                headers: {"content-type": "text/html;charset=utf-8"},
                body: "<!doctype html>" + doc.outerHTML,
            };
            return indexLink.put(message);
        });
    },
    empty: function () {
        var doc = document.implementation.createHTMLDocument("index");
        doc.body.innerHTML = document.querySelector("#frame").innerHTML;
        return doc;
    },
    newEntry: function (data, index) {
        var template = document.querySelector("#article article");
        return window.fusion(data, template, index);
    },
    updateEntry: (function () {
        var updateEntry = function (index, view, entry) {
            entry = mergeOldEntry(index, view, entry);
            if (entry) insertEntry(index, entry);
            return index;
        };
        var mergeOldEntry = function (index, view, entry) {
            var existed = index.querySelector("article#" + entry.id);
            if (!existed) return entry;
            var dateEntry = entry.querySelector(".updated").textContent;
            var dateExisted = existed.querySelector(".updated").textContent;
            var isNewer = Util.dateLessThan(dateExisted, dateEntry);
            var newer = isNewer ? entry : existed;
            var older = isNewer ? existed: entry;
            var merged = tagMerge(
                newer.querySelectorAll(".tag > a"),
                older.querySelectorAll(".tag > a"));
            newer.querySelector(".tag").innerHTML = merged;
            if (!isNewer) return null;
            existed.parentNode.removeChild(existed);
            return entry;
        };
        var insertEntry = function (index, entry) {
            var entries = index.querySelectorAll("article.link");
            var updated = entry.querySelector(".updated").textContent;
            for (var i = 0; i < entries.length; i++) {
                var cur = entries[i];
                var cupdated = cur.querySelector(".updated").textContent;
                var isNewer = Util.dateLessThan(cupdated, updated);
                if (isNewer) {
                    cur.parentNode.insertBefore(entry, cur);
                    return index;
                }
            }
            index.querySelector("main").appendChild(entry);
            return index;
        };
        var tagMerge = function (newerTagAnchors, olderTagAnchors) {
            var tagAnchorHTMLs = [];
            [newerTagAnchors, olderTagAnchors].forEach(function (tagAs) {
                Array.prototype.forEach.call(tagAs, function (tagA) {
                    tagAnchorHTMLs.push(tagA.outerHTML);
                });
            });
            var merged = Util.uniq(tagAnchorHTMLs.sort());
            return merged.join(", ");
        };
        return updateEntry;
    })(),
};

var Activity = {
    updateIndex: (function () {
        var updateIndex = function (index, activity) {
            return Conf.get().then(function (conf) {
                //console.log(activity.outerHTML);
                var data = entryData(conf, activity);
                var entry = Index.newEntry(data, index);
                return Index.updateEntry(index, data.view, entry);
            });
        };
        
        var idFromUri = function (uri) {
            var head = "link-";
            return head + Array.prototype.slice.call(uri).map(function (ch) {
                return ch.charCodeAt(0).toString(16);
            }).join("");
        };

        var toAnchorTexts = function (conf, tagText) {
            var tagBase = conf.first({
                rel: "tagBase"}).html.getAttribute("href");
            var tagAnchors = [];
            tagText.split(",").forEach(function (tag) {
                var tag_ = tag.trim();
                var a = document.createElement("a");
                a.href = tagBase + "?or=" + tag_;
                a.textContent = tag_;
                tagAnchors.push(a.outerHTML);
            });
            return tagAnchors.join(", ");
        };
        
        var entryData = function (conf, activity) {
            var linkBase = conf.first({
                rel: "linkBase"}).html.getAttribute("href");
            var url = activity.querySelector(".src").href;
            var view = linkBase + encodeURIComponent(url);
            var id = idFromUri(url);
            var tagText = activity.querySelector(".tags").textContent;
            var tagAnchorText = toAnchorTexts(conf, tagText);
            return {
                id: id,
                url: url,
                view: view,
                title: activity.querySelector(".title").textContent,
                tags: tagAnchorText,
                updated: activity.querySelector(".date").textContent,
            };
        };
        return updateIndex;
    })(),
};

var View = {
    get: (function () {
        var defaultCount = 20;
        var get = function (ev, index) {
            //console.log(index.outerHTML);
            //return index;
            var query = ev.detail.request.location.query;
            if (query.refresh) return getRefresh(ev, index);
            if (query.backward) return getBackward(ev, index);
            return getHead(ev, index);
        };
        
        var getHead = function (ev, index) {
            var query = ev.detail.request.location.query;
            var count = query.count || defaultCount;
            var entries = index.querySelectorAll("article.link");
            var list = Array.prototype.slice.call(entries, 0, count);
            return render(ev, list);
        };
        
        var getRefresh = function (ev, index) {
            var query = ev.detail.request.location.query;
            var count = query.count || defaultCount;
            var refresh = query.refresh;
            var entries = index.querySelectorAll("article.link");
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                var id = decodeURIComponent(
                    entry.querySelector("a").getAttribute("href"));
                if (id === refresh) {
                    // exclude refresh entry
                    var start = Math.max(0, id - count);
                    var list = Array.prototype.slice.call(entries, start, i);
                    return render(ev, list);
                }
            }
            return getHead(ev, index);
        };
        
        var getBackward = function (ev, index) {
            var query = ev.detail.request.location.query;
            var count = query.count || defaultCount;
            var backward = query.backward;
            var entries = index.querySelectorAll("article.link");
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                var id = decodeURIComponent(
                    entry.querySelector("a").getAttribute("href"));
                if (id === backward) {
                    // inlude backward entry
                    var list = Array.prototype.slice.call(
                        entries, i, i + count);
                    return render(ev, list);
                }
            }
            return getHead(ev, index);
        };
        
        var render = function (ev, links) {
            //var pathname = ev.detail.request.location.pathname;
            var pathname = "";
            var doc = document.implementation.createHTMLDocument("index");
            doc.body.innerHTML = document.querySelector("#frame").innerHTML;
            var refresh = doc.createElement("link");
            refresh.rel = "refresh";
            refresh.href = pathname;
            doc.head.appendChild(refresh);
            var backward = doc.createElement("link");
            backward.rel = "backward";
            backward.href = pathname;
            doc.head.appendChild(backward);
            if (links.length === 0) return doc;
            var last = links[0];
            var first = links[links.length - 1];
            refresh.href = queryLink(pathname, "refresh", last);
            backward.href = queryLink(pathname, "backward", first);
            var main = doc.querySelector("main");
            links.forEach(function (link) {
                main.appendChild(doc.importNode(link, true));
            });
            
            // for debug
            doc.body.appendChild(doc.createElement("hr"));
            var rlink = doc.createElement("a");
            rlink.href = refresh.getAttribute("href");
            rlink.textContent = "refresh";
            doc.body.appendChild(rlink);
            doc.body.appendChild(doc.createTextNode("|"));
            var blink = doc.createElement("a");
            blink.href = backward.getAttribute("href");
            blink.textContent = "backward";
            doc.body.appendChild(blink);
            
            return doc;
        };
        
        var queryLink = function (pathname, type, link) {
            return pathname + "?" + type + "=" + 
                link.querySelector("a").getAttribute("href");
        };
        
        return get;
    })(),
};

var Util = {
    uniq: function (arr) {
        if (arr.length <= 1) return arr;
        var prev = arr[0];
        var ret = [prev];
        for (var i = 1; i < arr.length; i++) {
            var cur = arr[i];
            if (prev === cur) continue;
            ret.push(cur);
            prev = cur;
        }
        return ret;
    },
    dateLessThan: function (a, b) {
        return new Date(a).getTime() < new Date(b).getTime();
    },
};
