"use strict";

// An agent for formatting formdata to "Link Post" HTML
window.addEventListener("agent-load", function (ev) {
    var template = document.querySelector(".link");
    var configLink = anatta.engine.link(
        document.querySelector("[rel=config]"),
        "text/html", anatta.entity);
    
    var postLink = null;
    var postTo = function (message) {
        if (postLink) return postLink.post(message);
        //console.log(configLink.href());
        return configLink.get().then(function (configEntity) {
            postLink = configEntity.first({rel: "postTo"});
            //console.log(postLink.href());
            return postLink.post(message);
        });
    };
    
    var postByForm = function (ev) {
        var form = anatta.form.decode(ev.detail.request);
        var doc = formToHtml(fixForm(form));
        var message = {
            headers: {
                "content-type": "text/html;charset=utf-8",
            },
            body: "<!doctype html>" + doc.outerHTML,
        };
        //console.log(form);
        //console.log(message.body);
        return postTo(message).then(function (entity) {
            var uri = entity.response.headers.location;
            //console.log(uri);
            //console.log([entity.response.status, entity.response.headers]);
            // TBD: 300 redirect or 201 created
            ev.detail.respond("201", {location: uri}, "");
        });
    };
    var fixForm = function (form) {
        form.date = new Date().toUTCString();
        return form;
    };
    var formToHtml = function (form) {
        var doc = document.implementation.createHTMLDocument(form.title);
        var content = window.fusion(form, template, doc);
        doc.body.appendChild(content);
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
