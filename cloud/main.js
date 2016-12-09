Parse.Cloud.beforeSave("Barter", function (request, response) {
    let keys = request.object.dirtyKeys();
    for (let i = 0; i < keys.length; i++) {
        if (typeof request.object.get(keys[i]) === 'string') {
            request.object.set(keys[i], htmlentities(request.object.get(keys[i])));
        } else if (Array.isArray(request.object.get(keys[i]))) {
            if (keys[i] == 'offerMilestones') {
                var ret = [];
                let arr = request.object.get(keys[i]);
                for (let j = 0; j < arr.length; j++) {
                    let arr2 = arr[j];
                    arr2.task = htmlentities(arr[j].task);
                    ret.push(arr2);
                }
                request.object.set(keys[i], ret);
            } else {
                var ret = [];
                let arr = request.object.get(keys[i]);
                for (let j = 0; j < arr.length; j++) {
                    ret.push(htmlentities(arr[j]));
                }
                request.object.set(keys[i], ret);
            }
        } else if (keys[i] == 'barterRequests') {
            var ret = [];
            let obj = request.object.get(keys[i]);
            let arr = obj.milestones;
            for (let j = 0; j < arr.length; j++) {
                let arr2 = arr[j];
                arr2.task = htmlentities(arr[j].task);
                ret.push(arr2);
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
    var hashMap = get_html_translation_table('HTML_ENTITIES', quoteStyle)

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

function get_html_translation_table(table, quoteStyle) {

    var entities = {}
    var hashMap = {}
    var decimal
    var constMappingTable = {}
    var constMappingQuoteStyle = {}
    var useTable = {}
    var useQuoteStyle = {}

    // Translate arguments
    constMappingTable[0] = 'HTML_SPECIALCHARS'
    constMappingTable[1] = 'HTML_ENTITIES'
    constMappingQuoteStyle[0] = 'ENT_NOQUOTES'
    constMappingQuoteStyle[2] = 'ENT_COMPAT'
    constMappingQuoteStyle[3] = 'ENT_QUOTES'

    useTable = !isNaN(table)
        ? constMappingTable[table]
        : table
        ? table.toUpperCase()
        : 'HTML_SPECIALCHARS'

    useQuoteStyle = !isNaN(quoteStyle)
        ? constMappingQuoteStyle[quoteStyle]
        : quoteStyle
        ? quoteStyle.toUpperCase()
        : 'ENT_COMPAT'

    if (useTable !== 'HTML_SPECIALCHARS' && useTable !== 'HTML_ENTITIES') {
        throw new Error('Table: ' + useTable + ' not supported')
    }

    entities['38'] = '&amp;'
    if (useTable === 'HTML_ENTITIES') {
        entities['160'] = '&nbsp;'
        entities['161'] = '&iexcl;'
        entities['162'] = '&cent;'
        entities['163'] = '&pound;'
        entities['164'] = '&curren;'
        entities['165'] = '&yen;'
        entities['166'] = '&brvbar;'
        entities['167'] = '&sect;'
        entities['168'] = '&uml;'
        entities['169'] = '&copy;'
        entities['170'] = '&ordf;'
        entities['171'] = '&laquo;'
        entities['172'] = '&not;'
        entities['173'] = '&shy;'
        entities['174'] = '&reg;'
        entities['175'] = '&macr;'
        entities['176'] = '&deg;'
        entities['177'] = '&plusmn;'
        entities['178'] = '&sup2;'
        entities['179'] = '&sup3;'
        entities['180'] = '&acute;'
        entities['181'] = '&micro;'
        entities['182'] = '&para;'
        entities['183'] = '&middot;'
        entities['184'] = '&cedil;'
        entities['185'] = '&sup1;'
        entities['186'] = '&ordm;'
        entities['187'] = '&raquo;'
        entities['188'] = '&frac14;'
        entities['189'] = '&frac12;'
        entities['190'] = '&frac34;'
        entities['191'] = '&iquest;'
        entities['192'] = '&Agrave;'
        entities['193'] = '&Aacute;'
        entities['194'] = '&Acirc;'
        entities['195'] = '&Atilde;'
        entities['196'] = '&Auml;'
        entities['197'] = '&Aring;'
        entities['198'] = '&AElig;'
        entities['199'] = '&Ccedil;'
        entities['200'] = '&Egrave;'
        entities['201'] = '&Eacute;'
        entities['202'] = '&Ecirc;'
        entities['203'] = '&Euml;'
        entities['204'] = '&Igrave;'
        entities['205'] = '&Iacute;'
        entities['206'] = '&Icirc;'
        entities['207'] = '&Iuml;'
        entities['208'] = '&ETH;'
        entities['209'] = '&Ntilde;'
        entities['210'] = '&Ograve;'
        entities['211'] = '&Oacute;'
        entities['212'] = '&Ocirc;'
        entities['213'] = '&Otilde;'
        entities['214'] = '&Ouml;'
        entities['215'] = '&times;'
        entities['216'] = '&Oslash;'
        entities['217'] = '&Ugrave;'
        entities['218'] = '&Uacute;'
        entities['219'] = '&Ucirc;'
        entities['220'] = '&Uuml;'
        entities['221'] = '&Yacute;'
        entities['222'] = '&THORN;'
        entities['223'] = '&szlig;'
        entities['224'] = '&agrave;'
        entities['225'] = '&aacute;'
        entities['226'] = '&acirc;'
        entities['227'] = '&atilde;'
        entities['228'] = '&auml;'
        entities['229'] = '&aring;'
        entities['230'] = '&aelig;'
        entities['231'] = '&ccedil;'
        entities['232'] = '&egrave;'
        entities['233'] = '&eacute;'
        entities['234'] = '&ecirc;'
        entities['235'] = '&euml;'
        entities['236'] = '&igrave;'
        entities['237'] = '&iacute;'
        entities['238'] = '&icirc;'
        entities['239'] = '&iuml;'
        entities['240'] = '&eth;'
        entities['241'] = '&ntilde;'
        entities['242'] = '&ograve;'
        entities['243'] = '&oacute;'
        entities['244'] = '&ocirc;'
        entities['245'] = '&otilde;'
        entities['246'] = '&ouml;'
        entities['247'] = '&divide;'
        entities['248'] = '&oslash;'
        entities['249'] = '&ugrave;'
        entities['250'] = '&uacute;'
        entities['251'] = '&ucirc;'
        entities['252'] = '&uuml;'
        entities['253'] = '&yacute;'
        entities['254'] = '&thorn;'
        entities['255'] = '&yuml;'
    }

    if (useQuoteStyle !== 'ENT_NOQUOTES') {
        entities['34'] = '&quot;'
    }
    if (useQuoteStyle === 'ENT_QUOTES') {
        entities['39'] = '&#39;'
    }
    entities['60'] = '&lt;'
    entities['62'] = '&gt;'

    // ascii decimals to real symbols
    for (decimal in entities) {
        if (entities.hasOwnProperty(decimal)) {
            hashMap[String.fromCharCode(decimal)] = entities[decimal]
        }
    }

    return hashMap
}