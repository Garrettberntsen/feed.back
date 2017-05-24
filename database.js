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
    return new Promise(function (resolve, reject) {
        Promise.all([firebase, current_user]).then(function (resolved) {
            var firebase = resolved[0];
            var user = resolved[1];
            if (firebase.apps.length == 0) {
                var config = {
                    apiKey: "AIzaSyBb2F9FgRd69-B_tPgShM2CWF9lp5zJ9DI",
                    authDomain: "feedback-f33cf.firebaseapp.com",
                    databaseURL: "https://feedback-f33cf.firebaseio.com",
                    storageBucket: "feedback-f33cf.appspot.com",
                    messagingSenderId: "17295082044"
                };
                firebase.initializeApp(config);
            }
            firebase.auth().signInWithCredential(firebase.auth.GoogleAuthProvider.credential(null, user.auth_token));
            return firebase.database().ref("users/" + user.id).once("value").then(function (snapshot) {
                if (!snapshot.exists()) {
                    firebase.database().ref("users/" + user.id).set(user);
                }
                resolve(firebase);
            }, function (error) {
                reject(error);
            });
        });
    });
}
var _firebase = initializeFirebase();

chrome.identity.onSignInChanged.addListener(function () {
    _firebase = initializeFirebase();
});

chrome.runtime.onMessage(function (request, sender, sendResponse) {
    switch (request.type) {
        case "getUser":
            getUser(request.message).then(function (user) {
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
    return _firebase.then(function (firebase) {
        return firebase.database().ref("users/" + user_id).once("value");
    }).then(function (snapshot) {
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            return null;
        }
    }, function (reason) {
        "use strict";
        console.error(reason);
    });
}

/**
 * Sets the user at the location users/user_id with the given user information.
 * @param user_id
 * @param user
 */
function setUser(user_id, user) {
    return _firebase.then(function (firebase) {
        firebase.database().ref("users/" + user_id).set(user);
    }, function (reason) {
        "use strict";
        console.error(reason);
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
    }, function (reason) {
        "use strict";
        console.error(reason);
    }).then(function (snapshot) {
        //For some reason, calling val on a non-existent object is slower than checking exists.
        if (snapshot.exists()) {
            console.log("Spent " + (new Date().getTime() - request_time) + " ms in database.");
            return snapshot.val();
        } else {
            console.log("Spent " + (new Date().getTime() - request_time) + " ms in database.");
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
    }, function (reason) {
        "use strict";
        console.error(reason);
    }).then(function () {
        return true;
    });
}