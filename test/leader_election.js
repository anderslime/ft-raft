var assert = require('chai').assert;
var Server = require('../raft/server');


describe("Leader election", function() {
  it("CurrentTerm is 0 at start", function() {
    var server = new Server(1, [], 'follower');
    assert.equal(server.currentTerm, 0);
  });

/*  it("Server timeouts after 0.1 second", function(){
    var server = new Server(1, [], 'follower');

  });*/

  it("Server timeouts and becomes a candidate", function(){
    var server = new Server(1, [], 'follower');
    server.onTimeout();
    assert.equal(server.state, "candidate");
  });

  it("Server starts an election after timeout", function(){
    var server = new Server(1, [], 'follower');
    server.onTimeout();
    assert.equal(server.currentTerm, 1);
    assert.equal(server.votedFor, 1);

    //TODO test for reset electiontimer

  });

/*  describe("Requesting vote on election", function() {
    it("requests vote", function() {
      var server = new Server(1, [], 'follower');
      var requestVote = {
        
      };
      server.sendRequestVote()
    });
  })*/



});


