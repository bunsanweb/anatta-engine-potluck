"use strict";

// agent for development 
window.addEventListener("agent-load", ev => {
    const base = document.querySelector("[rel=base]").getAttribute("href");
    const index = anatta.engine.link(
        document.querySelector("[rel=index]"), "text/html", anatta.entity);
    
    window.addEventListener("agent-access", ev => {
        ev.detail.accept();
        switch (ev.detail.request.method) {
        case "GET": return get(ev);
        default: return ev.detail.respond("405", {allow: "GET"}, "");
        }
    }, false);
    
    const activity = (id) => {
        const uri = anatta.builtin.url.resolve(base, id);
        return anatta.engine.link({href: uri});
    };
    
    const get = (ev) => {
        //console.log("get raw activity index in orb");
        const id = ev.detail.request.location.query.id;
        const page = id ? activity(id) : index;
        //console.log(page.href());
        return page.get().then(entity => {
            //console.log(entity.response.status);
            //console.log(entity.response.text());
            //console.log(entity.response.status);
            ev.detail.respond(
                entity.response.status,
                entity.response.headers,
                entity.response.body);
        });
    };
}, false);
