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

        let restricted = ['paymentInfo', 'rate', 'rateCount', 'emailVerified', 'favors'];
        for (let key of restricted) {
            if (request.object.dirty(key)) {
                value = null;
                if (request.original)
                    value = request.original.get(key);
                request.object.set(key, value);
            }
        }
    }
    if (request.object.dirty('bio') && request.object.get('bio')) {
        request.object.set('bio', sanitizeIt(request.object.get('bio'), ['a', 'img', 'hr', 'iframe']));
    }
    if (request.object.isNew()) {
        request.object.set('membership', {
            "__type": "Pointer", "className": "Membership",
            "objectId": "G0wH0oBAyF"
        });
        request.object.addUnique('favors', {
            count: 1,
            favor: {__type: "Pointer", className: "Favor", objectId: "W7cjBZuI39"}
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
    var required = ['barterTitle', 'offerCategory', 'seekCategory', 'seekDescription', 'seekDeadline', 'user', 'state', 'words'];
    if (!request.object.has('offerFavor'))
        required.push('offerDeadline', 'offerMilestones', 'offerDescription');
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
    query.include('favors.favor');
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
                            return response.error('Sorry you have exceeded your monthly limit, Would you like to upgrade your plan to increase the limit check the prices here: http://enbarter.com/prices');

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
                                    return response.error('Sorry you have exceeded your active limit, Would you like to upgrade your plan to increase the limit check the prices here: http://enbarter.com/prices');

                                if (request.object.dirty('offerFavor') && request.object.get('offerFavor')) {
                                    let flag = true;
                                    for (let index in  result.get('favors')) {
                                        let favor = result.get('favors')[index];
                                        if ((favor.favor.objectId || favor.favor.id) == request.object.get('offerFavor').id && favor.count > 0) {
                                            flag = false;
                                            favor.count--;
                                            result.save(null, {
                                                useMasterKey: true,
                                                error: function (object, error) {
                                                    console.error("Got an error " + error.code + " : " + error.message);
                                                }
                                            });
                                            break;
                                        }
                                    }
                                    if (flag)
                                        return response.error('Sorry you dont have enough favors');
                                }

                                if (request.object.dirty('barterRequests') && request.object.get('barterRequests')) {
                                    let barterRequests = request.object.get('barterRequests');

                                    for (let indexj in barterRequests) {
                                        if (barterRequests[indexj].user.id == result.id) {
                                            if (barterRequests[indexj].favor) {
                                                let flag = true;
                                                for (let index in  result.get('favors')) {
                                                    let favor = result.get('favors')[index];
                                                    if ((favor.favor.objectId || favor.favor.id) == barterRequests[indexj].favor.id && favor.count > 0) {
                                                        flag = false;
                                                        favor.count--;
                                                        result.save(null, {
                                                            useMasterKey: true,
                                                            error: function (object, error) {
                                                                console.error("Got an error " + error.code + " : " + error.message);
                                                            }
                                                        });
                                                        break;
                                                    }
                                                }
                                                if (flag)
                                                    return response.error('Sorry you dont have enough favors');
                                            }
                                            break;
                                        }
                                    }
                                }

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
function incrementFavorCount(userId, favorId) {
    let query = new Parse.Query(Parse.User);
    query.include('favors.favor');
    query.get(userId, {
        useMasterKey: true,
        success: function (result) {
            let flag = true;
            for (let index in  result.get('favors')) {
                let favor = result.get('favors')[index];
                if ((favor.favor.objectId || favor.favor.id) == favorId) {
                    flag = false;
                    favor.count++;
                    break;
                }
            }
            if (flag) {
                let favorObject = {
                    "count": 1,
                    "favor": {
                        "__type": "Pointer",
                        "className": "Favor",
                        "objectId": favorId
                    }
                };
                result.addUnique('favors', favorObject);
            }
            result.save(null, {
                useMasterKey: true,
                error: function (object, error) {
                    console.error("Got an error " + error.code + " : " + error.message);
                }
            });
        },
        error: function (error) {
            console.error("Got an error " + error.code + " : " + error.message);
        }
    });
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
    } else if (!request.master) {
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
                var acl = new Parse.ACL();
                acl.setPublicWriteAccess(false);
                acl.setPublicReadAccess(true);
                request.object.setACL(acl);
            }
            if (request.object.dirty('state') && request.object.get('state') == 'completed') {
                request.original.get('barterDashboard').set('state', 'completed');
                var acl = new Parse.ACL();
                acl.setPublicWriteAccess(false);
                acl.setPublicReadAccess(true);
                request.original.get('barterDashboard').setACL(acl);

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
                var acl = new Parse.ACL();
                acl.setPublicWriteAccess(false);
                acl.setPublicReadAccess(true);
                request.object.setACL(acl);
            }
            if (request.object.dirty('state') && request.object.get('state') == 'completed') {
                request.original.get('barterDashboard').set('state', 'completed');
                var acl = new Parse.ACL();
                acl.setPublicWriteAccess(false);
                acl.setPublicReadAccess(true);
                request.original.get('barterDashboard').setACL(acl);

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
        if (request.object.dirty('state')) {
            if (request.object.get('state') == 'disabled') {
                if (request.original.get('offerFavor')) {
                    incrementFavorCount(request.original.get('user').id, request.original.get('offerFavor').id);
                }
            }
            if (request.object.get('state') == 'disabled' || request.object.get('state') == 'bartered') {
                let barterRequests = request.object.get('barterRequests');

                for (let indexj in barterRequests) {
                    if (!request.object.get('barterUpUser') || barterRequests[indexj].user.id != request.object.get('barterUpUser').id) {
                        if (barterRequests[indexj].favor) {
                            incrementFavorCount(barterRequests[indexj].user.id, barterRequests[indexj].favor.id);
                        }
                    }
                }
            } else if (request.object.get('state') == 'completed') {
                if (request.original.get('offerFavor')) {
                    incrementFavorCount(request.original.get('barterUpUser').id, request.original.get('offerFavor').id);
                } else if (request.original.get('barterUpFavor')) {
                    incrementFavorCount(request.original.get('user').id, request.original.get('barterUpFavor').id);
                }
            }

        }
        return response.success();
    } else
        return response.success();
});

Parse.Cloud.beforeSave("BarterComment", function (request, response) {
    if (request.object.dirty('comment')) {
        request.object.set('comment', sanitizeIt(request.object.get('comment')));
    }
    return response.success();
});

Parse.Cloud.afterSave("BarterComment", function (request) {
    if (!request.object.existed()) {
        if (request.object.get('parent')) {
            request.object.get("parent").fetch({
                useMasterKey: true,
                success: function (object) {
                    // object.add('children', request.object);
                    // object.save(null, {
                    //     useMasterKey: true, error: function (object, error) {
                    //         console.error("Got an error " + error.code + " : " + error.message);
                    //     }
                    // });
                    if (object.get('user').id != request.user.id)
                        createNotification(object.get('user'), "barterCommentReply", request.user, request.object.get("barter").id);
                },
                error: function (error) {
                    console.error("Got an error " + error.code + " : " + error.message);
                }
            });
        } else if (request.object.get("barter")) {
            request.object.get("barter").fetch({
                useMasterKey: true,
                success: function (object) {
                    if (object.get('user').id != request.user.id)
                        createNotification(object.get('user'), "barterComment", request.user, request.object.get("barter").id);
                },
                error: function (error) {
                    console.error("Got an error " + error.code + " : " + error.message);
                }
            });
        }
    }
});


Parse.Cloud.beforeSave("Message", function (request, response) {
    if (request.object.dirty('message')) {
        request.object.set('message', sanitizeIt(request.object.get('message')));
    }
    return response.success();

});

Parse.Cloud.afterSave("Message", function (request) {
    if (!request.object.existed()) {
        request.object.get('messageThread').set('lastMessage', request.object.get('message').replace(/(<([^>]+)>)/ig, "").substring(0, 100) || '');
        request.object.get('messageThread').save(null, {
            useMasterKey: true, error: function (object, error) {
                console.error("Got an error " + error.code + " : " + error.message);
            }
        });
    }
});

Parse.Cloud.afterSave("MessageThread", function (request) {
    if (!request.object.existed()) {
        createNotification(request.object.get("to"), "MessageThread", request.user, request.object.get("to").id);
    }
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
            notification.set("description", "You just Got a New Rating!");
            notification.set("redirect", '/profile');

            subject = 'You just got a new rating';
            message = 'Hi, <br> Someone just gave you a new rating! Check it out! ';
            break;
        case 'barterRequests':
            notification.set('description', 'You Got a New Barter Request');
            notification.set("redirect", '/barter/' + objectId);
            subject = 'You Got a New Barter Request';
            message = 'Hi, <br> A new barter request comes your way!  ';
            break;
        case 'barterUpUser':
            notification.set('description', 'Your Barter Request is Accepted! To the Dashboard!');
            notification.set("redirect", '/dashboard/barter/' + objectId);
            subject = 'Your Barter Request is Accepted! To the Dashboard!';
            message = 'Hi, <br> A barter request you recently made has been accepted! ';
            break;
        case 'barterUpMilestones':
        case 'offerMilestones':
            notification.set('description', 'A Milestone has been Checked!');
            notification.set("redirect", '/dashboard/barter/' + objectId);
            subject = 'A Milestone has been Checked!';
            message = 'Hi, <br> A milestone on one of your barters has been checked! ';
            break;
        case 'newUserWelcoming':
            notification.set('description', 'Welcome to Enbarter! Start by Browsing!');
            notification.set("redirect", '/browse');
            break;
        case 'barterCompleted':
            notification.set('description', 'Congratulations on Completing your Barter!');
            notification.set("redirect", '/dashboard/barter/' + objectId);
            subject = 'Congratulations on Completing your Barter!';
            message = 'Hi, <br> You have just completed a barter! Congratulations! ';
            break;
        case 'finalUploaded':
            notification.set('description', 'Complete Project Uploaded!');
            notification.set("redirect", '/dashboard/barter/' + objectId);
            subject = 'Complete Project Uploaded';
            message = 'Hi, <br> Congratulations! The complete project has been uploaded! ';
            break;
        case 'barterComment':
            notification.set('description', 'A New Comment has been Posted on your Barter!');
            notification.set("redirect", '/barter/' + objectId + '#qna');
            subject = 'You Got a New Comment on your Barter!';
            message = 'Hi, <br> Someone commented on your barter! ';
            break;
        case 'barterCommentReply':
            notification.set('description', 'You Got a New Reply!');
            notification.set("redirect", '/barter/' + objectId + '#qna');
            subject = 'You Got a New Reply on a Comment!';
            message = 'Hi, <br> Someone replied to your comment! ';
            break;
        case 'MessageThread':
            notification.set('description', 'You Received a New Message!');
            notification.set("redirect", '/messages/' + objectId);
            subject = 'You Received a New Message';
            message = 'Hi, <br> Someone sent you a new message! ';
            break;
    }

    let query = new Parse.Query(Notification);
    query.equalTo("user", user);
    query.equalTo("creator", creator);

    query.descending("createdAt");

    query.first({
        useMasterKey: true,
        success: function (object) {
            if (!object || object.get('read') || object.get('redirect') != notification.get('redirect') || object.get('description') != notification.get('description')) {
                notification.save(null, {
                    useMasterKey: true, success: function (notification) {
                        if (message && subject) {
                            message += '<br> http://enbarter.com/notifications#' + notification.id;
                            sendMailToUser(notification.get('user'), message, subject);
                        }
                    }, error: function (object, error) {
                        console.error("Got an error " + error.code + " : " + error.message);
                    }
                });
            } else {
                object.increment('count');
                object.save(null, {
                    useMasterKey: true, error: function (object, error) {
                        console.error("Got an error " + error.code + " : " + error.message);
                    }
                });
            }
        },
        error: function (error) {
            console.error("Got an error " + error.code + " : " + error.message);
        }
    });
}

function sendMailToUser(user, message, subject) {
    if (user.get('email') && (!user.get('options') || user.get('options').sendEmails != false))
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
                    if (!result.get('options') || result.get('options').sendEmails != false)
                        sendSmtpMail({
                            to: result.get('email'),
                            text: message,
                            subject: "Enbarter Notification " + subject
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

Parse.Cloud.define("changeSubscription", function (request, response) {
    if (!request.user)
        return response.error("You not logged in");

    let query = new Parse.Query(Parse.User);
    query.include('paymentInfo');
    query.get(request.user.id, {
        useMasterKey: true,
        success: function (result) {
            if (!result.get('paymentInfo'))
                return response.error("You dont have a paid subscription");

            let query = new Parse.Query("Membership");
            query.get(request.params.membership, {
                useMasterKey: true,
                success: function (membership) {
                    Parse.Cloud.httpRequest({
                        method: 'POST',
                        url: 'https://vendors.paddle.com/api/2.0/subscription/users/move',
                        body: {
                            vendor_id: '17807',
                            vendor_auth_code: '40926e842ab8d995239b9e05fa5c47cd6ee1145eaa7a883d34',
                            subscription_id: result.get('paymentInfo').get('subscription_id'),
                            plan_id: membership.get('productId')
                        }
                    }).then(function (httpResponse) {
                        console.log(httpResponse.text);
                        let object = JSON.parse(httpResponse.text);
                        if (object.success)
                            return response.success('Success');
                        else
                            return response.error('Failed: ' + object.error.message);
                    }, function (httpResponse) {
                        console.error('Request failed with response code ' + httpResponse.status);
                        return response.error('Request failed');
                    });
                },
                error: function (object, error) {
                    console.error("Got an error " + error.code + " : " + error.message);
                    return response.error('Membership fetch failed');
                }
            });
        },
        error: function (object, error) {
            console.error("Got an error " + error.code + " : " + error.message);
            return response.error('User fetch failed');
        }
    });

});