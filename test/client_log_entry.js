var assert = require('chai').assert;
var Server = require('../raft/server');


describe("Server", function() {
  it("is created with paramters", function() {
    var server = new Server(1, [], 'follower');
    assert.equal(server.index, 1);
    assert.sameMembers(server.peers, []);
    assert.equal(server.state, 'follower');
  });

  it("client sends log request to server", function() {
    var server = new Server(1, [], 'leader');
    server.onReceiveRequest(1);
    assert.equal(server.log.length, 1);
    assert.equal(server.lastLogEntry(), 1);

    });
});


