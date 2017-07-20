function createAdminDashboardLink() {
	var link = '<a class="sidebar__link" href=/dashboard/admin-dashboard.html><img class="sidebar__icon sidebar__icon--active" src="/app-assets/img/dashboard-icons/edit.svg"><p>Admin</p></a>';
	var sidebar = document.querySelector(".sidebar__items");
	var div = document.createElement("div");
	div.innerHTML = link;
	sidebar.appendChild(div);
}

var model = {
	userData : {
		userNum: function() { return Object.keys(this.users).length },
		articlesPerUser: function() { return Math.round(model.articleData.articlesNum() / this.userNum()); },
	},

	articleData : {
		articlesNum: function() { return Object.keys(this.articles).length },
		wordsRead: function() { return model.countWordsRead(this.articles); },
		fullArticles: function() { return model.countFullRecords(this.articles); },
		wordsPerArticle: function() {return this.wordsRead() / this.articlesNum(); },
		wordsPerFullArticle: function() {return Math.round(this.wordsRead() / this.fullArticles()); },
	},

	sortedData: {

	},

	timeframeData: {
		
	},

	getWordsReadInTimeframe: function(data) {
		var wordsRead = 0,
			multiplier = 1, 
			currentArticle = "",
			currentText = "",
			currentTextLen = 0;
		var arr = [];

		for(var i = 0; i < data.length; i++) {
			currentArticle = data[i].article;
			if(model.articleData.articles.hasOwnProperty(currentArticle)) {
				multiplier = data[i].reads;
				currentText = model.articleData.articles[currentArticle].text;
				currentTextLen = currentText.split(" ").length * multiplier;
				wordsRead += currentTextLen;
			}
		}
		return wordsRead;
	},

	countWordsRead: function(data) {
		var count = 0,
			text = "",
			textLen = 0;

		for (let key in data) {
			text = data[key].text;
			textLen = text.split(" ").length;
			count += textLen;
		}
		return count;
	},

	countFullRecords: function(data) {
		var count = 0;
		for (let key in data) {
			if(data[key].text !== ""){
				count++;
			}
		}
		return count;
	},

	getArticlesInTimeSpan: function(userData, articleData) {
		var articles = JSON.parse(JSON.stringify(userData));
		var articlesInTimespan = []; 
		for (let userid in articles) {
			for (let articlesid in articles[userid].articles) {
				if (articles[userid].articles[articlesid].dateRead > model.datestart && articles[userid].articles[articlesid].dateRead < model.dateend) {
					articlesInTimespan.push(articlesid);
				}
			}
		};

		//adapted from https://stackoverflow.com/questions/9229645/remove-duplicates-from-javascript-array
		var articleCounts = {};
		articlesInTimespan.filter(function(item) {
			return articleCounts.hasOwnProperty(item) ? (articleCounts[item] += 1) : (articleCounts[item] = 1);
		});

		var sortedArticles = [];
		for(var article in articleCounts) {
			sortedArticles.push({
				article: article,
				reads: articleCounts[article]
			})
		};

		sortedArticles.sort(function(a , b){
			return b.reads - a.reads;
		});

		return sortedArticles;
	},

	getTopArticles: function(sortedArticles) {
		var tempId = '';
		var fullArticleData = [];
		for(var i = 0; i < 20; i++) {
			tempId = sortedArticles[i].article;
			fullArticleData.push(model.articleData.articles[tempId]); 
		}
		return fullArticleData;
	},

	getTopSources: function(sortedArticles) {
		var tempId, tempSource;
		var articleCounts = {};

		for(var i = 0; i < sortedArticles.length; i++) {
			tempId = sortedArticles[i].article;
			if(model.articleData.articles.hasOwnProperty(tempId)) {
				tempArticle = model.articleData.articles[tempId];
				if(tempArticle.hasOwnProperty("source")) {
					tempSource = tempArticle.source;
					if(articleCounts.hasOwnProperty(tempSource)) {
						articleCounts[tempSource] += sortedArticles[i].reads;
					}else {
						articleCounts[tempSource] = sortedArticles[i].reads;
					}
				}
			}
		}
		return articleCounts;
	},

	sortTopSources: function(articleCountObject) {
		var sortedSources = [];

		for(var article in articleCountObject) {
			sortedSources.push({
				source: article,
				uniqueReads: articleCountObject[article]
			})
		};

		sortedSources.sort(function(a , b){
			return b.uniqueReads - a.uniqueReads;
		});

		return sortedSources;
	},

	getTotalReads: function(data) {
		var count = 0;
		for(var i = 0; i < data.length; i++) {
			if(data[i].source === "tutorial") {
				count += 0;
			}else {
				count += data[i].uniqueReads;
			}
		}

		return count;
	}
};

