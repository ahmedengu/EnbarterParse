Parse.Cloud.afterSave("_User", function (request) {
    if (!request.object.existed()) {
        createNotification(request.object, "newUserWelcoming", request.object, request.object.id);
    }
});

function checkRequired(request) {
    var dirtyKeys = request.object.dirtyKeys();
    var required = ['barterTitle', 'barterDescription', 'offerCategory', 'offerDescription', 'offerMilestones', 'offerDeadline', 'seekCategory', 'seekDescription', 'seekDeadline', 'user', 'state', 'words'];
    var errors = "";
    for (var i = 0; i < required.length; i++) {
        if (dirtyKeys.indexOf(required[i]) == -1)
            errors += required[i] + " Is required! ";
    }
    return errors;
}
Parse.Cloud.beforeSave("Barter", function (request, response) {
    if (request.object.isNew()) {
        var errors = checkRequired(request);
        if (errors.length) {
            return response.error(errors);
        }
    } else {
        if (!request.user || ((request.user.id != request.object.get('user').id || (request.object.get('barterUpUser') && request.user.id != request.object.get('barterUpUser').id)) && !(request.object.dirtyKeys().length == 0 || (request.object.dirtyKeys().length == 1 && request.object.dirty('barterRequests'))))) {
            return response.error("Not Authorized");
        }
        if (request.object.dirty('barterUpUser') && request.original.get('barterUpUser')) {
            return response.error("Not Authorized");
        }
        if (request.user.id != request.object.get('user').id && ((request.object.dirty('barterUpMilestones') && request.original.get('barterUpMilestones') || (request.object.dirty('barterUpRate') || request.object.dirty('barterUpReview') || request.object.dirty('barterUpFinalPic') || request.object.dirty('barterUpDeadline'))))) {
            return response.error("Not Authorized");
        }

        var dirtyKeys = request.object.dirtyKeys();
        var flag = false;
        var allowed = ['barterUpMilestones', 'barterUpRate', 'barterUpReview', 'barterUpFinalPic', 'barterUpDeadline'];
        for (var i = 0; i < dirtyKeys.length; i++) {
            if (allowed.indexOf(dirtyKeys[i]) == -1)
                flag = true;
        }
        if (request.object.get('barterUpUser') && request.user.id != request.object.get('barterUpUser').id && flag) {
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
            if (request.object.dirty('state') && request.object.get('state') == 'completed') {
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

            if (request.object.dirty('state') && request.object.get('state') == 'completed') {
                createNotification(request.object.get('barterUpUser'), "barterCompleted", request.user, request.object.id);
                createNotification(request.object.get('user'), "barterCompleted", request.object.get('barterUpUser'), request.object.id);
            }
        } else if (request.object.dirty('barterUpUser') && request.object.dirty('barterUpMilestones')) {
            createNotification(request.object.get('barterUpUser'), "barterUpUser", request.user, request.object.id);
        } else if (request.object.dirty('barterRequests')) {
            createNotification(request.object.get("user"), "barterRequests", request.user, request.object.id);
        } else if (request.object.dirty('barterUpMilestones') && request.original.get('barterUpMilestones')) {
            createNotification(request.object.get("user"), "barterUpMilestones", request.user, request.object.id);
        } else if (request.object.dirty('offerMilestones') && request.original.get('barterUpMilestones')) {
            createNotification(request.object.get("barterUpUser"), "offerMilestones", request.user, request.object.id);
        }
    }
    return response.success();
});

function createNotification(user, event, creator, objectId) {
    var Notification = Parse.Object.extend("Notification");
    var notification = new Notification();
    notification.set("user", user);
    notification.set("creator", creator);
    notification.set("event", event);
    switch (event) {
        case 'rate':
            notification.set("description", "You got a new rate");
            notification.set("redirect", '/profile');
            break;
        case 'barterRequests':
            notification.set('description', 'You got a new barter request');
            notification.set("redirect", '/barter/' + objectId);
            break;
        case 'barterUpUser':
            notification.set('description', 'Your barter request accepted go to dashboard');
            notification.set("redirect", '/dashboard/barter/' + objectId);
            break;
        case 'barterUpMilestones':
        case 'offerMilestones':
            notification.set('description', 'Your barter have checked');
            notification.set("redirect", '/dashboard/barter/' + objectId);
            break;
        case 'newUserWelcoming':
            notification.set('description', 'Welcome to enbarter!, start by browsing');
            notification.set("redirect", '/browse');
            break;
        case 'barterCompleted':
            notification.set('description', 'Congratulations completing your barter');
            notification.set("redirect", '/dashboard/barter/' + objectId);
            break;
    }
    notification.save(null, {
        useMasterKey: true, error: function (object, error) {
            console.error("Got an error " + error.code + " : " + error.message);
        }
    });
}