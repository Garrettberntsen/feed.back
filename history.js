/**
 * This module is responsible for extracting partial article definitions from the users browser history.
 *
 * Created by Damie on 5/3/2017.
 */

var only_scrape_new_user_history = false;

_firebase.then(function (firebase) {
    chrome.identity.getProfileUserInfo(function (userInfo) {
        var database = firebase.database();
        database.ref("/users/" + userInfo.id).once("value").then(function (userSnapshot) {
            if (!userSnapshot.exists() || !only_scrape_new_user_history) {
                Object.values(sources).forEach(function (source) {
                    var now = new Date();
                    //TODO: Get rid of these magic numbers.
                    var cutoff = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
                    //Search browser history for entries from each source.
                    console.log("Searching for entries: " + source.url);
                    chrome.history.search({
                        text: source.url,
                        startTime: cutoff.getTime(),
                        maxResults: 10000
                    }, function (results) {
                        if(results.length > 0) {
                            console.log("Found " + results.length);
                        }
                        results.forEach(function (historyItem) {
                            var extractedItem = extractHistoryItemData(historyItem);
                            if (extractedItem) {
                                writeArticleData(extractedItem, userInfo.id);
                            }
                        });
                    });
                });
            }
        });
    })
});

function extractHistoryItemData(historyItem) {
    var reducedUrl = reduceUrl(historyItem.url);
    var sourceName = Object.keys(sources).find(function (sourceName) {
        return new RegExp(sources[sourceName].url + "/.+").test(reducedUrl);
    });
    var source = sources[sourceName];
    if (source) {
        if (source.excluded_urls && source.excluded_urls.find(function (exclude) {
                return new RegExp(exclude).test(reducedUrl);
            })) {
            return;
        }

        var article_data = new ArticleData(reduceUrl(historyItem.url),
            sourceName,
            historyItem.title,
            historyItem.lastVisitTime);
        article_data.partialRecord = true;
        return article_data;
    }
}