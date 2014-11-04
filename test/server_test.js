var assert = require('chai').assert;
var Server = require('../raft/server');

describe("Server", function() {
  it("is created with paramters", function() {
    var server = new Server(1, [], 'follower');
    assert.equal(server.id, 1);
    assert.sameMembers(server.peers, []);
    assert.equal(server.state, 'follower');
  });

  it("becomes leader", function() {
    var server = new Server(1, [], 'follower');
    server.becomeLeader();
    assert.equal(server.state, 'leader');
  });

  context("when starting an election", function() {
    it("becomes a candidate", function() {
      var server = new Server(1, [], 'follower');
      server.startElection();
      assert.equal(server.state, 'candidate');
    });
  });
});
