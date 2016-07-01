/*global anatta, Streamer*/
"use strict";

// Agent for frontpage as the list of posted uris
window.addEventListener("agent-load", ev => {
    const refresh = (() => {
        let streamer = null;
        const initOrRefreshStreamer = (conf) => {
            if (!streamer) {
                const watchUri = conf.first({rel: "activities"}).href();
                streamer = new Streamer(watchUri);
                streamer.on("insert", activityArrived);
                streamer.get("load")();
            } else {
                streamer.get("refresh")();
            }
            return streamer;
        };
        return () => Conf.get().then(initOrRefreshStreamer);
    })();
    
    let queue = Promise.resolve(null);
    const activityArrived = (activity) => {
        //console.log("[activityArrived]", activity);
        queue = queue.then(() => Index.get()).then(
            index => Activity.updateIndex(index, activity)
        ).then(doc => Index.put(doc)).catch(err => {
            console.log("[activityArrived] error:", err);
        });
    };
    const get = (ev) => Index.get().then(index => {
        const view = View.get(ev, index);
        return ev.detail.respond(
            "200", {
                "content-type": "text/html;charset=utf-8",
                // for demo
                "cache-control": [
                    "no-store", "no-cache",
                    "max-age=0", "must-revalidate"].join(", "),
                expires: new Date(0).toUTCString(),
                pragma: "no-cache"
            },
            `<!doctype html>${view.documentElement.outerHTML}`);
    });
    
    // init
    window.addEventListener("agent-access", ev => {
        ev.detail.accept();
        refresh().then(streamer => {
            if (ev.detail.request.method === "GET") {
                return get(ev);
            }
            return ev.detail.respond("405", {allow: "GET"}, "");
        });
    }, false);
    refresh();
}, false);

const Conf = {
    get: (() => {
        let conf = null;
        return () => {
            if (conf) return Promise.resolve(conf);
            const confLink = anatta.engine.link(
                document.querySelector("[rel=config]"),
                "text/html", anatta.entity
            );
            return confLink.get().then(entity => {
                conf = entity;
                return conf;
            });
        };
    })()
};

const Index = {
    getLink: (() => {
        let indexLink = null;
        return () => {
            if (indexLink) return Promise.resolve(indexLink);
            return Conf.get().then(conf => {
                indexLink = conf.first({rel: "indexCache"});
                return indexLink;
            });
        };
    })(),
    get() {
        const self = this;
        return self.getLink().then(indexLink => indexLink.get()).then(
            entity => {
                //console.log(entity.response.text("utf8"));
                if (entity.response.status === "200") return entity;
                return self.put(self.empty());
            }).then(entity => entity.html);
    },
    put(doc) {
        return this.getLink().then(indexLink => {
            const message = {
                headers: {"content-type": "text/html;charset=utf-8"},
                body: `<!doctype html>${doc.documentElement.outerHTML}`
            };
            return indexLink.put(message);
        });
    },
    empty() {
        const doc = document.implementation.createHTMLDocument("index");
        doc.body.innerHTML = document.querySelector("#frame").innerHTML;
        return doc;
    },
    newEntry(data, index) {
        const template = document.querySelector("#article article");
        return window.fusion(data, template, index);
    },
    updateEntry: (() => {
        const updateEntry = (index, view, entry) => {
            const merged = mergeOldEntry(index, view, entry);
            if (merged) insertEntry(index, merged);
            return index;
        };
        const mergeOldEntry = (index, view, entry) => {
            const existed = index.querySelector(`article#${entry.id}`);
            if (!existed) return entry;
            const dateEntry = entry.querySelector(".updated").textContent;
            const dateExisted = existed.querySelector(".updated").textContent;
            const isNewer = Util.dateLessThan(dateExisted, dateEntry);
            const newer = isNewer ? entry : existed;
            const older = isNewer ? existed : entry;
            const merged = tagMerge(
                newer.querySelectorAll(".tag > a"),
                older.querySelectorAll(".tag > a"));
            newer.querySelector(".tag").innerHTML = merged;
            if (!isNewer) return null;
            existed.parentNode.removeChild(existed);
            return entry;
        };
        const insertEntry = (index, entry) => {
            const entries = index.querySelectorAll("article.link");
            const updated = entry.querySelector(".updated").textContent;
            for (const cur of entries) {
                const cupdated = cur.querySelector(".updated").textContent;
                const isNewer = Util.dateLessThan(cupdated, updated);
                if (isNewer) {
                    cur.parentNode.insertBefore(entry, cur);
                    return index;
                }
            }
            index.querySelector("main").appendChild(entry);
            return index;
        };
        const tagMerge = (newerTagAnchors, olderTagAnchors) => {
            const tagAnchorHTMLs = [];
            for (const tagAs of [newerTagAnchors, olderTagAnchors]) {
                for (const tagA of tagAs) tagAnchorHTMLs.push(tagA.outerHTML);
            }
            const merged = Util.uniq(tagAnchorHTMLs.sort());
            return merged.join(", ");
        };
        return updateEntry;
    })()
};

