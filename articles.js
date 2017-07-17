/**
 * This module is responsible for managing the cache of recently-viewed articles.
 *
 * Non-background scripts can interact with this module via the following messages:
 * - type: "update_article"
 * - message: Article object
 *      - article_data: ArticleData object
 *      - user_metadata: UserMetadata object
 * - type: "get_article":
 * - message: none
 *
 */
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
/**
 * The article definitions, mapped from reduced url to article.
 * @type {{}}
 */

/**
 * Maps tab ids to arrays of urls of the articles they were displayed in.
 * @type {{}}
 */
var tab_urls = {};
var scraping_in_progress = {};
var last_visited_url;

/**
 * Resolves the article definition for the given url. First, it determines if the cache contains a promise for the given
 * url. If it does not, it gets the definition from firebase and loads it into the cache.
 * @param url   the url to retrieve the article for
 * @returns {Promise.<TResult>} promise wrapping the article definition for the given url
 */


debug = true;

function addCurrentuserToArticleReaders(article) {
    return current_user.then(function (user) {
        "use strict";
        if (!article.article_data.readers) {
            article.article_data.readers = {};
        }
        if(!article.user_metadata.source){
            article.user_metadata.source = article.article_data.source;
        }
        article.user_metadata.dateRead = new Date().getTime();
        article.article_data.readers[user.id] = true;
        console.log("Added article reader");
        return article;
    }, function (reason) {
        "use strict";
        console.error("Failed to resolve current user while trying to update article readers: " + reason);
    });
}

chrome.runtime.onConnect.addListener(function (port) {
    switch (port.name) {
        case "scraper":
            port.onMessage.addListener(function (message) {
                switch (message.type) {
                    case "begun_scraping":
                        if (!message.url) {
                            new Error("A begun_scraping message was received with no url specified");
                        }
                        scraping_in_progress[reduceUrl(message.url)] = true;
                        scraping_in_progress[reduceUrl(message.url)] = new Promise(function (resolve, reject) {
                            "use strict";
                            var scrapingCompletionHandler = function (message) {
                                "use strict";
                                if (message.type === "finished_scraping") {
                                    if (message.message.error) {
                                        console.error(message.message.error);
                                        reject(message.message.error);
                                    } else if (message.message.article) {
                                        var url = reduceUrl(message.message.url);
                                        addCurrentuserToArticleReaders(message.message.article).then(function (article) {
                                                article.article_data.url = reduceUrl(article.article_data.url);
                                                resolve(article);
                                            },
                                            function (reason) {
                                                reject(reason);
                                            })
                                    } else {
                                        resolveArticleForUrl(reduceUrl(message.message.url)).then(function(article){
                                            return addCurrentuserToArticleReaders(article);
                                        }).then(function(article){
                                            resolve(article);
                                        });
                                    }
                                    port.onMessage.removeListener(scrapingCompletionHandler);
                                }
                            }
                            port.onMessage.addListener(scrapingCompletionHandler);
                        });
                        scraping_in_progress[reduceUrl(message.url)].then(function (result) {
                            "use strict";
                            delete scraping_in_progress[reduceUrl(message.url)];
                            if (result) {
                                insertArticleForUrlIntoCache(result, reduceUrl(message.url));
                                Promise.all([result, current_user])
                                    .then(function (resolved) {
                                        "use strict";
                                        writeArticleData(resolved[0], resolved[1]);
                                    })
                            }
                        }, function (reason) {
                            "use strict";
                            delete scraping_in_progress[reduceUrl(message.url)]
                            console.log("Did not save scraped article to cache: " + reason);
                        });

                }
            });
            break;
    }
})

