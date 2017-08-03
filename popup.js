chrome.runtime.sendMessage({
    type: "analytics",
    message: {
        hitType: "event",
        command: "send",
        eventCategory: "User Action",
        eventAction: "Popup Opened"
    }
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

var displayed_article;

/**
 * Maps lean ratings to descriptions
 * @param value
 */
var lean_descriptions = [
    {
        min: 1,
        max: 1.4,
        description: "Very Liberal"
    },
    {
        min: 1.5,
        max: 2.4,
        description: "Liberal"
    },
    {
        min: 2.5,
        max: 3.5,
        description: "Neutral"
    },
    {
        min: 3.6,
        max: 4.5,
        description: "Conservative"
    },
    {
        min: 4.6,
        max: 5,
        description: "Very Conservative"
    }
]

function setLeanColor(value) {
    var color;
    switch (value) {
        case '1':
            color = '#0014E5';
            break;
        case '2':
            color = '#2611BE';
            break;
        case '3':
            color = '#730B72';
            break;
        case '4':
            color = '#BF0526';
            break;
        case '5':
            color = '#E60300';
            break;
        default:
    }
    $('.br-theme-bars-movie .br-widget a').css('background-color', '');
    $('.br-theme-bars-movie .br-widget a.br-selected').css('background-color', color);
    $('.br-theme-bars-movie .br-widget .br-current-rating').css('color', color);
}

function updateLeanAverage(article) {
    "use strict";
    chrome.runtime.sendMessage({
        type: "getAverageLean",
        message: article.article_data.url
    }, function (response) {
        var value = Number.parseFloat(response);
        if (value && displayed_article.user_metadata.lean) {
            "use strict";
            var definition = lean_descriptions.find(function (description) {
                return description.min <= value && description.max >= value;
            });
            $("#avg-lean").text(definition.description);
        } else {
            $("#avg-lean").text("-");
        }
        $("#avg-lean-message").show();
        $("#avg-lean > .loading").fadeOut(500);
    });
}

function updateRatingAverage(article) {
    "use strict";
    chrome.runtime.sendMessage({
        type: "getAverageRating",
        message: article.article_data.url
    }, function (response) {
        "use strict";
        if (response) {
            $("#avg-rating").text(response);
        } else {
            $("#avg-rating").text("-");
        }
        $("#avg-rating-message").show();
        $("#avg-rating > .loading").fadeOut(500);
    });
}

$(document).ready(function () {
    chrome.runtime.sendMessage({type: "resetReadCount"});
    $('#dashboard-link').on('click', function () {
        chrome.tabs.create({url: '../dashboard/dashboard.html'});
        chrome.runtime.sendMessage({
            type: "analytics",
            message: {
                hitType: "event",
                command: "send",
                eventCategory: "User Action",
                eventAction: "Opened Dashboard"
            }
        });
    });
    chrome.tabs.query({
        active: true,
        status: chrome.tabs.TabStatus.LOADING
    }, function (tabs) {
        if (tabs.length) {
            console.log("Loading tabs were found: " + tabs[0].id);
            "use strict";
            chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
                "use strict";
                if (tabId == tabs[0].id && changeInfo && changeInfo.status == "complete") {
                    console.log("Tab finished loading: " + tabId);
                    console.log("Requesting current article")
                    request_time = new Date().getTime();
                    chrome.runtime.sendMessage({
                        type: "getCurrentArticle",
                        message: {waitForScrape: true}
                    }, refreshDisplayedArticle);
                }
            });
        } else {
            console.log("Tab already loaded.");
            console.log("Requesting current article")
            request_time = new Date().getTime();
            chrome.runtime.sendMessage({
                type: "getCurrentArticle",
                message: {waitForScrape: true}
            }, refreshDisplayedArticle);
        }
    })

});

var request_time;