var controller = {
	init: function() {
		model.form = document.querySelector(".date-picker"),
		this.datepickerInit();
		views.databaseOverInit();
		console.log(model);
	},

	datepickerInit: function() {
		var submitElem = document.querySelector(".date-picker-submit");
		submitElem.addEventListener("click", controller.datepickerMod);
	},

	datepickerMod: function(e) {
		e.preventDefault();
		model.datestart = model.form[0].valueAsNumber; 
		model.dateend = model.form[1].valueAsNumber;
		model.sortedData.articles = model.getArticlesInTimeSpan(model.userData.users, model.articleData.articles);
		model.sortedData.topTwentyArticles = model.getTopArticles(model.sortedData.articles);
		model.articleData.topSources = model.getTopSources(model.sortedData.articles);
		model.sortedData.topSources = model.sortTopSources(model.articleData.topSources); 
		if(document.contains(document.querySelector("#table"))) {
			document.querySelector("#table").remove();
			document.querySelector("#source-table").remove();
		}
		views.createTable(model.sortedData.topTwentyArticles, model.sortedData.articles.slice(0, 20), ".top-ten-articles");
		views.displayTopSources(model.sortedData.topSources, ".top-sources");
		views.addTimeframeData();
		
	},
};

var views = {
	databaseOverInit: function() {
		this.appendData("total users", ".card-database", model.userData.userNum());
		this.appendData("total articles", ".card-database", model.articleData.articlesNum());
		this.appendData("articles/user", ".card-database", model.userData.articlesPerUser());

		this.appendData("full record articles", ".card-database", model.articleData.fullArticles());
		this.appendData("words scraped", ".card-database", model.articleData.wordsRead());
		this.appendData("words scraped/full record article", ".card-database", model.articleData.wordsPerFullArticle());
	},

	addTimeframeData: function() {
		document.querySelector(".timeframe-data").innerHTML = "";

		this.appendData("articles in timeframe", ".timeframe-data", model.sortedData.articles.length);
		this.appendData("reads in timeframe", ".timeframe-data", model.getTotalReads(model.sortedData.topSources));
		this.appendData("words read in timeframe", ".timeframe-data", model.getWordsReadInTimeframe(model.sortedData.articles));
	},

	appendData: function(string, parentElem, data) {
		var elem = document.createElement("div");
		var parent = document.querySelector(parentElem);
		elem.innerHTML = `<p>${string}: ${data}</p>`;
		parent.appendChild(elem);
	},

	createTable: function(data, dataReads, parentElem) {
		var len = data.length;
		var title,
			url,
			reads,
			source;

		var parent = document.querySelector(parentElem);
		var elem = document.createElement("table");
		elem.setAttribute("id", "table");
		var tr = document.createElement("tr");
		tr.innerHTML = "<th>title</th> <th>source</th> <th>reads</th> <th>url</th>";
		elem.appendChild(tr);
		
		var tbody = document.createElement("tbody");
		elem.appendChild(tbody);

		for(var i = 0; i < len; i++){
			var tr = document.createElement("tr");
			title = data[i].title;
			url = data[i].url;
			reads = dataReads[i].reads;
			source = data[i].source;
			tr.innerHTML = `<td>${title}</td> <td>${source}</td> <td>${reads}</td> <td>${url}</td>`;
			tbody.appendChild(tr);
		}
		parent.appendChild(elem);
	},

	displayTopSources: function(data, parentElem) {
		var len = data.length;
		var source,
			reads;

		var parent = document.querySelector(parentElem);
		var elem = document.createElement("table");
		elem.setAttribute("id", "source-table");
		elem.style.fontSize = "16px";
		var tr = document.createElement("tr");
		tr.innerHTML = "<th>source</th> <th>reads</th>";
		elem.appendChild(tr);
		
		var tbody = document.createElement("tbody");
		elem.appendChild(tbody);

		for(var i = 0; i < len; i++){
			var tr = document.createElement("tr");
			reads = data[i].uniqueReads;
			source = data[i].source;
			tr.innerHTML = `<td>${source}</td> <td>${reads}</td>`;
			tbody.appendChild(tr);
		}
		parent.appendChild(elem);
	}
};

if( location.pathname.split("/")[2].split(".")[0] === "admin-dashboard" ) {
	if(typeof database !== "undefined") {
		model.articleData.articles = database.articles;
		model.userData.users = database.users;
		controller.init();
	} else {
	chrome.extension.getBackgroundPage()._firebase.then(function (firebase) {
		firebase.database().ref().once("value").then(function (snapshot) {
			model.userData.users = snapshot.val().users;
			model.articleData.articles = snapshot.val().articles;
			controller.init();
		}).catch(function (error) {
				console.log(error);
			});
		});	
	}
}
