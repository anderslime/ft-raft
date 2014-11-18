var Log = require('./log');
var Cluster = require('./cluster');
var LeaderState = require('./leader_state');

Server = (function() {
  function Server(id, peers, state, currentTerm, log) {
    this.id = id;
    this.cluster = new Cluster(peers.concat(this));
    this.state = state || 'follower';
    this.log = log || new Log();
    this.currentTerm = currentTerm || 0;
    this.votedFor = null;
    this.leaderState = new LeaderState(this._lastLogIndex());
  };

  Server.prototype.nextIndexFor = function(peerId) {
    return this.leaderState.nextIndexFor(peerId);
  };

  Server.prototype.matchIndexFor = function(peerId) {
    return this.leaderState.matchIndexFor(peerId);
  };

  Server.prototype.onReceiveClientRequest = function(logEntry) {
    if (this.isLeader()) {
      this.log.append({"index": logEntry.index, "term": this.currentTerm});
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
  };

  Server.prototype.onTimeout = function(withElection){
    this.state = "candidate";
    this._startElection()
  };

  Server.prototype.invokeVoteRequest = function(targetPeer) {
    return targetPeer.onReceiveRequestVote(
      this,
      {
        "term": this.currentTerm,
        "candidateId": this.id,
        "lastLogIndex": this._lastLogIndex(),
        "lastLogTerm": this._lastLogTerm()
      }
    )
  };

  Server.prototype.onReceiveRequestVote = function(sourcePeer, requestVote) {
    this._onRemoteProcedureCall(requestVote);

    if (this._isValidVote(requestVote)) {
      this.votedFor = requestVote.candidateId;
      return sourcePeer.invokeVoteResponse(
        { "term": requestVote.term, "voteGranted": true }
      );
    } else {
      return sourcePeer.invokeVoteResponse(
        { "term": this.currentTerm, "voteGranted": false }
      );
    }
  };

  Server.prototype.onReceiveAppendEntries = function(sourcePeer, appendEntries) {
    this._onRemoteProcedureCall(appendEntries);
    this.state = "follower";
    if (!this.containsLogEntryWithSameTerm(appendEntries)) {
      this._deleteLogEntriesFollowingAndIncluding(appendEntries.prevLogIndex);
    }
    return sourcePeer.invokeAppendEntriesResponse(
      this.id,
      {
        "term": this.currentTerm,
        "success": this.appendEntriesSuccessResult(appendEntries)
      }
    );
  };

  Server.prototype.appendEntriesSuccessResult = function(appendEntries) {
    return !(appendEntries.term < this.currentTerm) &&
            this.containsLogEntryWithSameTerm(appendEntries);
  };

  Server.prototype.containsLogEntryWithSameTerm = function(appendEntries) {
    return (appendEntries.prevLogIndex === null) ||
           (this.log.entryAt(appendEntries.prevLogIndex) !== undefined &&
            this.log.entryAt(appendEntries.prevLogIndex).term === appendEntries.prevLogTerm);
  };


  Server.prototype.invokeVoteResponse = function(requestVoteResult) {
    this._onRemoteProcedureCall(requestVoteResult);
    return requestVoteResult;
  };

  Server.prototype.invokeAppendEntriesResponse = function(targetPeerId, appendEntriesResult) {
    this._onRemoteProcedureCall(appendEntriesResult);
    if(appendEntriesResult.success){
      this.leaderState.incrementNextIndex(targetPeerId);
      this.leaderState.setMatchIndex(targetPeerId, this._lastLogIndex());
    } else {
      this.leaderState.decrementNextIndex(targetPeerId);
    }
    
    return appendEntriesResult;
  };

  Server.prototype.invokeAppendEntries = function(targetPeer) {
    return targetPeer.onReceiveAppendEntries(
      this,
      {
        "term": this.currentTerm,
        "leaderId": this.id,
        "prevLogIndex": this._lastLogIndex(),
        "prevLogTerm": this._lastLogTerm(),
        "entries": [],
        "leaderCommit": null
      }
    )
  };

  Server.prototype._lastLogIndex = function() {
    return this.log.lastIndex();
  };

  Server.prototype._deleteLogEntriesFollowingAndIncluding = function(logIndex) {
    this.log.deleteLogEntriesFollowingAndIncluding(logIndex);
  };

  // Rules for Servers: If RPC request or response contains term T > currentTerm:
  // set currentTerm = T, convert to follower
  Server.prototype._onRemoteProcedureCall = function(rpc) {
    if (rpc.term > this.currentTerm) {
      this.currentTerm = rpc.term;
      this.state = 'follower';
    }
  };

  Server.prototype._isValidVote = function(requestVote) {
    return requestVote.term >= this.currentTerm &&
      (this.votedFor === null || this.votedFor === requestVote.candidateId) &&
      this._isLogAtLeastUpToDateAsRequestVote(requestVote);
  };

  Server.prototype._isLogAtLeastUpToDateAsRequestVote = function(requestVote) {
    return this.log.isAtLeastUpToDateAs(
      requestVote.lastLogIndex,
      requestVote.lastLogTerm
    );
  };

  Server.prototype._lastLogTerm = function() {
    return this.log.lastLogTerm();
  };

  Server.prototype._hasGrantedMajorityOfVotes = function(positiveVotes) {
    serversOwnVote = (this.votedFor == this.id) ? 1 : 0;
    var totalVotes = positiveVotes.length + serversOwnVote;
    return this.cluster.isLargerThanMajority(totalVotes);
  };

  Server.prototype._startElection = function() {
    this.currentTerm += 1;
    this.votedFor = this.id;
    var _me = this;
    var voteResponses = this._collectVotesFromOtherPeers();
    this._becomeLeaderIfMajorityOfVotesReceived(voteResponses);
  };

  Server.prototype._becomeLeaderIfMajorityOfVotesReceived = function(voteResponses) {
    positiveVotes = voteResponses.filter(function(voteResponse) {
      return voteResponse.voteGranted;
    });
    if (this._hasGrantedMajorityOfVotes(positiveVotes)) {
      this._becomeLeader();
    }
  };

  Server.prototype._collectVotesFromOtherPeers = function() {
    var _me = this;
    return this._otherPeers().map(function(peer) {
      return _me.invokeVoteRequest(peer);
    });
  };

  Server.prototype._otherPeers = function() {
    var _me = this;
    return this.cluster.peers.filter(function(peer) {
      return peer.id !== _me.id;
    });
  };

  Server.prototype._becomeLeader = function() {
    this.state = 'leader';
  };

  return Server;

})();

module.exports = Server;
