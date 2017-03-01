var sendSmtpMail = require('simple-parse-smtp-adapter')({
    fromAddress: 'Enbarter <no-reply@enbarterdev.ml>',
    user: 'no-reply@enbarterdev.ml',
    password: 'cba2321ce58c9bd28e8b7b1d3e6fde24a194c485cd94b7c21e736041487bab80',
    host: 'enbarterdev.ml',
    isSSL: true,
    port: 465,
    isTlsRejectUnauthorized: false,
    name: 'enbarterdev.ml',
    emailField: 'email'
}).sendMail;
var sanitizeHtml = require('sanitize-html');
const fs = require('fs');

function sanitizeIt(html, removeTag) {
    let options = {
        allowedTags: ['p', 'a', 'img', 'b', 'i', 'u', 'strike', 'strike', 'sup', 'hr', 'br', 'sub', 'span'],
        allowedAttributes: {
            a: ['href', 'name', 'target', 'src'],
            img: ['src']
        },
        selfClosing: ['img', 'br', 'hr', 'link'],
        allowedSchemes: ['http', 'https', 'ftp', 'mailto'],
        allowedSchemesByTag: {
            img: ['http', 'https', 'data']
        },
        allowProtocolRelative: true, allowedClasses: {
            a: ['aWrapper'],
            span: ['glyphicon', 'glyphicon-play-circle', 'playBtn']
        }
    };
    for (let tag of removeTag || []) {
        options.allowedTags = options.allowedTags.filter(i => i !== tag);
    }
    return sanitizeHtml(html, options);
}

Parse.Cloud.beforeSave("_User", function (request, response) {
    if (!request.master) {
        if (request.object.dirty('membership')) {
            membership = {
                "__type": "Pointer", "className": "Membership",
                "objectId": "G0wH0oBAyF"
            };
            if (request.original)
                membership = request.original.get('membership');
            request.object.set('membership', membership);
        }
        if (request.object.dirty('paymentInfo')) {
            paymentInfo = null;
            if (request.original)
                paymentInfo = request.original.get('paymentInfo');
            request.object.set('paymentInfo', paymentInfo);
        }
    }
    if (request.object.dirty('bio')) {
        request.object.set('bio', sanitizeIt(request.object.get('bio'), ['a', 'img', 'hr', 'iframe']));
    }
    if (request.object.isNew()) {
        request.object.set('membership', {
            "__type": "Pointer", "className": "Membership",
            "objectId": "G0wH0oBAyF"
        });
    } else {
        if (request.object.dirty('pic') && request.original.get('pic') && request.object.get('pic')) {
            fs.unlink(__dirname + '/../files/' + request.original.get('pic').name(), function () {
            });
        }
    }
    return response.success();
});

Parse.Cloud.afterSave("_User", function (request) {
    if (!request.object.existed()) {
        createNotification(request.object, "newUserWelcoming", request.object, request.object.id);
    }
});

