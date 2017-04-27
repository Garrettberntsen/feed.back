/**
 * Created by Damie on 4/18/2017.
 */
//For isolating
var vm = require("vm")
var fs = require("fs");
var sinon = require("sinon");
console = require("console");

var chromeApiMock = {
    identity: {
        //http://sinonjs.org/releases/v2.1.0/stubs/
        getProfileUserInfo: sinon.stub(),
        getAuthToken: sinon.stub()
    },
    runtime: {
        onMessage: {
            addListener: sinon.spy()
        },
        sendMessage: sinon.spy()
    },
    history: {
        search: sinon.stub()
    }
};
var firebaseApiMock = {
    auth: function () {
        return {
            signInWithCredential: sinon.stub().resolves({})
        }
    },
    initializeApp: sinon.spy(),
    database: sinon.stub()
};

firebaseApiMock.auth.GoogleAuthProvider = {
    credential: sinon.spy()
}
var now = new Date();

var articleSnapshotMock = {
    exists: sinon.stub(),
    once: sinon.stub(),
    val: sinon.stub(),
    name: "articleSnapshot"
}
var userSnapshotMock = {
    exists: sinon.stub(),
    once: sinon.stub().resolves(),
    name: "userSnapshot"
};

var userReferenceMock = {
    set: sinon.stub(),
    once: sinon.stub()
        .withArgs(sinon.match("value")).resolves(userSnapshotMock)
}

var articleReferenceMock = {
    set: sinon.stub(),
    once: sinon.stub().withArgs("value").resolves(articleSnapshotMock)
}

var databaseMock = {
    ref: sinon.stub().withArgs(sinon.match(/users\/12345/)).returns(userReferenceMock)
        .withArgs(sinon.match(/articles\/.*/)).returns(articleReferenceMock),
    name: "databaseMock"
};

beforeEach(function () {
    chromeApiMock.identity.getProfileUserInfo.callsArgWith(0, {id: 12345, email: "whatever"});
    chromeApiMock.identity.getAuthToken.callsArg(1, "123456789abcdefg");

    databaseMock.ref.returns(userReferenceMock);
    firebaseApiMock.database.returns(databaseMock);

    firebaseApiMock.auth.GoogleAuthProvider.credential.calledWith(null, "123456789abcdefg");
    chromeApiMock.history.search.callsArgWith(1, [
        {
            id: 1,
            url: "http://www.forbes.com/somearticle",
            title: "whatever",
            lastVisitTime: now.getTime()
        }
    ]);

    var context = vm.createContext({
        chrome: chromeApiMock,
        firebase: firebaseApiMock,
        console: console,
        $: require("jquery")(require("jsdom").jsdom().defaultView),
        window: {location: {href: "http://forbes.com/somearticle"}}
    });
})

afterEach(function(){
    chromeApiMock.identity.getProfileUserInfo.resetHistory()
    chromeApiMock.identity.getAuthToken.resetHistory();
    firebaseApiMock.auth().signInWithCredential.resetHistory()
})

