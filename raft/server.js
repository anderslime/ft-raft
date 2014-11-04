Server = (function() {
  function Server(id, peers, state, currentTerm) {
    this.id = id;
    this.peers = peers;
    this.state = state || 'follower';
    this.log = [];
    this.currentTerm = currentTerm || 0;
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

  Server.prototype.invokeVoteRequest = function(targetPeer) {
    return targetPeer.onReceiveRequestVote(
      this,
      {
        "term": this.currentTerm,
        "candidateId": this.id,
        "lastLogIndex": this.lastLogIndex(),
        "lastLogTerm": this.lastLogTerm()
      }
    )
  }

  Server.prototype.lastLogIndex = function() {
    return this.log.length - 1;
  }

  Server.prototype.onReceiveRequestVote = function(sourcePeer, requestVote) {
    this.onRemoteProcedureCall(requestVote);

    if (this.isValidVote(requestVote)) {
      this.votedFor = requestVote.candidateId;
      return sourcePeer.invokeVoteResponse({ "term": requestVote.term, "voteGranted": true })
    } else {
      return sourcePeer.invokeVoteResponse({ "term": this.currentTerm, "voteGranted": false })
    }
  }

  Server.prototype.invokeVoteResponse = function(requestVoteResult) {
    this.onRemoteProcedureCall(requestVoteResult);
    return requestVoteResult;
  }



  // Rules for Servers: If RPC request or response contains term T > currentTerm:
  // set currentTerm = T, convert to follower
  Server.prototype.onRemoteProcedureCall = function(rpc) {
    if (rpc.term > this.currentTerm) {
      this.currentTerm = rpc.term;
      this.state = 'follower';
    }
  }  

  Server.prototype.isValidVote = function(requestVote) {
    return requestVote.term >= this.currentTerm &&
      (this.votedFor === null || this.votedFor === requestVote.candidateId) &&
      this.isRequestLogAtLeastUpdToDate(requestVote.lastLogIndex, requestVote.lastLogTerm);
  }

  Server.prototype.isRequestLogAtLeastUpdToDate = function(logIndex, logTerm) {
    return this.lastLogIndex() <= logIndex && this.lastLogTerm() <= logTerm;
  }

  Server.prototype.lastLogTerm = function() {
    if (this.log.length === 0) {
      return 0;
    } else {
      return this.lastLogEntry().term;
    }
  }


  return Server;

})();


module.exports = Server;
