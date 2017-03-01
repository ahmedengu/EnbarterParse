#!/usr/bin/env node
var prerender = require('./lib');
var raven = require('raven');
var client = new raven.Client('https://22c41b4449c04f2f9678babd3400566c:db3b5311623146389b2afe0e37340d95@sentry.io/118691');

process.env.ALLOWED_DOMAINS = 'www.enbarter.com,enbarter.com,enbarterdev.ml,www.enbarterdev.ml';
process.env.CACHE_MAXSIZE = 10000;
process.env.CACHE_ROOT_DIR = __dirname + '/cache';
var server = prerender({
    workers: 1,
    iterations: 30,
    phantomBasePort: 12300,
    cookiesEnabled: true,
    logRequests: true,
    pageDoneCheckTimeout: 300,
    resourceDownloadTimeout: 10000,
    waitAfterLastRequest: 500,
    jsTimeout: 10000,
    jsCheckTimeout: 300,
    noJsExecutionTimeout: 3000,
    evaluateJavascriptCheckTimeout: 300,
    softIterations: 10
});

var cache_config = {
    /**
     * Example of custom path builder
     * @param key String the url of the resource being processed
     * @return path String folder path like '../', 'f1/f2/f3/.../'
     */
    pathBuilder: function (key) {
        var now = new Date();
        return process.env.CACHE_ROOT_DIR + '/' + key;
    },
    // Custom file name
    fileName: '.cache'
}
server.use(require('prerender-compressed-file-cache')(cache_config));

server.use(prerender.sendPrerenderHeader());
server.use(prerender.whitelist());
server.use(prerender.logger());
server.use(prerender.httpHeaders());
server.use(require('prerender-remove-meta-fragment'));

// server.use(prerender.removeScriptTags());

server.start();
