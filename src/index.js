"use strict";

window.addEventListener("agent-load", function (ev) {
    var getConf = (function () {
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
    })();
    
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
            return getConf().then(initOrRefreshStreamer);
        };
    })();
    
    var activityArrived = function (activity) {
        return getIndex().then(function (index) {
            return updateIndex(index, activity);
        }).then(putIndex);
    };
    
    var get = function (ev) {
        return getIndex().then(function (index) {
            // TBD
            return ev.detail.respond(
                "200", {"content-type": "text/html;charset=utf-8"},
                "<doctype html>" + index.outerHTML);
        });
    };
    
    var updateIndex = function (index, activity) {
        // TBD
        console.log(activity.outerHTML);
        
        return index;
    };
    
    var getIndexLink = (function () {
        var indexLink = null;
        return function () {
            if (indexLink) return anatta.q.resolve(indexLink);
            return getConf().then(function (conf) {
                indexLink = conf.first({rel: "indexCache"});
                return indexLink;
            });
        };
    })();
    var getIndex = function () {
        return getIndexLink().then(function (indexLink) {
            return indexLink.get().then(function (entity) {
                if (entity.response.status === "200") return entity;
                return putIndex(emptyIndex());
            }).then(function (entity) {
                //console.log(entity.html.outerHTML);
                return entity.html;
            });
        });
    };
    var putIndex = function (doc) {
        return getIndexLink().then(function (indexLink) {
            var message = {
                headers: {"content-type": "text/html;charset=utf-8"},
                body: "<!doctype html>" + doc.outerHTML,
            };
            return indexLink.put(message);
        });
    };
    var emptyIndex = function () {
        var doc = document.implementation.createHTMLDocument("index");
        doc.body.innerHTML = document.querySelector("#frame").innerHTML;
        return doc;
    };
    
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
