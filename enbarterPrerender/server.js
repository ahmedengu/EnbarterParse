#!/usr/bin/env node
var prerender = require('./lib');
process.env.ALLOWED_DOMAINS = 'www.enbarter.com,enbarter.com,enbarterdev.ml,www.enbarterdev.ml';
process.env.CACHE_MAXSIZE = 10000;

var server = prerender({
    workers: 4,
    iterations: 10,
    phantomBasePort: 12300,
    cookiesEnabled: true,
    logRequests: true,
    pageDoneCheckTimeout: 300,
    resourceDownloadTimeout: 10000,
    waitAfterLastRequest: 500,
    jsTimeout: 10000,
    jsCheckTimeout: 300,
    noJsExecutionTimeout: 3000,
    evaluateJavascriptCheckTimeout: 300
});


server.use(prerender.sendPrerenderHeader());
server.use(prerender.whitelist());
server.use(prerender.logger());
server.use(prerender.httpHeaders());
server.use(prerender.inMemoryHtmlCache());

server.start();
