/*eslint quote-props: 0*/
"use strict";

process.chdir(require("path").dirname(module.filename));

const anatta = require("anatta-engine");

const engine = anatta.engine.builder.engine({
    type: "generic",
    porter: {
        "text/html": "html",
        "application/json": "json",
    },
    space: {
        "root:/": {field: "file", root: "./ui/", prefix: "/"},
        "root:/post/": {field: "agent", uri: "src:/post.html"},
        "root:/author/": {field: "agent", uri: "src:/author.html"},
        "root:/index/": {field: "agent", uri: "src:/index.html"},
        "root:/link/": {field: "agent", uri: "src:/link.html"},
        "root:/tag/": {field: "agent", uri: "src:/tag.html"},
        "root:/persona/": {field: "agent", uri: "src:/persona.html"},
        
        "http:": {field: "web"},
        "https:": {field: "web"},
        "src:/": {field: "file", root: "./src/", prefix: "/"},
        "src:/shared/": {field: "file", root: anatta.shared(),
                         prefix: "/shared/"},
        "activities:": {field: "agent", uri: "src:/activities.html"},
        "orb:": {field: "orb"},
        "config:/": {field: "file", root: "./config/", prefix: "/"},
        
        // for development
        "root:/activityList/": {field: "agent", uri: "src:/activityList.html"}
    }
});
const termset = anatta.termset.desc.create({
    "name": "potluck-config",
    "uri-pattern": "^config:",
    "content-type": "text/html",
    "link": {
        "rel": {"value": "rel"},
    },
});
engine.glossary.add(termset);
//const uri = "mongodb://localhost/potluck";
//engine.space.maanager.fields["orb|orb:/"].orb = anatta.orb.mondodb.Orb(uri);
const gate = anatta.webgate.core.WebGate(
    engine.space, {from: "/", to: "root:/"});
gate.start(process.argv[2] || process.env.PORT || "8000");