function checkRequired(request) {
    var dirtyKeys = request.object.dirtyKeys();
    var required = ['barterTitle', 'offerCategory', 'offerDescription', 'offerMilestones', 'offerDeadline', 'seekCategory', 'seekDescription', 'seekDeadline', 'user', 'state', 'words'];
    var errors = "";
    for (var i = 0; i < required.length; i++) {
        if (dirtyKeys.indexOf(required[i]) == -1)
            errors += required[i] + " Is required! ";
    }
    return errors;
}
Parse.Cloud.beforeSave("BarterDashboard", function (request, response) {
    if (!request.master && !request.object.isNew()) {
        if (request.object.dirty('barterUpUser') && request.original.get('barterUpUser')) {
            return response.error("Not Authorized");
        }

        var dirtyKeys = request.object.dirtyKeys();
        if (dirtyKeys.length == 1 && dirtyKeys[i] == 'barter') {
            request.object.set('barter', request.original.get('barter'));
            return response.success();
        }
        var flag = false;
        var allowed = ['barterUpMilestones', 'barterUpFinalPic', 'barterUpDeadline'];
        for (var i = 0; i < dirtyKeys.length; i++) {
            if (allowed.indexOf(dirtyKeys[i]) == -1)
                flag = true;
        }
        if (request.original.get('barterUpUser') && request.user.id == request.original.get('barterUpUser').id && flag) {
            return response.error("Not Authorized");
        }
        if (request.user.id == request.original.get('user').id && !flag) {
            return response.error("Not Authorized");
        }
        if (request.object.dirty('barterUpUser') && request.object.dirty('barterUpMilestones')) {
            createNotification(request.object.get('barterUpUser'), "barterUpUser", request.user, request.object.get('barter').id);
        } else if (request.object.dirty('barterUpMilestones') && request.original.get('barterUpMilestones')) {
            createNotification(request.object.get("user"), "barterUpMilestones", request.user, request.object.get('barter').id);
        } else if (request.object.dirty('offerMilestones') && request.original.get('barterUpMilestones')) {
            createNotification(request.object.get("barterUpUser"), "offerMilestones", request.user, request.object.get('barter').id);
        } else if (request.object.dirty('offerFinalPic') && !request.original.get('offerFinalPic')) {
            createNotification(request.object.get("barterUpUser"), "finalUploaded", request.user, request.object.get('barter').id);
        } else if (request.object.dirty('barterUpFinalPic') && !request.original.get('barterUpFinalPic')) {
            createNotification(request.object.get("user"), "finalUploaded", request.user, request.object.get('barter').id);
        }
    }
    return response.success();
});
function checkLimits(request, response, callback) {
    let query = new Parse.Query(Parse.User);
    query.include('membership');
    query.get(request.user.id, {
            useMasterKey: true,
            success: function (result) {
                if (!result.get('membership')) {
                    result.set('membership', {
                        "__type": "Pointer", "className": "Membership",
                        "objectId": "G0wH0oBAyF"
                    });
                    result.save(null, {
                        useMasterKey: true
                    });
                }
                let queryBarter1 = new Parse.Query("Barter");
                queryBarter1.equalTo('user', request.user);
                queryBarter1.greaterThanOrEqualTo('createdAt', new Date(new Date().setDate(new Date().getDate() - 30)));
                let queryBarter2 = new Parse.Query("Barter");
                queryBarter2.equalTo('barterUpUser', request.user);
                queryBarter2.greaterThanOrEqualTo('createdAt', new Date(new Date().setDate(new Date().getDate() - 30)));

                let queryBarter3 = request.user.relation('barterRequests').query();
                queryBarter3.equalTo('state', 'new');
                queryBarter3.greaterThanOrEqualTo('createdAt', new Date(new Date().setDate(new Date().getDate() - 30)));
                let mainQuery = Parse.Query.or(queryBarter1, queryBarter2, queryBarter3);
                mainQuery.find({
                    success: function (results) {
                        if (results.length >= result.get('membership').get('monthlyUnits'))
                            return response.error('Sorry you have exceeded your monthly limit');

                        let queryBarter1 = new Parse.Query("Barter");
                        queryBarter1.equalTo('user', request.user);
                        queryBarter1.containedIn('state', ['new', 'bartered']);
                        let queryBarter2 = new Parse.Query("Barter");
                        queryBarter2.equalTo('barterUpUser', request.user);
                        queryBarter2.containedIn('state', ['new', 'bartered']);
                        let mainQuery = Parse.Query.or(queryBarter1, queryBarter2);

                        mainQuery.find({
                            success: function (results) {
                                if (results.length >= result.get('membership').get('activeLimit'))
                                    return response.error('Sorry you have exceeded your active limit');
                                callback(function () {
                                    if (request.object.dirty('offerDescription')) {
                                        request.object.set('offerDescription', sanitizeIt(request.object.get('offerDescription')));
                                    }
                                    if (request.object.dirty('seekDescription')) {
                                        request.object.set('seekDescription', sanitizeIt(request.object.get('seekDescription')));
                                    }
                                    return response.success();
                                });
                            },
                            error: function (object, error) {
                                console.error("Got an error " + error.code + " : " + error.message);
                                return response.error(error);
                            }
                        });
                    },
                    error: function (object, error) {
                        console.error("Got an error " + error.code + " : " + error.message);
                        return response.error(error);
                    }
                });
            },
            error: function (object, error) {
                console.error("Got an error " + error.code + " : " + error.message);
                return response.error(error);
            }
        }
    );
}
Parse.Cloud.beforeSave("Barter", function (request, response) {
    if (request.object.isNew()) {
        checkLimits(request, response, function (callback) {
            var errors = checkRequired(request);
            if (errors.length) {
                return response.error(errors);
            }
            callback();
        });
    } else {
        if (!request.user || ((request.user.id != request.object.get('user').id && (request.object.get('barterUpUser') && request.user.id != request.object.get('barterUpUser').id)) && !(request.object.dirtyKeys().length == 0 || (request.object.dirtyKeys().length == 1 && request.object.dirty('barterRequests'))))) {
            return response.error("Not Authorized");
        }
        if (request.object.dirty('barterUpUser') && request.original.get('barterUpUser')) {
            return response.error("Not Authorized");
        }

        var dirtyKeys = request.object.dirtyKeys();
        var flag = false;
        var allowed = ['barterUpMilestones', 'barterUpRate', 'barterUpReview', 'barterUpFinalPic', 'barterUpDeadline'];
        for (var i = 0; i < dirtyKeys.length; i++) {
            if (allowed.indexOf(dirtyKeys[i]) == -1)
                flag = true;
        }
        if (request.original.get('barterUpUser') && request.user.id == request.original.get('barterUpUser').id && flag) {
            return response.error("Not Authorized");
        }
        if (request.user.id == request.original.get('user').id && !flag) {
            return response.error("Not Authorized");
        }
        if (request.object.dirty('offerRate') && !request.original.get('offerRate')) {
            query = new Parse.Query(Parse.User);
            query.get(request.object.get("barterUpUser").id, {
                useMasterKey: true,
                success: function (result) {
                    result.increment("rateCount", 1);
                    result.increment("rate", request.object.get('offerRate'));
                    result.save(null, {
                        useMasterKey: true,
                        error: function (object, error) {
                            console.error("Got an error " + error.code + " : " + error.message);
                        }
                    });
                    createNotification(result, "rate", request.user, request.object.id);
                },
                error: function (object, error) {
                    console.error("Got an error " + error.code + " : " + error.message);
                }
            });
            if (request.original.get('barterUpRate')) {
                request.object.set('state', 'completed');
            }
            if (request.object.dirty('state') && request.object.get('state') == 'completed') {
                request.original.get('barterDashboard').set('state', 'completed');
                request.original.get('barterDashboard').save(null, {
                    useMasterKey: true,
                    error: function (object, error) {
                        console.error("Got an error " + error.code + " : " + error.message);
                    }
                });
                createNotification(request.object.get('barterUpUser'), "barterCompleted", request.user, request.object.id);
                createNotification(request.object.get('user'), "barterCompleted", request.object.get('barterUpUser'), request.object.id);
            }
        }
        else if (request.object.dirty('barterUpRate') && !request.original.get('barterUpRate')) {
            query = new Parse.Query(Parse.User);
            query.get(request.object.get("user").id, {
                useMasterKey: true,
                success: function (result) {
                    result.increment("rateCount", 1);
                    result.increment("rate", request.object.get('barterUpRate'));
                    createNotification(result, "rate", request.user, request.object.id);
                    result.save(null, {
                        useMasterKey: true,
                        error: function (object, error) {
                            console.error("Got an error " + error.code + " : " + error.message);
                        }
                    });
                },
                error: function (object, error) {
                    console.error("Got an error " + error.code + " : " + error.message);
                }
            });
            if (request.original.get('offerRate')) {
                request.object.set('state', 'completed');
            }
            if (request.object.dirty('state') && request.object.get('state') == 'completed') {
                request.original.get('barterDashboard').set('state', 'completed');
                request.original.get('barterDashboard').save(null, {
                    useMasterKey: true,
                    error: function (object, error) {
                        console.error("Got an error " + error.code + " : " + error.message);
                    }
                });

                createNotification(request.object.get('barterUpUser'), "barterCompleted", request.user, request.object.id);
                createNotification(request.object.get('user'), "barterCompleted", request.object.get('barterUpUser'), request.object.id);
            }
        } else if (request.object.dirty('barterUpUser') && request.object.dirty('barterUpMilestones')) {

            createNotification(request.object.get('barterUpUser'), "barterUpUser", request.user, request.object.id);

            var query = new Parse.Query(Parse.User);
            query.get(request.object.get('barterUpUser').id, {
                    useMasterKey: true,
                    success: function (result) {
                        let relation = result.relation('barterRequests');
                        relation.remove(request.object);
                        result.save(null, {
                            useMasterKey: true, error: function (object, error) {
                                console.error("Got an error " + error.code + " : " + error.message);
                            }
                        });
                    },
                    error: function (object, error) {
                        console.error("Got an error " + error.code + " : " + error.message);
                    }
                }
            );
        } else if (request.object.dirty('barterRequests')) {
            checkLimits(request, response, function (callback) {
                createNotification(request.object.get("user"), "barterRequests", request.user, request.object.id);
                callback();
            });
            return;
        } else if (request.object.dirty('barterUpMilestones') && request.original.get('barterUpMilestones')) {
            createNotification(request.object.get("user"), "barterUpMilestones", request.user, request.object.id);
        } else if (request.object.dirty('offerMilestones') && request.original.get('barterUpMilestones')) {
            createNotification(request.object.get("barterUpUser"), "offerMilestones", request.user, request.object.id);
        } else if (request.object.dirty('offerFinalPic') && !request.original.get('offerFinalPic')) {
            createNotification(request.object.get("barterUpUser"), "finalUploaded", request.user, request.object.id);
        } else if (request.object.dirty('barterUpFinalPic') && !request.original.get('barterUpFinalPic')) {
            createNotification(request.object.get("user"), "finalUploaded", request.user, request.object.id);
        }
        if (request.object.dirty('offerDescription')) {
            request.object.set('offerDescription', sanitizeIt(request.object.get('offerDescription')));
        }
        if (request.object.dirty('seekDescription')) {
            request.object.set('seekDescription', sanitizeIt(request.object.get('seekDescription')));
        }
        return response.success();
    }
});

