Parse.Cloud.beforeSave("Barter", function (request, response) {
    let keys = request.object.dirtyKeys();
    for (let i = 0; i < keys.length; i++) {
        if (typeof request.object.get(keys[i]) === 'string') {
            request.object.set(keys[i], htmlentities(request.object.get(keys[i])));
        } else if (typeof request.object.get(keys[i]) === '[object Array]') {
            var ret = [];
            let arr = request.object.get(keys[i]);
            for (let j = 0; j < arr.length; j++) {
                ret.push(htmlentities(arr[i]));
            }
            request.object.set(keys[i], ret);

        } else if (keys[i] == 'barterRequests') {
            var ret = [];
            let obj = request.object.get(keys[i]);
            let arr = obj.milestones;
            for (let j = 0; j < arr.length; j++) {
                ret.push(htmlentities(arr[i]));
            }
            obj.milestones = arr;
            request.object.set(keys[i], obj);
        }
    }
    if (request.object.isNew()) {
    } else {
        if (!request.user || ((request.user.id != request.object.get('user').id || request.user.id != request.object.get('barterUpUser').id) && !(request.object.dirtyKeys == 1 && request.object.dirty('barterRequests')))) {
            response.error("Not Authorized");
            return;
        }
        if (request.object.dirty('barterUpUser') && request.original.get('barterUpUser')) {
            response.error("Not Authorized");
            return;
        }
        if (request.user.id != request.object.get('user').id && ((request.object.dirty('barterUpMilestones') && request.original.get('barterUpMilestones') || (request.object.dirty('barterUpRate') || request.object.dirty('barterUpReview') || request.object.dirty('barterUpFinalPic') || request.object.dirty('barterUpDeadline'))))) {
            response.error("Not Authorized");
            return;
        }

        let dirtyKeys = request.object.dirtyKeys();
        var flag = false;
        var allowed = ['barterUpMilestones', 'barterUpRate', 'barterUpReview', 'barterUpFinalPic', 'barterUpDeadline'];
        for (let i = 0; i < dirtyKeys.length; i++) {
            if (allowed.indexOf(dirtyKeys[i]) == -1)
                flag = true;
        }
        if (request.user.id != request.object.get('barterUpUser').id && flag) {
            response.error("Not Authorized");
            return;
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
    response.success();
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


function htmlentities(string, quoteStyle, charset, doubleEncode) {
    var getHtmlTranslationTable = require('../strings/get_html_translation_table')
    var hashMap = getHtmlTranslationTable('HTML_ENTITIES', quoteStyle)

    string = string === null ? '' : string + ''

    if (!hashMap) {
        return false
    }

    if (quoteStyle && quoteStyle === 'ENT_QUOTES') {
        hashMap["'"] = '&#039;'
    }

    doubleEncode = doubleEncode === null || !!doubleEncode

    var regex = new RegExp('&(?:#\\d+|#x[\\da-f]+|[a-zA-Z][\\da-z]*);|[' +
        Object.keys(hashMap)
            .join('')
            // replace regexp special chars
            .replace(/([()[\]{}\-.*+?^$|\/\\])/g, '\\$1') + ']',
        'g')

    return string.replace(regex, function (ent) {
        if (ent.length > 1) {
            return doubleEncode ? hashMap['&'] + ent.substr(1) : ent
        }

        return hashMap[ent];
    })
}