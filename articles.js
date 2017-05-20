/**
 * This module is responsible for managing the cache of recently-viewed articles.
 *
 * Non-background scripts can interact with this module via the following messages:
 * - type: "update_article"
 * - message: Article object
 *      - article_data: ArticleData object
 *      - user_metadata: UserMetadata object
 * - type: "get_article":
 *
 */
/**
 * The article definitions, mapped from reduced url to article.
 * @type {{}}
 */
var current_articles = {};
/**
 * Maps tab ids to arrays of urls of the articles they were displayed in.
 * @type {{}}
 */
var tab_urls = {};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    "use strict";
    switch (request.type) {
        case "update_article":
        {
            request.message.article_data.url = reduceUrl(request.message.article_data.url);
            updateCurrentArticle(sender, request.message);
            break;
        }
        case "getCurrentArticle":
        {
            //Request is coming from a non-content script origin
            if (!sender.tab) {
                if (last_visited_url) {
                    var reduced_url = reduceUrl(last_visited_url);
                    Promise.resolve(current_articles[reduced_url]).then(function (current_article) {
                        if (!current_article) {
                            current_articles[reduced_url] = new Promise(function (resolve, reject) {
                                current_user.then(function (user) {
                                    Promise.all([
                                        firebase.database().ref("articles/" + reduced_url.hashCode()).once("value"),
                                        firebase.database().ref("users/" + user.id + "/articles/" + reduced_url.hashCode()).once("value")]).then(function (resolved) {
                                        var article_data = resolved[0].val();
                                        var user_metadata = resolved[1].val() ? resolved[1].val() : {};
                                        resolve(new Article(article_data, user_metadata));
                                    });
                                });
                            });
                            current_article = current_articles[reduced_url];
                        }
                        return current_article;
                    }).then(function (article) {
                        "use strict";
                        sendResponse(article);
                    });
                }
            } else {
                Promise.resolve(current_articles[reduceUrl(sender.tab.url)]).then(function (current_article) {
                    var reduced_url = reduceUrl(request.message);
                    if (!current_article) {
                        current_articles[reduced_url] = new Promise(function (resolve, reject) {
                            current_user.then(function (user) {
                                "use strict";
                                Promise.all([
                                    firebase.database().ref("articles/" + reduced_url.hashCode()).once("value"),
                                    firebase.database().ref("users/" + user.id + "/articles/" + reduced_url.hashCode()).once("value")]).then(function (resolved) {
                                    var article_data = resolved[0].val();
                                    var user_metadata = resolved[1].val() ? resolved[1].val() : {};
                                    resolve(new Article(article_data, user_metadata));
                                });
                            })
                        });
                        current_article = current_articles[reduced_url];
                    }
                    return current_article;
                }).then(function (article) {
                    sendResponse(article);
                });
            }
            return true;
        }
        case "updateScrollMetric" :
        {
            current_articles[reduceUrl(sender.tab.url)].then(function (article) {
                article.user_metadata.scrolled_content_ratio = request.message;
            });
            break;
        }
        case "getAverageRating":
        {
            calculateAverageRatingForArticle(request.message).then(function (rating) {
                "use strict";
                sendResponse(rating);
            })
            return true;
        }
        case "getAverageLean":
        {
            calculateAverageLeanForArticle(request.message).then(function (rating) {
                "use strict";
                sendResponse(rating);
            })
            return true;
        }
    }
});

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
/**
 * Discard all article definitions associated with the given tab.
 *
 * Removing references to them allows them to be garbage collected and avoids unbounded growth in memory usage during
 * long-term use.
 * @param tabId
 */
function disposeArticles(tabId) {
    "use strict";
    var urls = tab_urls[tabId];
    if (urls) {
        urls.forEach(function (url) {
            current_articles[url] = null;
        });
        tab_urls[tabId] = [];
    }
}

function updateLastVisited(tabId, changeInfo) {
    "use strict";
    chrome.tabs.get(tabId, function (tab) {
        var sourceName = Object.keys(sources).find(function (sourceName) {
            return sources[sourceName].urls.find(function (def) {
                "use strict";
                return tab.url.indexOf(def.urlRoot) !== -1;
            })
        });
        if (sourceName) {
            last_visited_url = tab.url;
        } else {
            last_visited_url = null;
        }
    });
}

function tabUpdateHandler(tabId, changeInfo) {
    //If the tab is loading, clear it
    if (changeInfo.status == "loading") {
        disposeArticles(tabId);
        persistArticle(reduceUrl(changeInfo.url));
    }
    if (changeInfo.url) {
        //Try to find an existing entry for a new url
        Promise.all([_firebase, current_user]).then(function (resolved) {
                var firebase = resolved[0];
                var user = resolved[1];
                var reduced_url = reduceUrl(changeInfo.url);
                current_articles[reduced_url] = new Promise(function (resolve, reject) {
                    Promise.all([
                        firebase.database().ref("articles/" + reduced_url.hashCode()).once("value"),
                        firebase.database().ref("users/" + user.id + "/articles/" + reduced_url.hashCode()).once("value")]).then(function (resolved) {
                        var article_data = resolved[0].val();
                        var user_metadata = resolved[1].val() ? resolved[1].val() : {};
                        resolve(new Article(article_data, user_metadata));
                    });
                });
                chrome.tabs.sendMessage(tabId, {type: "urlChanged", message: changeInfo.url});
            }
        );
    }
};

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

function UserMetadata(dateRead, source, lean, stars, tags, notes) {
    this.dateRead = dateRead !== undefined ? dateRead : null;
    if (source === undefined) {
        throw "Source must be set";
    }
    this.source = source;
    this.lean = lean !== undefined ? lean : null;
    this.stars = stars !== undefined ? stars : null;
    this.tags = tags !== undefined ? tags : null;
    this.notes = notes !== undefined ? notes : null;
}

/**
 * Write the article associated with the given url to firebase.
 * @param url
 */
function persistArticle(url) {
    "use strict";
    //Persist the current article as we navigate away
    Promise.all([current_articles[reduceUrl(url)], current_user]).then(function (resolved) {
        if (resolved[0]) {
            writeArticleData(resolved[0], resolved[1]);
        }
    });
}

chrome.tabs.onRemoved.addListener(function (tabId, changeInfo) {
    "use strict";
    if (tab_urls[tabId]) {
        tab_urls[tabId].forEach(function (url) {
            persistArticle(reduceUrl(url));
        });
        disposeArticles(tabId);
    }
});
/**
 * Triggered when a tab is opened.
 */
chrome.tabs.onCreated.addListener(tabUpdateHandler);
/**
 * When a tab is activated, use its url as last visited.
 */
chrome.tabs.onActivated.addListener(function (event) {
    updateLastVisited(event.tabId);
});
/**
 * Triggered when a tab updates.
 */
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
    tabUpdateHandler(tabId, changeInfo);
    if (changeInfo && changeInfo.status == "completed") {
        updateLastVisited(tabId, changeInfo);
    }
});
