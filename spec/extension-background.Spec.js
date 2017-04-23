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
describe("The plugin background script", function () {
    it("gets Google OAuth token and creates new user in firebase for it if it doesn't exist already", function (done) {
        chromeApiMock.identity.getProfileUserInfo.callsArgWith(0, {id: 12345, email: "whatever"});
        chromeApiMock.identity.getAuthToken.callsArg(1, "123456789abcdefg");

        var databaseSnapshotMock = {
            exists: sinon.stub().returns(false)
        };
        var databaseMock = {
            ref: sinon.stub().returns({set: sinon.stub()})
        };
        databaseMock.ref.withArgs("/users/12345").returns({
            once: sinon.stub().resolves(databaseSnapshotMock),
        });
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
            window: {location:{href:"http://forbes.com/somearticle"}}
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
            return databaseMock.ref("/users/12345").once()
        }).then(function () {
            expect(databaseMock.ref.calledWith("/users/12345")).toBeTruthy();
            expect(databaseMock.ref("/users/12345").once.calledWith("value")).toBeTruthy();
            expect(databaseSnapshotMock.exists.called).toBeTruthy();

            //Scrape their history
            expect(chromeApiMock.history.search.called).toBeTruthy();
            return context.extractPageData.returnValue;
        }).then(function () {
            expect(context.extractHistoryItemData.called).toBeTruthy();
            console.log(databaseMock.ref().set.getCall(0).args[0]);
            expect(databaseMock.ref().set.calledWith({
                url: "forbes.com",
                source: "forbes",
                title: "whatever",
                date: "",
                author: "",
                text: "",
                lastRead: now.getTime()
            })).toBeTruthy();
            done();
        });
    });
});