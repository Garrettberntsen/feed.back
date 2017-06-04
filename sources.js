/**
 * This module contains the definitions for news sources.
 *
 * This module responds to the given messages:
 * - type: getSources
 *      - message: none
 *      - response: the source definitions object
 * Created by Damie on 5/2/2017.
 */

function testSingleUrlMatcher(matcher, urlRoot, url) {
    var matcher_pattern = matcher.pattern.replace(new RegExp("\{.*?\}", "g"), "(.*)");
    var regexString = matcher_pattern ? urlRoot + "/" + matcher_pattern : urlRoot;
    var regex = new RegExp(regexString).exec(url);
    if (regex) {
        var groupNames = matcher.groups;
        var result = {};
        for (var i = 0; i < groupNames.length; i++) {
            result[groupNames[i]] = regex[i + 1];
        }
        return result;
    }
    return false;
}

function SourceDefinition(definition) {
    this.urls = definition.urls;
    this["categorization"] = definition["categorization"];
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
                        return testSingleUrlMatcher(next, urlDescription.urlRoot, url);
                    }
                    return current;
                }.bind(this), false);
            } else {
                return testSingleUrlMatcher(urlDescription["article-url-matcher"], urlDescription.urlRoot, url);
            }
        });
    }
}

var sources = {
    'tutorial': new SourceDefinition({
        'urls': [{
            urlRoot: ".*?/tutorial/tutorial-page.html",
            'article-url-matcher': {
                pattern: "",
                groups: []
            }
        }],
        'author-selector': 'span.author',
        'author-selector-property': '',
        'date-selector': '',
        'date-selector-property': '',
        'text-selector': '',
        'text-selector-property': '',
        'title-selector': 'title',
        'title-selector-property': ''
    }),
    'washingtonpost': new SourceDefinition({
        'urls': [{
            urlRoot: 'washingtonpost.com',
            'article-url-matcher': {
                pattern: "{type}/{category}/{subcategory}/{title}/{year}/{month}/{day}",
                groups: ["type", "category", "subcategory", "title", "year", "month", "day"]
            }
        }, {
            urlRoot: 'washingtonpost.com',
            'article-url-matcher': {
                pattern: "{category}/{subcategory}/{title}/{year}/{month}/{day}",
                groups: ["category", "subcategory", "title", "year", "month", "day"]
            }
        },
            {
                urlRoot: 'washingtonpost.com',
                'article-url-matcher': {
                    pattern: "powerpost/{year}/{month}/{day}/{id}_story",
                    groups: ["title", "year", "month", "day", "id"]
                }
            }],
        'categorization': {
            type: 'url',
            matcher: {
                url_element: ["type", "category"],
                mappings: {
                    "lifestyle": "Arts",
                    "business": "Business",
                    "food": "Culture",
                    "local" : "Local",
                    "capital-weather-gang":" Local",
                    "animalia" : "US News",
                    "national" : "US News",
                    "world" : "World"
                }
            }
        },
        'author-selector': 'div.pb-sig-line > span.pb-byline > a > span[itemprop="name"]',
        'author-selector-property': '',
        'date-selector': 'span.pb-timestamp',
        'date-selector-property': 'content',
        'text-selector': 'article > p',
        'text-selector-property': '',
        'title-selector': 'meta[property="og:title"]',
        'title-selector-property': 'content'
    }),
    'nytimes': new SourceDefinition({
        'urls': [{
            urlRoot: 'nytimes.com',
            'article-url-matcher': {
                pattern: "{year}/{month}/{day}/{category}/{subcategory}/{title}.html",
                groups: ["year", "month", "day", "location", "category", "title"]
            }
        },
            {
                urlRoot: 'nytimes.com',
                'article-url-matcher': {
                    pattern: "{year}/{month}/{day}/{category}/{title}.html",
                    groups: ["year", "month", "day", "category", "title"]
                }
            },
            {
                urlRoot: 'nytimes.com',
                'article-url-matcher': {
                    pattern: "interactive/{year}/{month}/{day}/{category}/{title}.html",
                    groups: ["year", "month", "day", "category", "title"]
                }
            }],
        'categorization': {
            type: 'url',
            matcher: {
                url_element: ["category", "subcategory"],
                mappings: {
                    "business": "Business",
                    "realestate": "Business",
                    "your-money": "Business",
                    "fashion": "Culture",
                    "books": "Culture",
                    "arts": "Culture",
                    "well" : "Health",
                    "opinion" : "Opinion",
                    "politics" : "Politics",
                    "sports" : "Sports",
                    "world" : "World"
                }
            }
        },
        'author-selector': 'meta[name="byl"]',
        'author-selector-property': 'content',
        'date-selector': 'time',
        'date-selector-property': 'content',
        'text-selector': 'article#story',
        'text-selector-property': '',
        'title-selector': 'h1#headline',
        'title-selector-property': ''
    }),
    'politico': new SourceDefinition({
        'urls': [{
            urlRoot: 'politico.com',
            'article-url-matcher': {
                pattern: "story/{year}/{month}/{day}/{title}-{id}",
                groups: ["year", "month", "day", "title", "id"]
            }
        }],
        'author-selector': 'dt.credits-author',
        'author-selector-property': '',
        'date-selector': 'time',
        'date-selector-property': '',
        'text-selector': 'div.content-group.story-core',
        'text-selector-property': '',
        'title-selector': 'title',
        'title-selector-property': ''
    }),
    'wsj': new SourceDefinition({
        'urls': [{
            urlRoot: 'wsj.com',
            'article-url-matcher': {
                pattern: "articles/{title}-{id}",
                groups: ["title", "id"]
            }
        }],
        'author-selector': 'div.byline > div.author > span',
        'author-selector-property': '',
        'date-selector': 'meta[itemprop=\'datePublished\']',
        'date-selector-property': 'content',
        'text-selector': 'div#wsj-article-wrap > p',
        'text-selector-property': '',
        'title-selector': 'meta[name="article.origheadline"]',
        'title-selector-property': 'content'
    }),
    'vox': new SourceDefinition({
        'urls': [{
            urlRoot: 'vox.com',
            'article-url-matcher': {
                pattern: "{category}/{year}/{month}/{day}/{id}/{title}",
                groups: ["category", "year", "month", "day", "title", "id", "title"]
            }
        }],
        'categorization' : {
            type: 'url',
            matcher: {
                "science-and-health" : "Health",
                "world" : "World"
            }
        },
        'author-selector': 'meta[property="author"]',
        'author-selector-property': 'content',
        'date-selector': 'time.c-byline__item',
        'date-selector-property': '',
        'text-selector': 'div.c-entry-content',
        'text-selector-property': '',
        'title-selector': 'title',
        'title-selector-property': ''
    }),
    'cnn': new SourceDefinition({
        'urls': [{
            urlRoot: 'cnn.com',
            'article-url-matcher': {
                pattern: "{year}/{month}/{day}/{category}/{title}/index.html",
                groups: ["year", "month", "day", "category", "title "]
            }
        },
            {
                urlRoot: 'cnn.com',
                'article-url-matcher': {
                    pattern: "{year}/{month}/{day}/news/{category}/{title}/index.html",
                    groups: ["year", "month", "day", "category", "title "]
                }
            }],
        'categorization': {
            type: "url",
            matcher: {
                url_element: "category",
                mappings: {
                    "economy": "Business",
                    "architecture": "Culture",
                    "travel": "Culture",
                    "entertainment": "Entertainment",
                    "celebrities": "Entertainment",
                    "health" : "Health",
                    "media" : "Media",
                    "opinion" : "Opinion",
                    "opinions" : "Opinion",
                    "politics" : "Politics",
                    "sport" : "Sports",
                    "technology" : "Technology",
                    "us":"US News",
                    "middleeast" : "World",
                    "europe" : "World"
                }
            }
        },
        'author-selector': 'span.metadata__byline__author',
        'author-selector-property': '',
        'date-selector': 'p.update-time',
        'date-selector-property': '',
        'text-selector': 'section#body-text',
        'text-selector-property': '',
        'title-selector': 'h1.pg-headline',
        'title-selector-property': ''
    }),
    'newyorker': new SourceDefinition({
        'urls': [{
            urlRoot: 'newyorker.com',
            'article-url-matcher': {
                pattern: "{type}/{year}/{month}/{day}/{title}",
                groups: ["type", "year", "month", "day", "title"]
            }
        },
            {
                urlRoot: 'newyorker.com',
                'article-url-matcher': {
                    pattern: "{category}/{subcategory}/{title}",
                    groups: ["category", "subcategory", "title"]
                }
            }],
        'categorization': {
            type: "url",
            matcher: {
                url_element: "category",
                matcher: {
                    "culture": "Culture",
                    "humor" : "Humor"
                }
            }
        },
        'author-selector': 'span[itemprop="name"]',
        'author-selector-property': '',
        'date-selector': 'time',
        'date-selector-property': 'content',
        'text-selector': 'div[itemprop="articleBody"]',
        'text-selector-property': '',
        'title-selector': 'h1[itemprop="headline"]',
        'title-selector-property': ''
    }),
    'vicemedia': new SourceDefinition({
        'urls': [{
            urlRoot: 'vice.com',
            'article-url-matcher': {
                pattern: "{locale}/article/{title}",
                groups: ["locale", "title"]
            }
        }],
        'author-selector': 'li.contributor__name > a.contributor__link',
        'author-selector-property': '',
        'date-selector': 'div.contributor__content__date',
        'date-selector-property': '',
        'text-selector': 'div.article__body',
        'text-selector-property': '',
        'title-selector': 'div.article__title',
        'title-selector-property': ''
    }),
    'fivethirtyeight': new SourceDefinition({
        'urls': [{
            urlRoot: 'fivethirtyeight.com',
            'article-url-matcher': {
                pattern: "features/{title}/",
                groups: ["title"]
            }
        }],
        'author-selector': 'a[rel="author"]',
        'author-selector-property': '',
        'date-selector': 'span.datetime',
        'date-selector-property': '',
        'text-selector': 'div.entry-content',
        'text-selector-property': '',
        'title-selector': 'h1.article-title',
        'title-selector-property': ''
    }),
    'upworthy': new SourceDefinition({
        'urls': [{
            urlRoot: 'upworthy.com',
            'article-url-matcher': {
                pattern: "{title}",
                groups: ["title"]
            }
        }],
        'author-selector': 'a.article-authors__profile',
        'author-selector-property': '',
        'date-selector': 'div.article-header__date',
        'date-selector-property': '',
        'text-selector': 'div.layout__story-page--middle',
        'text-selector-property': '',
        'title-selector': 'h1.article-header__title',
        'title-selector-property': ''
    }),
    'buzzfeed': new SourceDefinition({
        'urls': [{
            urlRoot: 'buzzfeed.com',
            'article-url-matcher': {
                pattern: "{author}/{title}",
                groups: ["author", "title"]
            }
        }],
        'author-selector': 'div.byline.vignette > div > a',
        'author-selector-property': '',
        'date-selector': 'time.buzz-timestamp__time',
        'date-selector-property': '',
        'text-selector': 'div.subbuzz',
        'text-selector-property': '',
        'title-selector': 'h1.buzz-title',
        'title-selector-property': ''
    }),
    'theatlantic': new SourceDefinition({
        'urls': [{
            urlRoot: 'theatlantic.com',
            'article-url-matcher': {
                pattern: "{category}/archive/{year}/{month}/{title}/{id}/",
                groups: ["category", "year", "month", "title", "id"]
            }
        }],
        'categoriztion': {
            type: 'url',
            matcher: {
                url_element: "category",
                mappings: {
                    "business": "Business",
                    "entertainment": "Entertainment",
                    "health" : "Health",
                    "politics" : "Politics",
                    "international" : "World"
                }
            }
        },
        'author-selector': 'div.article-cover-extra > ul.metadata > li.byline > span[itemprop="author"] > a > span[itemprop="name"]',
        'author-selector-property': '',
        'date-selector': 'time[itemprop="datePublished"]',
        'date-selector-property': '',
        'text-selector': 'div.article-body',
        'text-selector-property': '',
        'title-selector': 'h1.hed',
        'title-selector-property': ''
    }),
    'mic': new SourceDefinition({
        'urls': [{
            urlRoot: 'mic.com',
            'article-url-matcher': {
                pattern: "articles/{id}/{title}",
                groups: ["id", "title"]
            }
        }],
        'author-selector': 'a.link-author.name',
        'author-selector-property': '',
        'date-selector': 'time[itemprop="datePublished"]',
        'date-selector-property': '',
        'text-selector': 'div#article-body',
        'text-selector-property': '',
        'title-selector': 'h1[itemprop="headline"]',
        'title-selector-property': ''
    }),
    'slate': new SourceDefinition({
        'urls': [{
            urlRoot: 'slate.com',
            'article-url-matcher': [{
                pattern: "blogs/{category}/{subcategory}/{year}/{month}/{title}.html",
                groups: ["category", "subcategory", "year", "month", "title"]
            },
                {
                    pattern: "articles/{category}/{subcategory}/{year}/{month}/{title}.html",
                    groups: ["category", "subcategory", "year", "month", "title"]
                }]
        }],
        'categorization': {
            type: "url",
            matcher: {
                url_element: "category",
                mappings: {
                    "business": "Business",
                    "moneybox": "Business",
                    "arts": "Culture",
                    "health_and_science" : "Health",
                    "news_and_politics" : "Politics"
                }
            }
        },
        'author-selector': 'div#main_byline > a',
        'author-selector-property': '',
        'date-selector': 'div.pub-date',
        'date-selector-property': '',
        'text-selector': 'div.newbody',
        'text-selector-property': '',
        'title-selector': 'h1.hed',
        'title-selector-property': ''
    }),
    'nationalreview': new SourceDefinition({
        'urls': [{
            urlRoot: 'nationalreview.com',
            'article-url-matcher': {
                pattern: "article/{id}/{title}",
                groups: ["year", "id", "title"]
            }
        }],
        'author-selector': 'span.uppercase',
        'author-selector-property': '',
        'date-selector': 'time[itemprop="datePublished"]',
        'date-selector-property': '',
        'text-selector': 'div[itemprop="articleBody"]',
        'text-selector-property': '',
        'title-selector': 'h1.article-header',
        'title-selector-property': ''
    }),
    'bloomberg': new SourceDefinition({
        'urls': [{
            urlRoot: 'bloomberg.com',
            'article-url-matcher': [
                {
                    pattern: "{category}/articles/{year}-{month}-{day}/{title}",
                    groups: ["{category}","year", "month", "day", "title"]
                }]
        }],
        "categorization" : {
            type: "url",
            matcher: {
                url_element: "category",
                mappings: {
                    "politics" : "Politics"
                }
            }
        },
        'author-selector': 'address.lede-text-only__byline > div.author',
        'author-selector-property': '',
        'date-selector': 'time[itemprop="datePublished"]',
        'date-selector-property': '',
        'text-selector': 'div.body-copy',
        'text-selector-property': '',
        'title-selector': 'h1.lede-text-only__hed',
        'title-selector-property': ''
    }),
    'weeklystandard': new SourceDefinition({
        'urls': [{
            urlRoot: 'weeklystandard.com',
            'article-url-matcher': {
                pattern: "{title}/article/{id}",
                groups: ["title", "id"]
            }
        }],
        'author-selector': 'div[itemprop="author"] a',
        'author-selector-property': '',
        'date-selector': 'span.datetime',
        'date-selector-property': '',
        'text-selector': 'div.body-text',
        'text-selector-property': '',
        'title-selector': 'div.headline > h1',
        'title-selector-property': ''
    }),
    'forbes': new SourceDefinition({
        'urls': [{
            urlRoot: 'forbes.com',
            'article-url-matcher': {
                pattern: "sites/{author}/{year}/{month}/{day}/{title}/",
                groups: ["author", "year", "month", "day", "title"]
            }
        }],
        'categorization': {
            type: 'url',
            matcher: {
                url_element: "author",
                mappings: {
                    "bizblog": "Business"
                }
            }
        },
        'article-root-element-selector': 'article.main-article:not(article#article-container-spinner) > div > div.main-article-padding',
        'author-selector': 'p.contrib-byline-author > a',
        'author-selector-property': '',
        'date-selector': 'time[itemprop="datePublished"]',
        'date-selector-property': '',
        'text-selector': 'div.article-text.clearfix > div',
        'text-selector-property': '',
        'title-selector': 'h1.article-headline',
        'title-selector-property': ''
    }),
    'washingtontimes': new SourceDefinition({
        'urls': [{
            urlRoot: 'washingtontimes.com',
            'article-url-matcher': {
                pattern: "news/{year}/{month}/{day}/{title}",
                groups: ["year", "month", "day", "title"]
            }
        }],
        'author-selector': 'div.meta > span.byline > a',
        'author-selector-property': '',
        'date-selector': 'span.source', //going to need cleanup function
        'date-selector-property': '',
        'text-selector': 'div.storyareawrapper > div.bigtext > p',
        'text-selector-property': '',
        'title-selector': 'h1.page-headline',
        'title-selector-property': ''
    }),
    'foxnews': new SourceDefinition({
        'urls': [{
            urlRoot: 'foxnews.com',
            'article-url-matcher': {
                pattern: "{category}/{year}/{month}/{day}/{title}.html",
                groups: ["category", "year", "month", "day", "title"]
            }
        }],
        "categorization": {
            type: "url",
            matcher: {
                url_element: "category",
                mappings: {
                    "entertainment": "Entertainment",
                    "health" : "Health",
                    "opinion" : "Opinion",
                    "politics" : "Politics",
                    "us" : "US News",
                    "world" : "World"
                }
            }
        },
        'author-selector': 'div.byline > span.author > a',
        'author-selector-property': '',
        'date-selector': 'div.article-info time', //going to need cleanup
        'date-selector-property': '',
        'text-selector': 'div.article-text',
        'text-selector-property': '',
        'title-selector': 'article h1',
        'title-selector-property': ''
    }),
    'thehill': new SourceDefinition({
        'urls': [{
            urlRoot: 'thehill.com',
            'article-url-matcher': {
                pattern: "{area}/{category}/{id}-{title}",
                groups: ["area", "category", "id", "title"]
            }
        }],
        'categorization': {
            type: url,
            matcher: {
                url_element: "category",
                mappings: {
                    "finance": "Business",
                    "50-most-beautiful": "Entertainment",
                    "healthcare" : "Health",
                    "defence" : "Politics",
                    "national-security" : "Politics",
                    "international" : "World"
                }
            }
        },
        'author-selector': 'span.submitted-by', //going to need cleanup
        'author-selector-property': '',
        'date-selector': 'span.submitted-date',
        'date-selector-property': '',
        'text-selector': 'div.content-wrp',
        'text-selector-property': '',
        'title-selector': 'h1.title',
        'title-selector-property': ''
    }),
    'bbc': new SourceDefinition({
        'urls': [{
            urlRoot: 'bbc.com',
            'article-url-matcher': {
                pattern: "news/{region}-{category}-{id}",
                groups: ["region", "category", "id"]
            }
        }],
        "categorization" : {
            type: "url",
            matcher: {
                url_element: "region",
                mappings: {
                    "world" : "World"
                }
            }
        },
        'author-selector': 'li.mini-info-list__item a',
        'author-selector-property': '',
        'date-selector': 'div.date',
        'date-selector-property': '',
        'text-selector': 'div.story-body__inner',
        'text-selector-property': '',
        'title-selector': 'h1.story-body__h1',
        'title-selector-property': ''
    }),
    'abc': new SourceDefinition({
        'urls': [{
            urlRoot: 'abcnews.go.com',
            'article-url-matcher': [{
                pattern: "{category}/wireStory/{title}-{id}$",
                groups: ["category", "title", "id"]
            }, {
                pattern: "{category}/{title}/story",
                groups: ["area", "category", "id", "title"]
            },
                {
                    pattern: "{category}/{subcategory}/{title}/story",
                    groups: ["area", "category", "subcategory", "id", "title"]
                }]
        }],
        "categorization": {
            type: "url",
            matcher: {
                url_element: "category",
                mappings: {
                    "Entertainment": "Entertainment",
                    "Health" : "Health",
                    "Politics" : "Politics",
                    "Technology" : "Technology",
                    "US": "US News",

                }
            }
        },
        'author-selector': 'div.article-meta > ul > div.author', //going to need clean up
        'author-selector-property': '',
        'date-selector': 'span.timestamp',
        'date-selector-property': '',
        'text-selector': 'div.article-copy',
        'text-selector-property': '',
        'title-selector': 'header.article-header h1',
        'title-selector-property': ''
    }),
    'nbc': new SourceDefinition({
        'urls': [{
            urlRoot: 'nbcnews.com',
            'article-url-matcher': {
                pattern: "{category}/{subcategory}/{title}-{id}",
                groups: ["category", "subcategory", "title", "id"]
            }
        }],
        'categorization': {
            type: "url",
            matcher: {
                url_element: ["subcategory", "category"],
                mappings: {
                    "careers": "Business",
                    "health" : "Health",
                    "politics" : "Politics",
                    "us-news" : "US News",
                    "world" : "World"
                }
            }
        },
        'author-selector': 'span.byline_author',
        'author-selector-property': '',
        'date-selector': 'time.timestamp_article',
        'date-selector-property': '',
        'text-selector': 'div.article-body',
        'text-selector-property': '',
        'title-selector': 'div.article-hed h1',
        'title-selector-property': ''
    }),
    'reuters': new SourceDefinition({
        'urls': [{
            urlRoot: 'reuters.com',
            'article-url-matcher': {
                pattern: "article/.*?id{id}",
                groups: ["id"]
            }
        }, {
            urlRoot: 'reuters.com',
            'article-url-matcher': {
                pattern: "article/us-{region}-{subject}-.*?id{id}",
                groups: ["region", "subject","id"]
            }
        }],
        'author-selector': '#article-byline > span.author > a',
        'author-selector-property': '',
        'date-selector': 'span.timestamp',
        'date-selector-property': '',
        'text-selector': 'span#article-text',
        'text-selector-property': '',
        'title-selector': 'h1.article-headline',
        'title-selector-property': ''
    }),
    'techcrunch': new SourceDefinition({
        'urls': [{
            urlRoot: 'techcrunch.com',
            'article-url-matcher': {
                pattern: "{year}/{month}/{date}/{title}/",
                groups: ["year", "month", "date", "title"]
            }
        }],
        'author-selector': 'a[rel="author"]',
        'author-selector-property': '',
        'date-selector': 'time.timestamp',
        'date-selector-property': '',
        'text-selector': 'div.article-entry',
        'text-selector-property': '',
        'title-selector': 'h1.alpha',
        'title-selector-property': ''
    }),
    'breitbartnews': new SourceDefinition({
        'urls': [{
            urlRoot: 'breitbart.com',
            'article-url-matcher': {
                pattern: "{category}/{year}/{month}/{day}/{title}",
                groups: ["category", "year", "month", "day", "title"]
            }
        }],
        'categorization':{
            type: "url",
            matcher: {
                url_element : "category",
                mappings : {
                    "big-government" : "Politics",
                    "sports" : "Sports"
                }
            }
        },
        'author-selector': 'a.byauthor',
        'author-selector-property': '',
        'date-selector': 'span.bydate',
        'date-selector-property': '',
        'text-selector': 'div.entry-content',
        'text-selector-property': '',
        'title-selector': 'h1[itemprop="headline"]',
        'title-selector-property': ''
    }),
    'theblaze': new SourceDefinition({
        'urls': [{
            urlRoot: 'theblaze.com',
            'article-url-matcher': {
                pattern: "news/{year}/{month}/{day}/{title}/",
                groups: ["year", "month", "day", "title"]
            }
        }],
        'author-selector': 'a.article-author',
        'author-selector-property': '',
        'date-selector': 'time.published',
        'date-selector-property': '',
        'text-selector': 'div.entry-content',
        'text-selector-property': '',
        'title-selector': 'h1.page-title',
        'title-selector-property': ''
    }),
    'economist': new SourceDefinition({
        'urls': [{
            urlRoot: 'economist.com',
            'article-url-matcher': {
                pattern: "news/{category}/{id}-{title}",
                groups: ["category", "id", "title"]
            }
        }],
        'categorization' :{
            type: 'url',
            matcher: {
                url_element: "category",
                mappings: {
                    "business" : "Business",
                    "americas" : "US News",
                    "europe" : "World",
                    "leaders" : "World",
                    "middle-east-and-africa" : "World"
                }
            }
        },
        'author-selector': 'span.blog-post__byline',
        'author-selector-property': '',
        'date-selector': 'time.blog-post__datetime',
        'date-selector-property': 'dateCreated',
        'text-selector': 'div.blog-post__text > p',
        'text-selector-property': '',
        'title-selector': 'h1.flytitle-and-title__body > span.flytitle-and-title__title',
        'title-selector-property': ''
    }),
    'TheFederalist': new SourceDefinition({
        'urls': [{
            urlRoot: 'thefederalist.com',
            'article-url-matcher': {
                pattern: "{year}/{month}/{day}/{title}/",
                groups: ["year", "month", "day", "title"]
            }
        }],
        'author-selector': 'article > div.aside-pos-fix > div > div > div.aside-header-wrapper > header > div.rwd-byline > a',
        'author-selector-property': '',
        'date-selector': 'div.byline-standard', //going to need clean up
        'date-selector-property': '',
        'text-selector': 'div.entry-content > p',
        'text-selector-property': '',
        'title-selector': 'article > div.aside-pos-fix > div > div > div.aside-header-wrapper > header > h2 > a',
        'title-selector-property': ''
    }),
    'TheDailyCaller': new SourceDefinition({
        'urls': [{
            urlRoot: 'thedailycaller.com',
            'article-url-matcher': {
                pattern: "{year}/{month}/{day}/{title}/",
                groups: ["year", "month", "day", "title"]
            }
        }],
        'author-selector': 'div#name',
        'author-selector-property': '',
        'date-selector': 'div.dateline',
        'date-selector-property': '',
        'text-selector': 'div.article-primary',
        'text-selector-property': '',
        'title-selector': 'div#main-article h1',
        'title-selector-property': ''
    }),
    'TheWashingtonFreeBeacon': new SourceDefinition({
        'urls': [{
            urlRoot: 'freebeacon.com',
            'article-url-matcher': {
                pattern: "{subject}/{title}/",
                groups: ["subject", "title"]
            }
        }],
        'categorization' :{
            type: 'url',
            matcher: {
                url_element: "subject",
                mappings: {
                    "culture" : "Culture",
                    "national-security", "Politics"
                }
            }
        },
        'author-selector': 'span.author a',
        'author-selector-property': '',
        'date-selector': 'time.entry-date',
        'date-selector-property': '',
        'text-selector': 'div.entry-content p',
        'text-selector-property': '',
        'title-selector': 'h1.entry-title',
        'title-selector-property': ''
    }),
    'InfoWars': new SourceDefinition({
        'urls': [{
            urlRoot: 'infowars.com',
            'article-url-matcher': {
                pattern: "{title}",
                groups: ["title"]
            }
        }],
        'author-selector': 'span.author a',
        'author-selector-property': '',
        'date-selector': 'span.date',
        'date-selector-property': '',
        'text-selector': 'div.text article',
        'text-selector-property': '',
        'title-selector': 'h1.entry-title',
        'title-selector-property': ''
    }),
    'CBSNews': new SourceDefinition({
        'urls': [{
            urlRoot: 'cbsnews.com',
            'article-url-matcher': {
                pattern: "news/{title}",
                groups: ["title"]
            }
        }],
        'author-selector': 'span.source',
        'author-selector-property': '',
        'date-selector': 'span.time',
        'date-selector-property': '',
        'text-selector': 'div[data-page="1"]',
        'text-selector-property': '',
        'title-selector': 'h1.title',
        'title-selector-property': ''
    }),
    'NYMag': new SourceDefinition({
        'urls': [{
            urlRoot: 'nymag.com',
            'article-url-matcher': {
                pattern: "{interval}/{category}/{year}/{month}/{title}.html",
                groups: ["interval", "category", "year", "month", "title"]
            }
        }],
        'author-selector': 'a.article-author > span',
        'author-selector-property': '',
        'date-selector': 'span.article-date.large-width-date',
        'date-selector-property': '',
        'text-selector': 'div.article-content',
        'text-selector-property': '',
        'title-selector': 'h1.headline-primary',
        'title-selector-property': ''
    }),
    'NYPost': new SourceDefinition({
        'urls': [
            {
                urlRoot: 'nypost.com',
                'article-url-matcher': {
                    pattern: "{year}/{month}/{day}/{title}/",
                    groups: ["year", "month", "day", "title"]
                }
            },
            {
                urlRoot: 'pagesix.com',
                'article-url-matcher': {
                    pattern: "{year}/{month}/{day}/{title}/",
                    groups: ["year", "month", "day", "title"]
                }
            }],
        'author-selector': '#author-byline > p',
        'author-selector-property': '',
        'date-selector': 'div.article-header > p',
        'date-selector-property': '',
        'text-selector': 'div.entry-content',
        'text-selector-property': '',
        'title-selector': 'div.article-header > h1 > a',
        'title-selector-property': ''
    }),
    'RT': new SourceDefinition({
        'urls': [{
            urlRoot: 'rt.com',
            'article-url-matcher': {
                pattern: "{region}/{id}-{title}/",
                groups: ["region", "title"]
            }
        }],
        'author-selector': '',
        'author-selector-property': '',
        'date-selector': 'time.date_article-header',
        'date-selector-property': '',
        'text-selector': 'div.article__text',
        'text-selector-property': '',
        'title-selector': 'h1.article__heading',
        'title-selector-property': ''
    }),
    'tutorial': new SourceDefinition({
        'urls': [{
            urlRoot: 'tutorial/tutorial-page.html',
            'article-url-matcher': {
                pattern: "",
                groups: [""]
            }
        }],
        'author-selector': 'span.author',
        'author-selector-property': '',
        'date-selector': '',
        'date-selector-property': '',
        'text-selector': '',
        'text-selector-property': '',
        'title-selector': '',
        'title-selector-property': ''
    }),
    'lawfare': new SourceDefinition({
        'urls': [{
            urlRoot: 'lawfareblog.com',
            'article-url-matcher': {
                pattern: "{title}",
                groups: ["title"]
            }
        }],
        'author-selector': 'div.article-top__contributors > a.author__link',
        'author-selector-property': '',
        'date-selector': 'div.article-top__meta > datetime',
        'date-selector-property': '',
        'text-selector': 'div.field-item > p',
        'text-selector-property': '',
        'title-selector': 'header.article-top > h1.title',
        'title-selector-property': ''
    }),
    "latimes": new SourceDefinition({
        'urls': [{
            urlRoot: 'latimes.com',
            'article-url-matcher': {
                pattern: "{category}/{title}",
                groups: ["category", "title"]
            }
        }],
        'author-selector': 'span[itemprop="author"]',
        'author-selector-property': '',
        'date-selector': 'div.trb_ar_dateline > time[itemprop="datePublished"]',
        'date-selector-property': 'dt',
        'text-selector': 'div[itemprop="articleBody"] > div.trb_ar_page',
        'text-selector-property': '',
        'title-selector': 'h1.trb_ar_hl_t',
        'title-selector-property': ''
    })
};
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.type) {
        case "getSources":
            sendResponse(sources);
            break;
        case "getSourceUrlMatches":
            if (request.message.source_name) {
                sendResponse(sources[request.message.source_name].testForArticleUrlMatch(reduceUrl(request.message.location)));
            }
            break;
    }
});