Parse.Cloud.beforeSave("BarterComment", function (request, response) {
    if (request.object.dirty('comment')) {
        request.object.set('comment', sanitizeIt(request.object.get('comment')));
    }
    return response.success();
});

function createNotification(user, event, creator, objectId) {
    var Notification = Parse.Object.extend("Notification");
    var notification = new Notification();
    notification.set("user", user);
    notification.set("creator", creator);
    notification.set("event", event);
    var subject, message;
    switch (event) {
        case 'rate':
            notification.set("description", "You got a new rate");
            notification.set("redirect", '/profile');

            subject = 'You got a new rate';
            message = 'Hi, <br> You got a new rate <br> http://enbarter.com' + notification.get('redirect');
            break;
        case 'barterRequests':
            notification.set('description', 'You got a new barter request');
            notification.set("redirect", '/barter/' + objectId);
            subject = 'You got a new barter request';
            message = 'Hi, <br> You got a new barter request <br> http://enbarter.com' + notification.get('redirect');
            break;
        case 'barterUpUser':
            notification.set('description', 'Your barter request accepted go to dashboard');
            notification.set("redirect", '/dashboard/barter/' + objectId);
            subject = 'Your barter request accepted go to dashboard';
            message = 'Hi, <br> Your barter request accepted go to dashboard <br> http://enbarter.com' + notification.get('redirect');
            break;
        case 'barterUpMilestones':
        case 'offerMilestones':
            notification.set('description', 'Your barter have checked');
            notification.set("redirect", '/dashboard/barter/' + objectId);
            subject = 'Your barter have checked';
            message = 'Hi, <br> Your barter have checked <br> http://enbarter.com' + notification.get('redirect');
            break;
        case 'newUserWelcoming':
            notification.set('description', 'Welcome to enbarter!, start by browsing');
            notification.set("redirect", '/browse');
            break;
        case 'barterCompleted':
            notification.set('description', 'Congratulations completing your barter');
            notification.set("redirect", '/dashboard/barter/' + objectId);
            subject = 'Congratulations completing your barter';
            message = 'Hi, <br> Congratulations completing your barter <br> http://enbarter.com' + notification.get('redirect');
            break;
        case 'finalUploaded':
            notification.set('description', 'Complete project uploaded');
            notification.set("redirect", '/dashboard/barter/' + objectId);
            subject = 'Complete project uploaded';
            message = 'Hi, <br> Complete project uploaded <br> http://enbarter.com' + notification.get('redirect');
            break;
    }


    let query = new Parse.Query(Notification);
    query.equalTo("user", user);
    query.equalTo("creator", creator);
    query.notEqualTo("read", true);

    query.descending("createdAt");

    query.find({
        success: function (object) {
            if (!object[0] || object[0].get('redirect') != notification.get('redirect')) {
                notification.save(null, {
                    useMasterKey: true, error: function (object, error) {
                        console.error("Got an error " + error.code + " : " + error.message);
                    }
                });
                if (message && subject)
                    sendMailToUser(notification.get('user'), message, subject);
            }
        },
        error: function (error) {
            console.error("Got an error " + error.code + " : " + error.message);
        }
    });
}

