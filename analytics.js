/**
 * This module is responsible for dispatching Google Analytics events.
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
chrome.identity.getProfileUserInfo(function (userInfo) {
    ga("create", "UA-90713326-2", {
        storage: "none",
        userId: userInfo.id
    });
    ga("set", "checkProtocolTask", null);
    ga(function (tracker) {
        console.log("Initialized analytics.");
    });
});
var analytics = new Promise(function(resolve,reject){
    ga(function(tracker){
        resolve(tracker);
    });
});
//Need to disable protocol check, GA only allows from http/https by default.

chrome.runtime.onMessage.addListener(function(request, sender, sendReponse){
    switch (request.type){
        case "analytics":
            switch (request.message.command){
                case "send":
                    analytics.then(function(){
                        request.message.hitType = "event";
                        ga("send", request.message);
                    });
                    break;
            }
    }
})