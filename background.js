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
//Duplication, figure out how to fix this.
var sources = {
    'washingtonpost': {
        'url': 'washingtonpost.com',
        'author-selector': 'span[itemprop="author"]',
        'author-selector-property': '',
        'date-selector': 'span.pb-timestamp',
        'date-selector-property': 'content',
        'text-selector': 'article[itemprop="articleBody"]',
        'text-selector-property': '',
        'title-selector': 'meta[property="og:title"]',
        'title-selector-property': 'content'
    },
    'nytimes': {
        'url': 'nytimes.com',
        'author-selector': 'meta[name="byl"]',
        'author-selector-property': 'content',
        'date-selector': 'time',
        'date-selector-property': 'content',
        'text-selector': 'p.story-body-text',
        'text-selector-property': '',
        'title-selector': 'h1[itemprop="headline"]',
        'title-selector-property': ''
    },
    'politico': {
        'url': 'politico.com',
        'author-selector': 'dt.credits-author',
        'author-selector-property': '',
        'date-selector': 'time',
        'date-selector-property': '',
        'text-selector': '',
        'text-selector-property': '',
        'title-selector': 'title',
        'title-selector-property': ''
    },
    'wsj': {
        'url': 'wsj.com',
        'author-selector': 'span.name',
        'author-selector-property': '',
        'date-selector': 'meta[itemprop=\'datePublished\']',
        'date-selector-property': 'content',
        'text-selector': '',
        'text-selector-property': '',
        'title-selector': 'meta[name="article.origheadline"]',
        'title-selector-property': 'content'
    },
    'vox': {
        'url': 'vox.com',
        'author-selector': 'meta[name="author"]',
        'author-selector-property': 'content',
        'date-selector': 'time.c-byline__item',
        'date-selector-property': '',
        'text-selector': '',
        'text-selector-property': '',
        'title-selector': 'title',
        'title-selector-property': ''
    },
    'cnn': {
        'url': 'cnn.com',
        'author-selector': 'span.metadata__byline__author',
        'author-selector-property': '',
        'date-selector': 'p.update-time',
        'date-selector-property': '',
        'text-selector': 'section#body-text',
        'text-selector-property': '',
        'title-selector': 'h1.pg-headline',
        'title-selector-property': ''
    },
    'newyorker': {
        'url': 'newyorker.com',
        'author-selector': 'span[itemprop="name"]',
        'author-selector-property': '',
        'date-selector': 'time',
        'date-selector-property': 'content',
        'text-selector': 'div[itemprop="articleBody"]',
        'text-selector-property': '',
        'title-selector': 'h1[itemprop="headline"]',
        'title-selector-property': ''
    },
    'vicemedia': {
        'url': 'vice.com',
        'author-selector': 'a.contributor__link',
        'author-selector-property': '',
        'date-selector': 'div.contributor__content__date',
        'date-selector-property': '',
        'text-selector': 'div.article__body',
        'text-selector-property': '',
        'title-selector': 'h1.article__title',
        'title-selector-property': ''
    },
    'fivethirtyeight': {
        'url': 'fivethirtyeight.com',
        'author-selector': 'a[rel="author"]',
        'author-selector-property': '',
        'date-selector': 'span.datetime',
        'date-selector-property': '',
        'text-selector': 'div.entry-content',
        'text-selector-property': '',
        'title-selector': 'h1.article-title',
        'title-selector-property': ''
    },
    'upworthy': {
        'url': 'upworthy.com',
        'author-selector': 'a.article-authors__profile',
        'author-selector-property': '',
        'date-selector': 'div.article-header__date',
        'date-selector-property': '',
        'text-selector': 'div.layout__story-page--middle',
        'text-selector-property': '',
        'title-selector': 'h1.article-header__title',
        'title-selector-property': ''
    },
    'buzzfeed': {
        'url': 'buzzfeed.com',
        'author-selector': 'a.byline__author',
        'author-selector-property': '',
        'date-selector': 'span.buzz-datetime',
        'date-selector-property': '',
        'text-selector': 'div.buzz',
        'text-selector-property': '',
        'title-selector': 'h1#post-title',
        'title-selector-property': ''
    },
    'theatlantic': {
        'url': 'theatlantic.com',
        'author-selector': 'span[itemprop="author"]',
        'author-selector-property': '',
        'date-selector': 'time[itemprop="datePublished"]',
        'date-selector-property': '',
        'text-selector': 'div.article-body',
        'text-selector-property': '',
        'title-selector': 'h1.hed',
        'title-selector-property': ''
    },
    'mic': {
        'url': 'mic.com',
        'author-selector': 'a.link-author.name',
        'author-selector-property': '',
        'date-selector': 'time[itemprop="datePublished"]',
        'date-selector-property': '',
        'text-selector': 'div#article-body',
        'text-selector-property': '',
        'title-selector': 'h1[itemprop="headline"]',
        'title-selector-property': ''
    },
    'slate': {
        'url': 'slate.com',
        'author-selector': 'a[rel="author"]',
        'author-selector-property': '',
        'date-selector': 'div.pub-date',
        'date-selector-property': '',
        'text-selector': 'div.newbody',
        'text-selector-property': '',
        'title-selector': 'h1.hed',
        'title-selector-property': ''
    },
    'nationalreview': {
        'url': 'nationalreview.com',
        'author-selector': 'span.uppercase',
        'author-selector-property': '',
        'date-selector': 'time[itemprop="datePublished"]',
        'date-selector-property': '',
        'text-selector': 'div[itemprop="articleBody"]',
        'text-selector-property': '',
        'title-selector': 'h1.article-header',
        'title-selector-property': ''
    },
    'bloomberg': {
        'url': 'bloomberg.com',
        'author-selector': 'div.author',
        'author-selector-property': '',
        'date-selector': 'time[itemprop="datePublished"]',
        'date-selector-property': '',
        'text-selector': 'div.body-copy',
        'text-selector-property': '',
        'title-selector': 'h1.lede-text-only__hed',
        'title-selector-property': ''
    },
    'weeklystandard': {
        'url': 'weeklystandard.com',
        'author-selector': 'div[itemprop="author"] a',
        'author-selector-property': '',
        'date-selector': 'span.datetime',
        'date-selector-property': '',
        'text-selector': 'div.body-text',
        'text-selector-property': '',
        'title-selector': 'h1.headline',
        'title-selector-property': ''
    },
    'forbes': {
        'url': 'forbes.com',
        'author-selector': 'p.contrib-byline-author',
        'author-selector-property': '',
        'date-selector': 'time[itemprop="datePublished"]',
        'date-selector-property': '',
        'text-selector': 'div.article-text.clearfix > div',
        'text-selector-property': '',
        'title-selector': 'h1.article-headline',
        'title-selector-property': ''
    },
    'washingtontimes': {
        'url': 'washingtontimes.com',
        'author-selector': 'div.article-text a',
        'author-selector-property': '',
        'date-selector': 'span.source', //going to need cleanup function
        'date-selector-property': '',
        'text-selector': 'section#content',
        'text-selector-property': '',
        'title-selector': 'h1.page-headline',
        'title-selector-property': ''
    },
    'foxnews': {
        'url': 'foxnews.com',
        'author-selector': 'div.article-info a',
        'author-selector-property': '',
        'date-selector': 'div.article-info time', //going to need cleanup
        'date-selector-property': '',
        'text-selector': 'div.article-text',
        'text-selector-property': '',
        'title-selector': 'article h1',
        'title-selector-property': ''
    },
    'thehill': {
        'url': 'thehill.com',
        'author-selector': 'span.submitted-by', //going to need cleanup
        'author-selector-property': '',
        'date-selector': 'span.submitted-date',
        'date-selector-property': '',
        'text-selector': 'div.content-wrp',
        'text-selector-property': '',
        'title-selector': 'h1.title',
        'title-selector-property': ''
    },
    'bbc': {
        'url': 'bbc.com',
        'author-selector': 'li.mini-info-list__item a',
        'author-selector-property': '',
        'date-selector': 'div.date',
        'date-selector-property': '',
        'text-selector': 'div.story-body__inner',
        'text-selector-property': '',
        'title-selector': 'h1.story-body__h1',
        'title-selector-property': ''
    },
    'abc': {
        'url': 'abcnews.go.com',
        'author-selector': 'div.author', //going to need clean up
        'author-selector-property': '',
        'date-selector': 'span.timestamp',
        'date-selector-property': '',
        'text-selector': 'div.article-copy',
        'text-selector-property': '',
        'title-selector': 'header.article-header h1',
        'title-selector-property': ''
    },
    'nbc': {
        'url': 'nbcnews.com',
        'author-selector': 'span.byline_author',
        'author-selector-property': '',
        'date-selector': 'time.timestamp_article',
        'date-selector-property': '',
        'text-selector': 'div.article-body',
        'text-selector-property': '',
        'title-selector': 'div.article-hed h1',
        'title-selector-property': ''
    },
    'reuters': {
        'url': 'reuters.com',
        'author-selector': 'span.span.author a',
        'author-selector-property': '',
        'date-selector': 'span.timestamp',
        'date-selector-property': '',
        'text-selector': 'span#article-text',
        'text-selector-property': '',
        'title-selector': 'h1.article-headline',
        'title-selector-property': ''
    },
    'techcrunch': {
        'url': 'techcrunch.com',
        'author-selector': 'a[rel="author"]',
        'author-selector-property': '',
        'date-selector': 'time.timestamp',
        'date-selector-property': '',
        'text-selector': 'div.article-entry',
        'text-selector-property': '',
        'title-selector': 'h1.alpha',
        'title-selector-property': ''
    },
    'breitbartnews': {
        'url': 'breitbart.com',
        'author-selector': 'a.byauthor',
        'author-selector-property': '',
        'date-selector': 'span.bydate',
        'date-selector-property': '',
        'text-selector': 'div.entry-content',
        'text-selector-property': '',
        'title-selector': 'h1[itemprop="headline"]',
        'title-selector-property': ''
    },
    'theblaze': {
        'url': 'theblaze.com',
        'author-selector': 'a.article-author',
        'author-selector-property': '',
        'date-selector': 'time.published',
        'date-selector-property': '',
        'text-selector': 'div.entry-content',
        'text-selector-property': '',
        'title-selector': 'h1.page-title',
        'title-selector-property': ''
    },
    'economist': {
        'url': 'economist.com',
        'author-selector': 'span[itemprop="author"]',
        'author-selector-property': '',
        'date-selector': 'time[itemprop="dateCreated"]',
        'date-selector-property': '',
        'text-selector': 'div[itemprop="description"]',
        'text-selector-property': '',
        'title-selector': 'span.flytitle-and-title__title',
        'title-selector-property': ''
    },
    'TheFederalist': {
        'url': 'thefederalist.com',
        'author-selector': 'a[rel="author"]',
        'author-selector-property': '',
        'date-selector': 'div.byline-standard', //going to need clean up
        'date-selector-property': '',
        'text-selector': 'div.entry-content',
        'text-selector-property': '',
        'title-selector': 'h2.entry-title',
        'title-selector-property': ''
    },
    'TheDailyCaller': {
        'url': 'thedailycaller.com',
        'author-selector': 'div#name',
        'author-selector-property': '',
        'date-selector': 'div.dateline',
        'date-selector-property': '',
        'text-selector': 'div.article-primary',
        'text-selector-property': '',
        'title-selector': 'div#main-article h1',
        'title-selector-property': ''
    },
    'TheWashingtonFreeBeacon': {
        'url': 'freebeacon.com',
        'author-selector': 'span.author a',
        'author-selector-property': '',
        'date-selector': 'time.entry-date',
        'date-selector-property': '',
        'text-selector': 'div.entry-content p',
        'text-selector-property': '',
        'title-selector': 'h1.entry-title',
        'title-selector-property': ''
    },
    'InfoWars': {
        'url': 'infowars.com',
        'author-selector': 'span.author a',
        'author-selector-property': '',
        'date-selector': 'span.date',
        'date-selector-property': '',
        'text-selector': 'div.text article',
        'text-selector-property': '',
        'title-selector': 'h1.entry-title',
        'title-selector-property': ''
    },
    'CBSNews': {
        'url': 'cbsnews.com',
        'author-selector': 'span.source',
        'author-selector-property': '',
        'date-selector': 'span.time',
        'date-selector-property': '',
        'text-selector': 'div[data-page="1"]',
        'text-selector-property': '',
        'title-selector': 'h1.title',
        'title-selector-property': ''
    },
    'NYMag': {
        'url': 'nymag.com',
        'author-selector': 'a.article-author > span',
        'author-selector-property': '',
        'date-selector': 'span.article-date.large-width-date',
        'date-selector-property': '',
        'text-selector': 'div.article-content',
        'text-selector-property': '',
        'title-selector': 'h1.headline-primary',
        'title-selector-property': ''
    },
    'NYPost': {
        'url': 'nypost.com',
        'author-selector': '#author-byline > p',
        'author-selector-property': '',
        'date-selector': 'div.article-header > p',
        'date-selector-property': '',
        'text-selector': 'div.entry-content',
        'text-selector-property': '',
        'title-selector': 'div.article-header > h1 > a',
        'title-selector-property': ''
    },
    'RT': {
        'url': 'rt.com',
        'author-selector': '',
        'author-selector-property': '',
        'date-selector': 'time.date_article-header',
        'date-selector-property': '',
        'text-selector': 'div.article__text',
        'text-selector-property': '',
        'title-selector': 'h1.article__heading',
        'title-selector-property': ''
    },
    'RT': {
        'url': 'rt.com',
        'author-selector': '',
        'author-selector-property': '',
        'date-selector': 'time.date_article-header',
        'date-selector-property': '',
        'text-selector': 'div.article__text',
        'text-selector-property': '',
        'title-selector': 'h1.article__heading',
        'title-selector-property': ''
    }
};

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

