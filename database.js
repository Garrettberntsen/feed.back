/**
 * This modules handles reading from, writing to and initializing the backing firebase data store.
 *
 * This modules responds to the following messages
 *  - type : "getUser"
 *  - message: user_id
 *  - response: the user matching the given id from the database
 *
 *  - type: "setUser"
 *  - message: {user_id, user}
 *  - response: a promise that resolves after the write completes
 */
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.type) {
        case "getUserByGoogleId":
            current_user.then(function (user) {
                "use strict";
                return getUser(user.id);
            }).then(function (user) {
                "use strict";
                sendResponse(user);
            });
            return true;
    }
});

var database = {
    /**
     * The url of the backend rest API to the database.
     */
    //api_location: "https://feedback-backend-dot-feedback-f33cf.appspot.com/",
    api_location: "http://localhost:8080/",
    /**
     * Returns a Promise that resolves to the user with the given id pulled from the database or fails if it cannot be
     * found.
     * @param   google_id the id of the user to get
     */
    getUserByGoogleId: function (google_id) {
        if (!google_id) {
            throw new Error("getUserByGoogleId called with no id.");
        }
        var location = this.api_location;
        return new Promise(function (resolve, reject) {
            "use strict";
            $.get({
                url: location + "api/users",
                data: {
                    "q": JSON.stringify({
                        filters: [{
                            name: "google_id",
                            op: "equals",
                            val: google_id
                        }]
                    })
                },
                crossDomain: true,
                timeout: 10000
            }).done(function (result) {
                if (result.num_results == 1) {
                    resolve(result.objects[0]);
                } else {
                    resolve(null);
                }
            }).fail(function (reason) {
                if (reason.statusText === "timeout") {
                    reject("The request to contact the database timed out.")
                } else {
                    reject(reason);
                }
            });
        })
    },
    /**
     * Save the given user by posting it to the given api endpoint
     */
    saveUser: function (user) {
        return $.ajax({
            method: 'POST',
            url: this.api_location + "api/users",
            data: JSON.stringify(user),
            success: function (response) {
                "use strict";
                console.log("Saved new user to database.")
            },
            headers: {
                "Content-Type": "application/json"
            }
        });
    },
    /**
     *   Get the article with the given id.
     */
    getArticle: function (article_id) {
        var location = this.api_location;
        return new Promise(function (resolve) {
            $.get(location + "api/articles/" + article_id)
                .done(function (result) {
                    resolve(result);
                }).fail(function (reason) {
                "use strict";
                if (reason.status === 404) {
                    resolve(null);
                }
            });
        });
    },
    saveArticle: function (articleToSave) {
        var api_location = this.api_location;
        this.getArticle(articleToSave.article_data.url.hashCode()).then(function (existing_article) {
            "use strict";
            if (existing_article) {
                return [
                    $.ajax({
                        method: 'PUT',
                        url: api_location + "api/articles/" + articleToSave.id,
                        data: JSON.stringify(articleToSave.article_data),
                        success: function () {
                            "use strict";
                            console.log("Updated article in database.");
                        },
                        error: function (cause) {
                            console.log(cause);
                        },
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }),
                ];
            } else {
                var article = {
                    url: articleToSave.article_data.url,
                    article_source: articleToSave.article_data.source,
                    title: articleToSave.article_data.title,
                    date_published: articleToSave.article_data.date,
                    author: articleToSave.article_data.author,
                    text: articleToSave.article_data.text,
                    partial_record: articleToSave.article_data.partial_record !== undefined ?
                        articleToSave.article_data.partial_record : true
                };
                var readers = Object.keys(articleToSave.article_data.readers);
                return $.ajax({
                    method: 'POST',
                    url: api_location + "api/articles",
                    data: JSON.stringify(article),
                    success: function (response) {
                        "use strict";
                        console.log("Saved new article to database.")
                    },
                    error: function (cause) {
                        console.log(cause);
                    },
                    headers: {
                        "Content-Type": "application/json"
                    }
                });
            }
        })
    }
}