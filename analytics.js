/**
 * This module is responsible for dispatching Google Analytics events.
 *
 * To use analytics elsewhere in the background, call the relevant code inside of a resolve handler for analytics.
 *
 * Non-background scripts can interact with this module via the following messages:
 * - type: "analytics"
 * - message: array
 *      - command: string, type of command
 *          allowed: "send"
 *      - category: string, event category, e.g. "Lifecycle"
 *      - action: string, the action that occured, e.g. "Extension Started"
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
})(window, document, 'script', 'https://www.google-analytics.com/analytics_debug.js', 'ga');
window.ga_debug = {trace: true};
var analytics = Promise.resolve(firebase).then(function (firebase) {
    return new Promise(function (resolve, reject) {
        chrome.identity.getProfileUserInfo(function (userInfo) {
            firebase.database().ref("users/" + userInfo.id).once("value").then(function (userSnapshot) {
                var user = userSnapshot.val();
                if(!user){
                    user = userInfo;
                }
                if (!user.analytics_id) {
                    firebase.database().ref("users").orderByChild("analytics_id").limitToLast(1).on("child_added", function (child) {
                        var next_id = child.val().analytics_id + 1;
                        if (!next_id) {
                            next_id = 1;
                        }
                        //Without this check, updating the user will cause this handler to fire again.
                        if(!user.analytics_id) {
                            user.analytics_id = next_id;
                            firebase.database().ref("users/" + userInfo.id).set(user);
                        }
                    });
                }
                ga("create", "UA-90713326-2", {
                    storage: "none",
                    clientId: user.analytics_id
                });
                ga("set", "checkProtocolTask", null);

                //Comment this out to test analytics
                ga("set", "sendHitTask", null);
                ga(function (tracker) {
                    console.log("Initialized analytics.");
                    resolve(tracker);
                });
            }).catch(function (error) {
                reject(error);
            })
        });
    })
});
//Need to disable protocol check, GA only allows from http/https by default.

chrome.runtime.onMessage.addListener(function (request, sender, sendReponse) {
    switch (request.type) {
        case "analytics":
            switch (request.message.command) {
                case "send":
                    analytics.then(function () {
                        request.message.hitType = "event";
                        ga("send", request.message);
                    });
                    break;
            }
    }
})