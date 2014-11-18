var Server = require('./raft/server')
var clivas = require('clivas');

var EventEmitter = require("events").EventEmitter;

updatePeers = function(servers) {
  for (serverId in servers) {
    for (otherServerId in servers) {
      if (otherServerId != serverId) {
        servers[serverId].addPeer(servers[otherServerId]);
      }
    }
  }
}

var server1 = new Server(1, [], 'follower');
var server2 = new Server(2, [], 'follower');
var server3 = new Server(3, [], 'follower');
var peers = [server1, server2, server3];
updatePeers(peers);

function drawScreen() {
  clivas.clear();
  peers.map(function(server) {
    clivas.line(
      [
        "Server ",
        server.id,
        " ('{",
        serverColor(server),
        ":",
        server.state,
        "}'): ",
        server.electionTimeoutMilSec
      ].join("")
    );
  });
}

function serverColor(server) {
  if (server.isLeader()) return 'green';
  return 'blue';
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

for (var peerIndex in peers) {
  var peer = peers[peerIndex];
  setupClock(peer)
}
