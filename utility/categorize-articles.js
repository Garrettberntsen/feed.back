/**
 * Created by Damie on 6/5/2017.
 */

var admin = require("firebase-admin");

var serviceAccount = require("../feedback-f33cf-firebase-adminsdk-hb72h-1e8cf4947c.json");

var app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://feedback-f33cf.firebaseio.com"
});
var sources = require("../sources").sources;
var last = null;
admin.database().ref("articles").once("value").then(function (snapshot) {
    var categorized_articles = {};
    var article_count = 0;
    snapshot.forEach((function () {
        return function (child) {
            try {
                article_count++;
                var article = child.val()
                var article_url = article.url;
                var source_for_article = Object.keys(sources).find(function (source) {
                    "use strict";
                    return sources[source].urls.find(function(definition){
                        "use strict";
                        return article_url.indexOf(definition.urlRoot) !== -1;
                    });
                });
                if (source_for_article) {
                    var categorization = sources[source_for_article].testForArticleUrlMatch(article_url);
                    if(!categorization){
                        throw new Error("Match failed for url " + article_url + " with key " + child.key);
                    }
                    if (categorization.category) {
                        article.category = categorization.category;
                        console.log("Category is " + article.category);
                    }
                } else {
                    console.warn("No source for " + article.url);
                }
            } catch(e){
                console.error(e);
            }
        }
    })());

    console.log("Finished categorization");
    app.delete();
}, function (reason) {
    "use strict";
    console.error(reason);
    app.delete();
}).catch(function (reason) {
    "use strict";
    console.error(reason);
    app.delete();
});