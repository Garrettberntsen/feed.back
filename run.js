var encountered_urls = [];

var sources = new Promise(function (resolve, reject) {
    chrome.runtime.sendMessage({type: "getSources"}, function (sources) {
        resolve(sources);
    })
});

/**
 * Handles the result of the content script scraping the given page.
 * @param existing_article
 * @param url
 */
function scrapePage(existing_article, url) {
    return new Promise(function (resolve, reject) {
        if (!existing_article || !existing_article.user_metadata) {
            existing_article = {
                user_metadata: {}
            }
        }
        sources.then(function (sources) {
            "use strict";
            var source_name = Object.keys(sources).find(function (source_name) {
                return sources[source_name].urls.find(function (url_definition) {
                    return window.location.href.indexOf(url_definition.urlRoot) !== -1;
                });
            });
            if (source_name) {
                var data = {
                    'source': '',
                    'url': '',
                    'author': '',
                    'date': '',
                    'text': '',
                    'title': '',
                    'errors': []
                };
                setArticleSource(data, existing_article.user_metadata, source_name);

                setArticleUrl(data, url);

                setUserDateRead(existing_article.user_metadata, new Date());

                var dateElement;
                if (encountered_urls[encountered_urls.current_index].article_root_element_selector) {
                    dateElement = $(encountered_urls[encountered_urls.current_index].article_root_element_selector);
                    dateElement = dateElement.find(sources[source_name]["date-selector"]);
                } else {
                    dateElement = $(sources[source_name]["date-selector"]);
                }

                var readDate;
                if (sources[source_name]["date-selector-property"] === "") {
                    readDate = dateElement.text();
                } else {
                    readDate = dateElement.attr(sources[source_name]["date-selector-property"]);
                }
                setArticleDate(data, readDate);

                var authorElement;
                if (encountered_urls[encountered_urls.current_index].article_root_element_selector) {
                    authorElement = $(encountered_urls[encountered_urls.current_index].article_root_element_selector);
                    authorElement = authorElement.find(sources[source_name]["author-selector"]);
                } else {
                    authorElement = $(sources[source_name]["author-selector"]);
                }

                var author;
                if (sources[source_name]["author-selector-property"] === "") {
                    author = authorElement.contents().not(authorElement.children())
                        .toArray().filter(function (element) {
                            "use strict";
                            return element.textContent.trim() && element.textContent.indexOf("ng") === -1;
                        }).map(function (element) {
                            "use strict";
                            return element.textContent;
                        }).join(", ");
                } else {
                    author = authorElement.attr(sources[source_name]["author-selector-property"]);
                }
                //Clean-up
                setArticleAuthor(data, author);

                var titleElement;
                if (encountered_urls[encountered_urls.current_index].article_root_element_selector) {
                    titleElement = $(encountered_urls[encountered_urls.current_index].article_root_element_selector);
                    titleElement = titleElement.find(sources[source_name]["title-selector"]);
                } else {
                    titleElement = $(sources[source_name]["title-selector"]);
                }
                var articleTitle;
                if (sources[source_name]["title-selector-property"] === "") {
                    articleTitle = titleElement.text();
                } else {
                    articleTitle = titleElement.attr(sources[source_name]["title-selector-property"]);
                }
                setArticleTitle(data, articleTitle);

                var textElement;
                if (encountered_urls[encountered_urls.current_index].article_root_element_selector) {
                    textElement = $(encountered_urls[encountered_urls.current_index].article_root_element_selector);
                    textElement = textElement.find(sources[source_name]["text-selector"]);
                } else {
                    textElement = $(encountered_urls[encountered_urls.current_index].content_element_selector);
                }

                var rawText;
                if (sources[source_name]["text-selector"] !== "") {
                    if (sources[source_name]["text-selector-property"] === "") {
                        rawText = textElement.text().trim();
                    } else {
                        rawText = textElement.attr(sources[source_name]["text-selector-property"]);
                    }
                } else {
                    rawText = $('p').text();
                }
                setArticleText(data, rawText);

                existing_article.article_data = data;

                console.log(JSON.stringify(data));
                resolve(existing_article);
            } else {
                console.log("No source was found matching " + window.location.href);
                reject();
            }
        });
    })
};

function updateScrollRatio(url) {
    var content_element;
    if (encountered_urls[encountered_urls.current_index].article_root_element_selector) {
        content_element = $(encountered_urls[encountered_urls.current_index].article_root_element_selector).find(encountered_urls[encountered_urls.current_index].content_element_selector);
    } else {
        content_element = $(encountered_urls[encountered_urls.current_index].content_element_selector);
    }
    if (content_element) {
        var content_height = content_element.last().height();
        var bottom_position = content_element.last().offset().top;
        var viewport_height = $(window).height();
        var calculated_scroll_ratio = Math.min(
            Math.max(
                (window.scrollY + viewport_height) / (bottom_position + content_height),
                0),
            1);
        if (calculated_scroll_ratio > encountered_urls[encountered_urls.current_index].scroll_ratio) {
            encountered_urls[encountered_urls.current_index].scroll_ratio = calculated_scroll_ratio;
            chrome.runtime.sendMessage({
                type: "updateScrollMetric",
                message: encountered_urls[encountered_urls.current_index].scroll_ratio
            });
        }
        console.log("new scroll ratio: " + encountered_urls[encountered_urls.current_index].scroll_ratio);
    }
}

