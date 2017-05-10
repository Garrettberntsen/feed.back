var sources = new Promise(function (resolve, reject) {
    chrome.runtime.sendMessage({type: "getSources"}, function (sources) {
        var sourceName
        if (sources) {
            resolve(sources);
        }
        if (chrome.runtime.lastError) {
            reject();
        }
    });
});

function scrapePage() {
    chrome.runtime.sendMessage({type: "getCurrentArticle"}, function (article) {
        if (!article) {
            article = {
                user_metadata: {}
            }
        }
        chrome.runtime.sendMessage({type: "getUser"}, function (user) {
            chrome.runtime.sendMessage({type: "getSources"}, function (sources) {
                var source_name = Object.keys(sources).find(function (source_name) {
                    return window.location.href.indexOf(sources[source_name].url) !== -1;
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
                    data.url = window.location.href.replace(/https?:\/\//, '').replace(/.*?:[\\/]{2}(www\.)?/, '').replace(/#.*/, '');
                    var d = new Date();
                    article.user_metadata.dateRead = d.getTime();
                    if (sources[source_name]["date-selector-property"] === "") {
                        data.date = $(sources[source_name]["date-selector"]).text();
                    } else {
                        data.date = $(sources[source_name]["date-selector"]).attr(sources[source_name]["date-selector-property"]);
                    }
                    //Clean-up
                    if (data.date) {
                        data.date = data.date.trim();
                    }

                    var authorElement = $(sources[source_name]["author-selector"]);
                    if (sources[source_name]["author-selector-property"] === "") {
                        data.author = $(sources[source_name]["author-selector"]).contents().not(authorElement.children()).text();
                    } else if (typeof sources[source_name]["author-selector"] === "function") {
                        data.author = sources[source_name]["author-selector"]();
                    } else {
                        data.author = $(sources[source_name]["author-selector"]).attr(sources[source_name]["author-selector-property"]);
                    }
                    //Clean-up
                    data.author = data.author.trim().replace(/By .*?By /, '').replace(/By /, '').replace(" and ", ", ").replace(", and ", ", ").replace(" & ", ", ").split(", ");

                    if (sources[source_name]["title-selector-property"] === "") {
                        data.title = $(sources[source_name]["title-selector"]).text();
                    } else {
                        data.title = $(sources[source_name]["title-selector"]).attr(sources[source_name]["title-selector-property"]);
                    }
                    //Clean-up
                    data.title = data.title.trim().replace(/\s{3,}/, ' ');

                    if (sources[source_name]["text-selector"] !== "") {
                        if (sources[source_name]["text-selector-property"] === "") {
                            data.text = $(sources[source_name]["text-selector"]).text().trim();
                        } else {
                            data.text = $(sources[source_name]["text-selector"]).attr(sources[source_name]["text-selector-property"]);
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

                    data.readers = article.article_data && article.article_data.readers ? article.article_data.readers : [];
                    article.article_data = data;
                    if (!article.article_data.readers) {
                        article.article_data.readers = {};
                    }
                    article.article_data.readers[user.id] = true;

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
        scrapePage();
    }
});

var content_scroll_ratio = 0;
var content_element;

function updateScrollRatio() {
    var content_height = content_element.height();
    var bottom_position = content_element[0].getBoundingClientRect().bottom;
    var viewport_height = $(window).height();
    var calculated_scroll_ratio = Math.min(
        Math.max(
            ($(window).scrollTop() + viewport_height) / (bottom_position + content_height),
            0),
        1);
    if (calculated_scroll_ratio > content_scroll_ratio) {
        content_scroll_ratio = calculated_scroll_ratio;
        chrome.runtime.sendMessage({type: "updateScrollMetric", message: content_scroll_ratio});
    }
    console.log("new scroll ratio: " + content_scroll_ratio);
}

$(document).ready(function () {
    sources.then(function (sources) {
        var source_name = Object.keys(sources).find(function (source_name) {
            return window.location.href.indexOf(sources[source_name].url) !== -1;
        });
        if (source_name) {
            chrome.runtime.sendMessage({
                type: "getSourceUrlMatches",
                message: window.location.href
            }, function (response) {
                if (response) {
                    content_element = $(sources[source_name]["text-selector"]);
                    if (content_element.length) {
                        $(document).scroll(updateScrollRatio);
                    } else {
                        if (!source_name) {
                            console.log("No source description was found for this url");
                        } else {
                            console.log("No content element could be found with selector " + sources[source_name]["text-selector"])
                        }
                    }
                    scrapePage();
                    updateScrollRatio();
                }
            });
        }
    });
});