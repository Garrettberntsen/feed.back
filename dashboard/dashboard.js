/*jshint esversion: 6 */
chrome.runtime.sendMessage({type: "forcePersist"}, function(){
	"use strict";
	console.log("Force pesist.");
});
chrome.runtime.sendMessage({type: "getUser"}, function (user) {
	chrome.extension.getBackgroundPage()._firebase.then(function (firebase) {
		firebase.database().ref("users/" + user.id).once("value").then(function (userSnapshot) {
			var articles = userSnapshot.val().articles;
			var article_ids = [];
			var article_definitions = [];
			for (let key in articles) {
				article_definitions.push(firebase.database().ref("articles/" + key).once("value"));
				article_ids.push(key);
			}

			console.log(article_definitions);

			var todaysDate = Date.now();
			var millisecondsPerDay = 86400000;

			var userData = userSnapshot.val();
			var articlesRead = userData.articles;

			var currentPage = location.pathname.split("/")[2].split(".")[0];

			if(currentPage === "dashboard") {
				console.log("dashboard page");
				onDashboardPage();
			}else if(currentPage === "goals") {
				console.log("goals page");
				onGoalsPage();
			}

			function onDashboardPage() {
				updateCharts(13 * millisecondsPerDay, 14);
				function updateCharts(timeSpan, daysToGoBack) {
					var timeStart = todaysDate - timeSpan;

					var articlesInTimespan = getArticlesInTimespan(todaysDate, timeStart);

					var articleTimespanTemplate = createTemplate(articlesInTimespan);
					var articleCountInTimespan = getArticleCount(articlesInTimespan);

					var donutDataset = createDonutChartDataset(articleCountInTimespan);
					var barchartDataset = createBarChartDataset(articlesInTimespan);

					console.log(createBarChart);

					createBarChart(barchartDataset);
					createDonutChart(donutDataset);
					appendFacts(articleCountInTimespan);

					function getArticlesInTimespan(end, start) {
						var articles = JSON.parse(JSON.stringify(userSnapshot.val().articles));
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
					
					/* Creates array that is better suited for D3 parsing
					 *  @articlesToParse -> List of articles that user has read, obtained from JSON file
					 *  Returns -> Ordered array of sources read and their count
					 */
					function createDonutChartDataset(articlesToParse) {
						var dataset = [];
						for (let source in articlesToParse) {
							var articleCountObj = {};
							articleCountObj['source'] = source;
							articleCountObj['count'] = articlesToParse[source];
							dataset.push(articleCountObj);
						}

						dataset.sort(function (a, b) {
							var nameA = a.source;
							var nameB = b.source;
							if (nameA < nameB) {
								return -1;
							}
							if (nameA > nameB) {
								return 1;
							}
							return 0;
						});
						return dataset;
					}

					function createDonutChart(dataset) {
						var donutWidth = 50;
						var arcSpace = 0.00;

						var width = 480,
								height = 288;
						var radius = Math.min(width, height) / 2;

						var total = d3.sum(dataset.map(function(d) { return d.count; }));

						var pie = d3.layout.pie()
							.value(function (d) {
								return d.count;
							})
							.sort(null);

						var arc = d3.svg.arc()
							.innerRadius(radius - donutWidth)
							.outerRadius(radius)
							.padAngle(arcSpace);

						var svg = d3.select("div.donut-chart")
							.append("svg")
							.attr("class", "chart")
							.attr("width", width)
							.attr("height", height)
							.append("g")
							.attr("transform", "translate(" + 240 + "," + (height / 2) + ")");

						var path = svg.selectAll("path")
							.data(pie(dataset))
							.enter()
							.append("path")
							.attr("d", arc)
							.attr("fill", function (d, i) {
								return color[i];
							})
							.on("mouseover", function (d) {
								tooltip.style("display", null);
								tooltip.select(".tooltip__source").text( returnSource(d.data) ) ;
								tooltip.select(".tooltip__count").text( returnCount(d.data) ) ;
							})
							.on("mouseout", function () {
								tooltip.style("display", "none");
							})

						path.transition()
							.duration(1000)
							.attrTween('d', function(d) {
								var interpolate = d3.interpolate({startAngle: 0, endAngle: 0}, d);
								return function(t) {
									return arc(interpolate(t));
								}
							})
							.each("end", function(){
								this.classList.add("donut-chart-arc");

							});

						function returnSource(data) {
							var tooltipText = data.source;
							return tooltipText;
						}
						
						function returnCount(data) {
							var percent = Math.round(1000 * data.count / total) / 10;
							var tooltipText = data.count + " - " + percent + "%"   ;
							return tooltipText;
						}

						var tooltip = svg.append("g")
							.attr("class", "tooltip")
								
						tooltip.append("text")
							.attr("class", "tooltip__source")
							.attr("transform", "translate(" + 0 + "," + -8 + ")")
							.style("text-anchor", "middle")
							.attr("font-size", "14px")
							.attr("font-weight", "bold");

						tooltip.append("text")
							.attr("class", "tooltip__count")
							.attr("transform", "translate(" + 0 + "," + 10 + ")")
							.style("text-anchor", "middle")
							.attr("font-size", "14px")
							.attr("font-weight", "bold");
					}

					function appendFacts(articlesRead) {
						var factContainer = document.getElementsByClassName("facts")[0]
						var sourceCount = Object.keys(articlesRead).length;
						var count = countArticles(articlesRead);
						var faveSource = findFavoriteSource(articlesRead, false);
						var faveSourceRead = findFavoriteSource(articlesRead, true);

						var factsArray = [sourceCount, count, faveSource, faveSourceRead];

						var currentFacts = document.getElementsByClassName("bubble__data");
						if( currentFacts.length > 0 ){
							for(var i = 0; i < currentFacts.length; i++) {
								currentFacts[i].innerHTML = factsArray[i];
							}
							if(currentFacts[2].innerHTML.length > 10){
								currentFacts[2].setAttribute("style", "font-size: 1.6rem");
							} else{
								currentFacts[2].setAttribute("style", "font-size: 3rem");
							}
							return;
						}

						factContainer.appendChild( createBubbleFact(sourceCount, "sources", "red") );
						factContainer.appendChild( createBubbleFact(count, "articles", "green") );
						factContainer.appendChild( createBubbleFact(faveSource, "fav. source", "orange") );
						factContainer.appendChild( createBubbleFact(faveSourceRead, "fav. source # read", "purple") );
						
						function createBubbleFact(data, description, color){
							var bubbleElem = document.createElement("div");
							bubbleElem.className = "bubble";

							var bubbleElemStyle = "border: solid 5px " + color
							bubbleElem.setAttribute("style", bubbleElemStyle );

							var factElem = document.createElement("p");
							factElem.className = "bubble__data";
							factElem.appendChild( document.createTextNode(data) );
							if(data.length > 10) {
								factElem.setAttribute("style", "font-size: 2rem");
							}

							var descriptionElem = document.createElement("p");
							descriptionElem.className = "bubble__description";
							descriptionElem.appendChild( document.createTextNode(description) );
							var descriptionElemStyle = "background-color: " + color
							descriptionElem.setAttribute("style", descriptionElemStyle);

							bubbleElem.appendChild(factElem);
							bubbleElem.appendChild(descriptionElem);
							return bubbleElem;
						}

						function findFavoriteSource(data, findingMaxArticles) {
							var returnValue;
							var arr = Object.keys( data ).map(function ( key ) { return data[key]; });
							var max = Math.max.apply(null, arr);

							if(findingMaxArticles === true){
								return max;
							}else{
								for(let key in data) {
									if(data[key] === max) {
										return key;
									} 
								}
							}
						}

						function countArticles(data) {
							var count = 0;
							for (let key in data) {
								count += data[key];
							}
							return count;
						}
					}
				}

				Promise.all(article_definitions).then(function (articleSnapshots) {
					appendData("days-back", tranformDates(14) );

					createDropdownMenu();

					createTable(articlesRead, {ids: article_ids, snapshots: articleSnapshots});

					var myTable = document.querySelector("#table");
					var dataTable = new DataTable(myTable, {
						searchable: true,
						perPage: 25,
						perPageSelect: [25, 50, 100]
					});

					//Need to find a more logical place to put this
					document.getElementsByClassName("dataTable-wrapper")[0].className += " card--table";

					function appendData(elem, name) {
						var elem = document.getElementsByClassName(elem)[0];
						var elemText = elem.innerHTML = " " + name;
					}

					function tranformDates(num) {
						return num < 8 ? num/7 + " Week" : num/7 + " Weeks";
					}
					
					function createTable(userArticleInformation, articleInformation) {
						var articlesRead = [];
						var tableElem = document.getElementById("table-body");

						for (let key in userArticleInformation) {
							if (userArticleInformation.hasOwnProperty(key)) {
								var id_index;
								for (i = 0; i < articleInformation.ids.length; i++) {
									if (articleInformation.ids[i] === key) {
										id_index = i;
										break;
									}
								}
								var currentArticleUserInfo = userArticleInformation[key];
								var currentArticle = articleInformation.snapshots[id_index].val();
								var articleInfo = {
									dateString: '',
									dateUnix: 0,
									url: '',
									sourceUrl: ''
								};
								
								var userEvaluation = currentArticleUserInfo.stars; //to add
								articleInfo.dateString = new Date(currentArticleUserInfo.dateRead).toString("M/dd/yyyy");
								articleInfo.dateUnix = currentArticleUserInfo.dateRead;
								var publisher = currentArticle.source;
								var title = currentArticle.title;
								// var type = ""; //to add
								var author = currentArticle.author;
								var slant = currentArticle.lean;
								var read_percentage = currentArticleUserInfo.scrolled_content_ratio;


								articleInfo.url = currentArticle.url;
								articleInfo.sourceUrl = currentArticle.url.split(".");

								var articleData = new Array(userEvaluation, articleInfo, publisher, title, author, read_percentage);
								articlesRead.push(articleData);
							}
						}

						articlesRead.sort(function (a, b) {
							var articleA = a[1].dateUnix;
							var articleB = b[1].dateUnix;
							if (articleA > articleB) {
								return -1;
							}
							if (articleA < articleB) {
								return 1;
							}
							return 0;
						});

						for (let i = 0; i < articlesRead.length; i++) {
							var tr = document.createElement("TR");
							for (let j = 0; j < articlesRead[i].length; j++) {
								var td = document.createElement("TD");
								var content = articlesRead[i][j] ? articlesRead[i][j] : "";
								if(j === 1) {
									content = articlesRead[i][j].dateString ? articlesRead[i][j].dateString : "";
								}
								else if(j === 2) {
									var linkElem = document.createElement("a");
									linkElem.appendChild(  document.createTextNode(articlesRead[i][j] ));
									linkElem.target = "_blank";
									linkElem.href = prependHTTPSIfNeeded(hasSubdomains(articlesRead[i][1].sourceUrl));
									td.appendChild(linkElem);                                
								}
								else if(j === 3) {
									var linkElem = document.createElement("a");
									linkElem.appendChild(  document.createTextNode(articlesRead[i][j] ));
									linkElem.target = "_blank";
									linkElem.href = prependHTTPSIfNeeded(articlesRead[i][1].url);
									td.appendChild(linkElem);
								}
								else if (j === 5) {
									content = Math.floor(Number(content) * 100);
								}

								if(!td.firstChild){
									td.appendChild(document.createTextNode(content));
								}
								tr.appendChild(td);
							}
							tableElem.appendChild(tr);
						}

						function prependHTTPSIfNeeded(string) {
							if(string.includes('https://')){
								return string;
							}else {
								return 'https://' + string;
							}
						}

						function hasSubdomains(articleSource, isArticle) {
							if(articleSource.length > 2) {
								return articleSource[0] + "." + articleSource[1] + ".com";
							}
							return articleSource[0] + ".com"; 
						}
					}

					function createDropdownMenu() {
						window.onclick = function(e) {
							console.log(e.target)
							if(e.target.matches(".dropdown") || e.target.matches(".sidebar__icon") || e.target.matches(".days-back")  ){
								toggleDates();
							}else if(e.target.matches(".dropdown-day") ) {
								var dropdownMenu = e.target.parentElement;
								dropdownMenu.classList.remove("show")	
								console.log(dropdownMenu);
								var parents = document.getElementsByClassName("card--dashboard");
								var childBar = document.getElementsByClassName("chart")[0];
								var childDonut = document.getElementsByClassName("chart")[1];
								parents[0].removeChild(childBar);
								parents[1].removeChild(childDonut);

								updateCharts( (e.target.dataset.days - 1) * millisecondsPerDay, e.target.dataset.days);
								appendData("days-back", tranformDates(e.target.dataset.days) );
							}
						}

						function toggleDates() {
							document.getElementById("dropdown-dates").classList.toggle("show");
						}
					}
				});
			}

			function onGoalsPage() {
				var dateStr = Date.today().moveToDayOfWeek(0, -1).toISOString();
				var dateTime = new Date(dateStr).getTime();

				var articlesReadThisWeek = getArticlesInTimespan(todaysDate, dateTime);
				var articleTimespanTemplate = createTemplate(articlesReadThisWeek);

				var barchartDataset = createBarChartDataset(articlesReadThisWeek);
				console.log(barchartDataset);

				createBarChart(barchartDataset);

				function getArticlesInTimespan(end, start) {
					var articles = JSON.parse(JSON.stringify(userSnapshot.val().articles));
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

					for (let i = 0; i < 7; i++) {
						let timeToAdd = i * millisecondsPerDay;
						let currentDay = new Date(dateTime + timeToAdd).toString("M/d/yyyy");
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
								x: Date.parse(d.date).toString('dddd'),
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
			}



		}).catch(function (error) {
			console.log(error);
		});
	});
});

