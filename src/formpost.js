"use strict";

// An agent for formatting formdata to "Link Post" HTML
window.addEventListener("agent-load", function (ev) {
    var template = document.querySelector(".link");
    var postLink = anatta.engine.link(
        document.querySelector("[rel='postTo']"),
        "text/html", anatta.entity);
    //TBD: supplimental data for author name/identity uri
    var identity = "/";
    var author = "potluck";
    
    var postByForm = function (ev) {
        var form = anatta.form.decode(ev.detail.request);
        var doc = formToHtml(fixForm(form));
        var message = {
            headers: {
                "content-type": "text/html;charset=utf-8",
            },
            body: doc.outerHTML;
        };
        return postLink.post(message).then(function (entity) {
            var uri = entity.request.uri;
            // TBD: 300 redirect or 201 created
            ev.detail.respond("300", {location: uri}, "");
        });
    };
    var fixForm = function (form) {
        form.identity = identity;
        form.author = author;
        form.date = new Date().toUTCString();
        return form;
    };
    var formToHtml = function (form) {
        var doc = document.implementation.createHTMLDocument(form.title);
        var content = window.fusion(form, template, doc);
        doc.body.append(content);
        return doc;
    };
    
    window.addEventListener("agent-access", function (ev) {
        ev.detail.accept();
        switch (ev.detail.request.method) {
        case "POST": return postByForm(ev);
        default: return ev.detail.respond("405", {allow: "POST"}, "");
        }
    }, false);
}, false);
