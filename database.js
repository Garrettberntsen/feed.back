/**
 * This modules handles reading from, writing to and initializing the backing firebase data store.
 *
 * This modules responds to the following messages
 *  - type : "getUser"
 *  - message: user_id
 *  - response: the user matching the given id from the database
 *
 *  - type: "setUser"
 *  - message: {user_id, user}
 *  - response: a promise that resolves after the write completes
 */
//We guarantee that firebase is initialized before trying to access.
function initializeFirebase() {
    "use strict";
    return Promise.all([firebase, current_user]).then(function (resolved) {
        var firebase = resolved[0];
        var user = resolved[1];
        var config = {
            apiKey: "AIzaSyBb2F9FgRd69-B_tPgShM2CWF9lp5zJ9DI",
            authDomain: "chrome-extension://fjmjfjkiigcdeiaeofkappkccmcedeeb",
            //authDomain: "feedback-f33cf.firebaseapp.com",
            databaseURL: "https://feedback-f33cf.firebaseio.com",
            storageBucket: "feedback-f33cf.appspot.com",
            messagingSenderId: "17295082044"
        };
        if (firebase.apps.length == 0) {
            firebase.initializeApp(config);
        }
        var signIn = function (token) {
            return firebase.auth().signOut().then(function () {
                return firebase.auth().signInWithCredential(firebase.auth.GoogleAuthProvider.credential(null, token))
                    .catch(function (error) {
                        console.error(error.message);
                    });
            })
        }
        try {
            chrome.identity.getAuthToken(function (token) {
                signIn(token).then(function () {
                }, function () {
                    chrome.identity.removeCachedAuthToken(token, function () {
                        signIn(token)
                    });
                });
            });
        } catch (ex) {
            console.error(ex);
        }
        firebase.database().ref("users/" + user.id).once("value").then(function (snapshot) {
            if (!snapshot.exists()) {
                firebase.database().ref("users/" + user.id).set(user);
            }
        });
        return firebase;
    }).catch(function (reason) {
        console.error("Failed to initialize firebase: " + reason);
    });
}
var _firebase = initializeFirebase();
//When signin changes, reauthenticate firebase.
chrome.identity.onSignInChanged.addListener(function (accountInfo, signedIn) {
    if (signedIn) {
        _firebase = initializeFirebase();
    } else {
        _firebase = Promise.reject("User is not authenticated.");
    }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.type) {
        case "getUser":
            current_user.then(function (user) {
                "use strict";
                return getUser(user.id);
            }).then(function (user) {
                "use strict";
                sendResponse(user);
            });
            return true;
    }
});

/**
 * Returns a Promise that resolves to the firebase user with the given id pulled from the database.
 * @param   user_id the id of the user to get
 */
function getUser(user_id) {
    if (!user_id) {
        throw new Error("getUser called with no id set");
    }
    return _firebase.then(function (firebase) {
        return firebase.database().ref("users/" + user_id).once("value");
    }).then(function (snapshot) {
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            return null;
        }
    });
}

/**
 * Sets the user at the location users/user_id with the given user information.
 * @param user_id
 * @param user
 */
function setUser(user_id, user) {
    if (!user_id) {
        throw new Error("setUser called with no id set");
    }
    return _firebase.then(function (firebase) {
        firebase.database().ref("users/" + user_id).set(user);
    }).then(function () {
        return true;
    });
}

/**
 * Returns the article information for the article with the given key.
 * @param article_id
 */
function getArticle(article_id) {

    console.log("Getting article from firebase");
    var request_time = new Date().getTime();
    return _firebase.then(function (firebase) {
        return firebase.database().ref("articles/" + article_id).once("value");
    }).then(function (snapshot) {
        console.log("Article resolved from firebase");
        console.log("Spent " + (new Date().getTime() - request_time) + " ms in database.");
        //For some reason, calling val on a non-existent object is slower than checking exists.
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            return null;
        }
    });
}

/**
 * Writes the given article into the database at the location indicated as a child of articles at the given id.
 * @param article_id
 * @param article_data
 * @returns {!Thenable.<R>}
 */
function setArticle(article_id, article_data) {
    return _firebase.then(function (firebase) {
        firebase.database().ref("articles/" + article_id).set(article_data);
    }).then(function () {
        return true;
    });
}

function setArticleMetaData(article_id, user_id, user_metadata) {
    "use strict";
    return
}