/**
 * Created by Damie on 4/17/2017.
 */
//We need to put chromedriver on the path, this means the client environment won't require setting up before hand.
//http://stackoverflow.com/a/27733960/1503554
var webdriver = require("selenium-webdriver");
var chrome = require("selenium-webdriver/chrome");
var path = require("chromedriver").path;
var service = new chrome.ServiceBuilder(path).build();
chrome.setDefaultService(service);

//This will need manual updating, need to modularize sources.
var sources = {
    'washingtonpost': {
        'url': 'washingtonpost.com',
        'author-selector': 'span[itemprop="author"]',
        'author-selector-property': '',
        'date-selector': 'span.pb-timestamp',
        'date-selector-property': 'content',
        'text-selector': 'article[itemprop="articleBody"]',
        'text-selector-property': '',
        'title-selector': 'meta[property="og:title"]',
        'title-selector-property': 'content'
    },
    'nytimes': {
        'url': 'nytimes.com',
        'author-selector': 'meta[name="byl"]',
        'author-selector-property': 'content',
        'date-selector': 'time',
        'date-selector-property': 'content',
        'text-selector': 'p.story-body-text',
        'text-selector-property': '',
        'title-selector': 'h1[itemprop="headline"]',
        'title-selector-property': ''
    },
    'politico': {
        'url': 'politico.com',
        'author-selector': 'dt.credits-author',
        'author-selector-property': '',
        'date-selector': 'time',
        'date-selector-property': '',
        'text-selector': '',
        'text-selector-property': '',
        'title-selector': 'title',
        'title-selector-property': ''
    },
    'wsj': {
        'url': 'wsj.com',
        'author-selector': 'span.name',
        'author-selector-property': '',
        'date-selector': 'meta[itemprop=\'datePublished\']',
        'date-selector-property': 'content',
        'text-selector': '',
        'text-selector-property': '',
        'title-selector': 'meta[name="article.origheadline"]',
        'title-selector-property': 'content'
    },
    'vox': {
        'url': 'vox.com',
        'author-selector': 'meta[name="author"]',
        'author-selector-property': 'content',
        'date-selector': 'time.c-byline__item',
        'date-selector-property': '',
        'text-selector': '',
        'text-selector-property': '',
        'title-selector': 'title',
        'title-selector-property': ''
    },
    'cnn': {
        'url': 'cnn.com',
        'author-selector': 'span.metadata__byline__author',
        'author-selector-property': '',
        'date-selector': 'p.update-time',
        'date-selector-property': '',
        'text-selector': 'section#body-text',
        'text-selector-property': '',
        'title-selector': 'h1.pg-headline',
        'title-selector-property': ''
    },
    'newyorker': {
        'url': 'newyorker.com',
        'author-selector': 'span[itemprop="name"]',
        'author-selector-property': '',
        'date-selector': 'time',
        'date-selector-property': 'content',
        'text-selector': 'div[itemprop="articleBody"]',
        'text-selector-property': '',
        'title-selector': 'h1[itemprop="headline"]',
        'title-selector-property': ''
    },
    'vicemedia': {
        'url': 'vice.com',
        'author-selector': 'a.contributor__link',
        'author-selector-property': '',
        'date-selector': 'div.contributor__content__date',
        'date-selector-property': '',
        'text-selector': 'div.article__body',
        'text-selector-property': '',
        'title-selector': 'h1.article__title',
        'title-selector-property': ''
    },
    'fivethirtyeight': {
        'url': 'fivethirtyeight.com',
        'author-selector': 'a[rel="author"]',
        'author-selector-property': '',
        'date-selector': 'span.datetime',
        'date-selector-property': '',
        'text-selector': 'div.entry-content',
        'text-selector-property': '',
        'title-selector': 'h1.article-title',
        'title-selector-property': ''
    },
    'upworthy': {
        'url': 'upworthy.com',
        'author-selector': 'a.article-authors__profile',
        'author-selector-property': '',
        'date-selector': 'div.article-header__date',
        'date-selector-property': '',
        'text-selector': 'div.layout__story-page--middle',
        'text-selector-property': '',
        'title-selector': 'h1.article-header__title',
        'title-selector-property': ''
    },
    'buzzfeed': {
        'url': 'buzzfeed.com',
        'author-selector': 'a.byline__author',
        'author-selector-property': '',
        'date-selector': 'span.buzz-datetime',
        'date-selector-property': '',
        'text-selector': 'div.buzz',
        'text-selector-property': '',
        'title-selector': 'h1#post-title',
        'title-selector-property': ''
    },
    'theatlantic': {
        'url': 'theatlantic.com',
        'author-selector': 'span[itemprop="author"]',
        'author-selector-property': '',
        'date-selector': 'time[itemprop="datePublished"]',
        'date-selector-property': '',
        'text-selector': 'div.article-body',
        'text-selector-property': '',
        'title-selector': 'h1.hed',
        'title-selector-property': ''
    },
    'mic': {
        'url': 'mic.com',
        'author-selector': 'a.link-author.name',
        'author-selector-property': '',
        'date-selector': 'time[itemprop="datePublished"]',
        'date-selector-property': '',
        'text-selector': 'div#article-body',
        'text-selector-property': '',
        'title-selector': 'h1[itemprop="headline"]',
        'title-selector-property': ''
    },
    'slate': {
        'url': 'slate.com',
        'author-selector': 'a[rel="author"]',
        'author-selector-property': '',
        'date-selector': 'div.pub-date',
        'date-selector-property': '',
        'text-selector': 'div.newbody',
        'text-selector-property': '',
        'title-selector': 'h1.hed',
        'title-selector-property': ''
    },
    'nationalreview': {
        'url': 'nationalreview.com',
        'author-selector': 'span.uppercase',
        'author-selector-property': '',
        'date-selector': 'time[itemprop="datePublished"]',
        'date-selector-property': '',
        'text-selector': 'div[itemprop="articleBody"]',
        'text-selector-property': '',
        'title-selector': 'h1.article-header',
        'title-selector-property': ''
    },
    'bloomberg': {
        'url': 'bloomberg.com',
        'author-selector': 'div.author',
        'author-selector-property': '',
        'date-selector': 'time[itemprop="datePublished"]',
        'date-selector-property': '',
        'text-selector': 'div.body-copy',
        'text-selector-property': '',
        'title-selector': 'h1.lede-text-only__hed',
        'title-selector-property': ''
    },
    'weeklystandard': {
        'url': 'weeklystandard.com',
        'author-selector': 'div[itemprop="author"] a',
        'author-selector-property': '',
        'date-selector': 'span.datetime',
        'date-selector-property': '',
        'text-selector': 'div.body-text',
        'text-selector-property': '',
        'title-selector': 'h1.headline',
        'title-selector-property': ''
    },
    'forbes': {
        'url': 'forbes.com',
        'author-selector': 'p.contrib-byline-author',
        'author-selector-property': '',
        'date-selector': 'time[itemprop="datePublished"]',
        'date-selector-property': '',
        'text-selector': 'div.article-injected-body',
        'text-selector-property': '',
        'title-selector': 'h1.article-headline',
        'title-selector-property': ''
    },
    'washingtontimes': {
        'url': 'washingtontimes.com',
        'author-selector': 'div.article-text a',
        'author-selector-property': '',
        'date-selector': 'span.source', //going to need cleanup function
        'date-selector-property': '',
        'text-selector': 'section#content',
        'text-selector-property': '',
        'title-selector': 'h1.page-headline',
        'title-selector-property': ''
    },
    'foxnews': {
        'url': 'foxnews.com',
        'author-selector': 'div.article-info a',
        'author-selector-property': '',
        'date-selector': 'div.article-info time', //going to need cleanup
        'date-selector-property': '',
        'text-selector': 'div.article-text',
        'text-selector-property': '',
        'title-selector': 'article h1',
        'title-selector-property': ''
    },
    'thehill': {
        'url': 'thehill.com',
        'author-selector': 'span.submitted-by', //going to need cleanup
        'author-selector-property': '',
        'date-selector': 'span.submitted-date',
        'date-selector-property': '',
        'text-selector': 'div.content-wrp',
        'text-selector-property': '',
        'title-selector': 'h1.title',
        'title-selector-property': ''
    },
    'bbc': {
        'url': 'bbc.com',
        'author-selector': 'li.mini-info-list__item a',
        'author-selector-property': '',
        'date-selector': 'div.date',
        'date-selector-property': '',
        'text-selector': 'div.story-body__inner',
        'text-selector-property': '',
        'title-selector': 'h1.story-body__h1',
        'title-selector-property': ''
    },
    'abc': {
        'url': 'abcnews.go.com',
        'author-selector': 'div.author', //going to need clean up
        'author-selector-property': '',
        'date-selector': 'span.timestamp',
        'date-selector-property': '',
        'text-selector': 'div.article-copy',
        'text-selector-property': '',
        'title-selector': 'header.article-header h1',
        'title-selector-property': ''
    },
    'nbc': {
        'url': 'nbcnews.com',
        'author-selector': 'span.byline_author',
        'author-selector-property': '',
        'date-selector': 'time.timestamp_article',
        'date-selector-property': '',
        'text-selector': 'div.article-body',
        'text-selector-property': '',
        'title-selector': 'div.article-hed h1',
        'title-selector-property': ''
    },
    'reuters': {
        'url': 'reuters.com',
        'author-selector': 'span.span.author a',
        'author-selector-property': '',
        'date-selector': 'span.timestamp',
        'date-selector-property': '',
        'text-selector': 'span#article-text',
        'text-selector-property': '',
        'title-selector': 'h1.article-headline',
        'title-selector-property': ''
    },
    'techcrunch': {
        'url': 'techcrunch.com',
        'author-selector': 'a[rel="author"]',
        'author-selector-property': '',
        'date-selector': 'time.timestamp',
        'date-selector-property': '',
        'text-selector': 'div.article-entry',
        'text-selector-property': '',
        'title-selector': 'h1.alpha',
        'title-selector-property': ''
    },
    'breitbartnews': {
        'url': 'breitbart.com',
        'author-selector': 'a.byauthor',
        'author-selector-property': '',
        'date-selector': 'span.bydate',
        'date-selector-property': '',
        'text-selector': 'div.entry-content',
        'text-selector-property': '',
        'title-selector': 'h1[itemprop="headline"]',
        'title-selector-property': ''
    },
    'theblaze': {
        'url': 'theblaze.com',
        'author-selector': 'a.article-author',
        'author-selector-property': '',
        'date-selector': 'time.published',
        'date-selector-property': '',
        'text-selector': 'div.entry-content',
        'text-selector-property': '',
        'title-selector': 'h1.page-title',
        'title-selector-property': ''
    },
    'economist': {
        'url': 'economist.com',
        'author-selector': 'span[itemprop="author"]',
        'author-selector-property': '',
        'date-selector': 'time[itemprop="dateCreated"]',
        'date-selector-property': '',
        'text-selector': 'div[itemprop="description"]',
        'text-selector-property': '',
        'title-selector': 'span.flytitle-and-title__title',
        'title-selector-property': ''
    },
    'TheFederalist': {
        'url': 'thefederalist.com',
        'author-selector': 'a[rel="author"]',
        'author-selector-property': '',
        'date-selector': 'div.byline-standard', //going to need clean up
        'date-selector-property': '',
        'text-selector': 'div.entry-content',
        'text-selector-property': '',
        'title-selector': 'h2.entry-title',
        'title-selector-property': ''
    },
    'TheDailyCaller': {
        'url': 'thedailycaller.com',
        'author-selector': 'div#name',
        'author-selector-property': '',
        'date-selector': 'div.dateline',
        'date-selector-property': '',
        'text-selector': 'div.article-primary',
        'text-selector-property': '',
        'title-selector': 'div#main-article h1',
        'title-selector-property': ''
    },
    'TheWashingtonFreeBeacon': {
        'url': 'freebeacon.com',
        'author-selector': 'span.author a',
        'author-selector-property': '',
        'date-selector': 'time.entry-date',
        'date-selector-property': '',
        'text-selector': 'div.entry-content p',
        'text-selector-property': '',
        'title-selector': 'h1.entry-title',
        'title-selector-property': ''
    },
    'InfoWars': {
        'url': 'infowars.com',
        'author-selector': 'span.author a',
        'author-selector-property': '',
        'date-selector': 'span.date',
        'date-selector-property': '',
        'text-selector': 'div.text article',
        'text-selector-property': '',
        'title-selector': 'h1.entry-title',
        'title-selector-property': ''
    },
    'CBSNews': {
        'url': 'cbsnews.com',
        'author-selector': 'span.source',
        'author-selector-property': '',
        'date-selector': 'span.time',
        'date-selector-property': '',
        'text-selector': 'div[data-page="1"]',
        'text-selector-property': '',
        'title-selector': 'h1.title',
        'title-selector-property': ''
    }
};

var driver = new webdriver.Builder().withCapabilities(webdriver.Capabilities.chrome()).build();

//Get the "resting" percentages for each source.
/*
var restingPercentages = Object.keys(sources).reduce(function (percentages, sourceName) {
    session.url(sources[sourceName].url);
    var contentElement = session.getText(sources[sourceName]["text-selector"]);
    console.log(contentElement);
    var scrollRatio = contentElement.scrollTop / contentElement.scrollHeight;
    percentages[sourceName] = scrollRatio;
    return percentages;
}, {});
*/

//http://engineering.wingify.com/posts/e2e-testing-with-webdriverjs-jasmine/
describe("basic test", function(){
    it("should be on correct page", function(done){
        driver.get("http://www.wingify.com");
        driver.getTitle().then(function(title){
            expect(title).toBe("Wingify");
            done();
        });
    });
});