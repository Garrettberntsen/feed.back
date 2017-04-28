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
    chrome.tabs.query({'active': true, 'currentWindow': true}, function (tabs) {
        var url = tabs[0].url.replace(/https?:\/\//, '').replace(/.*?:[\\/]{2}(www\.)?/, '').replace(/#.*/, '');
        bg.database.then(function (database) {
            var article_key = url.hashCode();
            database.ref('articles/' + article_key).once('value').then(function (snapshot) {
                if (snapshot.exists()) {
                    var article = snapshot.val();
                    $('#title').text(article.title);
                    if (article.author) {
                        var authors = '';
                        for (var author in article.author) {
                            authors += article.author[author] + ', ';
                        }
                        authors = authors.substring(0, authors.length - 2);
                        $('#author').text('by ' + authors);
                    }
                    $('#read-count').text(Object.keys(article.readers).length);
                    database.ref('users/' + bg.user_id + '/articles/' + article_key).once('value').then(function (snapshot) {
                        $('#leanRating').barrating({
                            theme: 'bars-movie',
                            initialRating: snapshot.val().lean,
                            onSelect: function (value, text) {
                                setLeanColor(value);
                                database.ref('users/' + bg.user_id + '/articles/' + article_key + '/lean').set($('#leanRating').val());
                            }
                        });
                        if (snapshot.val().lean) {
                            setLeanColor(snapshot.val().lean);
                        }
                        $('#starRating').barrating({
                            theme: 'fontawesome-stars',
                            initialRating: snapshot.val().stars,
                            onSelect: function (value, text) {
                                database.ref('users/' + bg.user_id + '/articles/' + article_key + '/stars').set($('#starRating').val());
                                $('#avg-rating-message').show();
                            }
                        });
                        if (snapshot.val().stars) {
                            $('#avg-rating-message').show();
                        }
                        $("form").show();
                    });
                }
            });
        });
    });
});