function updateTabUrls(tabId, url) {
    "use strict";
    if (tabId) {
        if (tab_urls[tabId]) {
            tab_urls[tabId].push(reduceUrl(url));
        } else {
            tab_urls[tabId] = [reduceUrl(url)];
        }
    }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    "use strict";
    switch (request.type) {
        case "update_article":
        {
            if (sender.tab) {
                updateTabUrls(sender.tab.id, request.message.article_data.url);
            }
            request.message.article_data.url = reduceUrl(request.message.article_data.url);
            Promise.all([addCurrentuserToArticleReaders(request.message), current_user]).then(function (resolved) {
                insertArticleForUrlIntoCache(resolved[0], reduceUrl(resolved[0].article_data.url));
                return writeArticleData(resolved[0], resolved[1]);
            }, function (reason) {
                triggerGoogleAnalyticsEvent({
                    hitType: "exception",
                    exDescription: err
                });
                if (sender.tab) {
                    tab_urls[sender.tab.id] = tab_urls[sender.tab.id].splice(tab_urls[sender.tab.id].indexOf(request.message.article_data.url));
                    if (!tab_urls[sender.tab.id].length) {
                        delete tab_urls[sender.tab.id];
                    }
                }
                sendResponse("An error occurred while attempting to save the article: " + reason);
            }).then(function () {
                sendResponse();
            }, function (err) {
                console.error("An error occured while writing article data: " + err);
                triggerGoogleAnalyticsEvent({
                    hitType: "exception",
                    exDescription: err
                });
                if (sender.tab) {
                    tab_urls[sender.tab.id] = tab_urls[sender.tab.id].splice(tab_urls[sender.tab.id].indexOf(request.message.article_data.url));
                    if (!tab_urls[sender.tab.id].length) {
                        delete tab_urls[sender.tab.id];
                    }
                }
                sendResponse("An error occurred while attempting to save the article: " + err);
            });
            return true;
        }
        case "getCurrentArticle" :
        {
            var request_start_time = new Date().getTime();
            var sourceName = Object.keys(sources).find(function (sourceName) {
                return sources[sourceName].urls.find(function (def) {
                    "use strict";
                    return last_visited_url && last_visited_url.indexOf(def.urlRoot) !== -1;
                })
            });
            var last_url;
            if (sourceName) {
                last_url = reduceUrl(last_visited_url);
            }
            if (scraping_in_progress[last_url] && request.message && request.message.waitForScrape) {
                scraping_in_progress[last_url].then(function (article) {
                    if (article) {
                        sendResponse(article);
                    } else {
                        resolveArticleForUrl(last_url).then(function (article) {
                            sendResponse(article);
                        })
                    }
                });
            } else {
                if (!sender.tab) {
                    console.log("Request from a non-tab origin.");
                    console.log("Requesting previous visit url.");
                    var resolution = resolveArticleForUrl(reduceUrl(last_url)).then(function (article) {
                        "use strict";
                        console.log("Sending article response");
                        console.log("Response took " + (new Date().getTime() - request_start_time) + " ms.");
                        sendResponse(article);
                    }, function (err) {
                        console.error(err);
                        triggerGoogleAnalyticsEvent({
                            hitType: "exception",
                            exDescription: err
                        });
                        sendResponse("There was an error resolving the article");
                    });
                } else {
                    var resolution = resolveArticleForUrl(reduceUrl(sender.tab.url)).then(function (current_article) {
                        sendResponse(current_article);
                    }, function (err) {
                        console.error(err);
                        triggerGoogleAnalyticsEvent({
                            hitType: "exception",
                            exDescription: err
                        });
                        sendResponse("There was an error resolving the article");
                    });
                }
            }
            return true;
        }
        case
        "updateScrollMetric":
        {
            resolveArticleForUrl(reduceUrl(sender.tab.url)).then(function (article) {
                article.user_metadata.scrolled_content_ratio = request.message;
            });
            break;
        }
        case"getAverageRating":
        {
            resolveArticleForUrl(request.message).then(function (article) {
                calculateAverageRatingForArticle(request.message).then(function (rating) {
                    "use strict";
                    sendResponse(rating);
                })
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
        case "forcePersist":
        {
            for (var tabId of Object.keys(tab_urls)) {
                for (var url of tab_urls[tabId]) {
                    persistArticle(url);
                }
            }
            break;
        }
    }
})
;

function calculateAverageRatingForArticle(url) {
    "use strict";
    url = reduceUrl(url);
    var article_id = url.hashCode();
    return resolveArticleForUrl(url)
        .then(function (article) {
            if (article.article_data.readers) {
                var readers = Promise.all(Object.keys(article.article_data.readers).map(function (id) {
                    return getUser(id);
                }));
                var ratings = readers.then(function (users) {
                    return users.filter(function (user) {
                        return user.articles[article_id] && user.articles[article_id].stars;
                    }).map(function (user) {
                        return user.articles[article_id].stars;
                    });
                });
                return ratings.then(function (ratings) {
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
                        return rating_sum / rating_count;
                    } else {
                        return 0;
                    }
                });
            } else {
                return Promise.resolve(0);
            }
        }).catch(function (e) {
            console.error("There was an extepion while calculating article rating: " + e);
            triggerGoogleAnalyticsEvent({
                exDescription: JSON.stringify(e),
                exFatal: true
            })
        });
}

function calculateAverageLeanForArticle(url) {
    "use strict";
    url = reduceUrl(url);
    var article_id = url.hashCode();
    return resolveArticleForUrl(url)
        .then(function (article) {
            if (article.article_data.readers) {
                var readers = Promise.all(Object.keys(article.article_data.readers).map(function (id) {
                    return getUser(id);
                }));
                var ratings = readers.then(function (users) {
                    return users.filter(function (user) {
                        return user.articles[article_id] && user.articles[article_id].lean;
                    }).map(function (user) {
                        return user.articles[article_id].lean;
                    });
                });
                return ratings.then(function (ratings) {
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
                        return rating_sum / rating_count;
                    } else {
                        return 0;
                    }
                });
            } else {
                return Promise.resolve(0);
            }
        }).catch(function (e) {
            console.error("There was an extepion while calculating article lean: " + e);
            triggerGoogleAnalyticsEvent({
                exDescription: JSON.stringify(e),
                exFatal: true
            })
        });
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
            //current_articles[url] = null;
        });
        tab_urls[tabId] = [];
    }
}

