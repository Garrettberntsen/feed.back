/**
 * This module is responsible for keeping an active cache of recently viewed articles.
 * Created by Damie on 5/27/2017.
 */
var articles = {}

/**
 * Returns a promise wrapping an article definition.
 * @param url
 * @returns {*}
 */
function resolveArticleForUrl(url) {
    if (!url) {
        return Promise.resolve(null);
    }
    url = reduceUrl(url);
    "use strict";
    if (articles[url]) {
        return articles[url];
    } else {
        if (Object.keys(sources).find(function (source_name) {
                return sources[source_name].testForArticleUrlMatch(url);
            }) == "tutorial") {
            return Promise.resolve(new Article(
                new ArticleData(url, "tutorial", "Feedback - How To", null, ["The Feedback Team"]),
                new UserMetadata(new Date().getTime(), "tutorial")
            ));
        }
        else {
            articles[url] = current_user.then(function (user) {
                Promise.all([
                    getArticle(url.hashCode()),
                    getUser(user.id)]).then(function (resolved) {
                    if (resolved[0]) {
                        var article_data = resolved[0];
                        var hashCode = url.hashCode();
                        var user_metadata = resolved[1].articles && resolved[1].articles[url.hashCode()] ? resolved[1].articles[url.hashCode()] : {};
                        return new Article(article_data, user_metadata)
                    }
                }, function (error) {
                    console.log(error);
                    reject("There was an error resolving the article and user from firebase");
                });
            });
        }
    }
}

function insertArticleForUrlIntoCache(article, url) {
    var value;
    "use strict";
    if (article.then) {
        value = article;
    } else {
        value = Promise.resolve(article);
    }
    articles[reduceUrl(url)] = value;
}