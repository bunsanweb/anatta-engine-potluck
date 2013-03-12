"use strict";

var anatta = require("anatta-engine");

var engine = anatta.engine.builder.engine({
    type: "generic",
    porter: {
        "text/html": "html",
        "application/json": "json",
    },
    space: {
        "root:/": {field: "file", root: "./ui/", prefix: "/"},
        "root:/post/": {field: "agent", uri: "src:/post.html"},
        "root:/author/": {field: "agent", uri: "src:/author.html"},
        "root:/index/": {field: "agent", uri: "src:/link.html"},
        "root:/link/": {field: "agent", uri: "src:/link.html"},
        "root:/tag/": {field: "agent", uri: "src:/tag.html"},
        
        "http:": {field: "web"},
        "https:": {field: "web"},
        "src:/": {field: "file", root: "./src/", prefix: "/"},
        "src:/shared/": {field: "file", root: anatta.shared(),
                         prefix: "/shared/"},
        "actvities:": {field: "agent", uri: "src:/activities.html"},
        "orb:": {field: "orb"},
    }
});
//var uri = "mongodb://localhost/potluck";
//engine.space.maanager.fields["orb|orb:/"].orb = anatta.orb.mondodb.Orb(uri);
var gate = anatta.webgate.core.WebGate(
    engine.space, {from: "/", to: "root:/"});
gate.start(process.argv[2] || process.env.PORT || "8000");
