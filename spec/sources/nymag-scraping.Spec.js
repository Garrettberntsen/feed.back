/**
 *
 */
jasmine.getEnv().defaultTimeoutInterval = 10000;
var webdriver = require("selenium-webdriver");
var chrome = require("selenium-webdriver/chrome");
var path = require("chromedriver").path;
var service = new chrome.ServiceBuilder(path).build();
chrome.setDefaultService(service);
var options = new chrome.Options();
var path = require("path");
options.addArguments("load-extension=" + path.resolve(__dirname, "..", "..", "test-dist"));
options.addArguments("user-data-dir=" + path.resolve(require("os").homedir(), "feedback-test-profile"));

var sinon = require("sinon");

var console = require("console");

var test_username = "fb20939@gmail.com"
var test_password = "SecurePassword";

var browser = new webdriver.Builder().setChromeOptions(options).withCapabilities(webdriver.Capabilities.chrome()).build();

var target_url = "http://nymag.com/daily/intelligencer/2017/04/north-korea-blows-up-u-s-capitol-in-propaganda-video.html";
var expected_text = "The North Korean regime’s flair for the dramatic, typically displayed in its over-the-top pronouncements about the merciless punishment it intends to inflict on the U.S. President Trump, may have a history with the WWE, but Kim Jong-un cuts a wrestling promo better than any world leader. Occasionally though, Pyongyang will saber rattle via video, releasing propaganda films that put images to their daydreams of inflicting maximum pain on the U.S. The latest, a two-and-half-minute montage of military parades and missile launches, puts the White House and an aircraft carrier in the crosshairs, and ends with the simulated explosion of the U.S. Capitol. The captions in the video say things such as, “We will show you what a strong country that leads the world in nuclear and missile technology is capable of.” Then it ends with the words: “The final collapse will begin.” Released by state-run media outlet Arirang-Meari, the video comes days after North Korea held its largest-ever artillery drills, according to its neighbor to the south. The drills saw 300 artillery guns firing live ammunition into the sky above the ocean. Held to mark the 85th anniversary of the founding of the Korean People’s Army, the drill is reportedly meant to serve as a reminder of the harm Pyongyang could do to South Korea with conventional weapons."
var expected_title = "North Korea Blows Up U.S. Capitol in Latest Propaganda Video"
var expected_date = "April 27, 2017 5:18 pm";
var expected_author = "Adam K. Raymond";

function haltAndCatchFire(problem) {
    console.log(problem);
}

describe("The webpage scraper", function () {
    it("will correctly scrape the text, title, date and author of an article on nymag.com", function (done) {
        var parentWindow;
        browser.get("chrome://extensions").then(function () {
            return browser.switchTo().frame("extensions")
        }).catch(haltAndCatchFire)
            .then(function (background) {
                return browser.wait(webdriver.until.elementLocated(webdriver.By.css("#fjmjfjkiigcdeiaeofkappkccmcedeeb > div > div.extension-details > div.developer-extras > div.active-views > a")))
            }).catch(haltAndCatchFire)
            .then(function (background) {
                parentWindow = browser.getWindowHandle();
                background.click()
                browser.executeScript(function(){
                    console.log("firebase");
                })
            }).catch(haltAndCatchFire)
            .then(function () {

            })
    });
});