describe("The plugin background script", function () {
    it("gets Google OAuth token and creates new user in firebase for it if it doesn't exist already", function (done) {
        userSnapshotMock.exists.returns(false);
        chromeApiMock.history.search.callsArgWith(1, [
            {
                id: 1,
                url: "http://www.forbes.com/somearticle",
                title: "whatever",
                lastVisitTime: now.getTime()
            }
        ]);

        var context = vm.createContext({
            chrome: chromeApiMock,
            firebase: firebaseApiMock,
            console: console,
            $: require("jquery")(require("jsdom").jsdom().defaultView),
            window: {location: {href: "http://forbes.com/somearticle"}}
        });
        vm.runInContext(fs.readFileSync("background.js"), context);
        context.extractPageData = sinon.spy(context, "extractPageData");
        context.extractHistoryItemData = sinon.spy(context, "extractHistoryItemData");
        firebaseApiMock.auth().signInWithCredential().catch(function (error) {
            this.fail(error);
            return Promise.reject(error);
        }).then(function () {
            //Get Google oauth token and authenticate
            expect(chromeApiMock.identity.getProfileUserInfo.calledOnce).toBeTruthy();
            expect(chromeApiMock.identity.getAuthToken.calledOnce).toBeTruthy();
            expect(firebaseApiMock.auth().signInWithCredential.calledOnce);

            //Check if firebase user exists
            expect(firebaseApiMock.database.called).toBeTruthy();
            expect(firebaseApiMock.auth.GoogleAuthProvider.credential.called).toBeTruthy();
            expect(databaseMock.ref("/users/12345").once).toBeTruthy()
            return databaseMock.ref("/users/12345").once()
        }).then(function () {
            expect(databaseMock.ref.calledWith("/users/12345")).toBeTruthy();
            expect(databaseMock.ref("/users/12345").once).toBeTruthy();
            expect(databaseMock.ref("/users/12345").once.calledWith("value")).toBeTruthy();
            expect(userSnapshotMock.exists.returned(false)).toBeTruthy();

            //Scrape their history
            expect(chromeApiMock.history.search.called).toBeTruthy();
            return context.extractPageData.returnValue;
        }).then(function () {
            expect(context.extractHistoryItemData.called).toBeTruthy();
            expect(databaseMock.ref("articles/").set.calledWith({
                url: "forbes.com",
                source: "forbes",
                title: "whatever",
                date: "",
                author: "",
                text: "",
                lastRead: now.getTime(),
                partial: true
            })).toBeTruthy();
            expect(databaseMock.ref("articles/random/readers/").set.calledWith(true)).toBeTruthy();
            expect(databaseMock.ref("users/12345/articles/random/source").set.calledWith("forbes")).toBeTruthy();
            expect(databaseMock.ref("users/12345/articles/random/read").set.calledWith(now.getTime())).toBeTruthy();
            expect(databaseMock.ref("users/12345/email").set.calledWith("whatever")).toBeTruthy();
            done();
        });
    });
    it("will not replace existing entries from history", function (done) {
        userSnapshotMock.exists.returns(false);
        articleSnapshotMock.val.returns({partial:true});
        chromeApiMock.history.search.callsArgWith(1, [
            {
                id: 1,
                url: "http://www.forbes.com/somearticle",
                title: "whatever",
                lastVisitTime: now.getTime()
            }
        ]);

        var context = vm.createContext({
            chrome: chromeApiMock,
            firebase: firebaseApiMock,
            console: console,
            $: require("jquery")(require("jsdom").jsdom().defaultView),
            window: {location: {href: "http://forbes.com/somearticle"}}
        });
        vm.runInContext(fs.readFileSync("background.js"), context);
        context.extractPageData = sinon.spy(context, "extractPageData");
        context.extractHistoryItemData = sinon.spy(context, "extractHistoryItemData");
        firebaseApiMock.auth().signInWithCredential().catch(function (error) {
            this.fail(error);
            return Promise.reject(error);
        }).then(function () {
            //Get Google oauth token and authenticate
            expect(chromeApiMock.identity.getProfileUserInfo.calledOnce).toBeTruthy();
            expect(chromeApiMock.identity.getAuthToken.calledOnce).toBeTruthy();
            expect(firebaseApiMock.auth().signInWithCredential.calledOnce);

            //Check if firebase user exists
            expect(firebaseApiMock.database.called).toBeTruthy();
            expect(firebaseApiMock.auth.GoogleAuthProvider.credential.called).toBeTruthy();
            expect(databaseMock.ref("/users/12345").once).toBeTruthy()
            return databaseMock.ref("/users/12345").once()
        }).then(function () {
            expect(databaseMock.ref.calledWith("/users/12345")).toBeTruthy();
            expect(databaseMock.ref("/users/12345").once).toBeTruthy();
            expect(databaseMock.ref("/users/12345").once.calledWith("value")).toBeTruthy();
            expect(userSnapshotMock.exists.returned(false)).toBeTruthy();

            //Scrape their history
            expect(chromeApiMock.history.search.called).toBeTruthy();
            return context.extractPageData.returnValue;
        }).then(function () {
            expect(context.extractHistoryItemData.called).toBeTruthy();
            //TODO: Fragile, figure out how to retrieve the generated ids used to pass to firebase to validate args properly
            expect(databaseMock.ref("articles/random").set.getCall(0).calledWith({
                url: "forbes.com",
                source: "forbes",
                title: "whatever",
                date: "",
                author: "",
                text: "",
                lastRead: now.getTime()
            })).toBeFalsy();
            expect(databaseMock.ref("articles/random/readers/").set.calledWith(true)).toBeTruthy();
            expect(databaseMock.ref("users/12345/articles/random/source").set.calledWith("forbes")).toBeTruthy();
            expect(databaseMock.ref("users/12345/articles/random/read").set.calledWith(now.getTime())).toBeTruthy();
            expect(databaseMock.ref("users/12345/email").set.calledWith("whatever")).toBeTruthy();
            done();
        });
    })
});