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
            Promise.all(article_definitions).then(function (articleSnapshots) {
                var daysBack = 14;

                var todaysDate = Date.now();
                var millisecondsPerDay = 86400000;
                var millisecondsBack = daysBack * millisecondsPerDay;
                var articlesFromThisDate = todaysDate - millisecondsBack;

                var userData = userSnapshot.val();
                var email = user.email;

                var articlesRead = userData.articles;

                var articleObj = createArticleObject(articlesRead);
                var sourceCount = countSources(articlesRead, articleObj);

                appendData("days-back", daysBack);

                createPieChart(sourceCount, articleObj, daysBack);
                createBarChart(sourceCount, articleObj, daysBack);

                var total = calculateTotalArticleCounts(articlesRead);
                appendFacts(total);


                createTable(articlesRead, {ids: article_ids, snapshots: articleSnapshots});

                var myTable = document.querySelector("#table");
                var dataTable = new DataTable(myTable, {
                    searchable: true,
                    perPage: 25,
                    perPageSelect: [25, 50, 100]
                }); 

                document.getElementsByClassName("dataTable-wrapper")[0].className += " card card--dashboard card--table";

                function appendData(elem, name) {
                    var elem = document.getElementsByClassName(elem)[0];
                    var elemText = elem.innerHTML += " " + name;
                }
                
                /* Creates an empty object filled with a 0 count for every source the user has read
                *
                *  @articles -> List of articles that user has read, obtained from JSON file
                *
                *  Returns -> empty template object containing all the articles that the user has ever read
                */ 
                function createArticleObject(articles) {
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

                /* Creates an empty object filled with every date that the
                *  user has read an article.
                *
                *  @articles -> List of articles that user has read, obtained from JSON file
                *  @template -> Empty object every news site the user has visited. Will be copied 
                *               into each date.
                *
                *  Returns -> object containing a template obj with a property for each date that
                *             the user has read an article
                */ 
                function countSources(articles, template) {
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

                function createPieChart(data, obj, timeBack) {
                    var daysBack = timeBack;
                    var daysBackArr = getLastDays(daysBack);
                    var tempObjTwo = JSON.parse(JSON.stringify(obj));

                    var dataArray = [];

                    for (let key in data) {
                        if (data.hasOwnProperty(key)) {
                            dataArray.push(data[key]);
                        }
                    }

                    for (let i = 0; i < daysBackArr.length; i++) {
                        if (arrayObjectIndexOf(dataArray, daysBackArr[i], "date") < 0) {
                            let tempObj = {};
                            tempObj = JSON.parse(JSON.stringify(obj));
                            tempObj.date = daysBackArr[i];
                            dataArray.push(tempObj);
                        }
                    }

                    function arrayObjectIndexOf(myArray, searchTerm, property) {
                        for (let i = 0, len = myArray.length; i < len; i++) {
                            if (myArray[i].date === searchTerm) return i;
                        }
                        return -1;
                    }

                    dataArray.sort(function (a, b) {
                        var dateA = Date.parse(a.date);
                        var dateB = Date.parse(b.date);

                        if (dateA < dateB) return -1;
                        if (dateA > dateB) return 1;
                        return 0;
                    });

                    var finalData = dataArray.splice(dataArray.length - daysBack, dataArray.length);

                    for (let i = 0; i < finalData.length; i++) {
                        for (let property in finalData[i]) {
                            if (finalData[i].hasOwnProperty(property)) {
                                let currentCount = finalData[i][property];
                                tempObjTwo[property] += currentCount;
                            }
                        }
                    }

                    var tempArr = [];

                    for (let property in tempObjTwo) {
                        if (tempObjTwo.hasOwnProperty(property)) {
                            var tempArticleCount = {};
                            tempArticleCount.label = property;
                            tempArticleCount.count = tempObjTwo[property];
                            if(tempArticleCount.count > 0) {
                                tempArr.push(tempArticleCount);
                            }
                        }
                    }

                    var dataset = tempArr;

                    dataset.sort(function(a, b) {
                        var nameA = a.label;
                        var nameB = b.label;
                        if(nameA < nameB) {
                            return -1;
                        }
                        if (nameA > nameB) {
                            return 1;
                        }
                        return 0;
                    });

                    var donutWidth = 50;

                    var width = 480,
                        height = 288;
                    var radius = Math.min(width, height) / 2;

                    var pie = d3.layout.pie()
                        .value(function (d) {
                            return d.count;
                        })
                        .sort(null);

                    var arc = d3.svg.arc()
                        .innerRadius(radius - donutWidth)
                        .outerRadius(radius)
                        .padAngle(0.02);

                    var color = d3.scale.category20();

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
                        .attr("class", "donut-chart-arc")
                        .attr("d", arc)
                        .attr("fill", function (d, i) {
                            return color(d.data.label);
                        })
                        .on("mouseover", function () {
                            tooltip.style("display", null);
                        })
                        .on("mouseout", function () {
                            tooltip.style("display", "none");
                        })
                        .on("mousemove", function (d) { 
                            tooltip.select("text").text( returnSource(d.data) ) ;
                        });

                    function returnSource(data, type) {
                        var total = d3.sum(dataset.map(function(d) { return d.count; }));
                        var percent = Math.round(1000 * data.count / total) / 10;
                        var tooltipText = data.label + " - " + data.count + " - " + percent + "%"   ;
                        return tooltipText;
                    }

                    path.transition()
                        .duration(1000)
                        .attrTween('d', function(d) {
                            var interpolate = d3.interpolate({startAngle: 0, endAngle: 0}, d);
                            return function(t) {
                                return arc(interpolate(t));
                            }
                        });

                    var tooltip = svg.append("g")
                        .attr("class", "tooltip")
                            
                    tooltip.append("text")
                        .style("text-anchor", "middle")
                        .attr("font-size", "14px")
                        .attr("font-weight", "bold")

                    // var legendRectSize = 18;
                    // var legendSpacing = 4;

                    // var legend = svg.selectAll(".legend")
                    //     .data(color.domain())
                    //     .enter()
                    //     .append("g")
                    //     .attr("class", "legend")
                    //     .attr("transform", function (d, i) {
                    //         var height = legendRectSize + legendSpacing;
                    //         var offset = height * color.domain().length / 2;
                    //         var horz = 9     * legendRectSize;
                    //         var vert = i * height - offset;
                    //         return "translate( " + horz + "," + vert + ")";
                    //     });

                    // legend.append("rect")
                    //     .attr("width", legendRectSize)
                    //     .attr("height", legendRectSize)
                    //     .style("fill", color)
                    //     .style("stroke", color);

                    // legend.append("text")
                    //     .attr("x", legendRectSize + legendSpacing)
                    //     .attr("y", legendRectSize - legendSpacing)
                    //     .text(function (d) {
                    //         return d;
                    //     });
                }

                function calculateTotalArticleCounts(articles) {
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

                function appendFacts(articlesRead) {
                    var factContainer = document.getElementsByClassName("facts")[0]
                    console.log(articlesRead);
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

                function createBarChart(data, obj, timeBack) {
                    var daysBack = timeBack;
                    var daysBackArr = getLastDays(daysBack);

                    var dataArray = [];

                    for (let key in data) {
                        if (data.hasOwnProperty(key)) {
                            dataArray.push(data[key]);
                        }
                    }

                    //adds missing dates to arr
                    for (let i = 0; i < daysBackArr.length; i++) {
                        if (arrayObjectIndexOf(dataArray, daysBackArr[i], "date") < 0) {
                            var tempObj = {};
                            tempObj = JSON.parse(JSON.stringify(obj));
                            tempObj.date = daysBackArr[i];
                            dataArray.push(tempObj);
                        }
                    }

                    function arrayObjectIndexOf(myArray, searchTerm, property) {
                        for (let i = 0, len = myArray.length; i < len; i++) {
                            if (myArray[i].date === searchTerm) return i;
                        }
                        return -1;
                    }

                    dataArray.sort(function (a, b) {
                        var dateA = Date.parse(a.date);
                        var dateB = Date.parse(b.date);

                        if (dateA < dateB) return -1;
                        if (dateA > dateB) return 1;
                        return 0;
                    });

                    var finalData = dataArray.splice(dataArray.length - daysBack, dataArray.length);

                    var template = createTemplate(finalData);
                    var templateCategories = JSON.parse(JSON.stringify(template));
                    delete templateCategories.date;

                    var finalFinalData = trimObjects(finalData, template);

                    function trimObjects(array, template) {
                        var trimmed = [];
                        var tempTemplate = template;
                        for(var i = 0; i < array.length; i++) {
                            var todaysObj = {};
                            for(var key in array[i]) {
                                for(var templateKey in template) {
                                    if(key === templateKey) {
                                        todaysObj[templateKey] = array[i][templateKey];
                                        tempTemplate[templateKey] = array[i][templateKey];
                                    }
                                }                                
                            }
                            trimmed.push(todaysObj);
                        }
                        return trimmed;
                    }

                    //Create object of only articles read in that time period
                    function createTemplate(array) {
                        var objectsRead = {};
                        for(var i = 0; i < array.length; i++) {
                            for (let key in array[i]) {
                                if(array[i][key] !== 0) {
                                    objectsRead[key] = "Checked";
                                }
                            }
                        }
                        return objectsRead;
                    }

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

                    var categoryKeys = Object.getOwnPropertyNames(templateCategories);

                    categoryKeys.sort();
                    
                    var dataset = d3.layout.stack()(categoryKeys.map(function (source) {
                        return finalFinalData.map(function (d) {
                            return {
                                x: Date.parse(d.date).toString('MMM d'),
                                y: +d[source],
                                label: source
                            };
                        });
                    }));

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

                    var color = d3.scale.category20();

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
                            return color(i);
                        });

                    var rect = groups.selectAll("rect")
                        .data(function (d) {
                            return d;
                        })
                        .enter()
                        .append("rect")
                        .attr("x", function (d) {
                            return x(d.x);
                        })
                        .attr("y", function (d) {
                            return y(d.y0 + d.y);
                        })
                        .attr("height", function (d) {
                            return y(d.y0) - y(d.y0 + d.y);
                        })
                        .attr("width", x.rangeBand())
                        .on("mouseover", function () {
                            tooltip.style("display", null);
                        })
                        .on("mouseout", function () {
                            tooltip.style("display", "none");
                        })
                        .on("mousemove", function (d) {
                            var xPosition = d3.mouse(this)[0] - 15;
                            var yPosition = d3.mouse(this)[1] - 25;
                            tooltip.attr("transform", "translate(" + xPosition + "," + yPosition + ")");
                            tooltip.select("text").text(returnSource(d.label, d.y) ) ;
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
                }

                function returnSource(label, articlesRead) {
                    var tooltipText = label + " - " + articlesRead;
                    return tooltipText;
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

                function getLastDays(days) {
                    var lastDays = [];
                    for (let i = 0; i < days; i++) {
                        let date = new Date();
                        date.setDate(date.getDate() - i); //subtract i days from current date
                        lastDays.push(date.toString("M/d/yyyy"));
                    }
                    return lastDays;
                }
            });
        }).catch(function (error) {
            console.log(error);
        });
    });
});

