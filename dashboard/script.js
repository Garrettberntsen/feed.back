(function(){ 

getData("103440541182310425020");

function getData(id) {
  var daysBack = 10 ;
  var userData = totalData.users[id];
  var email = userData.email;
  var articlesRead = userData.articles;
  var articleObj = createArticleObject(articlesRead);
  var sourceCount = countSources(articlesRead, articleObj);

  createBarChart(sourceCount, articleObj, daysBack);
  createPieChart(sourceCount, articleObj, daysBack);
  createTable(articlesRead);
  var myTable = document.querySelector("#table");
  var dataTable = new DataTable(myTable, {
    searchable: true
  });
}

function createArticleObject(articles) {
  var articleCount = {};

  for (var key in articles) {
    if (articles.hasOwnProperty(key)) {

      var article = articles[key];
      var source = article.source;
      
      if(!articleCount.hasOwnProperty(source)){
        articleCount[source] = 0;
      }

    } 
  }

  return articleCount;
}

function countSources(articles, obj) {
  var size = Object.keys(articles).length;
  var count = {};

  //Loops through object of all articles read
  for (var key in articles) {
    if (articles.hasOwnProperty(key)) {
      var article = articles[key];
      var source = article.source;
      var articleCountCopy = obj;
      var date = new Date(articles[key].dateRead);
      var dateStr = date.toString("M/d/yyyy");

      if(count[dateStr] === undefined) {
        count[dateStr] = JSON.parse(JSON.stringify(obj));
        count[dateStr].date = dateStr;
      }else{
        count[dateStr][source]++;
      }
    }
  }

  return count;
}

function createPieChart(data, obj, timeBack) {
  var daysBack = timeBack;
  var daysBackArr = getLastDays(daysBack);
  var tempObjTwo = JSON.parse(JSON.stringify(obj));

  var dataArray = [];

  for (var key in data) {
    if (data.hasOwnProperty(key)) {
      dataArray.push(data[key]);
    }
  }

  //adds missing dates to arr
  for(var i = 0; i < daysBackArr.length; i++) {

    if( arrayObjectIndexOf(dataArray, daysBackArr[i], "date" ) < 0 ) {
      var tempObj = {};
      tempObj = JSON.parse(JSON.stringify(obj));
      tempObj.date = daysBackArr[i];
      dataArray.push(tempObj);
    }
  }

  function arrayObjectIndexOf(myArray, searchTerm, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
      if (myArray[i].date === searchTerm) return i;
    }
    return -1;
  }

  dataArray.sort(function(a,b) {
    var dateA = Date.parse(a.date);
    var dateB = Date.parse(b.date);
    
    if(dateA < dateB) return -1;
    if(dateA > dateB) return 1;
    return 0;
  });

  var finalData = dataArray.splice(  dataArray.length - daysBack, dataArray.length  );

  var sum = 0;

  for(var i = 0; i < finalData.length; i++) {
    for(var property in finalData[i]) {
      if(finalData[i].hasOwnProperty(property)) {
        var currentCount = finalData[i][property];
        tempObjTwo[property] += currentCount;

      }
    }
  }

  var tempArr = [];

  for(var property in tempObjTwo) {
    if(tempObjTwo.hasOwnProperty(property)) {
      var tempArticleCount = {};
      tempArticleCount["label"] = property;
      tempArticleCount["count"] = tempObjTwo[property];
      tempArr.push(tempArticleCount);      
    }
  };

  var dataset = tempArr.slice(0, tempArr.length - 1);

  var donutWidth = 75;

  var width = 480,
      height = 288;
  var radius = Math.min(width, height) / 2;

  var pie = d3.layout.pie()
    .value(function(d){return d.count})
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
    .attr("transform", "translate("+ 150+","+(height/2)+ ")"); 

  var path = svg.selectAll("path")
    .data(pie(dataset))
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("fill", function(d,i){ return color(d.data.label) });

  var legendRectSize = 18;
  var legendSpacing = 4;

  var legend = svg.selectAll(".legend")
    .data(color.domain())
    .enter()
    .append("g")
    .attr("class", "legend")
    .attr("transform", function(d, i) {
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
      .text(function(d) {return d; });
}

function createBarChart(data, obj, timeBack) {
  var daysBack = timeBack;
  var daysBackArr = getLastDays(daysBack);
  var categoryKeys = Object.getOwnPropertyNames(obj);

  var dataArray = [];

  for (var key in data) {
    if (data.hasOwnProperty(key)) {
      dataArray.push(data[key]);
    }
  }

  //adds missing dates to arr
  for(var i = 0; i < daysBackArr.length; i++) {

    if( arrayObjectIndexOf(dataArray, daysBackArr[i], "date" ) < 0 ) {
      var tempObj = {};
      tempObj = JSON.parse(JSON.stringify(obj));
      tempObj.date = daysBackArr[i];
      dataArray.push(tempObj);
    }
  }

  function arrayObjectIndexOf(myArray, searchTerm, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
      if (myArray[i].date === searchTerm) return i;
    }
    return -1;
  }

  dataArray.sort(function(a,b) {
    var dateA = Date.parse(a.date);
    var dateB = Date.parse(b.date);
    
    if(dateA < dateB) return -1;
    if(dateA > dateB) return 1;
    return 0;
  });


  var finalData = dataArray.splice(  dataArray.length - daysBack, dataArray.length  );

  var margin = {
    top: 10,
    right: 30,
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

  var dataset = d3.layout.stack()( categoryKeys.map(function(objective) {
    return finalData.map(function(d) {
      return {
        x: Date.parse(d.date).toString('MMM d'),
        y: +d[objective]
      };
    });
  }));

  var x = d3.scale.ordinal()
    .domain(dataset[0].map(function(d) {
      return d.x;
    }))
    .rangeRoundBands([10, width - 10], 0.02);

  var y = d3.scale.linear()
    .domain([0, d3.max(dataset, function(d){
      return d3.max(d, function(d){
        return d.y + d.y;
      });
    })])
    .range([height, 0]);

  var colors = ["#e5f5f9", "#99d8c9", "#2ca25f", "#e0ecf4", "#9ebcda", "#8856a7", "#fee8c8", "#fdbb84", "#e34a33", "#e5f5e0", "#a1d99b", "#31a354"];
  var color = d3.scale.category20();

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(5)
    .tickSize(-width, 0, 0)
    .tickFormat(function(d) {
      return d
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
    .attr("fill", function(d,i){ return color(i) });

  var rect = groups.selectAll("rect")
    .data(function(d) {
      return d;
    })
    .enter()
    .append("rect")
    .attr("x", function(d) {
      return x(d.x);
    })
    .attr("y", function(d) {
      return y(d.y0 + d.y);
    })
    .attr("height", function(d) {
      return y(d.y0) - y(d.y0 + d.y);
    })
    .attr("width", x.rangeBand())
    .on("mouseover", function() {
      tooltip.style("display", null);
    })
    .on("mouseout", function() {
      tooltip.style("display", "none");
    })
    .on("mousemove", function(d) {
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

function createTable(data) {
  var articlesRead = [];
  var tableElem = document.getElementById("table-body");

  for (var key in data) {
    if (data.hasOwnProperty(key)) {
      var currentArticle = totalData.articles[key];

      var userEvaluation = ""; //to add
      var dateRead =  new Date(data[key].dateRead).toString("M/dd/yyyy"); 
      var publisher = currentArticle.source;
      var title = currentArticle.title;
      var type = ""; //to add
      var author = currentArticle.author;
      var slant = ""; //to add
      var read = ""; //to add

      var articleData = new Array(userEvaluation, dateRead, publisher, title, type, author, read)

      articlesRead.push(articleData);

    }
  }

  articlesRead.sort(function (a, b) {
    return Date.parse(b[1]) - Date.parse(a[1]);
  });

  for(var i = 0; i < articlesRead.length; i++) {
    var tr = document.createElement("TR");
    for(var j = 0; j < articlesRead[j].length; j++) {
      var td = document.createElement("TD");
        td.appendChild(document.createTextNode(articlesRead[i][j]));
        tr.appendChild(td)
    }
    tableElem.appendChild(tr);
  } 
}

function getLastDays(days) {
  var lastDays = [];
  for (var i = 0; i < days; i++) {
    var date = Date.today().addDays(-i).toString("M/d/yyyy");
    lastDays.push(date);
  }
  return lastDays;
}

})();