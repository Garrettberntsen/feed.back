/**
 * This modules handles reading from, writing to and initializing the backing firebase data store.
 *
 * This modules responds to the following messages
 *  - type : "writeArticle"
 *  - message: {article_data, current_user}
 *  - response: none
 *
 *  - type: "signInWithCredential"
 *  - message: credential
 *  - response: resolved user
 * Created by Damie on 5/1/2017.
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
    return firebase;
});

/**
 * Returns a Promise that resolves to the firebase snapshot for the user with the given id.
 */
function getUser(user_id){
    return _firebase.then(function(firebase){
        firebase.database().ref("users/" + user_id)
    });
}