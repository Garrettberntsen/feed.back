// Function to create hashes for article keys
String.prototype.hashCode = function() {
    var hash = 0,
        i, chr, len;
    if (this.length === 0) return hash;
    for (i = 0, len = this.length; i < len; i++) {
        chr = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

var sourceDataCount = {};

var bg = chrome.extension.getBackgroundPage();
bg.database.ref('/users/' + bg.user_id).once('value').then(function(snapshot) {
	user = snapshot.val();
	articles = user && user.articles;

	for (var article in articles){
	  source = articles[article].source;
	  if(source !== undefined ) {
		if(sourceDataCount[source] !== undefined) {
		  sourceDataCount[source] += 1;
		} else {
		  sourceDataCount[source] = 1;
		}
	  }
	}
	sources = Object.keys(sourceDataCount);
	pie_data = [];

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
	  .padAngle(0.02)
	  .value(function(d) { return d.count; });

	var svg = d3.select("#donut").append("svg")
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

function setLeanColor(value, text) {
	var color;
	switch(value) {
		case '1':
			color = '#0014E5';
			break;
		case '2':
			color = '#2611BE';
			break;
		case '3':
			color = '#4C0E98';
			break;
		case '4':
			color = '#730B72';
			break;
		case '5':
			color = '#99084C';
			break;
		case '6':
			color = '#BF0526';
			break;
		case '7':
			color = '#E60300';
			break;
		default:
	}
	$('.br-theme-bars-movie .br-widget a').css('background-color','');
	$('.br-theme-bars-movie .br-widget a.br-selected').css('background-color',color);
	$('.br-theme-bars-movie .br-widget .br-current-rating').css('color',color);
}

$(document).ready(function(){
	var isArticle = false;
	var article_key;
		
	chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
		var url = tabs[0].url.replace(/.*?:\/\/(www\.)?/, '').replace(/(\.html?).*/, '$1');
		article_key = url.hashCode();
		bg.database.ref('/users/' + bg.user_id  + '/articles/' + article_key).once('value').then(function(snapshot) {
			if(snapshot.exists()) {
				isArticle = true;
				
				bg.database.ref('users/' + bg.user_id + '/articles/' + article_key).once('value').then(function(snapshot) {
					$('#leanRating').barrating({
						theme: 'bars-movie',
						initialRating: snapshot.val().lean,
						onSelect: setLeanColor
					});
					setLeanColor(snapshot.val().lean);
					$('#starRating').barrating({
						theme: 'fontawesome-stars',
						initialRating: snapshot.val().stars
					});
					$("form").show();
				});
			} else {
				$('starRating').barrating('destroy');
				$('leanRating').barrating('destroy');
				$("form").remove();
			}
		});
	});
	
	$("form").submit(function(){
        if(isArticle) {
			bg.database.ref('users/' + bg.user_id + '/articles/' + article_key + '/stars').set($('#starRating').val());
			bg.database.ref('users/' + bg.user_id + '/articles/' + article_key + '/lean').set($('#leanRating').val());
			alert("Ratings submitted!");
		} else {
			alert("Not a valid article");
		}
		return false;
    });
});

