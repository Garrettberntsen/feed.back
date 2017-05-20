/**
 * Created by Damie on 5/20/2017.
 */
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
        reduceUrl: sinon.stub().returnsArg(0),
        current_user: Promise.resolve({}),
        getArticle: sinon.stub().resolves({}),
        getUser: sinon.stub().resolves({id: 1, articles:[]}),
        setArticle: sinon.spy(),
        setUser: sinon.spy()
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
                    console.log("Response sent")
                    expect(Object.keys(context.current_articles).length).toBe(1);
                    expect(Object.keys(context.tab_urls).length).toBe(1);
                    done();
                });
            } catch (err) {
                console.log(err);
            }
        })
    });
    it("will keep an article updated from a non-content script when lastUpdated is set", function (done) {
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
                    console.log("Response sent")
                    expect(Object.keys(context.current_articles).length).toBe(1);
                    expect(Object.keys(context.tab_urls).length).toBe(0);
                    done();
                });
            } catch (err) {
                console.log(err);
            }
        })
    });
    it("will respond with an error message if an article update from a non-content script fires when last url not set", function (done) {
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
                }, {}, function (response) {
                    console.log("Response sent")
                    expect(Object.keys(context.current_articles).length).toBe(0);
                    expect(Object.keys(context.tab_urls).length).toBe(0);
                    expect(response).toBeDefined();
                    done();
                });
            } catch (err) {
                console.log(err);
            }
        })
    });
})
