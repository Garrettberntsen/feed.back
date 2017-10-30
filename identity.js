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
 * Type representing the user.
 */
class User{
    constructor(email, google_id, id){
        this.id = id;
        this.email = email;
        this.google_id = google_id;
    }
}

/**
 * A promise which resolves to the currently Authenticated Google User.
 * @type {Promise}
 */
var current_user = new Promise(function (resolve, reject) {
    "use strict";
    chrome.identity.getProfileUserInfo(function (userInfo) {
        if (!userInfo.id) {
            var message = "It looks like you aren't logged in to Google.";
            console.error(message);
            reject(message);
        } else {
            database.getUser(userInfo.id).then(function(database_user){
                resolve(new User(database_user.google_id, database_user.email, database_user.id));
            }, function(){
                resolve(database.saveUser(new User(userInfo.email, userInfo.id)));
            })
        }
    });
});
/**
 * Updates current_user when the authentication changes.
 */
chrome.identity.onSignInChanged.addListener(function () {
    "use strict";
    current_user = new Promise(function (resolve, reject) {
        "use strict";
        chrome.identity.getAuthToken(function (token) {
            chrome.identity.getProfileUserInfo(function (userInfo) {
                if (!userInfo.id) {
                    var message = "It looks like you aren't logged in to Google.";
                    console.error(message);
                    reject(message);
                }
                if (token) {
                    resolve(userInfo);
                } else {
                    var ok = confirm("Feed.back attempted to start, but requires that you be signed in to your Google account to work. Sign in to continue or click cancel to go back to where you were.")
                    if (!ok) {
                        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                            "use strict";
                            chrome.tabs.remove(tabs.map(function (t) {
                                return t.id;
                            }));
                        });
                    }
                }
            });
        });
    })
});

chrome.runtime.onMessage.addListener(function (request, requester, sendResponse) {
    switch (request.type) {
        case "getUser":
            current_user.then(function (user) {
                sendResponse(user);
            });
            return true;
    }
});