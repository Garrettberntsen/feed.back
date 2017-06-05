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
			createDropdownMenu();

			var color = 
			["#393B79", "#3182BD", "#E6550D", "#31A354", "#CE6BDB", "#17BECF",
			"#ED6A5A", "#EFCB68", "#88D18A", "#3E5C76", "#D1D1D1", "#114B5F",
			"#FFE74C", "#FE5F55", "#35A7FF", "#468966", "#B64926", "#1695A3",
			"#BDD4DE", "#832F5C", "#382513", "#363942", "#405952", "#F54F29",
			"#083643", "#CEF09D", "#FF974F", "#91BED4", "#365FB7", "#D23600",
			"#FC9D9A", "#83AF9B", "#791F33", "#78C0F9", "#FFDBE6", "#B9121B"];

			Promise.all(article_definitions).then(function (articleSnapshots) {
				var daysBack = 14;

				var todaysDate = Date.now();
				var millisecondsPerDay = 86400000;

				updateCharts((daysBack - 1) * millisecondsPerDay);

				function updateCharts(timeSpan) {
					var timeEnd = Date.now();
					var timeStart = timeEnd - timeSpan;    

					var articlesInTimespan = getArticlesInTimespan(timeEnd, timeStart);

					var articleTimespanTemplate = createTemplate(articlesInTimespan);
					var articleCountInTimespan = getArticleCount(articlesInTimespan);

					var donutDataset = createDonutChartDataset(articleCountInTimespan);
					var barchartDataset = createBarChartDataset(articlesInTimespan);

					updateBarChart(barchartDataset);
					updateDonutChart(donutDataset);
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
						for (let i = 0; i < daysBack; i++) {
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

					function updateBarChart(dataset) {
						var margin = {
							top: 0,
							right: 0,
							bottom: 25,
							left: 30
						};

						var width = 960 - margin.left - margin.right,
							height = 288 - margin.top - margin.bottom;

						var svg = d3.select("div.bar-chart")
							.append("svg")
							.attr("class", "chart")
							.attr("class","chart--font")
							.attr("width", width + margin.left + margin.right)
							.attr("height", height + margin.top + margin.bottom)
							.append("g")
							.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

						var x = d3.scale.ordinal()
							.domain(dataset[0].map(function (d) {
								return d.x;
							}))
							.rangeRoundBands([10, width - 10], 0.2);

						var y = d3.scale.linear()
							.domain([0, d3.max(dataset, function (d) {
								return d3.max(d, function (d) {
									return d.y * 3;
								});
							})])
							.range([height, 0]);

						// var color = d3.scale.category20();

						var yAxis = d3.svg.axis()
							.scale(y)
							.orient("left")
							.ticks(5)
							.tickSize(-width, 0, 0)
							.tickFormat(function (d) {
								return d;
							});

						var xAxis = d3.svg.axis()
							.scale(x)
							.orient(margin.bottom)
							.ticks(5);

						svg.append("g")
							.attr("class", "y axis")
							.call(yAxis);

						svg.append("g")
							.attr("class", "x axis")
							.attr("transform", "translate(0," + height + ")")
							.call(xAxis);

						var groups = svg.selectAll("g.time")
							.data(dataset) 
							.enter().append("g")
							.attr("class", "time")
							.attr("fill", function (d, i) {
								return color[i];
							});

						var rect = groups.selectAll("rect")
							.data(function (d) { return d; })
							.enter().append("rect")
							.attr("x", function (d) {
								return x(d.x);
							})
							.attr("class", "bar-chart-bar")
							.attr("y", height)
							.attr("width", x.rangeBand())
							.attr("height", 0);


						rect.transition()
							.delay(function(d, i) { return i * 74; })
							.attr("y", function (d) {
								return y(d.y0 + d.y);
							})
							.attr("height", function (d) {
								return y(d.y0) - y(d.y0 + d.y);
							})

							rect.on("mouseover", function (d) {
								tooltip.style("display", null);
								tooltip.select("text").text(returnSource(d.label, d.y) ) ;
							})
							.on("mouseout", function () {
								tooltip.style("display", "none");
							})
							.on("mousemove", function (d) {
								var xPosition = d3.mouse(this)[0] - 15;
								var yPosition = d3.mouse(this)[1] - 25;
								tooltip.attr("transform", "translate(" + xPosition + "," + yPosition + ")");
							});

						var tooltip = svg.append("g")
							.attr("class", "tooltip")
							.style("display", "none");

						tooltip.append("text")
							.attr("x", 15)
							.attr("dy", "1.2em")
							.style("text-anchor", "middle")
							.attr("font-size", "12px")
							.attr("font-weight", "bold");

						function returnSource(label, articlesRead) {
							var tooltipText = label + " - " + articlesRead;
							return tooltipText;
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

					function updateDonutChart(dataset) {
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

						// var color = d3.scale.category20();

						var svg = d3.select("div.donut-chart")
							.append("svg")
							.attr("class", "chart")
							.attr("class","chart--font")
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
						var count = countArticles(articlesRead);
						var faveSource = findFavoriteSource(articlesRead, false);
						var faveSourceRead = findFavoriteSource(articlesRead, true);

						factContainer.appendChild( createBubbleFact(Object.keys(articlesRead).length, "sources", "red") );
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
								factElem.setAttribute("style", "font-size: 1.6rem");
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

				var userData = userSnapshot.val();

				var articlesRead = userData.articles;

				appendData("days-back", daysBack);

				createTable(articlesRead, {ids: article_ids, snapshots: articleSnapshots});

				var myTable = document.querySelector("#table");
				var dataTable = new DataTable(myTable, {
					searchable: true,
					perPage: 25,
					perPageSelect: [25, 50, 100]
				});

				//Need to find a more logical place to put this
				document.getElementsByClassName("dataTable-wrapper")[0].className += " card card--dashboard card--table";

				function appendData(elem, name) {
					var elem = document.getElementsByClassName(elem)[0];
					var elemText = elem.innerHTML += " " + name;
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
			});
		
			function createDropdownMenu() {
				document.getElementsByClassName("dropdown")[0].addEventListener("click", toggleDates);

				window.onclick = function(e) {
					if(!e.target.matches(".sidebar__date-selector")) {
						var dropdowns = document.getElementsByClassName("dropdown-content");
						for(var i = 0; i < dropdowns.length; i++) {
							var openDropdown = dropdowns[i];
							if(openDropdown.classList.contains("show")) {
								openDropdown.classList.remove("show");
							}
						}
					}
					if(e.target.matches(".dropdown-day")) {
						console.log(e.target.dataset.days);
					}
				}

				function toggleDates() {
					document.getElementById("dropdown-dates").classList.toggle("show");
				}
			}			
		}).catch(function (error) {
			console.log(error);
		});
	});
});

