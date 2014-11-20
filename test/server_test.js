var assert = require('chai').assert;
var Server = require('../raft/server');
var Log = require('../raft/log');

updatePeers = function(servers) {
  for (serverId in servers) {
    for (otherServerId in servers) {
      if (otherServerId != serverId) {
        servers[serverId].addPeer(servers[otherServerId]);
      }
    }
  }
}

// Rules for Servers: Followers ($5.2)
describe("Rules for Followers", function() {
  describe("Respond to RPCs from candidates and leaders", function() {
    it("responds to RequestVote RPCs from candidate", function() {
      var server1 = new Server(1, 'follower');
      var server2 = new Server(2, 'candidate');
      updatePeers([server1, server2]);
      response = server2.invokeVoteRequest(server1);
      assert.isNotNull(response);
    });

    it("responds to AppendEntries RPC from leader", function() {
      var server1 = new Server(1, 'leader');
      var server2 = new Server(2, 'follower');
      updatePeers([server1, server2]);
      response = server1.invokeVoteRequest(server2);
      assert.isNotNull(response);
    });
  });
});

  // Rules for servers: Candidates ($5.2)
describe("Rules for Candidates", function() {
  describe("On conversion to candidate, start election:", function() {
    it("increments currentTerm", function() {
      var server1 = new Server(1, 'follower');
      server1.onTimeout();
      assert.equal(server1.currentTerm, 1);
    });

    it("votes for self", function() {
      var server1 = new Server(1, 'follower');
      var server2 = new Server(2, 'follower');
      updatePeers([server1, server2]);
      server2.votedFor = 2;
      server1.onTimeout();
      assert.equal(server1.votedFor, 1)
    });

    it("resets election timer", function() {
      // TODO: Test this
    });

    describe("sending RequestVote RPCs to all other servers", function() {
      it("is granted a vote", function() {
        var server1 = new Server(1, 'candidate');
        server1.currentTerm = 1;
        var server2 = new Server(2, 'follower');
        updatePeers([server1, server2]);
        var voteResponse = server1.invokeVoteRequest(server2);
        assert.equal(voteResponse.term, 1);
        assert.equal(voteResponse.voteGranted, true);
        assert.equal(server2.votedFor, 1);
      });

      // RequestVote RPC: 1. Reply false if term < currentTerm
      it("is not granted a vote if vote term is less than target server's term", function() {
        var server1 = new Server(1, 'candidate');
        server1.currentTerm = 1;
        var server2 = new Server(2, 'follower');
        server2.currentTerm = 2;
        updatePeers([server1, server2]);
        var voteResponse = server1.invokeVoteRequest(server2);
        assert.equal(voteResponse.term, 2);
        assert.equal(voteResponse.voteGranted, false);
      });

      // Rules for Servers: 2. If RPC request or response contains term T > currentTerm:
      // set currentTerm = T, convert to follower
      it("is converted to follower and updates term when outdated", function() {
        var server1 = new Server(1, 'candidate');
        server1.currentTerm = 1;
        var server2 = new Server(2, 'follower');
        server2.currentTerm = 2;
        updatePeers([server1, server2]);
        var voteResponse = server1.invokeVoteRequest(server2);
        assert.equal(voteResponse.voteGranted, false);
        assert.equal(server1.state, 'follower');
        assert.equal(server1.currentTerm, 2)
      });

      // Rules for Servers: 2. If RPC request or response contains term T > currentTerm:
      // set currentTerm = T, convert to follower
      it("is not granted a vote when target server that has already voted for another server", function() {
        var server1 = new Server(1, 'candidate');
        var server2 = new Server(2, 'follower');
        server2.votedFor = 3;
        updatePeers([server1, server2]);
        var voteResponse = server1.invokeVoteRequest(server2);
        assert.equal(voteResponse.voteGranted, false);
      });

      // Rules for Servers: 2. If RPC request or response contains term T > currentTerm:
      // set currentTerm = T, convert to follower
      it("is not granted a vote when the candidate log is not up to date", function() {
        var server1 = new Server(1, 'candidate');
        server1.currentTerm = 2;
        server1.log = new Log([{"index": 1, "term": 1}]);
        var server2 = new Server(2, 'follower');
        server2.currentTerm = 2;
        updatePeers([server1, server2]);
        server2.log = new Log([{"index": 1, "term": 1}, {"index": 5, "term": 2}]);
        var voteResponse = server1.invokeVoteRequest(server2);
        assert.equal(voteResponse.voteGranted, false);
      });
    });
  });

  describe("If votes received from majority of servers, become leader", function() {
    describe("with 5 peers in network", function() {
      it("becomes leader when receiving 3 votes", function() {
        var server1 = new Server(1, 'follower');
        var server2 = new Server(2, 'follower');
        var server3 = new Server(3, 'follower');
        var server4 = new Server(4, 'follower');
        var server5 = new Server(5, 'candidate');
        server4.votedFor = 5;
        server5.votedFor = 5;
        updatePeers([server1, server2, server3, server4, server5])
        server1.onTimeout()
        assert.equal(server1.state, 'leader');
      });

      it("does not become leader when receiving 2 votes", function() {
        var server1 = new Server(1, 'follower');
        var server2 = new Server(2, 'follower');
        var server3 = new Server(3, 'follower');
        var server4 = new Server(4, 'follower');
        var server5 = new Server(5, 'candidate');
        server3.votedFor = 5;
        server4.votedFor = 5;
        server5.votedFor = 5;
        updatePeers([server1, server2, server3, server4, server5]);
        server1.onTimeout();
        assert.equal(server1.state, 'candidate');
      });
    });

    describe("with 4 peers in network", function() {
      it("becomes leader when receiving 3 votes", function() {
        var server1 = new Server(1, 'follower');
        var server2 = new Server(2, 'follower');
        var server3 = new Server(3, 'follower');
        var server4 = new Server(4, 'candidate');
        server4.votedFor = 4;
        updatePeers([server1, server2, server3, server4])
        server1.onTimeout()
        assert.equal(server1.state, 'leader');
      });

      it("does not become leader when only receiving 2 votes", function() {
        var server1 = new Server(1, 'follower');
        var server2 = new Server(2, 'follower');
        var server3 = new Server(3, 'follower');
        var server4 = new Server(4, 'candidate');
        server1.votedFor = 3;
        server2.votedFor = 3;
        updatePeers([server1, server2, server3, server4]);
        server4.onTimeout();
        assert.equal(server4.state, 'candidate');
      });
    });
  });

  describe("If AppendEntries RPC received from new leader: convert to follower", function() {
    it("becomes follower when receiving AppendEntries from leader", function() {
      var server1 = new Server(2, 'leader');
      var server2 = new Server(3, 'candidate');
      server1.invokeAppendEntries(server2);
      assert.equal(server2.state,'follower');
    });
  });

  describe("Receiver AppendEntries Implementation", function() {
    // Rule 1
    it("replies false if term < currentTerm", function() {
      var server1 = new Server(2, 'leader');
      var server2 = new Server(3, 'candidate');
      server2.currentTerm = 2;
      var result = server1.invokeAppendEntries(server2);
      assert.equal(result.success, false);
    });
    // Rule 1
    it("replies true if term >= currentTerm", function() {
      var server1 = new Server(2, 'leader');
      server1.currentTerm = 2;
      var server2 = new Server(3, 'candidate');
      server1.currentTerm = 2;
      var result = server1.invokeAppendEntries(server2);
      assert.equal(result.success, true);
    });
    // Rule 2
    it("reply false if log doesn't contain entry at prevLogIndex", function() {
      var server1Log = new Log([{"index": 1, "term": 2}]);
      var server1 = new Server(1, 'leader', server1Log);
      server1.currentTerm = 2;
      var server2 = new Server(2, 'follower');
      server2.currentTerm = 2;
      var result = server1.invokeAppendEntries(server2);
      assert.equal(result.success, false);
    });
    // Rule 2
    it("reply false if log doesn't contain entry at prevLogIndex whose terms matches prevLogTerm", function() {
      var server1Log = new Log([{"index": 1, "term": 2}]);
      var server1 = new Server(1, 'leader', server1Log);
      server1.currentTerm = 2;
      var server2Log = new Log([{"index": 1, "term": 1}]);
      var server2 = new Server(2, 'follower', server2Log);
      server2.currentTerm = 2;
      var result = server1.invokeAppendEntries(server2);
      assert.equal(result.success, false);
    });
    // Rule 2
    it("reply true if log does contain entry at prevLogIndex whose terms matches prevLogTerm", function() {
      var server1 = new Server(1, 'leader');
      server1.log = new Log([{"index": 1, "term": 1}]);
      var server2 = new Server(2, 'follower');
      server2.log = new Log([{"index": 1, "term": 1}]);
      var result = server1.invokeAppendEntries(server2);
      assert.equal(result.success, true);
    });
    // Rule 3
    describe("If an existing entry conflicts with a new one", function() {
      it("deletes existing entry and all that follows", function() {
        var server1Log = new Log([{"index": 1, "term": 1}, {"index": 1, "term": 2}]);
        var server1 = new Server(1, 'leader', server1Log);
        server1.currentTerm = 2;
        var server2Log = new Log([{"index": 1, "term": 1}, {"index": 1, "term": 1}, {"index": 1, "term": 3}]);
        var server2 = new Server(2, 'follower', server2Log);
        server2.currentTerm = 2;
        var result = server1.invokeAppendEntries(server2);
        assert.deepEqual(server2.log.logEntries, [{"index": 1, "term": 1}]);
      });
    });
    // Rule 4
    it("appends any new entries not already in the log", function() {
      var server1 = new Server(1, 'leader', new Log([{"index": 1, "term": 1}]));
      server1.currentTerm = 2;
      var server2 = new Server(2, 'follower', new Log([{"index": 1, "term": 1}]));
      server2.currentTerm = 2;
      server1.log.append({"index": 2, "term": 1});
      var result = server1.invokeAppendEntries(server2);
      assert.deepEqual(server2.log.logEntries, [{"index": 1, "term": 1}, {"index": 2, "term": 1}]);
    });
  });

  describe("If election timeout elapses: start new election", function() {
    it("starts new election on timeout", function() {
      // TODO: Implement this rule
    });
  });
});

