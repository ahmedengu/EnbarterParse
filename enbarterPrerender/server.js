#!/usr/bin/env node
var prerender = require('./lib');
process.env.ALLOWED_DOMAINS = 'www.enbarter.com,enbarter.com,github.com,localhost,ahmedengu.github.io';
process.env.CACHE_ROOT_DIR = 'cache';
process.env.CACHE_LIVE_TIME = 10000;

var server = prerender({
    workers: 4,
    iterations: 10,
    phantomBasePort: process.env.PHANTOM_CLUSTER_BASE_PORT || 12300,
    accessLog: {
        // Check out the file-stream-rotator docs for parameters
        fileStreamRotator: {
            filename: 'logs/access-%DATE%.log',
            frequency: 'daily',
            date_format: 'YYYY-MM-DD',
            verbose: false
        },

        // Check out the morgan docs for the available formats
        morgan: {
            format: 'combined'
        }
    },
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


server.use(require('prerender-compressed-file-cache'));

server.use(prerender.sendPrerenderHeader());
// server.use(prerender.basicAuth());
server.use(prerender.whitelist());
//server.use(prerender.blacklist());
server.use(prerender.logger());
//server.use(prerender.removeScriptTags());
server.use(prerender.httpHeaders());
// server.use(prerender.inMemoryHtmlCache());
// server.use(prerender.s3HtmlCache());
server.use(require('prerender-access-log'));

server.start();
