var user_id;
var user_email;
chrome.identity.getProfileUserInfo(function(userInfo) {
    user_id = userInfo.id;
    user_email = userInfo.email;
});
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.msg == "getUser") {
      sendResponse({'email': user_email, 'id': user_id});
      return true;
    }
});
