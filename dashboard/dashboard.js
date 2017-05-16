/*jshint esversion: 6 */
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
                var daysBack = 10;
                var userData = userSnapshot.val();
                var email = user.email;
                var articlesRead = userData.articles;
                var articleObj = createArticleObject(articlesRead);
                var sourceCount = countSources(articlesRead, articleObj);

                createPieChart(sourceCount, articleObj, daysBack);
                createBarChart(sourceCount, articleObj, daysBack);
                createTable(articlesRead, {ids: article_ids, snapshots: articleSnapshots});

                var myTable = document.querySelector("#table");
                var dataTable = new DataTable(myTable, {
                    searchable: true,
                    perPage: 25,
                    perPageSelect: [25, 50, 100]
                }); 

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
                    var size = Object.keys(articles).length;
                    var count = {};
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

                    var sum = 0;

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

                    var donutWidth = 75;

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
                        .padAngle(0.03);

                    var color = d3.scale.category20();

                    var svg = d3.select("div.donut-chart")
                        .append("svg")
                        .attr("class", "chart")
                        .attr("width", width)
                        .attr("height", height)
                        .append("g")
                        .attr("transform", "translate(" + 150 + "," + (height / 2) + ")");

                    var path = svg.selectAll("path")
                        .data(pie(dataset))
                        .enter()
                        .append("path")
                        .attr("d", arc)
                        .attr("fill", function (d, i) {
                            return color(d.data.label);
                        });

                    var legendRectSize = 18;
                    var legendSpacing = 4;

                    var legend = svg.selectAll(".legend")
                        .data(color.domain())
                        .enter()
                        .append("g")
                        .attr("class", "legend")
                        .attr("transform", function (d, i) {
                            var height = legendRectSize + legendSpacing;
                            var offset = height * color.domain().length / 2;
                            var horz = 12 * legendRectSize;
                            var vert = i * height - offset;
                            return "translate( " + horz + "," + vert + ")";
                        });

                    legend.append("rect")
                        .attr("width", legendRectSize)
                        .attr("height", legendRectSize)
                        .style("fill", color)
                        .style("stroke", color);

                    legend.append("text")
                        .attr("x", legendRectSize + legendSpacing)
                        .attr("y", legendRectSize - legendSpacing)
                        .text(function (d) {
                            return d;
                        });
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
                        top: 10,
                        right: 0,
                        bottom: 25,
                        left: 30
                    };

                    var width = 640 - margin.left - margin.right,
                        height = 288 - margin.top - margin.bottom;

                    var svg = d3.select("div.bar-chart")
                        .append("svg")
                        .attr("class", "chart")
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom)
                        .append("g")
                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                    var categoryKeys = Object.getOwnPropertyNames(templateCategories);

                    categoryKeys.sort();
                    
                    var dataset = d3.layout.stack()(categoryKeys.map(function (objective) {
                        return finalFinalData.map(function (d) {
                            console.log( +d[objective] );
                            return {
                                x: Date.parse(d.date).toString('MMM d'),
                                y: +d[objective]
                            };
                        });
                    }));

                    console.log(dataset);

                    var x = d3.scale.ordinal()
                        .domain(dataset[0].map(function (d) {
                            return d.x;
                        }))
                        .rangeRoundBands([10, width - 10], 0.2);

                    var y = d3.scale.linear()
                        .domain([0, d3.max(dataset, function (d) {
                            return d3.max(d, function (d) {
                                return d.y + d.y;
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
                            tooltip.select("text").text(d.y);
                        });

                    // //Draw the Legend
                    // var legend = svg.selectAll(".legend")
                    //   .data(color.domain())
                    //   .enter().append("g")
                    //   .attr("class", "legend")
                    //   .attr("transform", function(d,i) {
                    //     return "translate(30, " + i * 20 + ")";
                    //   });

                    // legend.append("rect")
                    //   .attr("x", width - 10)
                    //   .attr("width", 10)
                    //   .attr("height", 10)
                    //   .style("fill", color)
                    //   .style("stroke", color);

                    // legend.append("text")
                    //   .attr("x", width + 5)
                    //   .attr("y", 5)
                    //   .attr("dy", ".35em")
                    //   .style("text-anchor", "start")
                    //   .text(function(d) {return categoryKeys[d] ; });

                    var tooltip = svg.append("g")
                        .attr("class", "tooltip")
                        .style("display", "none");

                    tooltip.append("rect")
                        .attr("width", 30)
                        .attr("height", 20)
                        .attr("fill", "white")
                        .style("opacity", 0.5);

                    tooltip.append("text")
                        .attr("x", 15)
                        .attr("dy", "1.2em")
                        .style("text-anchor", "middle")
                        .attr("font-size", "12px")
                        .attr("font-weight", "bold");
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
                            var dateRead = {
                                string: '',
                                unix: 0
                            };

                            var userEvaluation = userArticleInformation[key].stars; //to add
                            dateRead.string = new Date(userArticleInformation[key].dateRead).toString("M/dd/yyyy");
                            dateRead.unix = userArticleInformation[key].dateRead;
                            console.log(dateRead.unix);
                            var publisher = currentArticle.source;
                            var title = currentArticle.title;
                            var type = ""; //to add
                            var author = currentArticle.author;
                            var slant = currentArticle.lean; //to add
                            var read_percentage = userArticleInformation[key].scrolled_content_ratio;

                            var articleData = new Array(userEvaluation, dateRead, publisher, title, type, author, read_percentage);
                            articlesRead.push(articleData);
                        }
                    }

                    articlesRead.sort(function (a, b) {
                        var articleA = a[1].unix;
                        var articleB = b[1].unix;
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
                                var content = articlesRead[i][j].string ? articlesRead[i][j].string : "";
                            }
                            if (j === 6) {
                                content = Math.floor(Number(content) * 100);
                            }
                            td.appendChild(document.createTextNode(content));
                            tr.appendChild(td);
                        }
                        tableElem.appendChild(tr);
                    }
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