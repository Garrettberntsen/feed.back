/**
 * This module is responsible for the currently authenticated Google User. To get user information stored in firebase,
 * use the database module.
 *
 * Other modules in the background context may access the current user via a promise resolution handler.
 *
 * This modules responds to the following messages
 *  - type : "getUser"
 *  - message:
 *  - response: the current user
 * Created by Damie on 5/3/2017.
 */

var current_user = new Promise(function (resolve, reject) {
    chrome.identity.getAuthToken({
        interactive: true
    }, function (token) {
        chrome.identity.getProfileUserInfo(function (userInfo) {
            userInfo.auth_token = token;
            resolve(userInfo);
        });
    });
});

chrome.identity.onSignInChanged.addListener(function (userInfo) {
    current_user = new Promise(function (resolve, reject) {
        chrome.identity.getAuthToken({
            interactive: true
        }, function (token) {
            if (chrome.runtime.lastError) {
                alert(chrome.runtime.lastError.message);
            }
            userInfo.auth_token = token;
            resolve(userInfo);
        });
    });
});

chrome.runtime.onMessage.addListener(function (request, requester, sendResponse) {
    switch (request.type) {
        case "getUser":
            current_user.then(function (user) {
                sendResponse(user);
            })
            return true;
    }
});