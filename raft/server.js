Server = (function() {
  function Server(id, peers, state) {
    this.id = id;
    this.peers = peers;
    this.state = state || 'follower';
    this.log = [];
  };

  Server.prototype.becomeLeader = function() {
    this.state = 'leader';
  };

  Server.prototype.startElection = function() {
    this.state = 'candidate';
  };

  Server.prototype.onReceiveRequest = function(logEntry) {
    if (this.isLeader()) {
      this.log.push(logEntry);
      return {
        "isSuccessful": true,
        "leaderId": this.id
      }
    } else {
      return {
        "isSuccessful": false,
        "leaderId": this.findLeader().id
      }
    }
  };

  Server.prototype.lastLogEntry = function() {
    return this.log[this.log.length - 1];
  };

  Server.prototype.addPeer = function(server){
    this.peers.push(server);
  };

  Server.prototype.isLeader = function() {
    return this.state == 'leader';
  }

  Server.prototype.findLeader = function() {
    var leader = {};
    for (peerIndex in this.peers) {
      var peer = this.peers[peerIndex];
      if (peer.isLeader()) {
        leader = peer;
      }
    }
    return leader;
  }


  return Server;

})();


module.exports = Server;
