var current_article;
//To avoid duplication and global scope, we'll initialize firebase and make it accessible via a promise.
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
            current_article = new ArticleData(
                request.message.data.url,
                request.message.data.source,
                request.message.data.title,
                new Date().getTime(),
                request.message.data.date,
                request.message.data.author,
                request.message.data.text
            );
            current_user.then(function (user) {
                writeArticleData(current_article, user);
            });
            break;
        case "updateScrollMetric":
            if (current_article) {
                current_article.scrolled_content_ratio = request.message;
            }
            break;
    }
})

function writeArticleData(article_data, user) {
    if (!article_data) {
        console.log("writeArticleData was called with no data");
        return;
    }

    var article_key = article_data.url.hashCode();

    if (!article_key || !article_data.dateRead) {
        return false;
    }

    _firebase.then(function (firebase) {
        //Check if the article has already been scraped or the new record is not a partial record.
        firebase.database().ref('articles/' + article_key).once("value").then(function (articleSnapshot) {
            var existing_article;
            if (articleSnapshot.exists()) {
                existing_article = articleSnapshot.val();
            }
            firebase.database().ref('articles/' + article_key).set(article_data);
        });
        increaseReadCount();
        firebase.database().ref('articles/' + article_key + '/readers/' + user.id).set(true);
        firebase.database().ref('users/' + user.id + '/articles/' + article_key + '/source').set(article_data.source);
        firebase.database().ref('users/' + user.id + '/articles/' + article_key + '/dateRead').set(article_data.dateRead);
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

//Cut out the protocol, subdomain and path from a url
function reduceUrl(url) {
    //Replace leading www. and http and https and trailing # fragment
    return url.replace(/.*?:[\\/]{2}(www\.)?/, '').replace(/#.*/, '');
}

function ArticleData(url, source, title, dateRead, date, author, text, partialRecord) {
    if (url == undefined) {
        throw "url must be set";
    }
    this.url = url;
    if (!source == undefined) {
        throw "Source must be set";
    }
    this.source = source;
    if (!title == undefined) {
        throw "Title must be set"
    }
    this.title = title;
    if (!dateRead == undefined) {
        throw "Date must be set";
    }
    this.dateRead = dateRead;

    this.date = date || "";
    this.author = author || "";
    this.text = text || "";
    this.partialRecord = partialRecord || false;
}

function tabChangeHandler(tabId, changeInfo) {
    if (current_article && (changeInfo.url || changeInfo.isWindowClosing !== undefined)) {
        console.log("Navigating away from source page, persisting article data");
        current_user.then(function (user) {
            writeArticleData(current_article, user);
        });
    }
}

chrome.tabs.onUpdated.addListener(tabChangeHandler);
chrome.tabs.onRemoved.addListener(tabChangeHandler);