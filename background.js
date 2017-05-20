/**
 * The number of articles that the user has read since last opening the popup.
 * @type {number}
 */
var read_count = 0;

var last_visited_url;

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

function calculateAverageRatingForArticle(url) {
    "use strict";
    url = reduceUrl(url);
    var article_id;
    return current_articles[url].then(function (article) {
        article_id = article.article_data.url.hashCode();
        return getArticle(article_id);
    }).catch(function (e) {
        triggerGoogleAnalyticsEvent({
            exDescription: JSON.stringify(e),
            exFatal: true
        })
    })
        .then(function (article) {
            if (article.readers) {
                return Promise.all(Object.keys(article.readers).map(function (reader_id) {
                    return getUser(reader_id);
                })).then(function (readers) {
                    return readers.map(function (reader) {
                        return reader.articles[article_id].stars;
                    })
                }).then(function (ratings) {
                    var rating_count = 0;
                    var rating_sum = ratings.reduce(function (total, next) {
                        var next_rating = Number.parseInt(next);
                        if (!isNaN(next_rating)) {
                            total += next_rating;
                            rating_count++;
                        }
                        return total;
                    }, 0);
                    if (rating_count) {
                        return Promise.resolve(rating_sum / rating_count);
                    } else {
                        return Promise.resolve(0);
                    }
                });
            } else {
                return Promise.resolve(0);
            }
        }).catch(function (e) {
            triggerGoogleAnalyticsEvent({
                exDescription: JSON.stringify(e),
                exFatal: true
            })
        });
}

function calculateAverageLeanForArticle(url) {
    "use strict";
    url = reduceUrl(url);
    var article_id;
    return current_articles[url].then(function (article) {
        article_id = article.article_data.url.hashCode();
        return getArticle(article_id);
    }).catch(function (e) {
        triggerGoogleAnalyticsEvent({
            exDescription: JSON.stringify(e),
            exFatal: true
        })
    })
        .then(function (article) {
            if (article.readers) {
                return Promise.all(Object.keys(article.readers).map(function (reader_id) {
                    return getUser(reader_id);
                })).then(function (readers) {
                    return readers.map(function (reader) {
                        return reader.articles[article_id].lean;
                    })
                }).then(function (ratings) {
                    var rating_count = 0;
                    var rating_sum = ratings.reduce(function (total, next) {
                        var next_rating = Number.parseInt(next);
                        if (!isNaN(next_rating)) {
                            total += next_rating;
                            rating_count++;
                        }
                        return total;
                    }, 0);
                    if (rating_count) {
                        return Promise.resolve(rating_sum / rating_count);
                    } else {
                        return Promise.resolve(0);
                    }
                });
            } else {
                return Promise.resolve(0);
            }
        }).catch(function (e) {
            triggerGoogleAnalyticsEvent({
                exDescription: JSON.stringify(e),
                exFatal: true
            })
        });
};

function updateCurrentArticle(sender, message) {
    "use strict";
    if (!sender.tab) {
        if (last_visited_url) {
            current_articles[reduceUrl(last_visited_url)] = Promise.resolve(message);
            current_user.then(function (user) {
                writeArticleData(message, user);
            });
        }
        ;
    } else {
        if (!tab_urls[sender.tab.id]) {
            tab_urls[sender.tab.id] = [];
        }
        tab_urls[sender.tab.id].push(reduceUrl(sender.tab.url));
        current_articles[reduceUrl(sender.tab.url)] = Promise.resolve(message);
        current_user.then(function (user) {
            writeArticleData(message, user);
        });
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

/**
 * Opens up a specific page whenever the extension is installed or updated.
 * @object {Object} info about the installataion/update/etc. 
 */
chrome.runtime.onInstalled.addListener(function (object){
    if(object.reason === 'install'){
        chrome.tabs.create({url: "tutorial/tutorial-page.html"});
    }else if(object.reason === 'update'){
        chrome.tabs.create({url: "tutorial/tutorial-page.html"});
    }
});


function writeArticleData(article, user) {
    if (!article || !article.article_data || !article.user_metadata.dateRead || !article.article_data.url) {
        if (!article) {
            console.log("writeArticleData null article passed.");
        } else {
            if (!article.article_data) {
                console.log("writeArticleData was called with no data.");
            } else {
                if (!article_data.url) {
                    console.log("writeArticleData called without defined url");
                }

                if (!article.user_metadata.dateRead) {
                    console.log("writeArticleData date read not set");
                }
            }
        }

        return;
    }
    var article_data = article.article_data;

    var article_key = article_data.url.hashCode();

    _firebase.then(function (firebase) {
        //Check if the article has already been scraped or the new record is not a partial record.
        firebase.database().ref('articles/' + article_key).once("value").then(function (articleSnapshot) {
            var existing_article;
            if (articleSnapshot.exists()) {
                existing_article = articleSnapshot.val();
            }
            if (!existing_article || !article_data.partialRecord) {
                firebase.database().ref('articles/' + article_key).set(article_data);
                if (article.user_metadata) {
                    firebase.database().ref('users/' + user.id + '/articles/' + article_key).set(article.user_metadata);
                }
            }
        });
        firebase.database().ref('users/' + user.id + '/email').set(user.email);
        console.log("feed.back data written to firebase!");
    });
}

/*
 * Replace leading www. and http: and https:, trailing # fragment and query parameters.
 */
function reduceUrl(url) {
    if (url) {
        return url.replace(/https?:\/\//, "").replace(/www\./, '').replace(/\?.*/, '').replace(/#.*/, '');
    } else {
        return url;
    }
}