var user_email;
var user_id;
var auth_token;
var page_source = new Promise(function (resolve, reject) {
    chrome.runtime.sendMessage({type: "getSources"}, function (sources) {
        if (sources) {
            resolve(sources);
        }
        if (chrome.runtime.lastError) {
            reject();
        }
    });
});

function scrapePage() {
    if (!user_email || !user_id || !auth_token) {
        if (!user_email) {
            console.log("No user email available");
        }
        if (!user_id) {
            console.log("No user id available");
        }
        if (!auth_token) {
            console.log("No auth token available");
        }
        return;
    }
    page_source.then(function (sources) {
        var data = {
            'source': '',
            'url': '',
            'author': '',
            'date': '',
            'text': '',
            'title': '',
            'dateRead': ''
        };
        var sourceName = Object.keys(sources).find(function (sourceName) {
            return window.location.hostname.indexOf(sources[sourceName].url) !== -1;
        });
        page_source = sources[sourceName];

        if (page_source) {
            data.source = sourceName;
            data.url = window.location.href.replace(/https?:\/\//, '').replace(/.*?:[\\/]{2}(www\.)?/, '').replace(/#.*/, '');
            var d = new Date();
            data.dateRead = d.getTime();
            if (sources[sourceName]["date-selector-property"] === "") {
                data.date = $(sources[sourceName]["date-selector"]).text();
            } else {
                data.date = $(sources[sourceName]["date-selector"]).attr(sources[sourceName]["date-selector-property"]);
            }
            //Clean-up
            if (data.date) {
                data.date = data.date.trim();
            }

            if (sources[sourceName]["author-selector-property"] === "") {
                data.author = $(sources[sourceName]["author-selector"]).text();
            } else if (typeof sources[sourceName]["author-selector"] === "function") {
                data.author = sources[sourceName]["author-selector"]();
            } else {
                data.author = $(sources[sourceName]["author-selector"]).attr(sources[sourceName]["author-selector-property"]);
            }
            //Clean-up
            data.author = data.author.trim().replace(/By .*?By /, '').replace(/By /, '').replace(" and ", ", ").replace(", and ", ", ").replace(" & ", ", ").split(", ");

            if (sources[sourceName]["title-selector-property"] === "") {
                data.title = $(sources[sourceName]["title-selector"]).text();
            } else {
                data.title = $(sources[sourceName]["title-selector"]).attr(sources[sourceName]["title-selector-property"]);
            }
            //Clean-up
            data.title = data.title.trim().replace(/\s{3,}/, ' ');

            if (sources[sourceName]["text-selector"] !== "") {
                if (sources[sourceName]["text-selector-property"] === "") {
                    data.text = $(sources[sourceName]["text-selector"]).text().trim();
                } else {
                    data.text = $(sources[sourceName]["text-selector"]).attr(sources[sourceName]["text-selector-property"]);
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


            console.log(JSON.stringify(data));
            console.log("The user is: " + user_email);
            if (data.url) {
                chrome.runtime.sendMessage({
                    type: "update_current_article", message: {
                        is_new: true,
                        data: data,
                        user_id: user_id
                    }
                });
            }
        }
    });
};
chrome.runtime.onMessage.addListener(function (request, sender) {
    if (request.type == "userUpdated") {
        console.log("User identity updated");
        user_email = request.message.email;
        user_id = request.message.id;
        auth_token = request.message.authToken;
        scrapePage();
    }
});

chrome.runtime.sendMessage({type: "getUser"}, function (response) {
    if (response) {
        user_email = response.email;
        user_id = response.id;
        auth_token = response.authToken;
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
    page_source.then(function (source) {
        content_element = $(source["text-selector"]);
        if (content_element.length) {
            $(document).scroll(updateScrollRatio);
            updateScrollRatio();
        } else {
            if (!source) {
                console.log("No source description was found for this url");
            } else {
                console.log("No content element could be found with selector " + source["text-selector"])
            }
        }
    });
});