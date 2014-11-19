// Server configuration
var http = require('http');
var url = require("url");

module.exports.startServer = function(cluster) {
  http.createServer(function (request, response) {
    response.writeHead(200, {'Content-Type': 'text/plain'});
    var parsedUrl = url.parse(request.url, true);
    var query = parsedUrl.query;
    var responseMessage = "No Command\n";
    if (query.command.toString() === 'crash' && query.serverId) {
      cluster.crash(parseInt(query.serverId))
      response.end("CRASHING SERVER " + query.serverId + "\n");
    } else if (query.command === 'restart' && query.serverId) {
      cluster.restart(parseInt(query.serverId))
      response.end("RESTARTING SERVER " + query.serverId + "\n");
    } else if (query.command === 'request' && query.value) {
      cluster.request(parseInt(query.serverId), query.value)
      response.end("SUCCESS: " + raftResponse.isSuccessful + ", leaderId: " + raftResponse.leaderId);
    } else {
      response.end("COMMAND NOT RECOGNIZED");
    }
  }).listen(8080);
};
