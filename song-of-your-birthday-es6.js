const request = require('request-promise');
const cheerio = require('cheerio');
const moment = require('moment');

const view = `
    <html>
    <head>
      <title>Song of your birthday</title>
      <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
    </head>
    <body>
      <div class="container">
        <h1 class="text-center">Song of your birthday</h1>
        <% if (title) { %>
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
        <% } else { %>
        <p class="lead text-center">Ooops... According to the Billboard Hot 100, there is no song available for the week you were born. What a bummer! :(</p>
        <% } %>
      </div>
    </body>
    </html>`

module.exports = (context, req, res) => {
  const date = context.data.birthdate;
  if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('A valid date must be provided in the query string. Example: ?birthdate=1980-01-01');
    return;
  }
  
  getTrackForDate(date).then(getYouTubeVideo).then(track => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(require('ejs').render(view, track));
  })
  .catch(error => {
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`That's embarassing, but something went wrong: ${error}`);
  });
};

function getTrackForDate(date) {
    const options = {
      url: 'http://www.billboard.com/fe-ajax/birthdayin/379/weekly/' + date,
      json: true
    };
    return request(options).then(result => {
      const row = result && result.rows ? result.rows[0] : {};
      return {
        title: row.bmdb_title,
        artist: row.bmdb_artistname,
        date: row.date
      };
    });
}

function getYouTubeVideo(track) {
  if (!track.title) return Promise.resolve(track);
  
  const query = `${track.title} ${track.artist}`;
  const url = `https://www.youtube.com/results?search_query=${query}`;
  return request(url).then(response => {
    const $ = cheerio.load(response);
    const href = $('.yt-lockup-title a').attr('href'); 
    const videoId = /v=(.+)/.exec(href);
    track.videoId = videoId ? videoId[1] : '';
    track.unavailable = false;
    return track;
  });
}