var only_scrape_new_user_history = false;
var user_email;
var user_id;
var read_count = 0;
var _firebase = Promise.resolve(function () {
    var config = {
        apiKey: "AIzaSyBb2F9FgRd69-B_tPgShM2CWF9lp5zJ9DI",
        authDomain: "feedback-f33cf.firebaseapp.com",
        databaseURL: "https://feedback-f33cf.firebaseio.com",
        storageBucket: "feedback-f33cf.appspot.com",
        messagingSenderId: "17295082044"
    };
    firebase.initializeApp(config);
    return firebase;
}());
var database = _firebase.then(function (firebase) {
    return firebase.database();
});

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
        'text-selector': 'div.article-injected-body',
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

    //Guarantees initialization in one place.
    _firebase.then(function (firebase) {
        firebase.auth().signInWithCredential(firebase.auth.GoogleAuthProvider.credential(null, token)).then(function (user) {
            database.then(function (db) {
                db.ref("/users/" + user_id).once("value").then(function (snapshot) {
                    //This is a new user; scrape their browser history.
                    if (!snapshot.exists() && only_scrape_new_user_history) {
                        var now = new Date();
                        //TODO: Get rid of these magic numbers.
                        var cutoff = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
                        //Get the browsing history.
                        //TODO: Try to find a way to push filtering to the api so we don't have to dig through loads of irrelevant entries.
                        chrome.history.search({
                            text: "",
                            startTime: cutoff.getTime()
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
                            //Discard duplicate visits to same url.
                            //TODO: What about # fragments? Forbes at least seems to attach a per-visit unique fragment to their urls.
                                .reduce(function (previousVisists, nextVisit) {
                                    if (!previousVisists.find(function (visit) {
                                            return visit.url === nextVisit.url;
                                        })) {
                                        previousVisists.push(nextVisit);
                                    }
                                    return previousVisists;
                                }, [])
                                //Scrape and write.
                                .forEach(function (historyItem) {
                                    writeArticleData(extractHistoryItemData(historyItem), user_id);
                                });
                        });
                        //Write remaining entries.
                    }
                }).catch(function(error){
                    console.log(error);
                });
            }).catch(function (error) {
                console.log(error);
            });
        });
    });
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
            read_count++;
            chrome.browserAction.setBadgeBackgroundColor({color: [0, 0, 0, 1]});
            chrome.browserAction.setBadgeText({text: read_count.toString()});
            break;
        case "database_write":
            writeArticleData(request.payload.data, request.payload.user_id);
            break;
    }
})
//TODO: Move database stuff in separate file maybe?
function writeArticleData(article_data, user_id) {
    var article_key = article_data.url.hashCode();

    if (!article_key || !article_data.dateRead || article_data.title == undefined) {
        throw "Attempted to write an article with insufficient data";
    }

    database.then(function (db) {
        db.ref('articles/' + article_key).once('value').then(function (snapshot) {
            if (!snapshot.exists() || snapshot.val().partial) {
                db.ref('articles/' + article_key).set(article_data);
            }
        })

        db.ref('articles/' + article_key + '/readers/' + user_id).set(true);
        db.ref('users/' + user_id + '/articles/' + article_key + '/source').set(article_data.source);
        db.ref('users/' + user_id + '/articles/' + article_key + '/dateRead').set(article_data.dateRead);
        db.ref('users/' + user_id + '/email').set(user_email);
        chrome.runtime.sendMessage({msg: "increaseReadCount"});
        console.log("feed.back data written to firebase!");
    }).catch(function(error){
        console.log("Error resolving database to write article: " + error);
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
    var articleData = new ArticleData(reduceUrl(historyItem.url),
        Object.keys(sources).find(function (source) {
            return historyItem.url.indexOf(source) !== -1;
        }),
        historyItem.title,
        historyItem.lastVisitTime);
    articleData.partial = true;
    return articleData;
}

//Cut out the protocol, subdomain and path from a url
function reduceUrl(url) {
    return url.replace(/.*?:[\\/]{2}(www\.)?/, '').replace(/[\\/](.*)$/, '');
}

function ArticleData(url, source, title, dateRead, date, author, text) {
    if (!url === undefined) {
        throw "url must be set";
    }
    if (!source === undefined) {
        throw "Source must be set";
    }
    if (!title === undefined) {
        throw "Title must be set"
    }
    if (!dateRead === undefined) {
        throw "Date must be set";
    }
    this.url = url;
    this.source = source;
    this.title = title;
    this.date = date || "";
    this.author = author || "";
    this.text = text || "";
    this.dateRead = dateRead;
}