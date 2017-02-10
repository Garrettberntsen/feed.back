var sourceDataCount = {};

var config = {
  apiKey: "AIzaSyBb2F9FgRd69-B_tPgShM2CWF9lp5zJ9DI",
  authDomain: "feedback-f33cf.firebaseapp.com",
  databaseURL: "https://feedback-f33cf.firebaseio.com",
  storageBucket: "feedback-f33cf.appspot.com",
  messagingSenderId: "17295082044"
};

firebase.initializeApp(config);

chrome.identity.getProfileUserInfo(function(userInfo) {
  sourceDataCount = sourceDataCount;
  user_id = userInfo.id;
  user_email = userInfo.email;

  return firebase.database().ref('/users/' + user_id).once('value').then(function(snapshot) {

    user = snapshot.val();
    articles = user && user.articles;

    for (article in articles){
      source = articles[article]["source"];
      if(source != undefined ) {
        if(sourceDataCount[source] != undefined) {
          sourceDataCount[source] += 1
        } else {
          sourceDataCount[source] = 1
        }
      }
    }
    sources = Object.keys(sourceDataCount);
    pie_data = []

    for (var i=0;i<sources.length;i++ ) {
      pie_data.push({'source':sources[i], 'count':sourceDataCount[sources[i]], 'index':i});
    }


  var width = 400,
  height = 400,
  radius = Math.min(width, height) / 2;

  var color = d3.scaleOrdinal(d3.schemeCategory10);

  var arc = d3.arc()
      .outerRadius(radius - 10)
      .innerRadius(radius - 100);

  var labelArc = d3.arc()
      .outerRadius(radius - 40)
      .innerRadius(radius - 40);

  var pie = d3.pie()
      .sort(null)
      .padAngle(.02)
      .value(function(d) { return d.count; });

  var svg = d3.select("body").append("svg")
      .attr("width", width)
      .attr("height", height)
    .append("g")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");


  var g = svg.selectAll(".arc")
      .data(pie(pie_data))
    .enter().append("g")
      .attr("class", "arc");

  g.append("path")
      .attr("d", arc)
      .style("fill", function(d) { return color(d.index); });

  g.append("text")
      .attr("transform", function(d) { return "translate(" + labelArc.centroid(d) + ")"; })
      .attr("dy", ".35em")
      .text(function(d) { return d.data.source; });
  g.append("text")
      .attr("transform", function(d) { return "translate(" + labelArc.centroid(d) + ")"; })
      .attr("dy", "1.35em")
      .text(function(d) { return d.data.count; });
  });
});



