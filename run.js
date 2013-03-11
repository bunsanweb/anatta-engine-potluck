var anatta = require("anatta-engine");

var engine = anatta.engine.builder.engine({
    type: "generic",
    porter: {
        "text/html": "html",
        "application/json": "json",
    },
    space: {
        "orb:/": {field: "orb"},
        "src:/": {field: "file", root: "./src/", prefix: "/"},
        "root:/": {field: "file", root: "./ui/", prefix: "/"},
        "root:/posts/": {field: "agent", uri: "src:/posts.html"},
        "root:/formpost/": {field: "agent", uri: "src:/formpost.html"},
        "root:/list/": {field: "agent", uri: "src:/list.html"},
        "root:/link/": {field: "agent", uri: "src:/link.html"},
    },
});
//var uri = "mongodb://localhost/potluck";
//engine.space.maanager.fields["orb|orb:/"].orb = anatta.orb.mondodb.Orb(uri);
var gate = anatta.webgate.core.WebGate(
    engine.space, {from: "/", to: "root:/"});
gate.start(process.argv[2] || process.env.PORT || "8000");
