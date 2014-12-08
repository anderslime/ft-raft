var assert = require('chai').assert;
var raft = require('../raft');
var Direct = require('../raft/protocol/direct')

var countLeaders = function(servers) {
  return servers.filter(function(server) { return server.isLeader() }).length;
}

var crashLeader = function(servers) {
  servers.filter(function(server) { return server.isLeader() })[0].crash();
}

var assertOneLeader = function(servers) {
  assert.equal(countLeaders(servers), 1)
}

describe("LeaderElection: the system", function() {
  it("elects a new leader on initialization", function(done) {
    var directProtocol = new Direct(null, {});
    var cluster = raft.buildCluster({
      clusterSize: 5,
      heartbeatDelay: 1,
      electionTimerInterval: [150, 300],
      protocol: directProtocol
    });
    setTimeout(function() {
      assertOneLeader(cluster.servers);
      done();
    }, 1000);
  });

  it("elects a new leader when the leader crashes", function(done) {
    var directProtocol = new Direct(null, {});
    var cluster = raft.buildClusterWithLeader({
      clusterSize: 5,
      heartbeatDelay: 1,
      electionTimerInterval: [150, 300],
      protocol: directProtocol
    });
    crashLeader(cluster.servers);
    assert.equal(countLeaders(cluster.servers), 0);
    setTimeout(function() {
      assertOneLeader(cluster.servers);
      done();
    }, 1000);
  });
});
