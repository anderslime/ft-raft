var assert = require('chai').assert;
var raft = require('../raft');
var Direct = require('../raft/protocol/direct');

var findLeader = function(servers) {
  return servers.filter(function(server) { return server.isLeader() })[0];
}

var findFollowers = function(servers) {
  return servers.filter(function(server) { return !server.isLeader() });
}

var appendEntryToLeader = function(simulator, entry) {
  var leader = findLeader(simulator.servers);
  simulator.appendEntry(leader.id, entry);
}

describe("Log Replication: the system", function() {
  it("log entry is replicated to all followers", function(done) {
    var simulator = raft.buildClusterWithLeader({
      clusterSize: 5,
      heartbeatDelay: 50,
      electionTimerInterval: [150, 300],
      protocol: new Direct(null, {})
    });
    appendEntryToLeader(simulator, { "value": "x->42" });
    setTimeout(function() {
      var leader = findLeader(simulator.servers);
      var followers = findFollowers(simulator.servers);
      followers.forEach(function(follower) {
        assert.deepEqual(leader.log.logEntries, follower.log.logEntries);
      });
      done();
    }, 1000);
  });

  it("log entry is not replicated to crashed followers", function(done) {
    var simulator = raft.buildClusterWithLeader({
      clusterSize: 5,
      heartbeatDelay: 50,
      electionTimerInterval: [150, 300],
      protocol: new Direct(null, {})
    });
    var awokenFollower = findFollowers(simulator.servers)[0];
    awokenFollower.crash();
    appendEntryToLeader(simulator, { "value": "x->42" });
    setTimeout(function() {
      var leader = findLeader(simulator.servers);
      assert.notDeepEqual(awokenFollower.log.logEntries, leader.log.logEntries);
      done();
    }, 1000);
  });

  it("log entry is replicated to awoken followers", function(done) {
    var simulator = raft.buildClusterWithLeader({
      clusterSize: 5,
      heartbeatDelay: 50,
      electionTimerInterval: [150, 300],
      protocol: new Direct(null, {})
    });
    var awokenFollower = findFollowers(simulator.servers)[0];
    awokenFollower.crash();
    appendEntryToLeader(simulator, { "value": "x->42" });
    setTimeout(function() {
      awokenFollower.restart();
    }, 400);
    setTimeout(function() {
      var leader = findLeader(simulator.servers);
      assert.deepEqual(awokenFollower.log.logEntries, leader.log.logEntries);
      done();
    }, 1000);
  });
});
