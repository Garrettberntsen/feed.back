var user_id;
var user_email;
var read_count = 0;
chrome.identity.getProfileUserInfo(function(userInfo) {
    user_id = userInfo.id;
    user_email = userInfo.email;
});
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.msg == "getUser") {
        sendResponse({ 'email': user_email, 'id': user_id });
        return true;
    }
});
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.msg == "increaseReadCount") {
        read_count += 1
        chrome.browserAction.setBadgeBackgroundColor({ color: [0, 0, 0, 1] });
        chrome.browserAction.setBadgeText({ text: read_count.toString() });
        // var config = {
        //     apiKey: "AIzaSyBb2F9FgRd69-B_tPgShM2CWF9lp5zJ9DI",
        //     authDomain: "feedback-f33cf.firebaseapp.com",
        //     databaseURL: "https://feedback-f33cf.firebaseio.com",
        //     storageBucket: "feedback-f33cf.appspot.com",
        //     messagingSenderId: "17295082044"
        // };

        // firebase.initializeApp(config);

        // chrome.identity.getProfileUserInfo(function(userInfo) {
        //     sourceDataCount = sourceDataCount;
        //     user_id = userInfo.id;
        //     user_email = userInfo.email;

        //     return firebase.database().ref('/users/' + user_id).once('value').then(function(snapshot) {

        //         user = snapshot.val();
        //         articles = user && user.articles;
        //         chrome.browserAction.setBadgeBackgroundColor({ color: [50, 0, 0, 50] });
        //         chrome.browserAction.setBadgeText({ text: Object.keys(articles).length.toString() });
        //     });
        // });
    }
});
