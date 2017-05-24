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
var current_user = new Promise(function(resolve, reject){
    "use strict";
    chrome.identity.getProfileUserInfo(function(userInfo){
        resolve(updateCurrentAuthenticatedUser(userInfo));
    });
});

chrome.identity.onSignInChanged.addListener(function(userInfo){
    current_user = updateCurrentAuthenticatedUser(userInfo);
});
function updateCurrentAuthenticatedUser(userInfo) {
    "use strict";
    return new Promise(function (resolve, reject) {
        if(!userInfo.email || !userInfo.id){
            reject("No user is signed in.");
        }
        chrome.identity.getAuthToken({
            interactive: true
        }, function (token) {
            if (chrome.runtime.lastError) {
                alert(chrome.runtime.lastError.message);
                reject()
            }
            userInfo.auth_token = token;
            resolve(userInfo);
        });
    });
}

/**
 * Updates current_user when the authentication changes.
 */

chrome.runtime.onMessage.addListener(function (request, requester, sendResponse) {
    switch (request.type) {
        case "getUser":
            current_user.then(function (user) {
                sendResponse(user);
            });
            return true;
    }
});