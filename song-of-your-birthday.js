var request = require('request-promise');
var cheerio = require('cheerio');
var moment = require('moment');

var view = (function view() {/*
    <html>
    <head>
      <title>Song of your birthday</title>
      <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
    </head>
    <body>
      <div class="container">
        <h1 class="text-center">Song of your birthday</h1>
        <p class="lead text-center">
          According to the Billboard Hot 100, the most popular song <a href="http://www.billboard.com/charts/hot-100/<%= date %>">in the week you were born</a> is
          <br><strong><%= title %></strong> by <strong><%= artist %></strong>.
        </p>
        <p class="lead text-center">
          And here is the first search result for that song on YouTube (results may vary)
        </p>
        <div class="text-center">
          <iframe width="640" height="480" src="https://www.youtube.com/embed/<%= videoId %>">
        </div>
      </div>
    </body>
    </html>
*/}).toString().match(/[^]*\/\*([^]*)\*\/\s*\}$/)[1];

module.exports = function(context, req, res) {
  var date = context.data.birthdate;
  if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('A valid date must be provided in the query string. Example: ?birthdate=1980-01-01');
    return;
  }
  
  getTrackForDate(date).then(getYouTubeVideo).then(function(track) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(require('ejs').render(view, track));
  });
};

function getTrackForDate(date) {
    var options = {
      url: 'http://www.billboard.com/fe-ajax/birthdayin/379/weekly/' + date,
      json: true
    };
    return request(options).then(function(result) {
      var track = result.rows[0];
      return {
        title: track.bmdb_title,
        artist: track.bmdb_artistname,
        date: track.date
      };
    });
}

function getYouTubeVideo(track) {
  var query = track.title + ' ' + track.artist;
  var url = 'https://www.youtube.com/results?search_query=' + query;
  return request(url).then(function(response) {
    var $ = cheerio.load(response);
    var href = $('.yt-lockup-title a').attr('href'); 
    var videoId = /v=(.+)/.exec(href);
    track.videoId = videoId ? videoId[1] : '';
    return track;
  });
}