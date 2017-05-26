/**
 * Created by Damie on 5/18/2017.
 */

var path = require("path");
var fs = require("fs");
var util = require("util");
var script = path.join("analytics.js");
var console = require("console");
var sinon = require("sinon");

var vm = require("vm");

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
                    onMessage: {
                        addListener: sinon.stub()
                    }
                },
                tabs: {
                    onUpdated: {
                        addListener: sinon.stub()
                    },
                    onRemoved: {
                        addListener: sinon.stub()
                    },
                    onCreated: {
                        addListener: sinon.stub()
                    }
                },
                identity: {
                    getProfileUserInfo: sinon.stub().callsArgWith(0, {})
                }
            },
            analytics: Promise.resolve({}),
            current_user: Promise.resolve({}),
            _firebase: Promise.resolve(firebase),
            console: console,
            ga: (function () {
                var stub = sinon.stub();
                stub.withArgs(sinon.match.func).callsArg(0);
                //Correct invocations
                stub.withArgs(sinon.match(function (arg) {
                    "use strict";
                    return ["create", "set"].indexOf(arg) !== -1;
                }, "Incorrect action"), sinon.match.string);
                stub.withArgs(sinon.match("send"), sinon.match({
                    hitType: sinon.match("event"),
                    eventCategory: sinon.match.string,
                    eventAction: sinon.match.string
                }));
                //Bad invocation
                stub.withArgs(sinon.match("send"), sinon.match(function (arg) {
                    "use strict";
                    return !(arg.hasOwnProperty("hitType") &&
                    arg.hasOwnProperty("eventCategory") &&
                    arg.hasOwnProperty("eventAction"));
                })).throws("Event definition error.");
                return stub;
            }()),
            window: {},
            document: {
                createElement: sinon.stub().returns({}),
                getElementsByTagName: sinon.stub().returns([{
                    parentNode: {
                        insertBefore: sinon.spy()
                    }
                }])
            }
        });
    } catch (e) {
        console.log("Error in setup");
        console.log(e);
    }
});

describe("The analytics", function () {
    "use strict";
    it("can send analytics messages for events", function (done) {
        fs.readFile(script, "utf-8", function (err, out) {
            try {
                vm.runInContext(out, context);
                context.triggerGoogleAnalyticsEvent({
                    hitType: "event",
                    eventCategory: "category",
                    eventAction: "action"
                }).then(function () {
                    expect(context.ga.calledWith("send", {
                        hitType: "event",
                        eventCategory: "category",
                        eventAction: "action"
                    })).toBeTruthy();
                    done();
                });
            } catch (error) {
                console.log("error in test method");
                console.log(error);
            }
        })
    });
    it("will reject malformed events missing the hitType", function (done) {
        fs.readFile(script, "utf-8", function (err, out) {
            try {
                vm.runInContext(out, context);
                context.triggerGoogleAnalyticsEvent({
                    eventCategory: "category",
                    eventAction: "action"
                }).then(function (response) {
                }, function (reason) {
                    expect(context.ga.threw).toBeTruthy();
                    done();
                });
            } catch (error) {
                console.log("error in test method");
                console.log(error);
            }
        })
    });
    it("will reject malformed events missing the eventCategory", function (done) {
        fs.readFile(script, "utf-8", function (err, out) {
            try {
                vm.runInContext(out, context);
                context.triggerGoogleAnalyticsEvent({
                    hitType: "event",
                    eventAction: "action"
                }).then(function (response) {
                }, function (reason) {
                    expect(context.ga.threw).toBeTruthy();
                    done();
                });
            } catch (error) {
                console.log("error in test method");
                console.log(error);
            }
        })
    });
    it("will reject malformed events missing the eventAction", function (done) {
        fs.readFile(script, "utf-8", function (err, out) {
            try {
                vm.runInContext(out, context);
                context.triggerGoogleAnalyticsEvent({
                    eventCategory: "category",
                    hitType: "event"
                }).then(function () {
                }, function (response) {
                    expect(context.ga.threw).toBeTruthy();
                    done();
                });
            } catch (error) {
                console.log("error in test method");
                console.log(error);
            }
        })
    });
    it("will handle 'analytics' messages", function (done) {
        fs.readFile(script, "utf-8", function (err, out) {
            try {
                var message_handler;
                context.chrome.runtime.onMessage.addListener = sinon.stub().callsFake(function (callback) {
                    message_handler = callback;
                });
                var response_sender = sinon.stub().callsFake(function (response) {
                    console.log("Response sent");
                    expect(context.ga.called).toBeTruthy();
                    done();
                });
                vm.runInContext(out, context);
                message_handler({
                        type: "analytics", message: {
                            hitType: "event",
                            eventAction: "action",
                            eventCategory: "category"
                        }
                    }, null, response_sender
                );
            } catch (error) {
                console.log("error in test method");
                console.log(error);
            }
        })
    });
    it("will handle 'analytics' messages by sending an error response for malformed requests", function (done) {
        fs.readFile(script, "utf-8", function (err, out) {
            try {
                var message_handler;
                context.chrome.runtime.onMessage.addListener = sinon.stub().callsFake(function (callback) {
                    message_handler = callback;
                });
                var response_sender = sinon.stub().callsFake(function (response) {
                    expect(context.ga.threw).toBeTruthy();
                    done();
                });
                vm.runInContext(out, context);
                message_handler({
                    type: "analytics", message: {}
                }, null, response_sender);
            } catch (error) {
                console.log("error in test method");
                console.log(error);
            }
        })
    });
})