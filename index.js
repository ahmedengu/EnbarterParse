process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');
const resolve = require('path').resolve;

var app = express();
app.use('/public', express.static(path.join(__dirname, '/public')));
app.use(require('body-parser').urlencoded({extended: true}));
const Serialize = require('php-serialize');

const crypto = require('crypto');
let smtpOptions = {
    fromAddress: 'Enbarter <no-reply@enbarterdev.ml>',
    user: 'no-reply@enbarterdev.ml',
    password: 'cba2321ce58c9bd28e8b7b1d3e6fde24a194c485cd94b7c21e736041487bab80',
    host: 'enbarterdev.ml',
    isTlsRejectUnauthorized: false,
    isSSL: true, //True or false if you are using ssl
    port: 465, //SSL port or another port
    name: 'enbarterdev.ml', //  optional, used for identifying to the server
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
};
var sendSmtpMail = require('simple-parse-smtp-adapter')(smtpOptions).sendMail;
var api = new ParseServer({
    appName: 'Enbarter',
    publicServerURL: 'https://api.enbarterdev.ml/v1',
    databaseURI: 'mongodb://enbarterUser:1d9bd5d441415fc6556acb447b97903f1623d16fd9d56fe@82.196.12.219:27017/enbarterDB',
    cloud: __dirname + '/cloud/main.js',
    appId: 'EnbarterApp',
    javascriptKey: 'Ad06@!30',
    masterKey: 'fb4b98ea158cbbdd32c366682f280533d89374a2fa8908186b4478ff295b96f77096f54eabc9a61b956237d817fb04ea6498c73c4cd9ec14e1ade7cc81136b0',
    restAPIKey: "1df92f3ebeb37b888c55ea9edd4fedf63a718ddf63a718d73a0556fb473a0556fb49d5cdde63c567dc31df92f3ebeb37b888c55ea9edd4fe9d5cdde63c567dc3",
    clientKey: "315b2d9b1fe6ee6808696a315b2d9b1fe6ee6808696ac17b77fbd610b49ed4b513434fd255e5a400c9b82ec17b77fbd610b49ed4b513434fd255e5a400c9b82e",
    serverURL: 'https://api.enbarterdev.ml/v1',
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
        resetTokenValidityDuration: 24 * 60 * 60,
        doNotAllowUsername: true
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
        options: smtpOptions
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

app.post('/paddleWebhook', function (req, res) {
    let params = req.body;
    let signature = params.p_signature;
    delete params.p_signature;
    let serialize = Serialize.serialize(Object.keys(params).sort().reduce((r, k) => (r[k] = params[k], r), {}));
    const verify = crypto.createVerify('RSA-SHA1');
    verify.write(serialize);
    verify.end();

    if (!verify.verify(`-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAl5ZAnSrqqK8dnicmodUD
Eg0x/BYCrdhLUTV2MnEukvIpaOcVwTFzOb9+uGp3szjHkGYMK9TyGP9FI9HuVZfQ
j4KuU7S1owhVmjeXIR5IcYyBQGl41ccwv3UefojV0TvwO5e0E6UOM+PZy25XzZXx
dal8WPvHWoahsB+8FscpcOh/TPBUhFVA1vSIcRQQGsCxDEiofjxQskTBWAkwuZyF
4sdVWo9u4EC61AgSlnjx/2Gu/QezjF/tXcs7Wa/0ru0m73iitHGdLenK0upyDHIi
qMkOe0THxcQtAa0UxIGL/5IeJrGw4die2U13VIpHkJOYQ0xU3qpaVbdS7y2e8VQ0
O1NsF99Z/1PJxlB1r9kNRbNShT3BVDpIlG6//4ztGG1OVTmQQBupUoVrGhJxUTqh
aLPAHVk3LK6ruQXIxyqCwq53y9Y9Gpwf+5S0R8PFSgwFP5JCA/QuLoetM7dHSFiF
fgh9IwrVG7rEZP2ULCE7t61JOuWmLj/splqK+KYE9YJJ8QgBgkKyR61ZxSeeIC7G
0IlS8BVgzNCLGPxxNFMYCq+P23z0YSFsVOCMmYvr1dwKzDF7OzYeaRo9BPUUi+6S
JyS6cr5RElfniVOHQjj1XqSwF4g60DzeAzkNlUqW7lC6DKt+2cVX1Qv1lRhudiBX
tnDEYqcgG95GHkjG6TUfshECAwEAAQ==
-----END PUBLIC KEY-----`, signature, 'base64')) {
        res.status(500).send({
            "error": "invalid signature"
        });
        return;
    }

    let PaddleLog = Parse.Object.extend("PaddleLog");
    let paddleLog = new PaddleLog();

    for (let key in params) {
        paddleLog.set(key, params[key]);
    }

    let query = new Parse.Query(Parse.User);
    query.include('paymentInfo');
    function ret() {
        paddleLog.save(null, {
            useMasterKey: true,
            success: function (result) {
                res.send({result: 200});

                if (result.get('user')) {
                    if (['subscription_created', 'payment_succeeded', 'subscription_payment_succeeded'].indexOf(result.get('alert_name')) != -1) {
                        let Membership = Parse.Object.extend("Membership");
                        var queryMembership = new Parse.Query(Membership);
                        queryMembership.equalTo('productId', result.get('product_id') || result.get('subscription_plan_id'));
                        queryMembership.find({
                            useMasterKey: true,
                            success: function (results) {
                                if (results[0]) {
                                    result.get('user').set('membership', results[0]);
                                    var PaymentInfo = Parse.Object.extend("PaymentInfo");
                                    let paymentInfo = result.get('user').get("paymentInfo") || new PaymentInfo();
                                    if (result.get('receipt_url'))
                                        paymentInfo.set('receipt_url', result.get('receipt_url'));
                                    if (result.get('cancel_url'))
                                        paymentInfo.set('cancel_url', result.get('cancel_url'));
                                    if (result.get('update_url'))
                                        paymentInfo.set('update_url', result.get('update_url'));
                                    result.get('user').set('paymentInfo', paymentInfo);
                                    result.get('user').save(null, {
                                        useMasterKey: true,
                                        success: function (user) {
                                            console.log({
                                                action: "set membership to " + results[0].id,
                                                user: user.id
                                            });
                                            let text = 'hi,<br>Thank you for your payment,';

                                            if (result.get('receipt_url'))
                                                text += '<br>Receipt link: ' + result.get('receipt_url');
                                            if (result.get('cancel_url'))
                                                text += ' <br>Cancellation link: ' + result.get('cancel_url');
                                            if (result.get('update_url'))
                                                text += ' <br> Update link: ' + result.get('update_url');
                                            text += '<br>Event: ' + result.get('alert_name');
                                            sendSmtpMail({
                                                to: user.get('email'),
                                                text: text,
                                                subject: 'Premium Subscription'
                                            });

                                        },
                                        error: function (object, error) {
                                            console.error("Got an error " + error.code + " : " + error.message);
                                        }
                                    });
                                }
                            }
                        });
                    } else if (['payment_refunded', 'subscription_cancelled', 'subscription_payment_refunded'].indexOf(result.get('alert_name')) != -1) {
                        result.get('user').set('membership', {
                            "__type": "Pointer", "className": "Membership",
                            "objectId": "G0wH0oBAyF"
                        });
                        result.get('user').unset('paymentInfo');

                        result.get('user').save(null, {
                            useMasterKey: true,
                            success: function (result) {
                                console.log({
                                    action: "set membership to G0wH0oBAyF",
                                    user: result.id
                                });
                                sendSmtpMail({
                                    to: user.get('email'),
                                    text: 'hi,<br>Your subscription cancelled succeeded.<br>Event: ' + result.get('alert_name'),
                                    subject: 'Premium Subscription Cancelled'
                                });
                            },
                            error: function (object, error) {
                                console.error("Got an error " + error.code + " : " + error.message);
                            }
                        });
                    }
                }
            },
            error: function (object, error) {
                console.error("Got an error " + error.code + " : " + error.message);
                res.status(500).send(error);
            }
        })
    };
    if (!params.passthrough) {
        ret();
        return;
    }
    query.get(params.passthrough, {
            useMasterKey: true,
            success: function (result) {
                paddleLog.set('user', result);
                ret();
            },
            error: function (object, error) {
                console.error("Got an error " + error.code + " : " + error.message);
                ret();
            }
        }
    );

});


var port = 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function () {
    console.log('EnbarterParse running on port ' + port + '.');
});

ParseServer.createLiveQueryServer(httpServer);