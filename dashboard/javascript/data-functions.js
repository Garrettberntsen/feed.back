function getArticlesInTimespan(end, start, data) {
  var articles = JSON.parse(JSON.stringify(data));
  //To-Do: Add support to find articles in between two dates. Should be an easy
  //fix, just add in another more that sign to check for the end
  for (let key in articles) {
    if (articles[key].dateRead < start) {
      delete articles[key];
    }
  }
  return articles;
}

function getArticleCount(articles) {
  var totalCount = {};
  for (let key in articles) {
    var tempSource = articles[key].source;
    if( totalCount.hasOwnProperty(tempSource) ){
      totalCount[tempSource]++;
    }else {
      totalCount[tempSource] = 1;
    }
  }
  return totalCount;
}

function createTemplate(articles) {
  var articleCount = {};

  for (let key in articles) {
    if (articles.hasOwnProperty(key)) {
      var article = articles[key];
      var source = article.source;
      if (!articleCount.hasOwnProperty(source)) {
        articleCount[source] = 0;
      }
    }
  }
  return articleCount;
}

function organizeArticlesByDate(articles, template) {
  var articleCount = {};

  for (let key in articles) {
    var article = articles[key];
    var articleDate = new Date(article.dateRead).toString("M/d/yyyy");
    articleCount[articleDate] = JSON.parse(JSON.stringify(template));
  }

  for (let key in articles) {
    let article = articles[key];
    let articleSource = articles[key].source;
    let articleDate = new Date(article.dateRead).toString("M/d/yyyy");
    articleCount[articleDate][articleSource]++;
  }

  for (let key in articleCount) {
    let article = articleCount[key];
    article.date = key;
  }
  return articleCount;
}

/* Creates a very specific array of object that is better suited for D3 parsing
 * for creating a stacked bar chart.
 *  @articlesToParse -> List of articles that user has read, obtained from JSON file
 *  Returns -> Ordered array useful only for the stacked bar chart.
 */
function createBarChartDataset(articlesToParse) {
  var articles = organizeArticlesByDate(articlesToParse, articleTimespanTemplate);

  for (let i = 0; i < daysToGoBack; i++) {
    let timeToAdd = i * millisecondsPerDay;
    let currentDay = new Date(timeStart + timeToAdd).toString("M/d/yyyy");
    if (!articles.hasOwnProperty(currentDay)) {
      articles[currentDay] = JSON.parse(JSON.stringify(articleTimespanTemplate));
      articles[currentDay].date = currentDay;
    }
  }

  var articlesArray = Object.values(articles);
  var articleSourcesArray = createArrayOfSources();

  articlesArray.sort(function (a, b) {
    var dateA = Date.parse(a.date);
    var dateB = Date.parse(b.date);

    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    return 0;
  });

  var parsedData = d3.layout.stack()(articleSourcesArray.map(function (source) {
    return articlesArray.map(function (d) {
      return {
        x: Date.parse(d.date).toString('MMM d'),
        y: +d[source],
        label: source
      };
    });
  }));

  return parsedData;

  function createArrayOfSources() {
    return Object.keys( articleTimespanTemplate ).sort();
  }
}