describe("Client Log Entry Request", function() {
  it("client sends log request to server", function() {
    var server = new Server(1, 'leader');
    var logEntry = {"value": 1};
    var response = server.onReceiveClientRequest(logEntry);
    assert.equal(server.log.length(), 1);
    assert.equal(server.lastLogEntry().value, 1);
    assert.equal(server.lastLogEntry().term, 0);
    assert.equal(response.isSuccessful, true);

  });

  it("client sends log request to a follower", function() {
    var server1 = new Server(1, 'follower');
    var server2 = new Server(2, 'leader');
    server1.addPeer(server2);
    server2.addPeer(server1);
    var response = server1.onReceiveClientRequest(1);
    assert.equal(response.isSuccessful, false);
    assert.equal(response.leaderId, 2);
    assert.equal(server1.log.length(), 0);
  });

});
describe("General rules for servers",function(){
  it("If successful: ipdate nextIndex and matchIndex for follower.",function(){
    var server1 = new Server(1, 'leader', new Log([{"index": 1, "term": 1},{"index": 1, "term": 1}]));
    server1.currentTerm = 2;
    var server2 = new Server(2, 'follower', new Log([{"index": 1, "term": 1},{"index": 1, "term": 1}]));
    server2.currentTerm = 2
    var response = server1.invokeAppendEntries(server2);
    assert.equal(response.success,true);
    assert.equal(server1.matchIndexFor(server2.id), 2);
  })
  it("If AppendEntries fails because of log inconsistency: decrement nextIndex and retry.",function(){
    var server1 = new Server(1, 'leader', new Log([{"index": 1, "term": 2}]));
    server1.currentTerm = 2;
    var server2 = new Server(2, 'follower', new Log([{"index": 1, "term": 1}]));
    server2.currentTerm = 2;
    assert.equal(server1.nextIndexFor(2), 2);
    var response = server1.invokeAppendEntries(server2);
    assert.equal(response.success,false);
    assert.equal(server1.nextIndexFor(2), 1);
  })
});
