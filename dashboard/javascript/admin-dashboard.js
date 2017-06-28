function createAdminDashboardLink() {
	var link = '<a class="sidebar__link" href=/dashboard/admin-dashboard.html><img class="sidebar__icon sidebar__icon--active" src="/app-assets/img/dashboard-icons/edit.svg"><p>Admin</p></a>';
	var sidebar = document.querySelector(".sidebar__items");
	var div = document.createElement("div");
	div.innerHTML = link;
	sidebar.appendChild(div);
}

var model = {
	userData : {
		users: database.users,
		userNum: Object.keys(database.users).length,
		articlesPerUser: function() { return Math.round(model.articleData.articlesNum / this.userNum); },
	},

	articleData : {
		articles: database.articles,
		articlesNum: Object.keys(database.articles).length,
		wordsRead: function() { return model.countWordsRead(this.articles); },
		fullArticles: function() { return model.countFullRecords(this.articles); },
		wordsPerArticle: function() {return this.wordsRead() / this.articlesNum(); },
		wordsPerFullArticle: function() {return Math.round(this.wordsRead() / this.fullArticles()); },
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
	},
};

var views = {
	databaseOverInit: function() {
		this.appendData("total users", ".card-database", model.userData.userNum);
		this.appendData("total articles", ".card-database", model.articleData.articlesNum);
		this.appendData("articles/user", ".card-database", model.userData.articlesPerUser());

		this.appendData("full record articles", ".card-database", model.articleData.fullArticles());
		this.appendData("words read", ".card-database", model.articleData.wordsRead());
		this.appendData("words read/full record article", ".card-database", model.articleData.wordsPerFullArticle());

	},

	appendData: function(string, parentElem, data) {
		var elem = document.createElement("div");
		var parent = document.querySelector(parentElem);
		elem.innerHTML = `<p>${string}: ${data}</p>`;
		parent.appendChild(elem);
	}
};

//Kick off the process
controller.init();
