"use strict";

window.addEventListener("load", function (ev) {
    var doPost = function (ev) {
        var postUri = "/post/";
        var form = new FormData();
        form.append("url", document.getElementById("url").value);
        form.append("title", document.getElementById("title").value);
        form.append("tags", document.getElementById("tags").value);
        form.append("identity", document.getElementById("identity").value);
        form.append("author", document.getElementById("author").value);
        form.append("comment", document.getElementById("comment").value);
        var req = new XMLHttpRequest();
        req.addEventListener("load", onLoad.bind(req), false);
        req.open("POST", postUri, true);
        req.send(form);
    };
    var onLoad = function (ev) {
        //alert(this.status);
        window.location.href = "/";
    };
    
    document.getElementById("post").addEventListener("click", doPost, false);
}, false);