chrome.identity.getProfileUserInfo(function (userInfo) {
    user_id = userInfo.id;
    user_email = userInfo.email;
});

chrome.identity.getAuthToken({
    interactive: true
}, function (token) {
    if (chrome.runtime.lastError) {
        alert(chrome.runtime.lastError.message);
        return;
    }

    console.log(_firebase);
    _firebase.then(function (firebase) {
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
                        //Write remaining entries.
                    }
                });
            });
        });
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
        case "getSources":
            sendResponse(sources);
            break;
        case "updateScrollMetric":
            if (current_article) {
                current_article.scrolled_content_ratio = request.message;
            }
            break;
    }
})
//TODO: Move database stuff in separate file maybe?
function writeArticleData(article_data, user_id) {
    if (!article_data) {
        console.log("writeArticleData was called with no data");
        return;
    }

    var article_key = article_data.url.hashCode();

    if (!article_key || !article_data.dateRead) {
        return false;
    }

    console.log("Getting database")
    database.then(function (database) {
        //Check if the article has already been scraped or the new record is not a partial record.
        database.ref('articles/' + article_key).once("value").then(function (articleSnapshot) {
            var existing_article;
            if(articleSnapshot.exists()){
                existing_article = articleSnapshot.val();
            }
            console.log("Writing for article " + article_key);
            //Write new records and overwrite partial ones
            if (!articleSnapshot.exists() || (articleSnapshot.val().partialRecord && !article_data.partialRecord)) {
                if (!articleSnapshot.exists()) {
                    console.log("Writing new article record");
                } else if (articleSnapshot.val().partialRecord && !article_data.partialRecord) {
                    console.log("Overwriting partial record")
                } else {
                    console.log("Overwriting full record");
                }
                database.ref('articles/' + article_key).set(article_data);
                database.ref('articles/' + article_key + '/readers/' + user_id).set(true);
                database.ref('users/' + user_id + '/articles/' + article_key + '/source').set(article_data.source);
                database.ref('users/' + user_id + '/email').set(user_email);
            }
            increaseReadCount();
            database.ref('users/' + user_id + '/articles/' + article_key + '/dateRead').set(article_data.dateRead);
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
    console.log(historyItem.lastVisitTime);
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
    console.log("dateRead: " + dateRead);
    this.dateRead = dateRead;
    this.partialRecord = partialRecord || false;
}

function tabChangeHandler(tabId, changeInfo) {
    if (current_article && (changeInfo.url || changeInfo.isWindowClosing !== undefined)) {
        console.log("Navigating away from source page, persisting article data");
        writeArticleData(current_article, user_id);
        current_article = null;
    }
}

chrome.tabs.onUpdated.addListener(tabChangeHandler);
chrome.tabs.onRemoved.addListener(tabChangeHandler);