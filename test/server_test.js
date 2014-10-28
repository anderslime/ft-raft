var assert = require('chai').assert;
var Server = require('../raft/server');

describe("Server", function() {
  it("is created with index and peers", function() {
    var server = new Server(1, []);
    assert.equal(server.index, 1);
    assert.sameMembers(server.peers, []);
  });
});
