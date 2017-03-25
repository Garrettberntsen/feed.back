var user_email;
var read_count = 0;
var database;
var authToken;
chrome.identity.getProfileUserInfo(function(userInfo) {
    user_id = userInfo.id;
    user_email = userInfo.email;
});

	
chrome.identity.getAuthToken({
    interactive: true
}, function(token) {
    if (chrome.runtime.lastError) {
        alert(chrome.runtime.lastError.message);
        return;
    }
	
	authToken = token;
});
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.msg === "getUser") {
        sendResponse({ 'email': user_email, 'id': user_id, 'authToken': authToken });
    } else if (request.msg == "increaseReadCount") {
        read_count += 1
        chrome.browserAction.setBadgeBackgroundColor({ color: [0, 0, 0, 1] });
        chrome.browserAction.setBadgeText({ text: read_count.toString() });
    }
});