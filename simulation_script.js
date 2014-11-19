var Server = require('./raft/server')
var clivas = require('clivas');
var fs = require('fs');
var EventEmitter = require("events").EventEmitter;
fs.unlink('log.log');

// Server seup
updatePeers = function(servers) {
  for (serverId in servers) {
    for (otherServerId in servers) {
      if (otherServerId != serverId) {
        servers[serverId].addPeer(servers[otherServerId]);
      }
    }
  }
}
var servers = [1,2,3,4,5].map(function(serverId) {
  return new Server(serverId, [], 'follower');
});
updatePeers(servers);

// Server configuration
var http = require('http');
var url = require("url");

http.createServer(function (request, response) {
    response.writeHead(200, {'Content-Type': 'text/plain'});
    var parsedUrl = url.parse(request.url, true);
    var query = parsedUrl.query;
    var responseMessage = "No Command\n";
    if (query.command.toString() === 'crash' && query.serverId) {
      servers[parseInt(query.serverId) - 1].crash();
      response.end("CRASHING SERVER " + query.serverId + "\n");
    } else if (query.command === 'restart' && query.serverId) {
      servers[parseInt(query.serverId) - 1].restart();
      response.end("RESTARTING SERVER " + query.serverId + "\n");
    } else if (query.command === 'request' && query.value) {
      var raftResponse = servers[parseInt(query.serverId) - 1].onReceiveClientRequest({
        "value": query.value
      })
      response.end("SUCCESS: " + raftResponse.isSuccessful + ", leaderId: " + raftResponse.leaderId);
    } else {
      response.end("COMMAND NOT RECOGNIZED");
    }
}).listen(8080);


// Drawing stuff
function drawScreen() {
  clivas.clear();
  servers.map(function(server) {
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
    secondLine = "[" + server.log.logEntries.map(function(logEntry) {
      return ["v->", logEntry.value,", t->", logEntry.term].join("")
    }).join("], [") + "]"
    clivas.line(firstLine);
    clivas.line(secondLine);
    fs.appendFile("log.log", firstLine + "\n");
    fs.appendFile("log.log", secondLine + "\n");
    if (server.isLeader()) {
      nextIndexLine = [
        "next index:",
        server.leaderState.nextIndex.toString()
      ].join(" ")
      matchIndexLine = [
        "match index: ",
        server.leaderState.matchIndex.toString()
      ].join(" ")
      // clivas.line(nextIndexLine);
      // clivas.line(matchIndexLine);
      fs.appendFile("log.log", nextIndexLine + "\n");
      fs.appendFile("log.log", matchIndexLine + "\n");
    }
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

for (var peerIndex in servers) {
  var peer = servers[peerIndex];
  setupClock(peer)
}
