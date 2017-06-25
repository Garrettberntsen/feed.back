/**
 * This module is responsible for extracting partial article definitions from the users browser history.
 *
 * Created by Damie on 5/3/2017.
 */

var only_scrape_new_user_history = false;

function extractHistory(){
    console.log("Begin scraping browser history for news items.");
    "use strict";
    return _firebase.then(function(firebase){
        return current_user.then(function (user) {
            return Promise.all([
                firebase.database().ref("/users/" + user.id).once("value"),
                current_user]);
        }).then(function (resolved) {
            var userSnapshot = resolved[0];
            var chrome_user = resolved[1];
            if (!userSnapshot.exists() || !only_scrape_new_user_history) {
                Object.keys(sources).map(function (name) {
                    return sources[name];
                }).forEach(function (source) {
                    try {
                        var now = new Date();
                        //TODO: Get rid of these magic numbers.
                        var cutoff = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
                        //Search browser history for entries from each source.
                        source.urls.forEach(function (source) {
                            chrome.history.search({
                                text: source.urlRoot,
                                startTime: cutoff.getTime(),
                                maxResults: 10000
                            }, function (results) {
                                console.log("Searching for entries: " + source.url);
                                if (results.length > 0) {
                                    console.log("Found " + results.length);
                                }
                                results.forEach(function (historyItem) {
                                    console.log("Trying to extract history for " + historyItem.url);
                                    var extractedItem = extractHistoryItemData(historyItem);
                                    if (extractedItem) {
                                        console.log("Extracted");
                                        writeArticleData(extractedItem, chrome_user);
                                    }
                                });
                            });
                        })
                    } catch (e) {
                        console.log(e);
                    }
                });
            }
        }).catch(function (e) {
            console.log(e);
        });
    });
}

function extractHistoryItemData(historyItem) {
    var reducedUrl = reduceUrl(historyItem.url);
    var source = Object.keys(sources).reduce(function (found, nextSourceName) {
        if (found) {
            return found;
        }
        var found_source = sources[nextSourceName].urls.find(function (url_definition) {
            "use strict";
            return reducedUrl.indexOf(url_definition.urlRoot) !== -1;
        });
        if (found_source) {
            return {name: nextSourceName, definition: sources[nextSourceName]};
        }
    }, null);
    if (source) {
        if (!source.definition.testForArticleUrlMatch(reducedUrl)) {
            console.log(historyItem.url + " isn't an accepted url for " + source.name);
            return;
        }
        var article_data = new ArticleData(reduceUrl(historyItem.url),
            source.name,
            historyItem.title ? historyItem.title : "Untitled History Item");
        article_data.partialRecord = true;
        return new Article(article_data, new UserMetadata(historyItem.lastVisitTime, source.name));
    }
}

chrome.runtime.onStartup.addListener(extractHistory);
chrome.runtime.onInstalled.addListener(extractHistory);
