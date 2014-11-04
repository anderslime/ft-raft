Server = (function() {
  function Server(id, peers, state) {
    this.id = id;
    this.peers = peers;
    this.state = state || 'follower';
    this.log = [];
    this.currentTerm = 0;
    this.votedFor = null;
  };

  Server.prototype.becomeLeader = function() {
    this.state = 'leader';
  };

  Server.prototype.startElection = function() {
    this.state = 'candidate';
  };

  Server.prototype.onReceiveRequest = function(logEntry) {
    if (this.isLeader()) {
      this.log.push({"index": logEntry.index, "term": this.currentTerm});
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
    return this.log[this.lastLogIndex()];
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

  Server.prototype.onTimeout = function(){
    this.state = "candidate";
    this.currentTerm += 1;
    this.votedFor = this.id;
  };

  Server.prototype.sendRequestVote = function(targetPeer) {
    return targetPeer.onReceiveRequestVote(
      {
        "term": this.currentTerm,
        "candidateId": this.id,
        "lastLogIndex": this.lastLogIndex(),
        "lastLogTerm": this.lastLogEntry()
      }
    )
  }

  Server.prototype.lastLogIndex = function() {
    return this.log.length - 1;
  }

  Server.prototype.onReceiveRequestVote = function(requestVote) {

  }


  return Server;

})();


module.exports = Server;
