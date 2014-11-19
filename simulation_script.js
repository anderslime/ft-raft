var clivas = require('clivas');
var EventEmitter = require("events").EventEmitter;
var raft = require('./raft')

// Server seup
var cluster = raft.buildCluster(5);

// Server configuration
var http = require('http');
var url = require("url");

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


// Drawing stuff
function drawScreen() {
  clivas.clear();
  cluster.servers.map(function(server) {
    firstLine = [
      "Server ",
      server.id,
      " lastLogIndex: ",
      server._lastLogIndex(),
      " ('",
      inColor(serverColor(server), server.state),
      "'): ",
      server.electionTimeoutMilSec,
    ].join("")
    puncuations = server.log.length() > 5 ? '... ' : '';
    secondLine = "[" + puncuations + server.log.logEntries.slice(-5).map(function(logEntry) {
      return ["v->", logEntry.value,", t->", logEntry.term].join("")
    }).join("], [") + "]"
    clivas.line(firstLine);
    clivas.line(secondLine);
  });
}

function inColor(color, text) {
  return "{"+color+":"+text+"}";
}

function serverColor(server) {
  if (server.isDown) return 'red';
  if (server.isLeader()) return 'green';
  return 'yellow';
}


// Clock stuff
CLOCK_INTERVAL_IN_MIL_SEC = 100;
var ee = new EventEmitter();

ee.on("clock", function (theServer) {
  theServer.decrementElectionTimeout(CLOCK_INTERVAL_IN_MIL_SEC);
  drawScreen();
});

var clocks = [];

setupClock = function(peer) {
  setInterval(function() {
    ee.emit("clock", peer);
  }, CLOCK_INTERVAL_IN_MIL_SEC);
}

for (var peerIndex in cluster.servers) {
  var peer = cluster.servers[peerIndex];
  setupClock(peer)
}
