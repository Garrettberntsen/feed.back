/**
 * This module is responsible for dispatching Google Analytics events, including error reports.
 *
 * To use analytics elsewhere in the background, call the relevant code inside of a resolve handler for analytics.
 *
 * Non-background scripts can interact with this module via the following messages:
 * - type: analytics
 * - message: object
 *      - hitType: "event"
 *      - eventCategory: string
 *      - eventAction: string
 *      - eventLabel: string
 *      or
 *      - hitType: "exception"
 *      - exDescription: string
 */
(function (i, s, o, g, r, a, m) {
    i['GoogleAnalyticsObject'] = r;
    i[r] = i[r] || function () {
        (i[r].q = i[r].q || []).push(arguments)
    }, i[r].l = 1 * new Date();
    a = s.createElement(o),
        m = s.getElementsByTagName(o)[0];
    a.async = 1;
    a.src = g;
    m.parentNode.insertBefore(a, m)
})(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');
window.ga_debug = {trace: true};
var analytics = new Promise(function (resolve, reject) {
    current_user.then(function (user) {
        if(!user){
            throw "User was null";
        }
        ga("create", "UA-90713326-2", {
            storage: "none",
            clientId: user.id
        });
        ga("set", "checkProtocolTask", null);

        //Uncomment to disable sending event to analytics during development.
        //ga("set", "sendHitTask", null);
        ga(function (tracker) {
            console.log("Initialized analytics.");
            resolve(tracker);
        });
    }).catch(function (error) {
        reject(error);
    })
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.type) {
        case "analytics":
            try {
                var response;
                switch (request.message.hitType) {
                    case "event":
                    case "exception":
                        switch (request.message.eventCategory) {
                            case "Tracking":
                                request.message.eventLabel = last_visited_url;
                            //Intentional fall-through
                            default:
                                response = triggerGoogleAnalyticsEvent(request.message);
                        }

                        break;
                    default:
                        response = Promise.reject("hitType must be 'event' or 'exception', was " + request.message.hitType);
                }
                response.then(function () {
                    "use strict";
                    sendResponse(response);
                }, function (response) {
                    "use strict";
                    sendResponse(response);
                })
            } catch (err) {
                sendResponse(err);
            }
            return true;
    }
});

/**
 * Dispatches the given event to Google Analytics.
 *
 * @param event
 * @returns {Promise.<TResult>} resolves to true or rejects with a Google Analytics error.
 */
function triggerGoogleAnalyticsEvent(event) {
    "use strict";
    return analytics.then(function () {
        ga("send", event);
        return true;
    }).catch(function (err) {
        console.error(err);
        throw err;
    });
}