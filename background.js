var current_articles = {};
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

function increaseReadCount() {
    read_count++;
    chrome.browserAction.setBadgeBackgroundColor({color: [0, 0, 0, 1]});
    chrome.browserAction.setBadgeText({text: read_count.toString()});
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.type) {
        case "increaseReadCount":
            increaseReadCount();
            break;
        case "update_current_article":
            if (!sender.tab) {
                chrome.tabs.query({
                    active: true,
                    currentWindow: true
                }, function (tabs) {
                    current_articles[reduceUrl(tabs[0].url)] = Promise.resolve(request.message);
                });
            } else {
                current_articles[reduceUrl(sender.tab.url)] = Promise.resolve(request.message);
                current_user.then(function (user) {
                    writeArticleData(request.message, user);
                });
            }
            break;
        case "getCurrentArticle":
            //Request is coming from a non-content script origin
            if (!sender.tab) {
                chrome.tabs.query({
                    active: true,
                    currentWindow: true
                }, function (tabs) {
                    Promise.resolve(current_articles[reduceUrl(tabs[0].url)]).then(function (current_article) {
                        sendResponse(current_article);
                    });
                });
            } else {
                Promise.resolve(current_articles[reduceUrl(sender.tab.url)]).then(function (current_article) {
                    sendResponse(current_article);
                });
            }
            return true;
        case
        "updateScrollMetric" :
            current_articles[sender.tab.id].then(function (article) {
                article.user_metadata.scrolled_content_ratio = request.message;
            });
            break;
    }
});

function writeArticleData(article, user) {
    if (!article || !article.article_data) {
        console.log("writeArticleData was called with no data");
        return;
    }
    var article_data = article.article_data;

    var article_key = article_data.url.hashCode();

    if (!article_key || !article.user_metadata.dateRead) {
        return false;
    }

    _firebase.then(function (firebase) {
        //Check if the article has already been scraped or the new record is not a partial record.
        firebase.database().ref('articles/' + article_key).once("value").then(function (articleSnapshot) {
            var existing_article;
            if (articleSnapshot.exists()) {
                existing_article = articleSnapshot.val();
            }
            if (!existing_article || !article_data.partial_record) {
                firebase.database().ref('articles/' + article_key).set(article_data);
            }
        });
        increaseReadCount();
        if (article.user_metadata) {
            firebase.database().ref('users/' + user.id + '/articles/' + article_key).set(article.user_metadata);
        }
        firebase.database().ref('users/' + user.id + '/email').set(user.email);
        console.log("feed.back data written to firebase!");
    });
}


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
    var url = window.location.href; //TODO url is being declared but it is also a parameter for the method. Should be one or the other - Daniel 
    var sourceName = Object.keys(sources).find(function (sourceName) {
        return url.indexOf(sources[sourceName].url) !== -1;
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
}

/*
 * Replace leading www. and http: and https:, trailing # fragment and query parameters.
 */
function reduceUrl(url) {
    if (url) {
        return url.replace(/.*?:[\\/]{2}(www\.)?/, '').replace(/\?.*/, '').replace(/#.*/, '');
    } else {
        return url;
    }
}

function Article(article_data, user_metadata) {
    this.article_data = article_data;
    this.user_metadata = user_metadata;
}

function ArticleData(url, source, title, date, author, text, readers, partialRecord) {
    if (url === undefined) {
        throw "url must be set";
    }
    this.url = url;
    if (source === undefined) {
        throw "Source must be set";
    }
    this.source = source;
    if (title === undefined) {
        throw "Title must be set";
    }
    this.title = title;

    this.date = date || "";
    this.author = author || "";
    this.text = text || "";
    this.readers = readers || [];
    this.partialRecord = partialRecord || false;
}

function UserMetadata(dateRead, source, lean, stars) {
    this.dateRead = dateRead !== undefined ? dateRead : null;
    if (source === undefined) {
        throw "Source must be set";
    }
    this.source = source;
    this.lean = lean !== undefined ? lean : null;
    this.stars = stars !== undefined ? stars : null;
}

function tabChangeHandler(tabId, changeInfo) {
    if (changeInfo.url || changeInfo.isWindowClosing !== undefined) {
        //Persist the current article as we navigate away
        Promise.all([current_articles[tabId], current_user]).then(function (resolved) {
            if (resolved[0]) {
                writeArticleData(resolved[0], resolved[1]);
            }
        });
        //Try to find an existing entry for the new page
        Promise.all([_firebase, current_user]).then(function (resolved) {
                var firebase = resolved[0];
                var user = resolved[1];
                var reduced_url = reduceUrl(changeInfo.url);
                current_articles[tabId] = new Promise(function (resolve, reject) {
                    Promise.all([
                        firebase.database().ref("articles/" + reduced_url.hashCode()).once("value"),
                        firebase.database().ref("users/" + user.id + "/articles/" + reduced_url.hashCode()).once("value")]).then(function (resolved) {
                        var article_data = resolved[0].val();
                        var user_metadata = resolved[1].val() ? resolved[1].val() : {};
                        resolve(new Article(article_data, user_metadata));
                    });
                });
            }
        );
    }
}

chrome.tabs.onUpdated.addListener(tabChangeHandler);
chrome.tabs.onRemoved.addListener(tabChangeHandler);