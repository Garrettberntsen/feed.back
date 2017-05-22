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
var current_articles = {};
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
function resolveArticleForUrl(url) {
    if (!url) {
        return Promise.resolve(null);
    }
    "use strict";
    return Promise.resolve(current_articles[url]).then(function (current_article) {
        if (Object.keys(sources).find(function (source_name) {
                return sources[source_name].testForArticleUrlMatch(url);
            }) == "tutorial") {
            current_article = new Article(
                new ArticleData(url, "tutorial", "Feedback - How To", null, ["The Feedback Team"]),
                new UserMetadata(new Date().getTime(), "tutorial")
            );
        }
        else if (!current_article) {
            current_articles[url] = new Promise(function (resolve, reject) {
                current_user.then(function (user) {
                    Promise.all([
                        getArticle(url.hashCode()),
                        getUser(user.id)]).then(function (resolved) {
                        if (resolved[0]) {
                            var article_data = resolved[0];
                            var hashCode = url.hashCode();
                            var user_metadata = resolved[1].articles ? resolved[1].articles[url.hashCode()] : {};
                            resolve(new Article(article_data, user_metadata));
                        } else {
                            resolve(null);
                        }
                    }, function (error) {
                        console.log(error);
                        reject("There was an error resolving the article and user from firebase");
                    });
                });
            });
            current_article = current_articles[url];
        }
        return current_article;
    })
}

chrome.runtime.onConnect.addListener(function (port) {
        switch (port.name) {
            case "scraper":
                port.onMessage.addListener(function (message) {
                    switch (message.type) {
                        case "begun_scraping":
                            scraping_in_progress[reduceUrl(message.message)] = true;
                            current_articles[reduceUrl(message.message)] = new Promise(function (resolve, reject) {
                                var scrapingCompletionHandler = function (message) {
                                    "use strict";
                                    var url = reduceUrl(message.message.url);
                                    if (message.type === "finished_scraping") {
                                        delete scraping_in_progress[url]
                                        resolve(message.message.article);
                                        port.onMessage.removeListener(scrapingCompletionHandler);
                                    }
                                }
                                port.onMessage.addListener(scrapingCompletionHandler);
                            });
                    }
                });
                break;
        }
    }
)

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
            if (current_articles[request.message.article_data.url]) {
                current_articles[request.message.article_data.url] = current_articles[request.message.article_data.url].then(function () {
                    return request.message;
                });
            } else {
                current_articles[request.message.article_data.url] = Promise.resolve(request.message);
            }

            current_user.then(function (user) {
                return writeArticleData(request.message, user);
            }).then(function () {
                sendResponse();
            }, function (err) {
                console.log(err);
                if (sender.tab) {
                    tab_urls[sender.tab.id] = tab_urls[sender.tab.id].splice(tab_urls[sender.tab.id].indexOf(request.message.article_data.url));
                    if (!tab_urls[sender.tab.id].length) {
                        delete tab_urls[sender.tab.id];
                    }
                }
                delete current_articles[request.message.article_data.url];
                sendResponse("An error occurred while attempting to save the article.");
            });
            return true;
        }
        case "getCurrentArticle":
        {
            var request_start_time = new Date().getTime();
            var sourceName = Object.keys(sources).find(function (sourceName) {
                return sources[sourceName].urls.find(function (def) {
                    "use strict";
                    return last_visited_url && last_visited_url.indexOf(def.urlRoot) !== -1;
                })
            });
            var last_url;
            if(sourceName){
                last_url = last_visited_url;
            }
            if (!scraping_in_progress[last_url] || !(request.message && request.message.waitForScrape)) {
                if (!sender.tab) {
                    console.log("Request from a non-tab origin.");
                    console.log("Requesting previous visit url.");
                    var resolution = resolveArticleForUrl(reduceUrl(last_url)).then(function (article) {
                        "use strict";
                        console.log("Sending article response");
                        console.log("Response took " + (new Date().getTime() - request_start_time) + " ms.");
                        sendResponse(article);
                    });
                } else {
                    var resolution = resolveArticleForUrl(reduceUrl(sender.tab.url)).then(function (current_article) {
                        sendResponse(current_article);
                    }, function (err) {
                        console.log(err);
                        sendResponse("There was an error resolving the article");
                    });
                }
            } else {
                sendResponse()
            }
            return true;
        }
        case
        "updateScrollMetric"
        :
        {
            current_articles[reduceUrl(sender.tab.url)].then(function (article) {
                article.user_metadata.scrolled_content_ratio = request.message;
            });
            break;
        }
        case
        "getAverageRating"
        :
        {
            Promise.resolve(current_articles[request.message]).then(function (article) {
                calculateAverageRatingForArticle(request.message).then(function (rating) {
                    "use strict";
                    sendResponse(rating);
                })
            })

            return true;
        }
        case
        "getAverageLean"
        :
        {
            calculateAverageLeanForArticle(request.message).then(function (rating) {
                "use strict";
                sendResponse(rating);
            })
            return true;
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
                return Promise.all(Object.keys(article.article_data.readers).map(function (reader_id) {
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
    var article_id = url.hashCode();
    return resolveArticleForUrl(url)
        .then(function (article) {
            if (article.article_data.readers) {
                return Promise.all(Object.keys(article.article_data.readers).map(function (reader_id) {
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
        last_visited_url = reduceUrl(tab.url);
    });
}

function tabUpdateHandler(tabId, changeInfo) {
    if (changeInfo) {
        //If the tab is loading, clear it
        if (changeInfo.status == "loading") {
            disposeArticles(tabId);
            persistArticle(reduceUrl(changeInfo.url));
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
    Promise.all([current_articles[reduceUrl(url)], current_user]).then(function (resolved) {
        if (resolved[0]) {
            writeArticleData(resolved[0], resolved[1]);
        }
    });
}

function writeArticleData(article, chrome_user) {
    if (!article || !article.article_data || !article.user_metadata.dateRead || !article.article_data.url) {
        if (!article) {
            console.log("writeArticleData null article passed.");
        } else {
            if (!article.article_data) {
                console.log("writeArticleData was called with no data.");
            } else {
                if (!article.article_data.url) {
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

    //Check if the article has already been scraped or the new record is not a partial record.
    return Promise.all([getArticle(article_key), getUser(chrome_user.id)])
        .then(function (resolved) {
            var existing_article = resolved[0];
            var user = resolved[1];
            if (!existing_article || !article_data.partialRecord) {
                triggerGoogleAnalyticsEvent(
                    {
                        hitType: "event",
                        eventCategory: "Scraping",
                        eventAction: "New page scraped"
                    }
                )
                setArticle(article_key, article_data);
                if (article.user_metadata) {
                    user.articles[article_key] = article.user_metadata;
                    setUser(chrome_user.id, user);
                }
                console.log("feed.back data written to firebase!");
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
    if (changeInfo && changeInfo.status == "complete") {
        updateLastVisited(tabId, changeInfo);
    }
});
