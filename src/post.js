/*global anatta*/
"use strict";

// An agent for formatting formdata to "Link Post" HTML
window.addEventListener("agent-load", ev => {
    const template = document.querySelector(".link");
    const configLink = anatta.engine.link(
        document.querySelector("[rel=config]"),
        "text/html", anatta.entity);
    
    let postLink = null;
    const postTo = (message) => {
        if (postLink) return postLink.post(message);
        //console.log(configLink.href());
        return configLink.get().then(configEntity => {
            postLink = configEntity.first({rel: "postTo"});
            //console.log(postLink.href());
            return postLink.post(message);
        });
    };
    
    const postByForm = (ev) => {
        const form = anatta.form.decode(ev.detail.request);
        const doc = formToHtml(fixForm(form));
        const message = {
            headers: {
                "content-type": "text/html;charset=utf-8"
            },
            body: `<!doctype html>${doc.documentElement.outerHTML}`
        };
        //console.log(form);
        //console.log(message.body);
        return postTo(message).then(entity => {
            const uri = entity.response.headers.location;
            console.log("[post]", `form data posted to ${uri}`);
            //console.log([entity.response.status, entity.response.headers]);
            // TBD: 300 redirect or 201 created
            ev.detail.respond("201", {location: uri}, "");
        });
    };
    const fixForm = (form) => {
        form.date = new Date().toUTCString();
        return form;
    };
    const formToHtml = (form) => {
        const doc = document.implementation.createHTMLDocument(form.title);
        const content = window.fusion(form, template, doc);
        doc.body.appendChild(content);
        return doc;
    };
    
    window.addEventListener("agent-access", ev => {
        ev.detail.accept();
        switch (ev.detail.request.method) {
        case "POST": return postByForm(ev);
        default: return ev.detail.respond("405", {allow: "POST"}, "");
        }
    }, false);
}, false);
