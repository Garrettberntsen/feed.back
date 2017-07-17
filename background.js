/**
 * The number of articles that the user has read since last opening the popup.
 * @type {number}
 */
var read_count = 0;

analytics.then(function () {
    ga("send", {
        hitType: "event",
        eventCategory: "Lifecycle",
        eventAction: "Extension Startup"
    });
});
// Function to create hashes for article keys
String.prototype.hashCode = function () {
    var hash = 0,
        i, chr, len;
    if (this.length === 0) return hash;
    for (i = 0, len = this.length; i < len; i++) {
        chr = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

function setReadCount(new_count) {
    read_count = new_count;
    if (read_count) {
        chrome.browserAction.setBadgeBackgroundColor({color: [0, 0, 0, 255]});
        chrome.browserAction.setBadgeText({text: read_count.toString()});
    } else {
        chrome.browserAction.setBadgeBackgroundColor({color: [0, 0, 0, 125]});
        chrome.browserAction.setBadgeText({text: ""});
    }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.type) {
        case "incrementReadCount":
        {
            setReadCount(read_count + 1);
            break;
        }
        case "resetReadCount":
        {
            setReadCount(0);
            break;
        }
    }
});

var tutorial = false;

/**
 * Opens up a specific page whenever the extension is installed or updated.
 * @object {Object} info about the installataion/update/etc.
 */

chrome.runtime.onInstalled.addListener(function (object){
    chrome.identity.getAuthToken(function(token){
        if(token) {
            if (object.reason === 'install') {
                chrome.tabs.create({url: "tutorial/tutorial-page.html"});
                tutorial = true;
            } else if (object.reason === 'update') {
                chrome.tabs.create({url: "tutorial/tutorial-page.html"});
                tutorial = true;
            }
        } else {
            chrome.tabs.create({
                url: "chrome://chrome-signin"
            });
            var ok = confirm("Feed.back attempted to start, but requires that you be signed in to your Google account to work. Sign in to continue or click cancel to go back to where you were.")
            if(!ok){
                chrome.tabs.query({active:true, currentWindow:true}, function(tabs){
                    "use strict";
                   chrome.tabs.remove(tabs.map(function(t){return t.id;}));
                });
            }
        }
    });
});

chrome.identity.onSignInChanged.addListener(function(){
    "use strict";
    if(!tutorial){
        chrome.identity.getAuthToken(function () {
            chrome.tabs.create({url: "tutorial/tutorial-page.html"});
            tutorial = true;
        });
    }
});


/*
 * Replace scheme and leading www., trailing # fragment and query parameters.
 */
function reduceUrl(url) {
    if (url) {
        return url.replace(/.*:\/\//, "").replace(/www\./, '').replace(/\?.*/, '').replace(/#.*/, '');
    } else {
        return url;
    }
}