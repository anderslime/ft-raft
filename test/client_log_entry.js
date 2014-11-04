var assert = require('chai').assert;
var Server = require('../raft/server');


describe("Client Log Entry Request", function() {
  it("client sends log request to server", function() {
    var server = new Server(1, [], 'leader');
    var logEntry = {"index": 1};
    var response = server.onReceiveRequest(logEntry);
    assert.equal(server.log.length, 1);
    assert.equal(server.lastLogEntry().index, 1);
    assert.equal(server.lastLogEntry().term, 0);
    assert.equal(response.isSuccessful, true);

  });

  it("client send log request to a follower", function() {
    var server1 = new Server(1, [], 'follower');
    var server2 = new Server(2, [], 'leader');
    server1.addPeer(server2);
    server2.addPeer(server1);
    var response = server1.onReceiveRequest(1);
    assert.equal(response.isSuccessful, false);
    assert.equal(response.leaderId, 2);
    assert.equal(server1.log.length, 0);
  });

});


