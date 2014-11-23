var Log = require('./log');
var Cluster = require('./cluster');
var LeaderState = require('./leader_state');
var DirectAsync = require('./protocol/direct');

DEFAULT_HEART_BEAT_INTERVAL = 500;
DEFAULT_ELECTION_TIMER_INTERVAL = [1500, 3000];

Server = (function() {
  function Server(id, state, log, options) {
    if (options === undefined) options = {};
    this.heartBeatInterval = options.heartBeatInterval || DEFAULT_ELECTION_TIMER_INTERVAL
    this.electionTimerInterval = options.electionTimerInterval || DEFAULT_ELECTION_TIMER_INTERVAL
    this.protocol = options.protocol || new Direct();
    this.clock_interval
    this.id = id;
    this.cluster = new Cluster([this]);
    this.protocol.cluster = this.cluster;
    this.state = state || 'follower';
    this.log = log || new Log();
    this.currentTerm = 0;
    this.votedFor = null;
    this.leaderState = new LeaderState(this._lastLogIndex());
    this.electionTimeoutMilSec = null;
    this._resetElectionTimer();
    this.heartBeat = null;
    this.isDown = false;
    var _me = this;
    this.electionTimer = setInterval(function() {
      _me.decrementElectionTimeout(1);
    }, 1);
    this.votes = [];
  };

  Server.prototype.nextIndexFor = function(peerId) {
    return this.leaderState.nextIndexFor(peerId);
  };

  Server.prototype.matchIndexFor = function(peerId) {
    return this.leaderState.matchIndexFor(peerId);
  };

  Server.prototype.crash = function() {
    this._becomeFollower();
    this.isDown = true;
  };

  Server.prototype.restart = function() {
    this._resetElectionTimer();
    this.isDown = false;
  }

  Server.prototype.decrementElectionTimeout = function(milliSeconds) {
    if (this.isLeader()) return;
    this.electionTimeoutMilSec = this.electionTimeoutMilSec - milliSeconds;
    if (this.electionTimeoutMilSec <= 0) {
      this.onTimeout();
    }
  };

  Server.prototype.onReceiveClientRequest = function(logEntry) {
    if (this.isDown) return;
    if (this.isLeader()) {
      this.log.append({"value": logEntry.value, "term": this.currentTerm});
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

  Server.prototype.onTimeout = function(){
    if (this.isLeader() || this.isDown) return;
    this._becomeCandidate();
    this._startElection();
  };

  Server.prototype.invokeVoteRequest = function(targetPeer) {
    if (this.isDown) return;
    return this.protocol.invokeVoteRequest(
      this.id,
      targetPeer.id,
      {
        "term": this.currentTerm,
        "candidateId": this.id,
        "lastLogIndex": this._lastLogIndex(),
        "lastLogTerm": this._lastLogTerm()
      }
    )
  };

  Server.prototype.onReceiveRequestVote = function(sourcePeerId, requestVote) {
    this._onRemoteProcedureCall(requestVote);
    if (this.isDown) return;
    var _me = this;
    if (_me._isValidVote(requestVote)) {
      _me._voteFor(requestVote.candidateId);
      return this.protocol.invokeVoteResponse(
        sourcePeerId,
        { "term": requestVote.term, "voteGranted": true }
      );
    } else {
      return this.protocol.invokeVoteResponse(
        sourcePeerId,
        { "term": _me.currentTerm, "voteGranted": false }
      );
    }
  };

  Server.prototype.onReceiveAppendEntries = function(sourcePeerId, appendEntries) {
    this._onRemoteProcedureCall(appendEntries);
    if (this.isDown) return;
    this.votedFor = null;
    this._resetElectionTimer();
    this.state = "follower";
    if (!this.containsLogEntryWithSameTerm(appendEntries)) {
      this._deleteLogEntriesFollowingAndIncluding(appendEntries.prevLogIndex);
    }
    this.log.append(appendEntries.entries);
    return this.protocol.invokeAppendEntriesResponse(
      sourcePeerId,
      this.id,
      {
        "term": this.currentTerm,
        "success": this.appendEntriesSuccessResult(appendEntries),
        "matchIndex": this.log.lastIndex()
      }
    );
  };

  Server.prototype.appendEntriesSuccessResult = function(appendEntries) {
    return !(appendEntries.term < this.currentTerm) &&
            this.containsLogEntryWithSameTerm(appendEntries);
  };

  Server.prototype.containsLogEntryWithSameTerm = function(appendEntries) {
    return (appendEntries.prevLogIndex === 0) ||
           (this.log.entryAt(appendEntries.prevLogIndex) !== undefined &&
            this.log.entryAt(appendEntries.prevLogIndex).term === appendEntries.prevLogTerm);
  };

  Server.prototype.invokeVoteResponse = function(requestVoteResult) {
    this._onRemoteProcedureCall(requestVoteResult);
    if (this.isDown || this.isLeader()) return;
    this.votes.push(requestVoteResult);
    this._becomeLeaderIfMajorityOfVotesReceived(this.votes);
    return requestVoteResult;
  };

  Server.prototype.invokeAppendEntriesResponse = function(targetPeerId, appendEntriesResult) {
    this._onRemoteProcedureCall(appendEntriesResult);
    if (this.isDown) return;
    if(appendEntriesResult.success){
      var matchIndex = Math.max(
        this.leaderState.matchIndexFor(targetPeerId),
        appendEntriesResult.matchIndex
      );
      this.leaderState.setMatchIndex(targetPeerId, matchIndex);
      this.leaderState.setNextIndex(targetPeerId, matchIndex + 1);
    } else {
      this.leaderState.decrementNextIndex(targetPeerId);
    }

    return appendEntriesResult;
  };

  Server.prototype.invokeAppendEntries = function(targetPeer) {
    if (this.isDown) return;
    var prevLogIndex = this.leaderState.nextIndexFor(targetPeer.id) - 1;
    return this.protocol.invokeAppendEntries(
      this.id,
      targetPeer.id,
      {
        "term": this.currentTerm,
        "leaderId": this.id,
        "prevLogIndex": prevLogIndex,
        "prevLogTerm": this._termAtLogEntry(prevLogIndex),
        "entries": this._entries(targetPeer),
        "leaderCommit": null
      }
    )
  };

  Server.prototype._termAtLogEntry = function(entryIndex) {
    if (entryIndex === 0 || this.log.entryAt(entryIndex) === undefined) return null;
    return this.log.entryAt(entryIndex).term
  };

  Server.prototype._entries = function(targetPeer) {
    if (this._lastLogIndex() >= this.leaderState.nextIndexFor(targetPeer.id)) {
      return this.log.entryRange(
        this.leaderState.nextIndexFor(targetPeer.id),
        this._lastLogIndex() + 1
      );
    } else {
      return [];
    }
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
      this.votedFor = null;
      this._becomeFollower();
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
    this.votes = [];
    this.currentTerm += 1;
    this.votedFor = this.id;
    this._resetElectionTimer();
    var _me = this;
    this._collectVotesFromOtherPeers();
  };

  Server.prototype._resetElectionTimer = function() {
    this.electionTimeoutMilSec = this._randomNumberBetween(
      this.electionTimerInterval[0],
      this.electionTimerInterval[1]
    )
  };

  Server.prototype._randomNumberBetween = function(min, max) {
    return Math.floor((Math.random() * (max - min)) + min)
  }

  Server.prototype._becomeLeaderIfMajorityOfVotesReceived = function(voteResponses) {
    positiveVotes = voteResponses.filter(function(voteResponse) {
      return voteResponse && voteResponse.voteGranted;
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

  Server.prototype._voteFor = function(candidateId) {
    this.votedFor = candidateId;
    this._resetElectionTimer();
  };

  Server.prototype._becomeCandidate = function() {
    this.state = 'candidate';
    clearTimeout(this.heartBeat);
  };

  Server.prototype._becomeFollower = function() {
    this.state = 'follower';
    clearTimeout(this.heartBeat);
  };

  Server.prototype._becomeLeader = function() {
    if (this.isLeader()) return;
    this.state = 'leader';
    this.votedFor = null;
    var _me = this;
    this.leaderState = new LeaderState(this._lastLogIndex());
    this.heartBeat = setInterval(function() {
      _me._invokeAppendEntriesOnPeers();
    }, this.heartBeatInterval);
  };

  Server.prototype._invokeAppendEntriesOnPeers = function() {
    var _me = this;
    this._otherPeers().map(function(peer) {
      _me.invokeAppendEntries(peer);
    });
  };

  return Server;

})();

module.exports = Server;
