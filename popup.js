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

function setLeanColor(value) {
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
	$('#avg-lean-message').show();
}

$(document).ready(function(){	
	chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
		var url = tabs[0].url.replace(/.*?:\/\/(www\.)?/, '').replace(/\?(.*)$/, '');
		var article_key = url.hashCode();
		bg.database.ref('articles/' + article_key).once('value').then(function(snapshot) {
			if(snapshot.exists()) {
				var article = snapshot.val();
				$('#title').text(article.title);
				if(article.author) {
					var authors = '';
					for(var author in article.author) {
						authors += article.author[author] + ', ';
					}
					authors = authors.substring(0, authors.length - 2);
					$('#author').text('by ' + authors);
				}
				$('#read-count').text(Object.keys(article.readers).length);
				bg.database.ref('users/' + bg.user_id + '/articles/' + article_key).once('value').then(function(snapshot) {
					$('#leanRating').barrating({
						theme: 'bars-movie',
						initialRating: snapshot.val().lean,
						onSelect: function(value, text) {
							setLeanColor(value);
							bg.database.ref('users/' + bg.user_id + '/articles/' + article_key + '/lean').set($('#leanRating').val());
						}
					});
					if(snapshot.val().lean) {
						setLeanColor(snapshot.val().lean);
					}
					$('#starRating').barrating({
						theme: 'fontawesome-stars',
						initialRating: snapshot.val().stars,
						onSelect: function(value, text) {
							bg.database.ref('users/' + bg.user_id + '/articles/' + article_key + '/stars').set($('#starRating').val());		
							$('#avg-rating-message').show();
						}
					});
					if(snapshot.val().stars) {
						$('#avg-rating-message').show();
					}
					$("form").show();
				});
			} else {
				//build graph				
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
			}
		});
	});
});

