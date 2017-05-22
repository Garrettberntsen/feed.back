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
        $('#avg-lean-message').show();
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
        $('#avg-rating-message').show();
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
                    chrome.runtime.sendMessage({type: "getCurrentArticle", message: {waitForScrape:true}}, refreshDisplayedArticle);
                }
            });
        } else {
            console.log("Tab already loaded.");
            console.log("Requesting current article")
            request_time = new Date().getTime();
            chrome.runtime.sendMessage({type: "getCurrentArticle", message: {waitForScrape:true}}, refreshDisplayedArticle);
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
        $(".loading").fadeOut(500, function () {
            $(".loading").remove();
            addTrackThisQuestion();
        });
        //addCircleGraph();
    } else {
        if(!article.user_metadata){
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

                if($("#title").text() === "Feedback - How To"){
                    $("#avg-lean").text(value);
                    setLeanColor(value);
                } else {
                    article.user_metadata.lean = $('#leanRating').val();
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
                if($("#title").text() === "Feedback - How To"){
                    $("#avg-rating").text(value);
                } else {
                    article.user_metadata.stars = $('#starRating').val();
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

        if (article.user_metadata.notes) {
            $("#notes-area").val(article.user_metadata.notes);
        }

        //Keep track of any notes that user adds. When pressed, update the userData object.
        $("#notes-area").keyup(function () {
            chrome.runtime.sendMessage({
                type: "analytics",
                message: {
                    hitType: "event",
                    command: "send",
                    eventCategory: "User Action",
                    eventAction: "Article Notes Set"
                }
            });
            article.user_metadata.notes = $("#notes-area").val();
            console.log(article.user_metadata);
            chrome.runtime.sendMessage({
                type: "update_article",
                message: article
            });
        });

        var articleTags = new Taggle('tags', {
            tags: article.user_metadata.tags ? article.user_metadata.tags : [],
            //Update userData.tags when a tag is removed
            onTagRemove: function (event, tag) {
                article.user_metadata.tags = articleTags.getTagValues()
                chrome.runtime.sendMessage({
                    type: "analytics",
                    message: {
                        hitType: "event",
                        command: "send",
                        eventCategory: "User Action",
                        eventAction: "Article Tags Set"
                    }
                });
                chrome.runtime.sendMessage({
                    type: "update_article",
                    message: article
                });
            }
        });
        updateLeanAverage(article);
        updateRatingAverage(article);

        //Keep track of any tags that user adds.
        $("#tags").keyup(function () {
            if (article.user_metadata.tags === undefined) {
                article.user_metadata.tags = [];
            }

            if (article.user_metadata.tags.length !== articleTags.getTagValues().length) {
                chrome.runtime.sendMessage({
                    type: "analytics",
                    message: {
                        hitType: "event",
                        command: "send",
                        eventCategory: "User Action",
                        eventAction: "Article Tags Set"
                    }
                });

                article.user_metadata.tags = articleTags.getTagValues()
                console.log(article.user_metadata.tags);

                chrome.runtime.sendMessage({
                    type: "update_article",
                    message: article
                });
            }
        })
        $(".loading").fadeOut(500, function () {
            $(".loading").remove();
            $("form").show();
        });
    }
}

function addCircleGraph() {
    chrome.runtime.sendMessage({type: "getUser"}, function (user) {
        chrome.extension.getBackgroundPage()._firebase.then(function (firebase) {
            firebase.database().ref("users/" + user.id).once("value").then(function (userSnapshot) {
                var daysBack = 10;
                var todaysDate = Date.now();
                var millisecondsPerDay = 86400000;
                var millisecondsBack = daysBack * millisecondsPerDay;
                var articlesFromThisDate = todaysDate - millisecondsBack;

                //Create deep copy of articles to mess around with
                var articles = JSON.parse(JSON.stringify(userSnapshot.val().articles));

                for (let key in articles) {
                    if (articles[key].dateRead < articlesFromThisDate) {
                        delete articles[key];
                    }
                }

                var articleDataset = createD3Dataset(getArticleCount(articles));

                console.log(articleDataset);

                createDonutGraph(articleDataset);

                /* Creats an object with a count of all the the articles read and their sournce in
                 *  the past X amount of days
                 *
                 *  @articlesToParse -> List of articles that user has read, obtained from JSON file
                 *
                 *  Returns -> List of sources read and their count
                 */
                function getArticleCount(articlesToParse) {
                    var count = {};
                    for (let key in articlesToParse) {
                        var source = articlesToParse[key].source;
                        if (count.hasOwnProperty(source)) {
                            count[source]++;
                        } else {
                            count[source] = 1;
                        }
                    }
                    return count;
                };


                /* Creates array that is better suited for D3 parsing
                 *
                 *  @articlesToParse -> List of articles that user has read, obtained from JSON file
                 *
                 *  Returns -> Ordered array of sources read and their count
                 */
                function createD3Dataset(articlesToParse) {
                    var dataset = [];
                    for (let source in articlesToParse) {
                        var articleCountObj = {};
                        articleCountObj['source'] = source;
                        articleCountObj['count'] = articlesToParse[source];
                        dataset.push(articleCountObj);
                    }

                    dataset.sort(function (a, b) {
                        var nameA = a.source;
                        var nameB = b.source;
                        if (nameA < nameB) {
                            return -1;
                        }
                        if (nameA > nameB) {
                            return 1;
                        }
                        return 0;
                    });
                    return dataset;
                }

                /* Creats an object with a count of all the the articles read and their sournce in
                 *  the past X amount of days
                 *  @articlesToParse -> List of articles that user has read, obtained from JSON file
                 *  Returns -> List of sources read and their count
                 */
                function createDonutGraph(data) {
                    //Donut chart characteristics
                    var donutWidth = 60;
                    var width = 380;
                    var height = 380;
                    var radius = Math.min(width, height) / 2;

                    //Legend chart characteristics
                    var legendRectSize = 18;
                    var legendSpacing = 4;

                    var color = d3.scaleOrdinal(d3.schemeCategory20);

                    var svg = d3.select('#donut')
                        .append('svg')
                        .attr('width', width)
                        .attr('height', height)
                        .append('g')
                        .attr('transform', 'translate(' + (width / 2) + ',' + (height / 2) + ')');

                    var arc = d3.arc()
                        .innerRadius(radius - donutWidth)
                        .outerRadius(radius);

                    var pie = d3.pie()
                        .value(function (d) {
                            return d.count
                        })
                        .sort(null);

                    var path = svg.selectAll('path')
                        .data(pie(data))
                        .enter()
                        .append('path')
                        .attr('d', arc)
                        .attr('fill', function (d, i) {
                            return color(d.data.source)
                        });

                    path.on('mouseover', function (d) {
                        console.log('in');
                        var total = d3.sum(data.map(function (d) {
                            return d.count;
                        }));
                        var percent = Math.round(1000 * d.data.count / total) / 10;
                        tooltip.select('.tooltip__label').html(d.data.source);
                        tooltip.select('.tooltip__count').html('Articles Read: ' + d.data.count);
                        tooltip.select('.tooltip__percent').html('Percent of Total: ' + percent + '%');
                        tooltip.style('display', 'block');
                    });

                    path.on('mouseout', function (d) {
                        console.log('out');
                        tooltip.style('display', 'none');
                    });

                    path.on('mousemove', function (d) {
                        tooltip.style('top', (d3.event.layerY + 10) + 'px')
                            .style('left', (d3.event.layerX + 10) + 'px');
                    });

                    var legend = svg.selectAll('.legend')
                        .data(color.domain())
                        .enter()
                        .append('g')
                        .attr('class', 'legend')
                        .attr('transform', function (d, i) {
                            var height = legendRectSize + legendSpacing;
                            var offset = height * color.domain().length / 2;
                            var horz = -2 * legendRectSize;
                            var vert = i * height - offset;
                            return 'translate(' + horz + ',' + vert + ')';
                        });

                    legend.append('rect')
                        .attr('width', legendRectSize)
                        .attr('height', legendRectSize)
                        .style('fill', color)
                        .style('stroke', color);

                    legend.append('text')
                        .attr('x', legendRectSize + legendSpacing)
                        .attr('y', legendRectSize - legendSpacing)
                        .text(function (d) {
                            return d;
                        })

                    var tooltip = d3.select('#donut')
                        .append('div')
                        .attr('class', 'tooltip')

                    tooltip.append('div')
                        .attr('class', 'tooltip__label')

                    tooltip.append('div')
                        .attr('class', 'tooltip__count')

                    tooltip.append('div')
                        .attr('class', 'tooltip__percent')
                }
            }).catch(function (error) {
                console.log(error);
            });
        });
    });
}

function addTrackThisQuestion() {
    var trackElem = document.getElementById("track-this");
    var question = document.createElement("P");
    var questionText = document.createTextNode("We don't track this yet. Should we?");
    question.appendChild(questionText);

    var btn = document.createElement("BUTTON");
    var btnText = document.createTextNode("Yes - this is news!");
    btn.appendChild(btnText);

    btn.className = "dashboard-button button is-primary is-large is-news has-text-centered";

    console.log("trackElem");
    console.log(trackElem);
    console.log(question);
    console.log(btn);

    trackElem.appendChild(question);
    trackElem.appendChild(btn);
}