function updateLastVisited(tabId, changeInfo) {
    "use strict";
    chrome.tabs.get(tabId, function (tab) {
        last_visited_url = reduceUrl(tab.url);
        if (tab_urls[tabId]) {
            if (!tab_urls[tabId].find(function (url) {
                    return url === tab.url;
                })) {
                tab_urls[tabId].push(reduceUrl(tab.url));
            }
        } else {
            tab_urls[tabId] = [reduceUrl(tab.url)];
        }
    });
}

function tabUpdateHandler(tabId, changeInfo) {
    if (changeInfo) {
        //If the tab is loading, clear it
        if (changeInfo.status == "loading") {
            disposeArticles(tabId);
            for (var url in tab_urls[tabId]) {
                persistArticle(reduceUrl(url));
            }
        }
        if (changeInfo.url) {
            //Try to find an existing entry for a new url
            chrome.tabs.sendMessage(tabId, {type: "urlChanged", message: changeInfo.url});
            updateLastVisited(tabId, changeInfo.url);
        }
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
    return Promise.all([resolveArticleForUrl(reduceUrl(url)), current_user]).then(function (resolved) {
        if (resolved[0]) {
            return writeArticleData(resolved[0], resolved[1]);
        }
    }, function (reason) {
        console.error(reason);
    }).catch(function (reason) {
        console.error("There was an error persisting the articles: " + reason);
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
    if (changeInfo && changeInfo.status == "complete") {
        updateLastVisited(tabId, changeInfo);
    }
});

function writeArticleData(article, user) {
    if (!article || !article.article_data || !article.user_metadata.dateRead || !article.article_data.url) {
        if (!article) {
            console.error("writeArticleData null article passed.");
        } else {
            if (!article.article_data) {
                console.error("writeArticleData was called with no data.");
            } else {
                if (!article.article_data.url) {
                    console.error("writeArticleData called without defined url");
                }

                if (!article.user_metadata.dateRead) {
                    console.error("writeArticleData date read not set");
                }
            }
        }

        return;
    }
    var article_data = article.article_data;

    var article_key = article_data.url.hashCode();

    //Check if the article has already been scraped or the new record is not a partial record.
    return Promise.all([getArticle(article_key).then(function (article) {
        if (!article || !article_data.partialRecord) {
            return setArticle(article_key, article_data)
        }
    }), getUser(user.id).then(function (firebase_user) {
        "use strict";
        if(!article_data.partialRecord) {
            firebase_user.email = user.email;
            if (!firebase_user.articles) {
                firebase_user.articles = {};
            }
            firebase_user.articles[article_key] = article.user_metadata;
            return setUser(user.id, firebase_user);
        }
    })]).then(function () {
        "use strict";
        console.log("feed.back data written to firebase!");
    })

}