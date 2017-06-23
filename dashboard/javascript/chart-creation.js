var color = 
        ["#393B79", "#3182BD", "#E6550D", "#31A354", "#CE6BDB", "#17BECF",
        "#ED6A5A", "#EFCB68", "#88D18A", "#3E5C76", "#D1D1D1", "#114B5F",
        "#FFE74C", "#FE5F55", "#35A7FF", "#468966", "#B64926", "#1695A3",
        "#BDD4DE", "#832F5C", "#382513", "#363942", "#405952", "#F54F29",
        "#083643", "#CEF09D", "#FF974F", "#91BED4", "#365FB7", "#D23600",
        "#FC9D9A", "#83AF9B", "#791F33", "#78C0F9", "#FFDBE6", "#B9121B"];

function createBarChart(dataset) {
  var margin = {
    top: 10,
    right: 0,
    bottom: 25,
    left: 30
  };

  var width = 960 - margin.left - margin.right,
    height = 288 - margin.top - margin.bottom;

  var svg = d3.select("div.bar-chart")
    .append("svg")
    .attr("class","chart chart--font")
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
        if(d.y === 1){
          return d.y * 6;
        } 
        else{
          return d.y * 3;
        }
      });
    })])
    .range([height, 0]);

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

  svg.append("g")
    .attr("class", "y-axis")
    .call(yAxis)

  svg.append("g")
    .attr("class", "x-axis")
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

  if(dataset[0].length > 14) {
    var parent = d3.select(".x-axis")[0][0];
    var ticks = d3.selectAll(".x-axis .tick")[0];
    for(var i = 1; i < ticks.length; i += 2){
      parent.removeChild(ticks[i]);
    }
  };

  function returnSource(label, articlesRead) {
    var tooltipText = label + " - " + articlesRead;
    return tooltipText;
  }
}

function createTable(userArticleInformation, articleInformation) {
  console.log(userArticleInformation);
  var keys = Object.keys(userArticleInformation);
  var length = Object.keys(userArticleInformation).length;

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