function refreshDisplayedArticle(article) {
    var response_time = new Date().getTime() - request_time;
    console.log("Response took " + response_time + " ms");
    chrome.runtime.sendMessage({
        type: "analytics",
        message: {
            hitType: "event",
            command: "send",
            eventCategory: "Performance",
            metric1: response_time
        }
    });
    "use strict";
    if (!article || !article.article_data) {
        console.log("Not article")
        $("#form-loading").fadeOut(500, function () {
            addTrackThisQuestion();
        });
    } else {
        if (!article.user_metadata) {
            article.user_metadata = {};
        }
        console.log("Article found.");
        displayed_article = article;
        $('#title').text(article.article_data.title);
        if (article.article_data.author) {
            var authors = '';
            for (var author in article.article_data.author) {
                authors += article.article_data.author[author] + ', ';
            }
            authors = authors.substring(0, authors.length - 2);
            $('#author').text('by ' + authors);
        }
        $('#read-count').text(Object.keys(article.article_data.readers ? article.article_data.readers : {}).length);

        $('#leanRating').barrating({
            theme: 'bars-movie',
            initialRating: article.user_metadata.lean,
            onSelect: function (value, text) {
                chrome.runtime.sendMessage({
                    type: "analytics",
                    message: {
                        hitType: "event",
                        command: "send",
                        eventCategory: "User Action",
                        eventAction: "Article Lean Set"
                    }
                });

                if ($("#title").text() === "Feedback - How To") {
                    $("#avg-lean").text(value);
                    setLeanColor(value);
                } else {
                    article.user_metadata.lean = value;
                    chrome.runtime.sendMessage({
                        type: "update_article",
                        message: article
                    }, function () {
                        console.log("We should be updating the average lean here.");
                        updateLeanAverage(article);
                        setLeanColor(value);
                    });
                }
            }
        });

        if (article.user_metadata.lean) {
            setLeanColor(article.user_metadata.lean);
        }

        $('#starRating').barrating({
            theme: 'fontawesome-stars',
            initialRating: article.user_metadata.stars,
            onSelect: function (value, text) {
                chrome.runtime.sendMessage({
                    type: "analytics",
                    message: {
                        hitType: "event",
                        command: "send",
                        eventCategory: "User Action",
                        eventAction: "Article Rating Set"
                    }
                });
                if ($("#title").text() === "Feedback - How To") {
                    $("#avg-rating").text(value);
                } else {
                    article.user_metadata.stars = value;
                    chrome.runtime.sendMessage({
                        type: "update_article",
                        message: article
                    }, function () {
                        "use strict";
                        updateRatingAverage(article);
                    });
                }

            }
        });

        if (article.user_metadata.stars) {
            $('#avg-rating-message').show();
        }
        if (article.user_metadata.lean) {
            $('#avg-lean-message').show();
        }

        if (article.user_metadata.notes) {
            $("#notes-area").val(article.user_metadata.notes);
        }

        //Keep track of any notes that user adds. When pressed, update the userData object.
        $("#notes-area").keyup(function () {
            if ($("#notes-area").val().trim()) {
                chrome.runtime.sendMessage({
                    type: "analytics",
                    message: {
                        hitType: "event",
                        command: "send",
                        eventCategory: "User Action",
                        eventAction: "Article Notes Set"
                    }
                });
            }
            article.user_metadata.notes = $("#notes-area").val();
            console.log(article.user_metadata);
            chrome.runtime.sendMessage({
                type: "update_article",
                message: article
            });
        });

        updateLeanAverage(article);
        updateRatingAverage(article);

        $(".loading").fadeOut(500, function () {
            $(".loading").remove();
            $("form").show();
        });
    }
}

function addTrackThisQuestion() {
    var trackElem = document.getElementById("track-this");
    var question = document.createElement("P");
    var questionText = document.createTextNode("We don't track this yet. Should we?");

    question.appendChild(questionText);

    var btn = document.createElement("BUTTON");
    var btnText = document.createTextNode("Yes - this is news!");
    btn.addEventListener("click", acknowledgeSent)
    btn.appendChild(btnText);
    btn.className = "dashboard-button button is-primary is-large is-news has-text-centered";

    var button = $(btn);
    button.click(function () {
        "use strict";
        chrome.runtime.sendMessage({
            type: "analytics",
            message: {
                hitType: "event",
                command: "send",
                eventCategory: "Tracking",
                eventAction: "Track This Page"
            }
        });
    })

    trackElem.appendChild(question);
    trackElem.appendChild(btn);

    function acknowledgeSent() {
        //A little silly - but this creates a random number between one and two seconds long 
        //to fake doing something in the background.
        var randomWaitTime = Math.floor(Math.random() * (2000 - 500)) + 500;
        btn.className += " is-loading";
        setTimeout(function () {
            btn.className = "dashboard-button button is-primary is-large is-news has-text-centered";
            var btnTextSent = "Got it! Thanks! &#128077";
            btn.innerHTML = btnTextSent;
        }, randomWaitTime);
    }
}