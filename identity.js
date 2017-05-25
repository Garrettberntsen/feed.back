/**
 * This module is responsible for managing the currently authenticated Google User. To get user information stored in firebase,
 * use the database module.
 *
 * Other modules in the background context may access the current user via a promise resolution handler.
 *
 * Other modules which depend on the identity of the authenticated users should update
 *
 * This modules responds to the following messages
 *  - type : "getUser"
 *  - message:
 *  - response: the current user
 * Created by Damie on 5/3/2017.
 */

/**
 * A promise which resolves to the currently Authenticated Google User.
 * @type {Promise}
 */
var current_user = new Promise(function (resolve, reject) {
    "use strict";
    chrome.identity.getProfileUserInfo(function (userInfo) {
        if(!userInfo.id){
            var message = "It looks like you aren't logged in to Google.";
            console.error(message);
            alert(message);
            reject(message);
        }
        resolve(userInfo);
    });
});
/**
 * Updates current_user when the authentication changes.
 */
chrome.identity.onSignInChanged.addListener(updateCurrentAuthenticatedUser);

chrome.runtime.onMessage.addListener(function (request, requester, sendResponse) {
    switch (request.type) {
        case "getUser":
            current_user.then(function (user) {
                sendResponse(user);
            });
            return true;
    }
});