var port;

function pageUrlChange(new_url) {
    port = chrome.runtime.connect({
        name: "scraper"
    });

    "use strict";
    chrome.runtime.sendMessage({type: "getCurrentArticle"}, function (existing_article) {
        encountered_urls.current_index = encountered_urls.findIndex(function (e, index) {
            return new_url == e.url;
        });
        if (encountered_urls.current_index == -1) {
            var scroll_ratio = existing_article && existing_article.user_metadata && existing_article.user_metadata.scrolled_content_ratio ? existing_article.user_metadata.scrolled_content_ratio : 0;
            encountered_urls.push({url: new_url, scroll_ratio: scroll_ratio});
            encountered_urls.current_index = encountered_urls.length - 1;
        }
        sources.then(function (sources) {
            var source_name = Object.keys(sources).find(function (source_name) {
                if (sources[source_name].urls.find(function (source_url_definition) {
                        return window.location.href.indexOf(source_url_definition.urlRoot) !== -1;
                    })) {
                    return source_name;
                }
            });
            if (source_name) {
                chrome.runtime.sendMessage({type: "incrementReadCount"});
                chrome.runtime.sendMessage({
                    type: "getSourceUrlMatches",
                    message: {
                        location: window.location.href,
                        source_name: source_name
                    }
                }, function (response) {
                    if (response) {
                        port.postMessage({
                            type: "begun_scraping",
                            url: new_url
                        });
                        encountered_urls[encountered_urls.current_index].article_root_element_selector = sources[source_name]["article-root-element-selector"];
                        encountered_urls[encountered_urls.current_index].content_element_selector = sources[source_name]["text-selector"];
                        //If content_element_selector contains multiple elements, get the last
                        if ($(encountered_urls[encountered_urls.current_index].content_element_selector).length) {
                            $(document).scroll(updateScrollRatio);
                        } else {
                            if (!source_name) {
                                console.log("No source description was found for this url");
                            } else {
                                console.log("No content element could be found with selector " + sources[source_name].content_element_selector)
                            }
                        }
                        if (!existing_article || (existing_article.article_data && existing_article.article_data.partialRecord)) {
                            scrapePage(existing_article, new_url).then(function (article) {
                                "use strict";
                                updateScrollRatio(new_url);
                                port.postMessage({
                                    type: "finished_scraping",
                                    message: {url: new_url, article: article}
                                })
                            });
                        } else {
                            port.postMessage({
                                type: "finished_scraping",
                                message: {url: new_url}
                            })
                        }
                    }
                })
            }
        }).catch(function (error) {
            "use strict";
            console.error(error);
            port.postMessage({
                type: "finished_scraping",
                message: {
                    error: error
                }
            });
        });
    });
};

chrome.runtime.onMessage.addListener(function (message) {
    switch (message.type) {
        case "urlChanged":
            pageUrlChange(message.message);
            break;
    }
});


var scraping = false;

$(document).ready(function () {
    "use strict";
    pageUrlChange(window.location.href);
});

function setArticleSource(article_data, user_metadata, source_name) {
    if (!source_name) {
        article_data.errors.push("Source name was not set.")
    } else {
        article_data.source = source_name;
        user_metadata.source = source_name;
    }
}

function setArticleUrl(article_data, url) {
    "use strict";
    if (!url) {
        article_data.errors.push("Source url was not set.")
    }
    article_data.url = url;
}

function setUserDateRead(user_metadata, date) {
    user_metadata.dateRead = date.getTime();
}

function setArticleDate(article_data, date) {
    if (!date) {
        article_data.errors.push("Date read was not set.")
    }
    //Clean-up
    if (article_data.date) {
        article_data.date = article_data.date.trim();
    }
}

function setArticleAuthor(article_data, author) {
    "use strict";
    if (!author) {
        article_data.errors.push("Author was not set.");
    }
    article_data.author = author.trim().replace(/By .*?By /, '').replace(/By /, '').replace(" and ", ", ").replace(", and ", ", ").replace(" & ", ", ");
}

function setArticleTitle(article_data, title) {
    if (!title) {
        article_data.errors.push("Title was not set.")
    }
    article_data.title = title.trim().replace(/\s{3,}/, ' ');
}

function setArticleText(article_data, rawText) {
    "use strict";
    if (!rawText) {
        article_data.errors.push("No article text.");
    }
    rawText = rawText.trim().replace("\n", "").replace("\t", "").replace("\\\"", "\"").replace(/\s\s+/g, " ");
    //remove text between {} and <>
    var index = rawText.search(/{([^{}]+)}/g);
    //while(data.text.indexOf("{") > -1) {
    while (rawText.search(/{([^{}]+)}/g) > -1) {
        rawText = rawText.replace(/{([^{}]+)}/g, "");
    }
    while (rawText.search(/<([^<>]+)>/g) > -1) {
        rawText = rawText.replace(/<([^<>]+)>/g, "");
    }

    if (!rawText) {
        data.errors.push("Text was not set.")
    }
    article_data.text = rawText;
}