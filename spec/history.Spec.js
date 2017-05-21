/**
 * Created by Damie on 5/20/2017.
 */

var path = require("path");
var fs = require("fs");
var vm = require("vm");
var script = path.join("history.js");
var console = require("console");
var sinon = require("sinon");

function SourceDefinition(definition) {
    this.urls = definition.urls;
    this["article-url-matcher"] = definition["article-url-matcher"];
    this["author-selector"] = definition["author-selector"];
    this["author-selector-property"] = definition["author-selector-property"];
    this["date-selector"] = definition["date-selector"];
    this["date-selector-property"] = definition["date-selector-property"];
    this["text-selector"] = definition["text-selector"];
    this["text-selector-property"] = definition["text-selector-property"];
    this["title-selector"] = definition["title-selector"];
    this["title-selector-property"] = definition["title-selector-property"];
    this["article-root-element-selector"] = definition["article-root-element-selector"];
    //Test the given url against this sources' article matching pattern, returning an object mapping the url element
    //names to their matched values, or false if there was no match.
    this.testForArticleUrlMatch = function (url) {
        return this.urls.find(function (urlDescription) {
            if (Array.isArray(urlDescription["article-url-matcher"])) {
                return urlDescription["article-url-matcher"].reduce(function (current, next) {
                    if (!current) {
                        return urlDescription.urlRoot == url;
                    }
                    return current;
                }.bind(this), false);
            } else {
                return urlDescription.urlRoot == url;
            }
        });
    }
}

var context;
var firebase_snapshot;
var firebase_ref;
var firebase_database;
var firebase;
beforeEach(function () {
    try {
        firebase_snapshot = {
            exists: sinon.stub().returns(true),
            val: sinon.stub().returns({
                analytics_id: 1
            }),
            numChildren: sinon.stub().returns(1)
        };
        firebase_ref = {
            once: sinon.stub().resolves(firebase_snapshot),
            set: sinon.stub()
        };
        firebase_database = {
            ref: sinon.stub().returns(firebase_ref)
        };
        firebase = {
            database: sinon.stub().returns(firebase_database)
        };
        context = vm.createContext({
            chrome: {
                runtime: {
                    onInstalled: {}
                },
                history: {
                    search: sinon.stub().callsArgWith(1, [
                        {
                            id: 1,
                            url: "abc.com"
                        }
                    ])
                }
            },
            analytics: Promise.resolve({}),
            current_user: Promise.resolve({}),
            console: console,
            writeArticleData: sinon.spy(),
            _firebase: Promise.resolve(firebase),
            reduceUrl: sinon.stub().returnsArg(0),
            sources: {
                "test-source": new SourceDefinition({
                    urls: [{
                        urlRoot: "abc.com",
                        'article-url-matcher': {
                            pattern: "",
                            groups: []
                        }
                    }]
                })
            },
            Article: sinon.stub().callsFake(function (data, metadata) {
                "use strict";
                return {
                    article_data: data,
                    user_metadata: metadata
                }
            }),
            ArticleData: sinon.stub().callsFake(function (url) {
                "use strict";
                return {url: url}
            }),
            UserMetadata: sinon.stub().callsFake(function (time, source) {
                "use strict";
                return {
                    dateRead: time,
                    source: source
                }
            })
        });
    } catch (e) {
        console.log("Error in setup");
        console.log(e);
    }
});

describe("The history module", function () {
    "use strict";
    it("will save partial records of articles found in the browser history", function (done) {
        fs.readFile(script, function (err, out) {
            try {
                var install_handler;
                context.chrome.runtime.onInstalled.addListener = sinon.stub().callsFake(function (callback) {
                    install_handler = callback;
                })
                vm.runInContext(out, context);
                install_handler().then(function () {
                    console.log(context.writeArticleData.callCount)
                    expect(context.writeArticleData.calledOnce).toBeTruthy();
                    done();
                });
            } catch (e) {
                console.log(e);
            }
        });
    });
});