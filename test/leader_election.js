var assert = require('chai').assert;
var Server = require('../raft/server');

updatePeers = function(servers) {
  for (serverId in servers) {
    for (otherServerId in servers) {
      if (otherServerId != serverId) {
        servers[serverId].addPeer(servers[otherServerId]);
      }
    }
  }
}


describe("Leader election", function() {
  it("CurrentTerm is 0 at start", function() {
    var server = new Server(1, [], 'follower');
    assert.equal(server.currentTerm, 0);
  });

/*  it("Server timeouts after 0.1 second", function(){
    var server = new Server(1, [], 'follower');

  });*/

  it("Server timeouts and becomes a candidate when without election", function(){
    var server = new Server(1, [], 'follower');
    server.onTimeout(false);
    assert.equal(server.state, "candidate");
  });

  it("Server starts an election after timeout", function(){
    var server = new Server(1, [], 'follower');
    server.onTimeout();
    assert.equal(server.currentTerm, 1);
    assert.equal(server.votedFor, 1);

    //TODO test for reset electiontimer

  });

  describe("server sends RequestVote to all other servers", function() {
    it("all other servers sets votedFor to candidate", function() {
      var server1 = new Server(1, [], 'follower');
      var server2 = new Server(2, [], 'follower');
      var server3 = new Server(3, [], 'follower');
      updatePeers([server1, server2, server3])
      server1.onTimeout()
      assert.equal(server2.votedFor, 1)
      assert.equal(server3.votedFor, 1)
    });

    it("all other servers updates their term", function() {
      var server1 = new Server(1, [], 'follower');
      var server2 = new Server(2, [], 'follower');
      var server3 = new Server(3, [], 'follower');
      updatePeers([server1, server2, server3])
      server1.onTimeout()
      assert.equal(server2.currentTerm, server1.currentTerm)
      assert.equal(server3.currentTerm, server1.currentTerm)
    });
  });

  describe("Requesting vote on election", function() {
    // Rules for Servers: 1. and 2.
    it("is granted a vote", function() {
      var server1 = new Server(1, [], 'candidate', 1);
      var server2 = new Server(2, [], 'follower', 0);
      var voteResponse = server1.invokeVoteRequest(server2);
      assert.equal(voteResponse.term, 1);
      assert.equal(voteResponse.voteGranted, true);
      assert.equal(server2.votedFor, 1);
    });

    // RequestVote RPC: 1. Reply false if term < currentTerm
    it("is not granted a vote if vote term is less than target server's term", function() {
      var server1 = new Server(1, [], 'candidate', 1);
      var server2 = new Server(2, [], 'follower', 2);
      var voteResponse = server1.invokeVoteRequest(server2);
      assert.equal(voteResponse.term, 2);
      assert.equal(voteResponse.voteGranted, false);
    });

    // Rules for Servers: 2. If RPC request or response contains term T > currentTerm:
    // set currentTerm = T, convert to follower
    it("is converted to follower and updates term when outdated", function() {
      var server1 = new Server(1, [], 'candidate', 1);
      var server2 = new Server(2, [], 'follower', 2);
      var voteResponse = server1.invokeVoteRequest(server2);
      assert.equal(voteResponse.voteGranted, false);
      assert.equal(server1.state, 'follower');
      assert.equal(server1.currentTerm, 2)
    });

    // Rules for Servers: 2. If RPC request or response contains term T > currentTerm:
    // set currentTerm = T, convert to follower
    it("is not when target server has already voted for another server", function() {
      var server1 = new Server(1, [], 'candidate', 1);
      var server2 = new Server(2, [], 'follower', 1);
      server2.votedFor = 3;
      var voteResponse = server1.invokeVoteRequest(server2);
      assert.equal(voteResponse.voteGranted, false);
    });

    // Rules for Servers: 2. If RPC request or response contains term T > currentTerm:
    // set currentTerm = T, convert to follower
    it("is not granted a vote when the candidate log is not up to date", function() {
      var server1 = new Server(1, [], 'candidate', 2);
      server1.log = [{"index": 1, "term": 1}];
      var server2 = new Server(2, [], 'follower', 2);
      server2.log = [{"index": 1, "term": 1}, {"index": 5, "term": 2}];
      var voteResponse = server1.invokeVoteRequest(server2);
      assert.equal(voteResponse.voteGranted, false);  
    });
  });

  describe("Evaluating leadership", function() {
    // Rules for Servers: Candidates: If votes received from majority of servers: become leader
    it("becomes a leader when it has received the majority of votes", function() {
      var server1 = new Server(1, [], 'follower');
      var server2 = new Server(2, [], 'follower');
      var server3 = new Server(3, [], 'follower');
      updatePeers([server1, server2, server3])
      server1.onTimeout()
      assert.equal(server1.state, 'leader');
    });

    // Rules for Servers: Candidates: If votes received from majority of servers: become leader
    it("becomes a leader when it has received the majority of votes", function() {
      var server1 = new Server(1, [], 'follower');
      var server2 = new Server(2, [], 'follower');
      var server3 = new Server(3, [], 'follower');
      updatePeers([server1, server2, server3])
      server3.onTimeout()
      server1.onTimeout()
      assert.equal(server3.state, 'leader');
    });
  });
});


