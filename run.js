var encountered_urls = [];

var sources = new Promise(function (resolve, reject) {
    chrome.runtime.sendMessage({type: "getSources"}, function (sources) {
        var sourceName;
        if (sources) {
            resolve(sources);
        }
        if (chrome.runtime.lastError) {
            reject();
        }
    });
});

function scrapePage(url) {
    chrome.runtime.sendMessage({type: "getCurrentArticle"}, function (article) {
        if (!article) {
            article = {
                user_metadata: {}
            }
        }
        chrome.runtime.sendMessage({type: "getUser"}, function (user) {
            sources.then(function (sources) {
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
                    };
                    data.source = source_name;
                    article.user_metadata.source = source_name;
                    data.url = url;
                    var d = new Date();
                    article.user_metadata.dateRead = d.getTime();
                    var dateElement;
                    if (encountered_urls[encountered_urls.current_index].article_root_element_selector) {
                        dateElement = $(encountered_urls[encountered_urls.current_index].article_root_element_selector);
                        dateElement = dateElement.find(sources[source_name]["date-selector"]);
                    } else {
                        dateElement = $(sources[source_name]["date-selector"]);
                    }
                    if (sources[source_name]["date-selector-property"] === "") {
                        data.date = dateElement.text();
                    } else {
                        data.date = dateElement.attr(sources[source_name]["date-selector-property"]);
                    }
                    //Clean-up
                    if (data.date) {
                        data.date = data.date.trim();
                    }
                    var authorElement;
                    if (encountered_urls[encountered_urls.current_index].article_root_element_selector) {
                        authorElement = $(encountered_urls[encountered_urls.current_index].article_root_element_selector);
                        authorElement = authorElement.find(sources[source_name]["author-selector"]);
                    } else {
                        authorElement = $(sources[source_name]["author-selector"]);
                    }

                    if (sources[source_name]["author-selector-property"] === "") {
                        data.author = authorElement.contents().not(authorElement.children())
                            .toArray().filter(function (element) {
                                "use strict";
                                return element.textContent.trim() && element.textContent.indexOf("ng") === -1;
                            }).map(function (element) {
                                "use strict";
                                return element.textContent;
                            }).join(", ");
                    } else {
                        data.author = authorElement.attr(sources[source_name]["author-selector-property"]);
                    }
                    //Clean-up
                    data.author = data.author.trim().replace(/By .*?By /, '').replace(/By /, '').replace(" and ", ", ").replace(", and ", ", ").replace(" & ", ", ").split(", ");

                    var titleElement;
                    if (encountered_urls[encountered_urls.current_index].article_root_element_selector) {
                        titleElement = $(encountered_urls[encountered_urls.current_index].article_root_element_selector);
                        titleElement = titleElement.find(sources[source_name]["title-selector"]);
                    } else {
                        titleElement = $(sources[source_name]["title-selector"]);
                    }
                    if (sources[source_name]["title-selector-property"] === "") {
                        data.title = titleElement.text();
                    } else {
                        data.title = titleElement.attr(sources[source_name]["title-selector-property"]);
                    }
                    //Clean-up
                    data.title = data.title.trim().replace(/\s{3,}/, ' ');

                    var textElement;
                    if (encountered_urls[encountered_urls.current_index].article_root_element_selector) {
                        textElement = $(encountered_urls[encountered_urls.current_index].article_root_element_selector);
                        textElement = textElement.find(sources[source_name]["text-selector"]);
                    } else {
                        textElement = $(encountered_urls[encountered_urls.current_index]["text-selector"]);
                    }
                    if (sources[source_name]["text-selector"] !== "") {
                        if (sources[source_name]["text-selector-property"] === "") {
                            data.text = textElement.text().trim();
                        } else {
                            data.text = textElement.attr(sources[source_name]["text-selector-property"]);
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

                    data.readers = article.article_data && article.article_data.readers ? article.article_data.readers : {};
                    data.readers[user.id] = true;

                    article.article_data = data;

                    console.log(JSON.stringify(data));
                    console.log("The user is: " + user.email);
                    chrome.runtime.sendMessage({
                        type: "update_current_article", message: article
                    });
                } else {
                    console.log("No source was found matching " + window.location.href);
                }
            });
        });
    });
}

chrome.runtime.onMessage.addListener(function (request, sender) {
    if (request.type == "userUpdated") {
        console.log("User identity updated");
        scrapePage(window.location.href);
    }
});

function updateScrollRatio(url) {
    var content_element;
    if (encountered_urls[encountered_urls.current_index].article_root_element_selector) {
        content_element = $(encountered_urls[encountered_urls.current_index].article_root_element_selector).find(content_element_selector);
    } else {
        content_element = $(encountered_urls[encountered_urls.current_index].content_element_selector);
    }
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

function pageUrlChange(new_url) {
    chrome.runtime.sendMessage({type: "getCurrentArticle", message: new_url}, function (article) {
        encountered_urls.current_index = encountered_urls.findIndex(function (e, index) {
            return new_url == e.url;
        });
        if (encountered_urls.current_index == -1) {
            var scroll_ratio = article.user_metadata ? article.user_metadata.scrolled_content_ratio : 0;
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
                chrome.runtime.sendMessage({
                    type: "getSourceUrlMatches",
                    message: {
                        location: window.location.href,
                        source_name: source_name
                    }
                }, function (response) {
                    if (response) {
                        encountered_urls[encountered_urls.current_index].article_root_element_selector = sources[source_name]["article-root-element-selector"];
                        encountered_urls[encountered_urls.current_index].content_element_selector = sources[source_name]["text-selector"];
                        //If content_element_selector contains multiple elements, get the last
                        if ($(encountered_urls[encountered_urls.current_index].content_element_selector).length) {
                            $(document).scroll(updateScrollRatio);
                        } else {
                            if (!source_name) {
                                console.log("No source description was found for this url");
                            } else {
                                console.log("No content element could be found with selector " + sources[source_name]["text-selector"])
                            }
                        }
                        scrapePage(new_url);
                        updateScrollRatio(new_url);
                    }
                });
            }
        });
    });
}

chrome.runtime.onMessage.addListener(function (message) {
    switch (message.type) {
        case "urlChanged":
            pageUrlChange(message.message);
            break;
    }
});

$(document).ready(function () {
    pageUrlChange(window.location.href);
});