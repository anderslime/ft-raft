// Server configuration
var http = require('http');
var url = require("url");
var qs = require('querystring');

module.exports.startServer = function(cluster) {
  var handleCommand = function(query, response) {
    if (query.command.toString() === 'crash' && query.serverId) {
      cluster.crash(parseInt(query.serverId))
      response.end("CRASHING SERVER " + query.serverId + "\n");
    } else if (query.command === 'restart' && query.serverId) {
      cluster.restart(parseInt(query.serverId))
      response.end("RESTARTING SERVER " + query.serverId + "\n");
    } else if (query.command === 'entry' && query.value) {
      var raftResponse = cluster.appendEntry(parseInt(query.serverId), query.value);
      if (raftResponse) {
        response.end(
          "SUCCESS: " + raftResponse.isSuccessful + ", leaderId: " + raftResponse.leaderId
        );
      }
    }
    response.end("Invalid Command or the server does not exist");
  };

  http.createServer(function (request, response) {
    response.writeHead(200, {'Content-Type': 'text/plain'});
    var parsedUrl = url.parse(request.url, true);
    var query = parsedUrl.query;
    var responseMessage = "No Command\n";
    var data = "";

    request.on("data", function(chunk) {
        data += chunk;
    });

    request.on("end", function() {
        var query = qs.parse(data);
        handleCommand(query, response);
    });
  }).listen(8080);
};
