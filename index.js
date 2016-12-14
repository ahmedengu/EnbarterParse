var raven = require('raven');
var client = new raven.Client('https://22c41b4449c04f2f9678babd3400566c:db3b5311623146389b2afe0e37340d95@sentry.io/118691');

var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');

var app = express();
app.use('/public', express.static(path.join(__dirname, '/public')));

var api = new ParseServer({
    databaseURI: 'mongodb://enbarterUser:1d9bd5d441415fc6556acb447b97903f1623d16fd9d56fe@178.62.247.181:27017/enbarterDB',
    cloud: __dirname + '/cloud/main.js',
    appId: 'EnbarterApp',
    javascriptKey: '28e0691b32ab',
    masterKey: 'fb4b98ea158cbbdd32c366682f280533d89374a2fa8908186b4478ff295b96f77096f54eabc9a61b956237d817fb04ea6498c73c4cd9ec14e1ade7cc81136b0',
    serverURL: 'http://178.62.247.181:1337/v1',
    liveQuery: {
        classNames: ["Barter", "Chat", "Notification"]
    },
    websocketTimeout: 10 * 1000,
    cacheTimeout: 60 * 600 * 1000,
    logLevel: 'VERBOSE',
    revokeSessionOnPasswordReset: true,
    accountLockout: {
        duration: 5,
        threshold: 3
    }
    ,
    filesAdapter: {
        module: "parse-server-fs-adapter",
        options: {
            filesSubDirectory: ""
        }
    }

});


var mountPath = '/v1';
app.use(mountPath, api);

app.get('/', function (req, res) {
    res.writeHead(301,
        {Location: 'http://enbarter.com/'}
    );
    res.end();
});

var port = 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function () {
    console.log('EnbarterParse running on port ' + port + '.');
});

ParseServer.createLiveQueryServer(httpServer);


