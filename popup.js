chrome.runtime.sendMessage({
    type: "analytics",
    message: {
        command: "send",
        category: "User Action",
        action: "Popup Opened"
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


var sourceDataCount = {};


/*
    Object that will hold all of the user's date for the page they are reading. When tags/notes/votes are
    added, it will update this object. On leaving the page, a call to firebase is made updating the info
    accordingly. 

    If those data points already exist, they are populated on pageload. This is basically the idea behind
    React's unidirectional data flow, minus all the overhead. Not needed for a chrome popout extension.
*/
var userData = {
    rating: 0,
    slant: 0,
    tags: '',
    notes: ''
}

var bg = chrome.extension.getBackgroundPage();

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
            color = '#4C0E98';
            break;
        case '4':
            color = '#730B72';
            break;
        case '5':
            color = '#99084C';
            break;
        case '6':
            color = '#BF0526';
            break;
        case '7':
            color = '#E60300';
            break;
        default:
    }
    $('.br-theme-bars-movie .br-widget a').css('background-color', '');
    $('.br-theme-bars-movie .br-widget a.br-selected').css('background-color', color);
    $('.br-theme-bars-movie .br-widget .br-current-rating').css('color', color);
    $('#avg-lean-message').show();
}

$(document).ready(function () {
    $('#dashboard-link').on('click', function () {
        chrome.tabs.create({url: '../dashboard/dashboard.html'});
    });


    chrome.tabs.query({'active': true, 'currentWindow': true}, function (tabs) {
        new Taggle('tags');


        addCircleGraph();

        var url = tabs[0].url.replace(/https?:\/\//, '').replace(/.*?:[\\/]{2}(www\.)?/, '').replace(/#.*/, '');
        var article_key = url.hashCode();
        chrome.runtime.sendMessage({type: "getCurrentArticle"}, function (article) {
            console.log(article);
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
                            command: "send",
                            category: "User Action",
                            action: "Article Lean Set"
                        }
                    });
                    setLeanColor(value);
                    article.user_metadata.lean = $('#leanRating').val();
                    chrome.runtime.sendMessage({
                        type: "update_current_article",
                        message: article
                    });
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
                            command: "send",
                            category: "User Action",
                            action: "Article Rating Set"
                        }
                    });
                    article.user_metadata.stars = $('#starRating').val();
                    chrome.runtime.sendMessage({
                        type: "update_current_article",
                        message: article
                    });
                    $('#avg-rating-message').show();
                }
            });
            if (article.user_metadata.stars) {
                $('#avg-rating-message').show();
            }
            $("form").show();
        });
    });
});

function addCircleGraph() {
    chrome.runtime.sendMessage({type: "getUser"}, function (user) {
        chrome.extension.getBackgroundPage()._firebase.then(function (firebase) {
            firebase.database().ref("users/" + user.id).once("value").then(function (userSnapshot) {
                var daysBack = 10;
                var todaysDate = Date.now();
                var millisecondsPerDay = 86400000;
                var millisecondsBack = daysBack * millisecondsPerDay;
                var articlesFromThisDate = todaysDate - millisecondsBack;


                console.log(todaysDate);
                console.log(articlesFromThisDate);
                console.log(millisecondsBack);

                //Create deep copy of articles to mess around with
                var articles = JSON.parse(JSON.stringify( userSnapshot.val().articles ));

                console.log(articles);
                for (let key in articles) {
                    if(articles[key].dateRead < articlesFromThisDate) {
                        delete articles[key];
                    }
                }
                console.log(articles);





                
            }).catch(function (error) {
                console.log(error);
            });
        });
    });
}