function sendMailToUser(user, message, subject) {
    if (user.get('email'))
        sendSmtpMail({
            to: user.get('email'),
            text: message,
            subject: subject
        });
    else {
        var query = new Parse.Query(Parse.User);
        query.get(user.id, {
                useMasterKey: true,
                success: function (result) {
                    sendSmtpMail({
                        to: result.get('email'),
                        text: message,
                        subject: subject
                    });
                },
                error: function (object, error) {
                    console.error("Got an error " + error.code + " : " + error.message);
                }
            }
        );
    }
}

Parse.Cloud.job("sitemapGenerator", function (request, status) {
    status.message("Started");
    var query = new Parse.Query("Barter");
    query.descending("updatedAt");
    query.find({
        success: function (results) {
            status.message("Got result");
            var fs = require('fs');
            var dir = __dirname + '/../public/sitemap.xml';
            fs.open(dir, 'w+', function (err, fd) {
                if (err) {
                    status.error("Got an error " + err);
                }

                fs.appendFileSync(dir, '<?xml version="1.0" encoding="UTF-8"?>\n', encoding = 'utf8');
                fs.appendFileSync(dir, '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n', encoding = 'utf8');
                fs.appendFileSync(dir, '   <url>\n', encoding = 'utf8');
                fs.appendFileSync(dir, '       <loc>https://enbarter.com</loc>\n', encoding = 'utf8');
                let updatedAt = (results.length) ? results[0].updatedAt : new Date();
                fs.appendFileSync(dir, '       <lastmod>' + updatedAt + '</lastmod>\n', encoding = 'utf8');
                fs.appendFileSync(dir, '       <changefreq>daily</changefreq>\n', encoding = 'utf8');
                fs.appendFileSync(dir, '       <priority>1.0</priority>\n', encoding = 'utf8');
                fs.appendFileSync(dir, '   </url>\n', encoding = 'utf8');

                fs.appendFileSync(dir, '   <url>\n', encoding = 'utf8');
                fs.appendFileSync(dir, '       <loc>https://enbarter.com/prices</loc>\n', encoding = 'utf8');
                fs.appendFileSync(dir, '       <lastmod>' + ((results.length) ? results[0].updatedAt : new Date()) + '</lastmod>\n', encoding = 'utf8');
                fs.appendFileSync(dir, '       <changefreq>daily</changefreq>\n', encoding = 'utf8');
                fs.appendFileSync(dir, '       <priority>1.0</priority>\n', encoding = 'utf8');
                fs.appendFileSync(dir, '   </url>\n', encoding = 'utf8');

                fs.appendFileSync(dir, '   <url>\n', encoding = 'utf8');
                fs.appendFileSync(dir, '       <loc>https://enbarter.com/browse</loc>\n', encoding = 'utf8');
                fs.appendFileSync(dir, '       <lastmod>' + ((results.length) ? results[0].updatedAt : new Date()) + '</lastmod>\n', encoding = 'utf8');
                fs.appendFileSync(dir, '       <changefreq>daily</changefreq>\n', encoding = 'utf8');
                fs.appendFileSync(dir, '       <priority>1.0</priority>\n', encoding = 'utf8');
                fs.appendFileSync(dir, '   </url>\n', encoding = 'utf8');

                for (let r of results) {
                    fs.appendFileSync(dir, '   <url>\n', encoding = 'utf8');
                    fs.appendFileSync(dir, '       <loc>https://enbarter.com/barter/' + r.id + '</loc>\n', encoding = 'utf8');
                    fs.appendFileSync(dir, '       <lastmod>' + r.updatedAt + '</lastmod>\n', encoding = 'utf8');
                    fs.appendFileSync(dir, '       <changefreq>weakly</changefreq>\n', encoding = 'utf8');
                    fs.appendFileSync(dir, '       <priority>0.8</priority>\n', encoding = 'utf8');
                    fs.appendFileSync(dir, '   </url>\n', encoding = 'utf8');
                }
                fs.appendFileSync(dir, '</urlset>\n', encoding = 'utf8');
                fs.close(fd, function (err) {
                    if (err) {
                        status.error("Got an error " + err);
                    }
                    status.success("Finished");
                });
            });
        },
        error: function (object, error) {
            status.error("Got an error " + error.code + " : " + error.message);
        }
    }).then(function (result) {
        status.success("Finished");
    }, function (error) {
        status.error("Got an error " + error.code + " : " + error.message);
    });
});