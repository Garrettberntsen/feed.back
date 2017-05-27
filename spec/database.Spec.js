/**
 * Created by Damie on 5/6/2017.
 */

var path = require("path");
var fs = require("fs");
var util = require("util");
var script = path.join("database.js");
var sinon = require("sinon");

var vm = require("vm");

var firebase_snapshot;
var firebase_ref;
var firebase_database;
var firebase;
var context;
beforeEach(function () {
    firebase_snapshot = {
        exists: sinon.stub().returns(true),
        val: sinon.stub().returns({})
    };
    firebase_ref = {
        once: sinon.stub().resolves(firebase_snapshot),
        set: sinon.stub()
    };
    firebase_database = {
        ref: sinon.stub().returns(firebase_ref)
    };
    firebase = {
        database: sinon.stub().returns(firebase_database),
        initializeApp: sinon.stub(),
        auth: sinon.stub(),
        apps: []
    };

    firebase.auth.GoogleAuthProvider = {
        credential: sinon.stub()
    };
    var firebase_auth = {
        signInWithCredential: sinon.stub()
    };
    firebase.auth.returns(firebase_auth);

    context = vm.createContext({
        console: console,
        firebase: firebase,
        current_user: Promise.resolve({}),
        chrome: {
            runtime: {
                onMessage: {
                    addListener: sinon.stub()
                }
            },
            identity: {
                onSignInChanged: {
                    addListener: sinon.stub()
                },
                getAuthToken: sinon.stub()
            }
        }
    });
});
describe("The database module", function () {
    it("will return a user object for an existing id", function (done) {
        var file = fs.readFile(script, "utf-8", function (err, out) {
            try {
                vm.runInNewContext(out, context);
                expect(context.getUser).toBeDefined();
                context.getUser(123).then(function (user) {
                    expect(user).toBeDefined();
                    done();
                });
            } catch (ex) {
                console.log(ex);
            }
        });
    });
    it("will return a null for a non-existent user id", function (done) {
        firebase_snapshot.val.returns(null);
        var file = fs.readFile(script, "utf-8", function (err, out) {
            try {
                vm.runInNewContext(out, context);
                expect(context.getUser).toBeDefined();
                context.getUser(123).then(function (user) {
                    expect(user).toBeNull();
                    done();
                });
            } catch (ex) {
                console.log(ex);
            }
        });
    });
    it("will save a new given user to the database", function (done) {
        firebase_snapshot.val.returns(null);
        var file = fs.readFile(script, "utf-8", function (err, out) {
            try {
                vm.runInNewContext(out, context);
                expect(context.chrome).toBeDefined();
                expect(context.getUser).toBeDefined();
                context.setUser(123, {}).then(function(){
                    expect(firebase_database.ref.calledWith("users/123")).toBeTruthy();
                    done();
                });
            } catch (ex) {
                console.log(ex);
            }
        });
    });
    it("will return an article object for an existing id", function (done) {
        var file = fs.readFile(script, "utf-8", function (err, out) {
            try {
                vm.runInNewContext(out, context);
                expect(context.getUser).toBeDefined();
                context.getArticle(123).then(function (article) {
                    expect(article).toBeDefined();
                    done();
                });
            } catch (ex) {
                console.log(ex);
            }
        });
    });
    it("will return a null for a non-existent article id", function (done) {
        firebase_snapshot.val.returns(null);
        var file = fs.readFile(script, "utf-8", function (err, out) {
            try {
                vm.runInNewContext(out, context);
                expect(context.getArticle).toBeDefined();
                context.getArticle(123).then(function (article) {
                    expect(article).toBeNull();
                    done();
                });
            } catch (ex) {
                console.log(ex);
            }
        });
    });
    it("will save a new given article to the database", function (done) {
        firebase_snapshot.val.returns(null);
        var file = fs.readFile(script, "utf-8", function (err, out) {
            try {
                vm.runInNewContext(out, context);
                expect(context.chrome).toBeDefined();
                expect(context.getUser).toBeDefined();
                context.setArticle(123, {}).then(function(){
                    expect(firebase_database.ref.calledWith("articles/123")).toBeTruthy();
                    done();
                });
            } catch (ex) {
                console.log(ex);
            }
        });
    });
});