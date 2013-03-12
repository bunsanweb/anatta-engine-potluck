"use strict";

var anatta = require("anatta-engine");

var engine = anatta.engine.builder.engine({
    type: "generic",
    porter: {
        "text/html": "html",
        "application/json": "json"
    },
    space: {
        "http:": {field: "web"},
        "https:": {field: "web"},
        "file:": {field: "file", root: "./agent/", prefix: "/"},
        "root:/": {field: "agent", uri: "file:/link.html"},
        "root:/post": {field: "agent", uri: "file:/post.html"},
        "root:/author": {field: "agent", uri: "file:/author.html"},
        "root:/link": {field: "agent", uri: "file:/link.html"},
        "root:/tag": {field: "agent", uri: "file:/tag.html"},
        "store:": {field: "agent", uri: "file:/store.html"},
        "cache:": {field: "orb"},
    }
});
var gate = anatta.webgate.core.WebGate(
    engine.space, {from: "/", to: "root:/"});
gate.start(process.argv[2] || process.env.PORT || "8000");
