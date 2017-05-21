/**
 * Created by Damie on 5/20/2017.
 */

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
var path = require("path");
var fs = require("fs");
var util = require("util");
var sinon = require("sinon");

var vm = require("vm");

var script = path.join("articles.js");

var context;

beforeEach(function () {
    "use strict";
    context = vm.createContext({
        console: console,
        chrome: {
            runtime: {
                onMessage: {
                    addListener: sinon.stub()
                }
            },
            tabs: {
                onRemoved: {
                    addListener: sinon.stub()
                },
                onCreated: {
                    addListener: sinon.stub()
                },
                onActivated: {
                    addListener: sinon.stub()
                },
                onUpdated: {
                    addListener: sinon.stub()
                }
            }
        },
        reduceUrl: sinon.stub().callsFake(function (url) {
            console.log("Reducing " + url);
            return url;
        }),
        current_user: Promise.resolve({
            id: 1
        }),
        getArticle: sinon.stub().resolves({}),
        getUser: sinon.stub().resolves({id: 1, articles: []}),
        setArticle: sinon.spy(),
        setUser: sinon.spy(),
        writeArticleData: sinon.stub(),
        sources: {
            "test" : {
                url : "abcdef.com",
                testForArticleUrlMatch: function(url){
                    return this.url == url;
                }
            }
        }
    });
})

