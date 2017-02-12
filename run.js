// Google Analytics
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-90713326-1', 'auto');
ga('send', 'pageview');

// Initialize Firebase
var config = {
  apiKey: "AIzaSyBb2F9FgRd69-B_tPgShM2CWF9lp5zJ9DI",
  authDomain: "feedback-f33cf.firebaseapp.com",
  databaseURL: "https://feedback-f33cf.firebaseio.com",
  storageBucket: "feedback-f33cf.appspot.com",
  messagingSenderId: "17295082044"
};
firebase.initializeApp(config);
var database = firebase.database();

// Function to create hashes for article keys
String.prototype.hashCode = function() {
  var hash = 0, i, chr, len;
  if (this.length === 0) return hash;
  for (i = 0, len = this.length; i < len; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

function writeArticleData(article_data, user_id) {
  var article_key = article_data['url'].hashCode()
  if (article_key == 0 || article_data['title'] == '' || article_data['text'] == ''){
    return False;
  }
  database.ref('articles/' + article_key).set({
    url:    article_data['url'],
    source: article_data['source'],
    title:  article_data['title'],
    date:   article_data['date'],
    author: article_data['author'],
    text:   article_data['text'],
    lastRead: article_data['dateRead'],
  });
  database.ref('readers/' + article_key + '/' + user_id).set(true);
  database.ref('users/' + user_id + '/articles/' + article_key).set(true);
  database.ref('users/' + user_id + '/articles/' + article_key + '/source').set(article_data['source']);
  database.ref('users/' + user_id + '/articles/' + article_key + '/dateRead').set(article_data['dateRead']);
  database.ref('users/' + user_id + '/email').set(user_email)
  console.log("feed.back data written to firebase!")
}

var user_email, user_id;

chrome.runtime.sendMessage({msg: "getUser"}, function(response) {
  user_email = response.email;
  user_id = response.id;
  var sources = {
    'washingtonpost':{
      'url':'washingtonpost.com',
      'author-selector':'span[itemprop="author"]',
      'author-selector-property':'',
      'date-selector':'span.pb-timestamp',
      'date-selector-property':'content',
      'text-selector':'article[itemprop="articleBody"]',
      'text-selector-property':'',
      'title-selector':'meta[property="og:title"]',
      'title-selector-property':'content'
    },
    'nytimes':{
      'url':'nytimes.com',
      'author-selector':'meta[name="byl"]',
      'author-selector-property':'content',
      'date-selector':'time',
      'date-selector-property':'content',
      'text-selector':'p.story-body-text',
      'text-selector-property':'',
      'title-selector':'h1[itemprop="headline"]',
      'title-selector-property':''
    },
    'politico':{
      'url':'politico.com',
      'author-selector':'dt.credits-author',
      'author-selector-property':'',
      'date-selector':'time',
      'date-selector-property':'',
      'text-selector':'',
      'text-selector-property':'',
      'title-selector':'title',
      'title-selector-property':''
    },
    'wsj':{
      'url':'wsj.com',
      'author-selector':'span.name',
      'author-selector-property':'',
      'date-selector':'meta[itemprop=\'datePublished\']',
      'date-selector-property':'content',
      'text-selector':'',
      'text-selector-property':'',
      'title-selector':'meta[name="article.origheadline"]',
      'title-selector-property':'content'
    },
    'vox':{
      'url':'vox.com',
      'author-selector':'meta[name="author"]',
      'author-selector-property':'content',
      'date-selector':'time.c-byline__item',
      'date-selector-property':'',
      'text-selector':'',
      'text-selector-property':'',
      'title-selector':'title',
      'title-selector-property':''
    },
    'cnn':{
      'url':'cnn.com',
      'author-selector':'span.metadata__byline__author',
      'author-selector-property':'',
      'date-selector':'p.update-time',
      'date-selector-property':'',
      'text-selector':'section#body-text',
      'text-selector-property':'',
      'title-selector':'h1.pg-headline',
      'title-selector-property':''
    },
    'newyorker':{
      'url': 'newyorker.com',
       'author-selector': 'span[itemprop="name"]',
       'author-selector-property': '',
       'date-selector':'time',
       'date-selector-property':'content',
       'text-selector': 'div[itemprop="articleBody"]',
       'text-selector-property': '',
       'title-selector': 'h1[itemprop="headline"]',
       'title-selector-property': ''
    },
    'vicemedia': {
      'url': 'vice.com',
      'author-selector': 'a.contributor__link',
      'author-selector-property': '',
      'date-selector':'div.contributor__content__date',
      'date-selector-property':'',
      'text-selector': 'div.article__body',
      'text-selector-property': '',
      'title-selector': 'h1.article__title',
      'title-selector-property': ''
    },
    'fivethirtyeight': {
      'url': 'fivethirtyeight.com',
      'author-selector': 'a[rel="author"]',
      'author-selector-property': '',
      'date-selector':'span.datetime',
      'date-selector-property':'',
      'text-selector': 'div.entry-content',
      'text-selector-property': '',
      'title-selector': 'h1.article-title',
      'title-selector-property': ''
    },

    'upworthy': {
      'url': 'upworthy.com',
      'author-selector': 'a.article-authors__profile',
      'author-selector-property': '',
      'date-selector':'div.article-header__date',
      'date-selector-property':'',
      'text-selector': 'div.layout__story-page--middle',
      'text-selector-property': '',
      'title-selector': 'h1.article-header__title',
      'title-selector-property': ''
    },

    'buzzfeed': {
      'url': 'buzzfeed.com',
      'author-selector': 'a.byline__author',
      'author-selector-property': '',
      'date-selector':'span.buzz-datetime',
      'date-selector-property':'',
      'text-selector': 'div.buzz',
      'text-selector-property': '',
      'title-selector': 'h1#post-title',
      'title-selector-property': ''
    },
    'theatlantic': {
      'url': 'theatlantic.com',
      'author-selector': 'span[itemprop="author"]',
      'author-selector-property': '',
      'date-selector':'time[itemprop="datePublished"]',
      'date-selector-property':'',
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
      'date-selector-property':'',
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
      'date-selector-property':'',
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
      'date-selector-property':'',
      'text-selector': 'div[itemprop="articleBody"]',
      'text-selector-property': '',
      'title-selector': 'h1.article-header',
      'title-selector-property': ''
    }
  };
  var data = {
    'source':'',
    'url': '',
    'author':'',
    'date':'',
    'text':'',
    'title':'',
    'dateRead':''
  };
  for (var prop in sources) {
    if(window.location.hostname.indexOf(sources[prop]["url"]) != -1) {
      data.source = prop;
      data.url = window.location.href.replace(/.*?:\/\/(www\.)?/,'').replace(/(\.html?).*/,'$1');
      var d=new Date();
      data.dateRead = d.getTime();

      if(sources[prop]["date-selector-property"] == "") {
        data.date = $(sources[prop]["date-selector"]).text();
      } else {
        data.date = $(sources[prop]["date-selector"]).attr(sources[prop]["date-selector-property"]);
      }
      //Clean-up
      data.date = data.date.trim();

      if(sources[prop]["author-selector-property"] == "") {
        data.author = $(sources[prop]["author-selector"]).text();
      } else {
        data.author = $(sources[prop]["author-selector"]).attr(sources[prop]["author-selector-property"]);
      }
      //Clean-up
      data.author = data.author.trim().replace(/By .*?By /,'').replace(/By /,'').replace(" and ",", ").split(", ");
      
      
      if(sources[prop]["title-selector-property"] == "") {
        data.title = $(sources[prop]["title-selector"]).text();
      } else {
        data.title = $(sources[prop]["title-selector"]).attr(sources[prop]["title-selector-property"]);
      }
      //Clean-up
      data.title = data.title.trim().replace(/\s{3,}/,' ')
      
      if(sources[prop]["text-selector"] !== "") {
        if(sources[prop]["text-selector-property"] == "") {
          data.text = $(sources[prop]["text-selector"]).text().trim();  
        } else {
          data.text = $(sources[prop]["text-selector"]).attr(sources[prop]["text-selector-property"]);
        }
      } else {
        data.text = $('p').text();
      }
      //Clean-up
      data.text= data.text.trim()
      ga('send','event', 'articleView', data.title, data.url)
    }  
  }
  console.log(JSON.stringify(data));
  console.log("The user is: " + user_email);
  if (undefined != user_id && data.url != '') {
    writeArticleData(data, user_id);
  }
  chrome.runtime.sendMessage({msg: "increaseReadCount"});
});

