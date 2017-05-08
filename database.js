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
var _firebase = Promise.all([firebase, current_user]).then(function (resolved) {
    var firebase = resolved[0];
    var user = resolved[1];
    var config = {
        apiKey: "AIzaSyBb2F9FgRd69-B_tPgShM2CWF9lp5zJ9DI",
        authDomain: "feedback-f33cf.firebaseapp.com",
        databaseURL: "https://feedback-f33cf.firebaseio.com",
        storageBucket: "feedback-f33cf.appspot.com",
        messagingSenderId: "17295082044"
    };
    firebase.initializeApp(config);
    firebase.auth().signInWithCredential(firebase.auth.GoogleAuthProvider.credential(null, user.auth_token));
    firebase.database().ref("users/" + user.id).once("value").then(function (snapshot) {
        if (!snapshot.exists()) {
            firebase.database().ref("users/" + user.id).set(user);
        }
    });
    return firebase;
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
 * Returns a Promise that resolves to the user with the given id pulled from the database.
 * @param   user_id the id of the user to get
 */
function getUser(user_id) {
    return _firebase.then(function (firebase) {
        return firebase.database().ref("users/" + user_id).once("value");
    }).then(function (snapshot) {
        return snapshot.val();
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
    }).then(function () {
        return true;
    });
}

/**
 * Returns the article information for the article with the given key.
 * @param article_id
 */
function getArticle(article_id){
    return _firebase.then(function (firebase) {
        return firebase.database().ref("articles/" + article_id).once("value");
    }).then(function (snapshot) {
        return snapshot.val();
    });
}

/**
 * Writes the given article into the database at the location indicated as a child of articles at the given id.
 * @param article_id
 * @param article_data
 * @returns {!Thenable.<R>}
 */
function setArticle(article_id, article_data){
    return _firebase.then(function (firebase) {
        firebase.database().ref("articles/" + article_id).set(article_data);
    }).then(function () {
        return true;
    });
}