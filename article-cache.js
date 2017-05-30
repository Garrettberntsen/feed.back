/**
 * This module is responsible for keeping an active cache of recently viewed articles.
 */
var articles = {}

/**
 * Returns a promise wrapping an article definition.
 *
 * If no definition exists in the in-memory cache, an attempt is made to retrieve the definition from Firebase.
 *
 * If none is found in firebase, the Promise resolves to null.
 *
 * @param url   the url to retrieve the article definition for.
 * @returns Promise a promise which resolves to the article definition
 */
function resolveArticleForUrl(url) {
    if (!url) {
        throw new Error("Attempted to resolve an article for an empty url.");
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
                return Promise.all([
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
            return articles[url];
        }
    }
}

/**
 * Inserts the article definition for the given url into the cache.
 *
 * This will overwrite the existing definition, if there is one.
 * @param article   the article definition or a promise wrapping the definition
 * @param url       the article url
 */
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