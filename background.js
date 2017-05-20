var current_articles = {};
var tab_urls = {};
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
        case "update_current_article":
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
        return url.replace(/https?:\/\//, "").replace(/www\./, '').replace(/\?.*/, '').replace(/#.*/, '');
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
    if (changeInfo.url) {
        disposeArticles(tabId);
        persistArticle(reduceUrl(changeInfo.url));
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
/**
 * Triggered when a tab updates.
 */
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
    tabUpdateHandler(tabId, changeInfo);
    if (changeInfo && changeInfo.status == "completed") {
        updateLastVisited(tabId, changeInfo);
    }
});
/**
 * Triggered when a tab closes.
 */
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
 * Triggered when the active tab changes.
 */
chrome.tabs.onActivated.addListener(function (event) {
    updateLastVisited(event.tabId);
});