const Activity = {
    updateIndex: (() => {
        const updateIndex = (index, activity) => Conf.get().then(conf => {
            //console.log("[Activity.updateIndex]",  activity);
            const data = entryData(conf, activity);
            const entry = Index.newEntry(data, index);
            return Index.updateEntry(index, data.view, entry);
        });
        
        const idFromUri = (uri) => {
            const head = "link-";
            const tail = Array.from(
                uri, ch => ch.charCodeAt(0).toString(16)).join("");
            return `${head}${tail}`;
        };

        const toAnchorTexts = (conf, tagText) => {
            const tagBase = conf.first({
                rel: "tagBase"}).html.getAttribute("href");
            return tagText.split(",").map(tag => {
                const tag$ = tag.trim();
                const a = document.createElement("a");
                a.setAttribute("href", `${tagBase}?or=${tag$}`);
                a.textContent = tag$;
                return a.outerHTML;
            }).join(", ");
        };
        
        const entryData = (conf, activity) => {
            const linkBase = conf.first({
                rel: "linkBase"}).html.getAttribute("href");
            const url = activity.querySelector(".src").getAttribute("href");
            const view = `${linkBase}${encodeURIComponent(url)}`;
            const id = idFromUri(url);
            const tagText = activity.querySelector(".tags").textContent;
            const tagAnchorText = toAnchorTexts(conf, tagText);
            return {
                id, url, view,
                title: activity.querySelector(".title").textContent,
                tags: tagAnchorText,
                updated: activity.querySelector(".date").textContent
            };
        };
        return updateIndex;
    })()
};

const View = {
    get: (() => {
        const defaultCount = 20;
        const get = (ev, index) => {
            const query = ev.detail.request.location.query;
            if (query.refresh) return getRefresh(ev, index);
            if (query.backward) return getBackward(ev, index);
            return getHead(ev, index);
        };
        
        const getHead = (ev, index) => {
            const query = ev.detail.request.location.query;
            const count = query.count || defaultCount;
            const entries = index.querySelectorAll("article.link");
            const list = Array.from(entries).slice(0, count);
            return render(ev, list);
        };
        
        const getRefresh = (ev, index) => {
            const query = ev.detail.request.location.query;
            const count = query.count || defaultCount;
            const refresh = query.refresh;
            const entries = index.querySelectorAll("article.link");
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                const id = decodeURIComponent(
                    entry.querySelector("a").getAttribute("href"));
                if (id === refresh) {
                    // exclude refresh entry
                    const start = Math.max(0, id - count);
                    const list = Array.from(entries).slice(start, i);
                    return render(ev, list);
                }
            }
            return getHead(ev, index);
        };
        
        const getBackward = (ev, index) => {
            const query = ev.detail.request.location.query;
            const count = query.count || defaultCount;
            const backward = query.backward;
            const entries = index.querySelectorAll("article.link");
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                const id = decodeURIComponent(
                    entry.querySelector("a").getAttribute("href"));
                if (id === backward) {
                    // inlude backward entry
                    const list = Array.from(entries).slice(i, i + count);
                    return render(ev, list);
                }
            }
            return getHead(ev, index);
        };
        
        const render = (ev, links) => {
            //const pathname = ev.detail.request.location.pathname;
            const pathname = "";
            const doc = document.implementation.createHTMLDocument("index");
            doc.body.innerHTML = document.querySelector("#frame").innerHTML;
            const refresh = doc.createElement("link");
            refresh.rel = "refresh";
            refresh.setAttribute("href", pathname);
            doc.head.appendChild(refresh);
            const backward = doc.createElement("link");
            backward.rel = "backward";
            backward.setAttribute("href", pathname);
            doc.head.appendChild(backward);
            if (links.length === 0) return doc;
            const last = links[0];
            const first = links[links.length - 1];
            refresh.setAttribute("href", queryLink(pathname, "refresh", last));
            backward.setAttribute(
                "href", queryLink(pathname, "backward", first));
            const main = doc.querySelector("main");
            links.forEach(
                link => main.appendChild(doc.importNode(link, true)));
            
            // for debug
            doc.body.appendChild(doc.createElement("hr"));
            const rlink = doc.createElement("a");
            rlink.setAttribute("href", refresh.getAttribute("href"));
            rlink.textContent = "refresh";
            doc.body.appendChild(rlink);
            doc.body.appendChild(doc.createTextNode("|"));
            const blink = doc.createElement("a");
            blink.setAttribute("href", backward.getAttribute("href"));
            blink.textContent = "backward";
            doc.body.appendChild(blink);
            
            return doc;
        };
        
        const queryLink = (pathname, type, link) => {
            const href = link.querySelector("a").getAttribute("href");
            return `${pathname}?${type}=${href}`;
        };
        return get;
    })()
};

const Util = {
    uniq: (arr) => arr.length <= 1 ? arr : arr.slice(1).reduce((r, cur) => {
        if (r[r.length - 1] !== cur) r.push(cur);
        return r;
    }, [arr[0]]),
    dateLessThan: (a, b) => new Date(a).getTime() < new Date(b).getTime()
};