describe("The articles module", function () {
    it("will keep an article updated from a content script", function (done) {
        "use strict";
        fs.readFile(script, function (err, out) {
            try {
                var message_handler;
                context.chrome.runtime.onMessage.addListener.callsFake(function (callback) {
                    message_handler = callback;
                });
                vm.runInContext(out, context);
                expect(Object.keys(context.current_articles).length).toBe(0);
                expect(Object.keys(context.tab_urls).length).toBe(0);
                message_handler({
                    type: "update_article",
                    message: new context.Article({url: "abcdef.com"}, {dateRead: new Date().getTime()})
                }, {tab: {id: 1, url: "abcdef.com"}}, function () {
                    expect(context.writeArticleData.called).toBeTruthy();
                    expect(Object.keys(context.current_articles).length).toBe(1);
                    expect(Object.keys(context.tab_urls).length).toBe(1);
                    done();
                });
            } catch (err) {
                console.log(err);
            }
        })
    });
    it("will keep an article updated from a non-content script", function (done) {
        "use strict";
        fs.readFile(script, function (err, out) {
            try {
                var message_handler;
                context.chrome.runtime.onMessage.addListener.callsFake(function (callback) {
                    message_handler = callback;
                });
                vm.runInContext(out, context);
                context.last_visited_url = "abcdef.com";
                expect(Object.keys(context.current_articles).length).toBe(0);
                expect(Object.keys(context.tab_urls).length).toBe(0);
                message_handler({
                    type: "update_article",
                    message: new context.Article({url: "abcdef.com"}, {dateRead: new Date().getTime()})
                }, {}, function () {
                    expect(context.writeArticleData.called).toBeTruthy();
                    expect(Object.keys(context.current_articles).length).toBe(1);
                    expect(Object.keys(context.tab_urls).length).toBe(0);
                    done();
                });
            } catch (err) {
                console.log(err);
            }
        })
    });
    it("will respond with an error message if an exception occurs while attempting to write the article data", function (done) {
        "use strict";
        fs.readFile(script, function (err, out) {
            try {
                var message_handler;
                context.chrome.runtime.onMessage.addListener.callsFake(function (callback) {
                    message_handler = callback;
                });
                context.writeArticleData.throws("something");
                vm.runInContext(out, context);
                expect(Object.keys(context.current_articles).length).toBe(0);
                expect(Object.keys(context.tab_urls).length).toBe(0);
                message_handler({
                    type: "update_article",
                    message: new context.Article({url: "abcdef.com"}, {dateRead: new Date().getTime()})
                }, {}, function (response) {
                    console.log("Response received: " + response);
                    expect(Object.keys(context.current_articles).length).toBe(0);
                    expect(Object.keys(context.tab_urls).length).toBe(0);
                    expect(response).toBe("An error occurred while attempting to save the article.");
                    done();
                });
            } catch (err) {
                console.log(err);
            }
        })
    });
    it("will respond to a request for an article from a content script if it's in the cache", function (done) {
        "use strict";
        fs.readFile(script, function (err, out) {
            try {
                var existing_article = {
                    article_data: {url: "abcdef.com", source: "test"},
                    user_metadata: {dateRead: new Date().getTime(), source: "test"}
                };
                var message_handler;
                context.chrome.runtime.onMessage.addListener.callsFake(function (callback) {
                    message_handler = callback;
                });
                vm.runInContext(out, context);
                context.current_articles["abcdef.com"] = Promise.resolve(existing_article);
                context.tab_urls[1] = ["abcdef.com"];
                expect(Object.keys(context.current_articles).length).toBe(1);
                expect(Object.keys(context.tab_urls).length).toBe(1);
                message_handler({
                    type: "getCurrentArticle"
                }, {tab: {id: 1, url: "abcdef.com"}}, function (response) {
                    expect(response).toEqual(existing_article);
                    done();
                });
            } catch (err) {
                console.log(err);
            }
        })
    });
    it("will respond to a request for an article not in the cache after refreshing from firebase", function (done) {
        "use strict";
        fs.readFile(script, function (err, out) {
            try {
                var existing_article = {
                    article_data: {url: "abcdef.com", source: "test"},
                    user_metadata: {dateRead: new Date().getTime(), source: "test"}
                };
                var message_handler;
                context.chrome.runtime.onMessage.addListener.callsFake(function (callback) {
                    message_handler = callback;
                });
                context.getArticle.resolves(existing_article.article_data);
                var user = {
                    articles: {}
                }
                user.articles["abcdef.com".hashCode()] = existing_article.user_metadata;
                context.getUser.resolves(user);
                vm.runInContext(out, context);
                expect(Object.keys(context.current_articles).length).toBe(0);
                expect(Object.keys(context.tab_urls).length).toBe(0);
                message_handler({
                    type: "getCurrentArticle"
                }, {tab: {id: 1, url: "abcdef.com"}}, function (response) {
                    expect(context.getArticle.calledWith("abcdef.com".hashCode())).toBeTruthy();
                    expect(context.getUser.calledWith(1)).toBeTruthy();
                    expect(response).toEqual(existing_article);
                    done();
                });
            } catch (err) {
                console.log(err);
            }
        })
    });
    it("will respond with an empty response to a request from a content script for a url that is not an article", function (done) {
        "use strict";
        fs.readFile(script, function (err, out) {
            try {
                var message_handler;
                context.chrome.runtime.onMessage.addListener.callsFake(function (callback) {
                    message_handler = callback;
                });
                context.getArticle.resolves(null);
                var user = {
                    articles: {}
                }
                context.getUser.resolves(user);
                vm.runInContext(out, context);
                expect(Object.keys(context.current_articles).length).toBe(0);
                expect(Object.keys(context.tab_urls).length).toBe(0);
                message_handler({
                    type: "getCurrentArticle"
                }, {tab: {id: 1, url: "cba.com"}}, function (response) {
                    expect(context.getArticle.calledWith("cba.com".hashCode())).toBeTruthy();
                    expect(context.getUser.calledWith(1)).toBeTruthy();
                    expect(response).toBeFalsy();
                    done();
                });
            } catch (err) {
                console.log(err);
            }
        })
    });
    it("will respond with an empty response to a request from a non-content script for a url that is not an article", function (done) {
        "use strict";
        fs.readFile(script, function (err, out) {
            try {
                var message_handler;
                context.chrome.runtime.onMessage.addListener.callsFake(function (callback) {
                    message_handler = callback;
                });
                context.getArticle.resolves(null);

                var user = {
                    articles: {}
                }
                context.getUser.resolves(user);
                vm.runInContext(out, context);
                context.last_visited_url = "abc.com";
                expect(Object.keys(context.current_articles).length).toBe(0);
                expect(Object.keys(context.tab_urls).length).toBe(0);
                message_handler({
                    type: "getCurrentArticle"
                }, {}, function (response) {
                    expect(context.getArticle.calledWith("abc.com".hashCode())).toBeTruthy();
                    expect(context.getUser.calledWith(1)).toBeTruthy();
                    expect(response).toBeFalsy();
                    done();
                });
            } catch (err) {
                console.log(err);
            }
        })
    });
})
