var Log = require('./log');
var Cluster = require('./cluster');

Server = (function() {
  function Server(id, peers, state, currentTerm) {
    this.id = id;
    this.peers = peers;
    this.cluster = new Cluster(peers.concat(this));
    this.state = state || 'follower';
    this.log = new Log();
    this.currentTerm = currentTerm || 0;
    this.votedFor = null;
  };

  Server.prototype.onReceiveRequest = function(logEntry) {
    if (this.isLeader()) {
      this.log.append({"index": logEntry.index, "term": this.currentTerm})
      return {
        "isSuccessful": true,
        "leaderId": this.id
      }
    } else {
      return {
        "isSuccessful": false,
        "leaderId": this.cluster.leaderId()
      }
    }
  };

  Server.prototype.lastLogEntry = function() {
    return this.log.lastEntry();
  };

  Server.prototype.addPeer = function(server){
    this.cluster.addPeer(server);
  };

  Server.prototype.isLeader = function() {
    return this.state == 'leader';
  }

  Server.prototype.onTimeout = function(withElection){
    if (withElection === undefined) withElection = true;
    this.state = "candidate";
    if (withElection) {
      this.startElection()
    }
  };

  Server.prototype.startElection = function() {
    this.currentTerm += 1;
    this.votedFor = this.id;
    var _me = this;
    var voteResponses = this._collectVotesFromOtherPeers();
    this.becomeLeaderIfMajorityOfVotesReceived(voteResponses);
  }

  Server.prototype.becomeLeaderIfMajorityOfVotesReceived = function(voteResponses) {
    positiveVotes = voteResponses.filter(function(voteResponse) {
      return voteResponse.voteGranted;
    });
    if (this.hasGrantedMajorityOfVotes(positiveVotes)) {
      this._becomeLeader();
    }
  }

  Server.prototype.otherPeers = function() {
    var _me = this;
    return this.cluster.peers.filter(function(peer) {
      return peer.id !== _me.id;
    });
  }

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
    return this.log.lastIndex();
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

  Server.prototype.onReceiveAppendEntries = function(sourcePeer, appendEntries) {
    this.onRemoteProcedureCall(appendEntries);
    this.state = "follower";
    if (!this.containsLogEntryWithSameTerm(appendEntries)) {
      this.deleteLogEntriesFollowingAndIncluding(appendEntries.prevLogIndex)
    }
    return sourcePeer.invokeAppendEntriesResponse(
      {"term": this.currentTerm,
       "success": this.appendEntriesSuccessResult(appendEntries)
      });
  }

  Server.prototype.deleteLogEntriesFollowingAndIncluding = function(logIndex) {
    this.log.deleteLogEntriesFollowingAndIncluding(logIndex);
  }

  Server.prototype.appendEntriesSuccessResult = function(appendEntries) {
    return !(appendEntries.term < this.currentTerm) &&
            this.containsLogEntryWithSameTerm(appendEntries);
  }

  Server.prototype.containsLogEntryWithSameTerm = function(appendEntries) {
    return (appendEntries.prevLogIndex === null) ||
           (this.log.entryAt(appendEntries.prevLogIndex) !== undefined &&
            this.log.entryAt(appendEntries.prevLogIndex).term === appendEntries.prevLogTerm);
  }


  Server.prototype.invokeVoteResponse = function(requestVoteResult) {
    this.onRemoteProcedureCall(requestVoteResult);
    return requestVoteResult;
  }

  Server.prototype.invokeAppendEntriesResponse = function(appendEntriesResult) {
    this.onRemoteProcedureCall(appendEntriesResult);
    return appendEntriesResult;
  }

  Server.prototype.invokeAppendEntries = function(targetPeer) {
    return targetPeer.onReceiveAppendEntries(
      this,
      {
        "term": this.currentTerm,
        "leaderId": this.id,
        "prevLogIndex": this.lastLogIndex(),
        "prevLogTerm": this.lastLogTerm(),
        "entries": [],
        "leaderCommit": null
      }
    )
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
      this.isLogAtLeastUpToDateAsRequestVote(requestVote);
  }

  Server.prototype.isLogAtLeastUpToDateAsRequestVote = function(requestVote) {
    return this.log.isAtLeastUpToDateAs(
      requestVote.lastLogIndex,
      requestVote.lastLogTerm
    )
  }

  Server.prototype.lastLogTerm = function() {
    return this.log.lastLogTerm();
  }

  Server.prototype.hasGrantedMajorityOfVotes = function(positiveVotes) {
    serversOwnVote = (this.votedFor == this.id) ? 1 : 0;
    var totalVotes = positiveVotes.length + serversOwnVote;
    return this.cluster.isLargerThanMajority(totalVotes);
  }

  Server.prototype._collectVotesFromOtherPeers = function() {
    var _me = this;
    return this.otherPeers().map(function(peer) {
      return _me.invokeVoteRequest(peer);
    });
  }

  Server.prototype._becomeLeader = function() {
    this.state = 'leader';
  }

  return Server;

})();


module.exports = Server;
