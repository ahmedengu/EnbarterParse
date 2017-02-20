var raven = require('raven');
var client = new raven.Client('https://22c41b4449c04f2f9678babd3400566c:db3b5311623146389b2afe0e37340d95@sentry.io/118691');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');
const resolve = require('path').resolve;

var app = express();
app.use('/public', express.static(path.join(__dirname, '/public')));

var api = new ParseServer({
    appName: 'Enbarter',
    publicServerURL: 'http://api.enbarterdev.ml/v1',
    databaseURI: 'mongodb://enbarterUser:1d9bd5d441415fc6556acb447b97903f1623d16fd9d56fe@localhost:27017/enbarterDB',
    cloud: __dirname + '/cloud/main.js',
    appId: 'EnbarterApp',
    javascriptKey: 'Ad06@!30',
    masterKey: 'fb4b98ea158cbbdd32c366682f280533d89374a2fa8908186b4478ff295b96f77096f54eabc9a61b956237d817fb04ea6498c73c4cd9ec14e1ade7cc81136b0',
    restAPIKey: "1df92f3ebeb37b888c55ea9edd4fedf63a718ddf63a718d73a0556fb473a0556fb49d5cdde63c567dc31df92f3ebeb37b888c55ea9edd4fe9d5cdde63c567dc3",
    clientKey: "315b2d9b1fe6ee6808696a315b2d9b1fe6ee6808696ac17b77fbd610b49ed4b513434fd255e5a400c9b82ec17b77fbd610b49ed4b513434fd255e5a400c9b82e",
    serverURL: 'http://api.enbarterdev.ml/v1',
    liveQuery: {
        classNames: ["BarterDashboard", "Chat", "Notification"]
    },
    websocketTimeout: 10 * 1000,
    cacheTimeout: 60 * 600 * 1000,
    logLevel: 'VERBOSE',
    revokeSessionOnPasswordReset: true,
    allowClientClassCreation: false,
    enableAnonymousUsers: false,
    sessionLength: 2592000,
    verifyUserEmails: true,
    emailVerifyTokenValidityDuration: 24 * 60 * 60,
    passwordPolicy: {
        validatorPattern: /^(?=.{8,})/,
        maxPasswordAge: 1000,
        maxPasswordHistory: 5,
        resetTokenValidityDuration: 24 * 60 * 60
    },
    auth: {
        facebook: {
            appIds: "1394780183887567"
        }
    },
    accountLockout: {
        duration: 5,
        threshold: 3
    },
    filesAdapter: {
        module: "parse-server-fs-adapter",
        options: {
            filesSubDirectory: ""
        }
    },
    emailAdapter: {
        module: "simple-parse-smtp-adapter",
        options: {
            fromAddress: 'Enbarter <ahmedengu@enbarterdev.ml>',
            user: 'ahmedengu@enbarterdev.ml',
            password: '123456789',
            host: 'mail.enbarterdev.ml',
            isSSL: true, //True or false if you are using ssl
            port: 465, //SSL port or another port
            name: 'enbarterdev.ml', //  optional, used for identifying to the server
            //Somtimes the user email is not in the 'email' field, the email is search first in
            //email field, then in username field, if you have the user email in another field
            //You can specify here
            emailField: 'email',
            templates: {
                resetPassword: {
                    template: __dirname + '/views/email/reset-password',
                    subject: 'Reset your password'
                },
                verifyEmail: {
                    template: __dirname + '/views/email/verify-email',
                    subject: 'Verify Email'
                }
            }
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