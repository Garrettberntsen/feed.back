var only_scrape_new_user_history = false;

var current_article;
//To avoid duplication and global scope, we'll initialize firebase and make it accessible via a promise.
var _firebase = Promise.resolve(firebase).then(function (firebase) {
    var config = {
        apiKey: "AIzaSyBb2F9FgRd69-B_tPgShM2CWF9lp5zJ9DI",
        authDomain: "feedback-f33cf.firebaseapp.com",
        databaseURL: "https://feedback-f33cf.firebaseio.com",
        storageBucket: "feedback-f33cf.appspot.com",
        messagingSenderId: "17295082044"
    };
    firebase.initializeApp(config);
    return firebase;
});
var user_email;
var user_id;
var read_count = 0;
//We guarantee that firebase is initialized before trying to access.
var database = Promise.resolve(_firebase).then(function (firebase) {
    return firebase.database();
});
var authToken;
analytics.then(function(){
    ga("send", {
        hitType: "event",
        eventCategory : "Lifecycle",
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

function increaseReadCount() {
    read_count++;
    chrome.browserAction.setBadgeBackgroundColor({color: [0, 0, 0, 1]});
    chrome.browserAction.setBadgeText({text: read_count.toString()});
}

function setUserInfo(userInfo) {
    if (userInfo) {
        console.log("Login changed");
        user_id = userInfo.id;
        user_email = userInfo.email;
    } else {
        user_email, user_id = null
    }
}

chrome.identity.getProfileUserInfo(setUserInfo);
chrome.identity.onSignInChanged.addListener(setUserInfo);

chrome.identity.getAuthToken({
    interactive: true
}, function (token) {
    if (chrome.runtime.lastError) {
        alert(chrome.runtime.lastError.message);
        return;
    }

    _firebase.then(function (firebase) {
        if (user_email && user_id) {
            firebase.auth().signInWithCredential(firebase.auth.GoogleAuthProvider.credential(null, token)).then(function (user) {
                database.then(function (database) {
                    database.ref("/users/" + user_id).once("value").then(function (userSnapshot) {
                        //This is a new user; get their browser history and search through their browsing history.
                        if (!userSnapshot.exists() || !only_scrape_new_user_history) {
                            var now = new Date();
                            //TODO: Get rid of these magic numbers.
                            var cutoff = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
                            //Get the browsing history.
                            chrome.history.search({
                                text: "",
                                startTime: cutoff.getTime(),
                                maxResults: 10000
                            }, function (results) {
                                var sourceUrls = Object.keys(sources).map(function (sourceName) {
                                    return sources[sourceName].url;
                                });
                                //Discard any results not for a source site.
                                results.filter(function (result) {
                                    return sourceUrls.find(function (sourceUrl) {
                                        return result.url.indexOf(sourceUrl) !== -1;
                                    });
                                })
                                //Discard duplicate visits to same url
                                    .reduce(function (previousUrls, nextUrl) {
                                        if (previousUrls.indexOf(nextUrl) === -1) {
                                            previousUrls.push(nextUrl);
                                        }
                                        return previousUrls;
                                    }, [])
                                    //Scrape each remaining page.
                                    .forEach(function (historyItem) {
                                        writeArticleData(extractHistoryItemData(historyItem), user_id);
                                    });
                            });
                        }
                    });
                });
            });
        }
    })
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.type) {
        case "getUser":
            chrome.identity.getAuthToken({
                interactive: true
            }, function (token) {
                sendResponse({'email': user_email, 'id': user_id, 'authToken': token});
            });
            return true;
        case "increaseReadCount":
            increaseReadCount();
            break;
        case "update_current_article":
            current_article = new ArticleData(
                request.message.data.url,
                request.message.data.source,
                request.message.data.title,
                new Date().getTime(),
                request.message.data.date,
                request.message.data.author,
                request.message.data.text
            );
            writeArticleData(current_article, user_id);
            break;
        case "updateScrollMetric":
            if (current_article) {
                current_article.scrolled_content_ratio = request.message;
            }
            break;
    }
})

function writeArticleData(article_data, user_id) {
    if (!article_data) {
        console.log("writeArticleData was called with no data");
        return;
    }

    var article_key = article_data.url.hashCode();

    if (!article_key || !article_data.dateRead) {
        return false;
    }

    database.then(function (database) {
        //Check if the article has already been scraped or the new record is not a partial record.
        database.ref('articles/' + article_key).once("value").then(function (articleSnapshot) {
            var existing_article;
            if (articleSnapshot.exists()) {
                existing_article = articleSnapshot.val();
            }
            console.log("Writing for article " + article_key);
            //Write new records and overwrite partial ones
            if (!articleSnapshot.exists() || (articleSnapshot.val().partialRecord && !article_data.partialRecord)) {
                if (!articleSnapshot.exists()) {
                    console.log("Writing new article record");
                } else if (articleSnapshot.val().partialRecord && !article_data.partialRecord) {
                    console.log("Overwriting partial record");
                } else {
                    console.log("Overwriting full record");
                }
                database.ref('articles/' + article_key).set(article_data);
            }
            increaseReadCount();
            database.ref('articles/' + article_key + '/readers/' + user_id).set(true);
            database.ref('users/' + user_id + '/articles/' + article_key + '/source').set(article_data.source);
            database.ref('users/' + user_id + '/articles/' + article_key + '/dateRead').set(article_data.dateRead);
            database.ref('users/' + user_id + '/email').set(user_email);
            console.log("feed.back data written to firebase!");
        });
    });
};


function extractPageData(url, content) {
    content = $.parseHTML(content);
    var data = {
        'source': '',
        'url': '',
        'author': '',
        'date': '',
        'text': '',
        'title': '',
        'dateRead': ''
    };
    var url = window.location.href;
    var sourceName = Object.keys(sources).find(function (sourceName) {
        return url.indexOf(sources[sourceName].url) !== -1
    });
    if (sourceName) {
        data.source = sourceName;
        data.url = reduceUrl(url);
        var d = new Date();
        data.dateRead = d.getTime();

        if (sources[sourceName]["date-selector-property"] === "") {
            data.date = $(sources[sourceName]["date-selector"], content).text();
        } else {
            data.date = $(sources[sourceName]["date-selector"]["date-selector"], content).attr(sources[sourceName]["date-selector-property"]);
        }
        //Clean-up
        if (data.date) {
            data.date = data.date.trim();
        }

        if (sources[sourceName]["author-selector-property"] === "") {
            data.author = $(sources[sourceName]["author-selector"], content).text();
        } else {
            data.author = $(sources[sourceName]["author-selector"], content).attr(sources[sourceName]["author-selector-property"]);
        }

        //Clean-up
        data.author = data.author.trim().replace(/By .*?By /, '').replace(/By /, '').replace(" and ", ", ").replace(", and ", ", ").replace(" & ", ", ").split(", ");

        if (sources[sourceName]["title-selector-property"] === "") {
            data.title = $(sources[sourceName]["title-selector"], content).text();
        } else {
            data.title = $(sources[sourceName]["title-selector"], content).attr(sources[sourceName]["title-selector-property"]);
        }
        //Clean-up
        data.title = data.title.trim().replace(/\s{3,}/, ' ');

        if (sources[sourceName]["text-selector"] !== "") {
            if (sources[sourceName]["text-selector-property"] === "") {
                data.text = $(sources[sourceName]["text-selector"], content).text().trim();
            } else {
                data.text = $(sources[sourceName]["text-selector"], content).attr(sources[sourceName]["text-selector-property"]);
            }
        } else {
            data.text = $('p').text();
        }
        //Clean-up
        //remove whitespace, tags, linebreaks
        data.text = data.text.trim().replace("\n", "").replace("\t", "").replace("\\\"", "\"").replace(/\s\s+/g, " ");
        //remove text between {} and <>
        var index = data.text.search(/{([^{}]+)}/g);
        //while(data.text.indexOf("{") > -1) {
        while (data.text.search(/{([^{}]+)}/g) > -1) {
            data.text = data.text.replace(/{([^{}]+)}/g, "");
        }
        while (data.text.search(/<([^<>]+)>/g) > -1) {
            data.text = data.text.replace(/<([^<>]+)>/g, "");
        }
        return Promise.resolve(data);
    }
    return Promise.reject();
};

function extractHistoryItemData(historyItem) {
    var article_data = new ArticleData(reduceUrl(historyItem.url),
        Object.keys(sources).find(function (sourceName) {
            return historyItem.url.indexOf(sources[sourceName].url) !== -1;
        }),
        historyItem.title,
        historyItem.lastVisitTime);
    article_data.partialRecord = true;
    return article_data;
}

//Cut out the protocol, subdomain and path from a url
function reduceUrl(url) {
    //Replace leading www. and http and https and trailing # fragment
    return url.replace(/https?:\/\//, '').replace(/.*?:[\\/]{2}(www\.)?/, '').replace(/#.*/, '');
}

function ArticleData(url, source, title, dateRead, date, author, text, partialRecord) {
    if (url == undefined) {
        throw "url must be set";
    }
    if (!source == undefined) {
        throw "Source must be set";
    }
    if (!title == undefined) {
        throw "Title must be set"
    }
    if (!dateRead == undefined) {
        throw "Date must be set";
    }
    this.url = reduceUrl(url);
    this.source = source;
    this.title = title;
    this.date = date || "";
    this.author = author || "";
    this.text = text || "";
    this.dateRead = dateRead;
    this.partialRecord = partialRecord || false;
}

function tabChangeHandler(tabId, changeInfo) {
    if (current_article && (changeInfo.url || changeInfo.isWindowClosing !== undefined)) {
        console.log("Navigating away from source page, persisting article data");
        writeArticleData(current_article, user_id);
    }
}

chrome.tabs.onUpdated.addListener(tabChangeHandler);
chrome.tabs.onRemoved.addListener(tabChangeHandler);